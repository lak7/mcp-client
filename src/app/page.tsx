"use client";

import ChatInterface from "./components/ChatInterface";
import ServerConnection from "./components/ServerConnection";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            MCP Client Chatbot
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Connect to an MCP server and start chatting with an LLM
          </p>
        </div>
      </header>

      <main className="container mx-auto flex-1 p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Server connection panel */}
          <div className="md:col-span-1">
            <ServerConnection />
          </div>

          {/* Chat interface */}
          <div className="md:col-span-2 h-[75vh]">
            <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md h-full">
              <h2 className="text-xl font-bold mb-4 dark:text-white">Chat</h2>
              <div className="h-[calc(100%-40px)]">
                <ChatInterface />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white dark:bg-gray-800 shadow-inner">
        <div className="container mx-auto px-4 py-3 text-center text-gray-600 dark:text-gray-400 text-sm">
          <p>
            Powered by the Model Context Protocol -{" "}
            <a
              href="https://modelcontextprotocol.io/"
              className="text-blue-500 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
