"use client";

import React, { useState, useRef, useEffect } from "react";
import { useMCPClient } from "../context/MCPClientContext";

export default function ChatInterface() {
  const { messages, isConnected, isLoading, sendMessage } = useMCPClient();
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    await sendMessage(inputMessage);
    setInputMessage("");
  };

  return (
    <div className="flex flex-col h-full max-h-[70vh] overflow-hidden">
      {/* Messages display */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800 rounded-t-lg">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-lg ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-black dark:text-white"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">
                {message.content}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSendMessage}
        className="flex items-center p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-700 rounded-b-lg"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={
            isConnected
              ? "Type your message..."
              : "Connect to an MCP server first..."
          }
          disabled={!isConnected || isLoading}
          className="flex-1 px-4 py-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!isConnected || isLoading || !inputMessage.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-blue-300"
        >
          {isLoading ? "Processing..." : "Send"}
        </button>
      </form>
    </div>
  );
}
