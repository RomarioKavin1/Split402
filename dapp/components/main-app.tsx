"use client";

import { useState, useEffect } from "react";
import { ChatInterface } from "./chat/chat-interface";
import { Navigation } from "./navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useDisconnect } from "wagmi";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

type View = "chats" | "groups" | "profile";

export function MainApp() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [activeView, setActiveView] = useState<View>("chats");
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-zinc-950 text-white items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950" />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          className="text-2xl font-medium"
        >
          <span className="text-blue-400">Split</span>
          <span className="text-purple-400">402</span>
        </motion.div>
      </div>
    );
  }

  const handleDisconnect = () => {
    disconnect();
    router.push("/");
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950 -z-10" />

      {activeChatId ? (
        <ChatInterface
          chatId={activeChatId}
          onBack={() => setActiveChatId(null)}
        />
      ) : (
        <>
          <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="px-6 py-4 flex items-center justify-between bg-zinc-900/50 border-b border-zinc-800/50 relative z-10"
          >
            <motion.h1
              className="text-xl font-medium"
              animate={{
                scale: [1, 1.03, 1],
              }}
              transition={{
                duration: 4,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            >
              <span className="text-blue-400">Split</span>
              <span className="text-purple-400">402</span>
            </motion.h1>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="flex space-x-2"
            >
              <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-400">
                {address?.slice(2, 4).toUpperCase()}
              </div>
            </motion.div>
          </motion.header>

          <main className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {activeView === "chats" && (
                <motion.div
                  key="chats"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <ChatList onSelectChat={setActiveChatId} />
                </motion.div>
              )}

              {activeView === "groups" && (
                <motion.div
                  key="groups"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <GroupList onSelectGroup={setActiveChatId} />
                </motion.div>
              )}

              {activeView === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full p-6"
                >
                  <h2 className="text-xl font-medium mb-6 text-blue-400">
                    Profile
                  </h2>
                  <div className="space-y-6">
                    <motion.div
                      className="flex items-center space-x-4"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-medium text-zinc-400">
                        {address?.slice(2, 4).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-medium text-zinc-200">
                          Wallet Address
                        </h3>
                        <p className="text-xs text-zinc-500 font-light">
                          {address}
                        </p>
                      </div>
                    </motion.div>

                    <div className="pt-4">
                      <button
                        onClick={handleDisconnect}
                        className="w-full px-4 py-2 bg-zinc-800 text-zinc-200 rounded-lg font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        <span>Disconnect Wallet</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          <Navigation activeView={activeView} setActiveView={setActiveView} />
        </>
      )}
    </div>
  );
}

function ChatList({ onSelectChat }: { onSelectChat: (id: string) => void }) {
  const chats = [
    {
      id: "1",
      name: "vitalik.base",
      lastMessage: "Let's split the dinner bill",
      time: "2m ago",
    },
    {
      id: "2",
      name: "alice.base",
      lastMessage: "I sent you 0.01 ETH",
      time: "1h ago",
    },
    {
      id: "3",
      name: "bob.base",
      lastMessage: "Can you pay for the tickets?",
      time: "3h ago",
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        <h2 className="text-xl font-medium mb-6 text-blue-400">Messages</h2>
        <div className="space-y-4">
          {chats.map((chat) => (
            <motion.button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className="w-full text-left p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-400">
                  {chat.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-zinc-200 truncate">
                      {chat.name}
                    </h3>
                    <span className="text-xs text-zinc-500">{chat.time}</span>
                  </div>
                  <p className="text-sm text-zinc-400 truncate">
                    {chat.lastMessage}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

function GroupList({ onSelectGroup }: { onSelectGroup: (id: string) => void }) {
  const groups = [
    {
      id: "g1",
      name: "Weekend Trip",
      members: 5,
      lastMessage: "Let's split the hotel bill",
      time: "5m ago",
    },
    {
      id: "g2",
      name: "Roommates",
      members: 3,
      lastMessage: "Rent due next week",
      time: "2h ago",
    },
    {
      id: "g3",
      name: "Dinner Club",
      members: 8,
      lastMessage: "Who's in for Friday?",
      time: "1d ago",
    },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        <h2 className="text-xl font-medium mb-6 text-purple-400">Groups</h2>
        <div className="space-y-4">
          {groups.map((group) => (
            <motion.button
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              className="w-full text-left p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-400">
                  {group.members}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-zinc-200 truncate">
                      {group.name}
                    </h3>
                    <span className="text-xs text-zinc-500">{group.time}</span>
                  </div>
                  <p className="text-sm text-zinc-400 truncate">
                    {group.lastMessage}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
