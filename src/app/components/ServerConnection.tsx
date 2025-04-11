"use client";

import React, { useState } from "react";
import { useMCPClient } from "../context/MCPClientContext";
import { Tool } from "../lib/mcpClient";

export default function ServerConnection() {
  const {
    isConnected,
    isLoading,
    connectToServer,
    disconnectFromServer,
    tools,
  } = useMCPClient();
  const [serverPath, setServerPath] = useState("node G:/mcp/empireui/index.js");
  const [error, setError] = useState("");

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!serverPath.trim()) {
      setError("Please enter a valid server path");
      return;
    }

    try {
      await connectToServer(serverPath);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      let helpfulMessage = `Failed to connect: ${errorMessage}`;

      // Provide more helpful error messages based on common issues
      if (errorMessage.includes("Connection closed")) {
        helpfulMessage +=
          "\n\nTips to fix this issue:\n" +
          "- Make sure the server script exists and is accessible\n" +
          "- For Windows paths, make sure to use forward slashes (/)\n" +
          "- Make sure you have the right permissions to execute the file\n" +
          "- Check that you have the required environment variables (ANTHROPIC_API_KEY) set in your .env file\n" +
          "- Try using the full command format: node path/to/file.js";
      } else if (errorMessage.includes("Cannot find module")) {
        helpfulMessage +=
          "\n\nThe server script file was not found. Please verify the path is correct.";
      } else if (errorMessage.includes("ENOENT")) {
        helpfulMessage +=
          "\n\nFile or directory not found. Check that the path exists.";
      }

      setError(helpfulMessage);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectFromServer();
    } catch (error) {
      setError(
        `Failed to disconnect: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 dark:text-white">
        MCP Server Connection
      </h2>

      <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded-md">
        <p className="font-medium">Important Setup Instructions:</p>
        <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
          <li>
            Create a <code className="bg-blue-50 px-1 rounded">.env</code> file
            in your project root
          </li>
          <li>
            Add your API key:{" "}
            <code className="bg-blue-50 px-1 rounded">
              ANTHROPIC_API_KEY=your_key_here
            </code>
          </li>
          <li>Restart the Next.js server after adding the key</li>
          <li>Make sure your MCP server script is properly implemented</li>
        </ol>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md whitespace-pre-wrap">
          {error}
        </div>
      )}

      {!isConnected ? (
        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label
              htmlFor="serverPath"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Server Path
            </label>
            <input
              id="serverPath"
              type="text"
              value={serverPath}
              onChange={(e) => setServerPath(e.target.value)}
              placeholder="node path/to/script.js"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Always include{" "}
              <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                node
              </code>{" "}
              or{" "}
              <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                python
              </code>{" "}
              before the script path
            </p>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
              <p className="font-medium mb-1">
                Example formats (notice forward slashes for Windows paths):
              </p>
              <ul className="space-y-1 pl-4">
                <li>
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                    node G:/path/to/script.js
                  </code>
                </li>
                <li>
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                    node ./relative/path/script.js
                  </code>
                </li>
                <li>
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">
                    python C:/Users/name/script.py
                  </code>
                </li>
              </ul>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? "Connecting..." : "Connect to Server"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-2 bg-green-100 text-green-700 rounded-md">
            Connected to MCP server
          </div>

          {tools && tools.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                Available Tools:
              </h3>
              <ul className="space-y-2">
                {tools.map((tool: Tool, index: number) => (
                  <li
                    key={index}
                    className="p-2 bg-gray-100 dark:bg-gray-800 rounded-md"
                  >
                    <span className="font-medium">{tool.name}</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {tool.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleDisconnect}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          >
            {isLoading ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      )}
    </div>
  );
}
