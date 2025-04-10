"use client";

import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { MCPClient, Tool } from "../lib/mcpClient";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface MCPClientContextProps {
  client: MCPClient | null;
  messages: Message[];
  tools: Tool[];
  isConnected: boolean;
  isLoading: boolean;
  connectToServer: (serverPath: string) => Promise<void>;
  disconnectFromServer: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
}

const MCPClientContext = createContext<MCPClientContextProps>({
  client: null,
  messages: [],
  tools: [],
  isConnected: false,
  isLoading: false,
  connectToServer: async () => {},
  disconnectFromServer: async () => {},
  sendMessage: async () => {},
});

export const useMCPClient = () => useContext(MCPClientContext);

export const MCPClientProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [client, setClient] = useState<MCPClient | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (client) {
        client.close().catch(console.error);
      }
    };
  }, [client]);

  const connectToServer = async (serverPath: string) => {
    try {
      setIsLoading(true);
      const newClient = new MCPClient();
      const serverTools = await newClient.connectToServer(serverPath);
      setClient(newClient);
      setTools(serverTools);
      setIsConnected(true);
      setMessages([
        {
          role: "assistant",
          content: `MCP Client Started! Available tools: ${serverTools
            .map((t) => t.name)
            .join(", ")}`,
        },
      ]);
    } catch (error) {
      console.error("Failed to connect to server:", error);
      setMessages([
        {
          role: "assistant",
          content: `Error connecting to server: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectFromServer = async () => {
    if (client) {
      try {
        setIsLoading(true);
        await client.close();
        setClient(null);
        setIsConnected(false);
        setTools([]);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Disconnected from MCP server." },
        ]);
      } catch (error) {
        console.error("Error disconnecting from server:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const sendMessage = async (message: string) => {
    if (!client || !isConnected) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Not connected to MCP server." },
      ]);
      return;
    }

    try {
      setIsLoading(true);
      setMessages((prev) => [...prev, { role: "user", content: message }]);

      if (message.toLowerCase() === "quit") {
        await disconnectFromServer();
        return;
      }

      const response = await client.processQuery(message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response },
      ]);
    } catch (error) {
      console.error("Error processing query:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error processing query: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MCPClientContext.Provider
      value={{
        client,
        messages,
        tools,
        isConnected,
        isLoading,
        connectToServer,
        disconnectFromServer,
        sendMessage,
      }}
    >
      {children}
    </MCPClientContext.Provider>
  );
};
