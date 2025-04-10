"use client";

export interface Tool {
  name: string;
  description: string;
  input_schema: any;
}

export class MCPClient {
  private serverPath: string = "";
  private isConnected: boolean = false;
  private tools: Tool[] = [];

  async connectToServer(serverPath: string): Promise<Tool[]> {
    this.serverPath = serverPath;

    try {
      const response = await fetch("/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "connect",
          serverPath: serverPath,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      this.isConnected = true;
      this.tools = data.tools || [];
      console.log("Connected to MCP server");
      return this.tools;
    } catch (error) {
      console.error("Error connecting to server:", error);
      throw error;
    }
  }

  async processQuery(message: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error("MCP server not connected");
    }

    try {
      const response = await fetch("/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "query",
          message: message,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      return data.message;
    } catch (error) {
      console.error("Error processing query:", error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.isConnected) {
      try {
        const response = await fetch("/api/mcp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "disconnect",
          }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.message);
        }

        this.isConnected = false;
        this.tools = [];
        console.log("Disconnected from MCP server");
      } catch (error) {
        console.error("Error disconnecting from server:", error);
        throw error;
      }
    }
  }

  getTools(): Tool[] {
    return this.tools;
  }

  isServerConnected(): boolean {
    return this.isConnected;
  }
}
