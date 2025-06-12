"use client";

import { useState, useEffect, useRef } from "react";
import { useAgent } from "./hooks/useAgent";
import ReactMarkdown from "react-markdown";

/**
 * Component to display the split information in a structured format
 */
const SplitDisplay = ({ data }: { data: any }) => {
  if (!data) return null;

  return (
    <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-md">
      <h2 className="text-xl font-bold mb-2">{data.title}</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-4">{data.description}</p>
      
      <div className="mb-4">
        <span className="font-semibold">Total Amount: </span>
        <span className="text-green-600 dark:text-green-400">${data.totalAmount.toFixed(2)}</span>
      </div>

      <div className="space-y-3">
        <div className="border-b dark:border-gray-600 pb-2">
          <h3 className="font-semibold mb-2">Initiator:</h3>
          <div className="flex justify-between items-center">
            <div>
              <span>{data.initiator.name}</span>
              <div className="text-sm text-gray-500">
                {data.initiator.walletAddress === "not_provided" ? (
                  <span className="text-yellow-600">No wallet address provided</span>
                ) : (
                  <span className="text-blue-600 dark:text-blue-400">{data.initiator.walletAddress}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-green-600 dark:text-green-400">${data.initiator.amount.toFixed(2)}</div>
              <div className="text-sm text-gray-500">({(data.initiator.proportion * 100).toFixed(1)}%)</div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Other Members:</h3>
          <div className="space-y-2">
            {data.members.map((member: any, index: number) => (
              <div key={index} className="flex justify-between items-center">
                <div>
                  <span>{member.name}</span>
                  <div className="text-sm text-gray-500">
                    {member.walletAddress === "not_provided" ? (
                      <span className="text-yellow-600">No wallet address provided</span>
                    ) : (
                      <span className="text-blue-600 dark:text-blue-400">{member.walletAddress}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-600 dark:text-green-400">${member.amount.toFixed(2)}</div>
                  <div className="text-sm text-gray-500">({(member.proportion * 100).toFixed(1)}%)</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {data.missingInfo && data.missingInfo.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Missing Information:</h4>
          <ul className="list-disc list-inside text-yellow-700 dark:text-yellow-300">
            {data.missingInfo.map((info: string, index: number) => (
              <li key={index}>{info}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        Created: {new Date(data.createdAt).toLocaleString()}
      </div>
    </div>
  );
};

/**
 * Home page for the Money Split Agent
 *
 * @returns {React.ReactNode} The home page
 */
export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isThinking } = useAgent();

  // Ref for the messages container
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Function to scroll to the bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const onSendMessage = async () => {
    if (!input.trim() || isThinking) return;
    const message = input;
    setInput("");
    await sendMessage(message);
  };

  // Function to parse JSON from message text
  const parseJsonFromMessage = (text: string) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  return (
    <div className="flex flex-col flex-grow items-center justify-center text-black dark:text-white w-full h-full">
      <div className="w-full max-w-2xl h-[70vh] bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 flex flex-col">
        {/* Chat Messages */}
        <div className="flex-grow overflow-y-auto space-y-3 p-2">
          {messages.length === 0 ? (
            <p className="text-center text-gray-500">Start chatting with the Money Split Agent...</p>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-2xl shadow ${
                  msg.sender === "user"
                    ? "bg-[#0052FF] text-white self-end"
                    : "bg-gray-100 dark:bg-gray-700 self-start"
                }`}
              >
                {msg.sender === "agent" ? (
                  <SplitDisplay data={parseJsonFromMessage(msg.text)} />
                ) : (
                  <ReactMarkdown
                    components={{
                      a: props => (
                        <a
                          {...props}
                          className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      ),
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                )}
              </div>
            ))
          )}

          {/* Thinking Indicator */}
          {isThinking && <div className="text-right mr-2 text-gray-500 italic">🤖 Thinking...</div>}

          {/* Invisible div to track the bottom */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Box */}
        <div className="flex items-center space-x-2 mt-2">
          <input
            type="text"
            className="flex-grow p-2 rounded border dark:bg-gray-700 dark:border-gray-600"
            placeholder={"Type your split request (e.g., 'Split dinner of $100 between me, John, and Sarah')..."}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onSendMessage()}
            disabled={isThinking}
          />
          <button
            onClick={onSendMessage}
            className={`px-6 py-2 rounded-full font-semibold transition-all ${
              isThinking
                ? "bg-gray-300 cursor-not-allowed text-gray-500"
                : "bg-[#0052FF] hover:bg-[#003ECF] text-white shadow-md"
            }`}
            disabled={isThinking}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
