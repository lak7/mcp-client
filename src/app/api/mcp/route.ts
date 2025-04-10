import { NextRequest, NextResponse } from "next/server";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Anthropic } from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import path from "path";
import { spawn, ChildProcess } from "child_process";

// Load environment variables
dotenv.config();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set");
}

// Maintain client state
let mcpClient: Client | null = null;
let serverProcess: ChildProcess | null = null;
let tools: any[] = [];
let anthropicClient: Anthropic | null = null;

// Helper to clean up resources
function cleanup() {
  if (serverProcess) {
    try {
      serverProcess.kill();
      serverProcess = null;
    } catch (error) {
      console.error("Error killing server process:", error);
    }
  }

  if (mcpClient) {
    try {
      mcpClient.close();
    } catch (error) {
      console.error("Error closing MCP client:", error);
    }
  }

  mcpClient = null;
  tools = [];
  console.log("MCP client resources cleaned up");
}

export async function POST(request: NextRequest) {
  try {
    const { action, serverPath, message } = await request.json();

    // Initialize and connect to MCP server
    if (action === "connect" && serverPath) {
      // Clean up any existing resources
      cleanup();

      try {
        // Initialize Anthropic client
        anthropicClient = new Anthropic({
          apiKey: ANTHROPIC_API_KEY || "",
        });

        // Parse the server path
        const parsedPath = serverPath.trim();
        console.log("Server path:", parsedPath);

        // Split into command and script path
        const parts = parsedPath.split(" ");
        let command = "";
        let scriptPath = "";

        if (
          parts.length > 1 &&
          (parts[0] === "node" || parts[0] === "python")
        ) {
          command = parts[0];
          scriptPath = parts.slice(1).join(" ");
        } else {
          // Determine command based on file extension
          const fileExt = path.extname(parsedPath).toLowerCase();

          if (fileExt === ".js") {
            command = "node";
            scriptPath = parsedPath;
          } else if (fileExt === ".py") {
            command = process.platform === "win32" ? "python" : "python3";
            scriptPath = parsedPath;
          } else {
            return NextResponse.json(
              {
                success: false,
                message: "Server script must be a .js or .py file",
              },
              { status: 400 }
            );
          }
        }

        console.log(`Launching command: ${command} with script: ${scriptPath}`);

        // Start the MCP server as a separate process
        serverProcess = spawn(command, [scriptPath], {
          stdio: ["pipe", "pipe", "pipe"],
          cwd: process.cwd(),
          shell: true, // Using shell for Windows path support
          env: {
            ...process.env,
            ANTHROPIC_API_KEY: ANTHROPIC_API_KEY,
          },
        });

        if (!serverProcess || !serverProcess.stdout || !serverProcess.stderr) {
          return NextResponse.json(
            {
              success: false,
              message: "Failed to start MCP server process",
            },
            { status: 500 }
          );
        }

        // Log server output for debugging
        serverProcess.stdout.on("data", (data) => {
          console.log(`Server stdout: ${data}`);
        });

        serverProcess.stderr.on("data", (data) => {
          console.error(`Server stderr: ${data}`);
        });

        serverProcess.on("error", (error) => {
          console.error(`Server process error: ${error.message}`);
        });

        // Wait for server to initialize (increased to 5 seconds)
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Now initialize the MCP client and connect to the server
        try {
          // Initialize the MCP client
          mcpClient = new Client({
            name: "mcp-client-web",
            version: "1.0.0",
            apiKey: process.env.ANTHROPIC_API_KEY ?? "",
          });

          // Create the transport
          const transport = new StdioClientTransport({
            command,
            args: [scriptPath],
            env: {
              ANTHROPIC_API_KEY: ANTHROPIC_API_KEY,
            },
          });

          // Connect the client to the transport
          mcpClient.connect(transport);

          // Get available tools with timeout
          const toolsPromise = mcpClient.listTools();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(
              () => reject(new Error("Timed out waiting for tools")),
              30000
            );
          });

          try {
            const toolsResult = (await Promise.race([
              toolsPromise,
              timeoutPromise,
            ])) as any;
            tools = toolsResult.tools;

            return NextResponse.json({
              success: true,
              message: "Connected to MCP server",
              tools: tools,
            });
          } catch (error) {
            console.error("Error listing tools:", error);

            // Create a basic tool definition since we can't get real tools
            tools = [
              {
                name: "testTool",
                description: "A test tool that doesn't do anything.",
                input_schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      description: "A message to echo back.",
                    },
                  },
                },
              },
            ];

            return NextResponse.json({
              success: true,
              message: `MCP Client Started! The server appears to be running, but tools could not be retrieved automatically.`,
              tools: tools,
            });
          }
        } catch (connError) {
          console.error("MCP connection error:", connError);
          cleanup();

          return NextResponse.json(
            {
              success: false,
              message: `Error connecting to MCP server: ${
                connError instanceof Error
                  ? connError.message
                  : String(connError)
              }`,
            },
            { status: 500 }
          );
        }
      } catch (error) {
        cleanup();
        console.error("Failed to connect to MCP server:", error);
        return NextResponse.json(
          {
            success: false,
            message: `Failed to connect to MCP server: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
          { status: 500 }
        );
      }
    }

    // Disconnect and clean up
    else if (action === "disconnect") {
      cleanup();
      return NextResponse.json({
        success: true,
        message: "Disconnected from MCP server.",
      });
    }

    // Process query using Anthropic and MCP
    else if (action === "query" && message) {
      if (!mcpClient || !anthropicClient) {
        return NextResponse.json(
          {
            success: false,
            message: "MCP server not connected",
          },
          { status: 400 }
        );
      }

      try {
        // Create message with available tools
        const response = await anthropicClient.messages.create({
          model: "claude-3-opus-20240229",
          max_tokens: 1024,
          messages: [{ role: "user", content: message }],
          tools: tools.map((tool) => ({
            name: tool.name,
            description: tool.description || "",
            input_schema: tool.inputSchema || tool.input_schema,
          })),
        });

        // Process the content
        let fullResponse = "";

        for (const item of response.content) {
          if (item.type === "text") {
            fullResponse += item.text;
          } else if (item.type === "tool_use") {
            const toolUseItem = item;
            try {
              // Extract tool call details
              const toolName = toolUseItem.name;
              const toolInput = toolUseItem.input;

              fullResponse += `\n[Tool Call: ${toolName}]\n`;
              fullResponse += `Input: ${JSON.stringify(toolInput, null, 2)}\n`;

              // Execute the tool call using MCP client
              const result = await mcpClient.callTool({
                name: toolName,
                arguments: toolInput as { [x: string]: unknown },
              });

              fullResponse += `\nResult: ${JSON.stringify(
                result.content,
                null,
                2
              )}\n`;
            } catch (error) {
              fullResponse += `\n[Tool Call Error: ${JSON.stringify(
                toolUseItem.input || {},
                null,
                2
              )}]\n${error}\n`;
            }
          }
        }

        return NextResponse.json({
          success: true,
          message: fullResponse,
        });
      } catch (error) {
        console.error("Error processing query:", error);
        return NextResponse.json(
          {
            success: false,
            message: `Error processing query: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Invalid action",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}

// Cleanup on server shutdown
process.on("beforeExit", cleanup);
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
