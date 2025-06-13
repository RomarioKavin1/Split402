"use client"

import { useState, useEffect } from "react"
import { ChatInterface } from "./chat/chat-interface"
import { Navigation } from "./navigation"
import { motion, AnimatePresence } from "framer-motion"
import { AnimatedBackground } from "./animated-background"
import { AnimatedGradient } from "./animated-gradient"
import { GlowText } from "./glow-text"

type View = "chats" | "groups" | "profile"

export function MainApp() {
  const [activeView, setActiveView] = useState<View>("chats")
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-black text-white items-center justify-center">
        <AnimatedBackground />
        <AnimatedGradient />
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
          <GlowText color="rgba(138, 43, 226, 0.7)">Split</GlowText>
          <GlowText color="rgba(0, 206, 209, 0.7)">402</GlowText>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      <AnimatedBackground className="opacity-20" />
      <AnimatedGradient />

      {activeChatId ? (
        <ChatInterface chatId={activeChatId} onBack={() => setActiveChatId(null)} />
      ) : (
        <>
          <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="px-6 py-4 flex items-center justify-between backdrop-blur-md bg-zinc-950/80 border-b border-zinc-900/50"
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
              <GlowText color="rgba(138, 43, 226, 0.7)">Split</GlowText>
              <GlowText color="rgba(0, 206, 209, 0.7)">402</GlowText>
            </motion.h1>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="flex space-x-2">
              {/* Profile avatar placeholder */}
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-xs font-medium">
                S
              </div>
            </motion.div>
          </motion.header>

          <main className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {activeView === "chats" && (
                <motion.div
                  key="chats"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <ChatList onSelectChat={setActiveChatId} />
                </motion.div>
              )}

              {activeView === "groups" && (
                <motion.div
                  key="groups"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <GroupList onSelectGroup={setActiveChatId} />
                </motion.div>
              )}

              {activeView === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full p-6"
                >
                  <h2 className="text-xl font-medium mb-6">
                    <GlowText color="rgba(0, 206, 209, 0.7)">Profile</GlowText>
                  </h2>
                  <div className="space-y-6">
                    <motion.div
                      className="flex items-center space-x-4"
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-lg font-medium">
                        S
                      </div>
                      <div>
                        <h3 className="font-medium">satoshi.base</h3>
                        <p className="text-xs text-zinc-500 font-light">0x1a2...3b4c</p>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          <Navigation activeView={activeView} setActiveView={setActiveView} />
        </>
      )}
    </div>
  )
}

function ChatList({ onSelectChat }: { onSelectChat: (id: string) => void }) {
  const chats = [
    {
      id: "1",
      name: "vitalik.base",
      lastMessage: "Let's split the dinner bill",
      time: "2m ago",
      color: "from-blue-500 to-purple-500",
    },
    {
      id: "2",
      name: "alice.base",
      lastMessage: "I sent you 0.01 ETH",
      time: "1h ago",
      color: "from-purple-500 to-pink-500",
    },
    {
      id: "3",
      name: "bob.base",
      lastMessage: "Can you pay for the tickets?",
      time: "3h ago",
      color: "from-teal-500 to-blue-500",
    },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        <h2 className="text-xl font-medium mb-6">
          <GlowText color="rgba(65, 105, 225, 0.7)">Messages</GlowText>
        </h2>
        <div className="space-y-3">
          {chats.map((chat, index) => (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => onSelectChat(chat.id)}
              className="p-4 rounded-2xl bg-zinc-900/50 backdrop-blur-sm hover:bg-zinc-800/50 cursor-pointer transition-colors border border-zinc-800/30"
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`h-10 w-10 rounded-full bg-gradient-to-r ${chat.color} flex items-center justify-center text-sm font-medium`}
                >
                  {chat.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <p className="font-medium truncate">{chat.name}</p>
                    <p className="text-xs text-zinc-500 font-light">{chat.time}</p>
                  </div>
                  <p className="text-sm text-zinc-400 truncate font-light">{chat.lastMessage}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function GroupList({ onSelectGroup }: { onSelectGroup: (id: string) => void }) {
  const groups = [
    {
      id: "g1",
      name: "Weekend Trip",
      members: 5,
      lastMessage: "Let's split the hotel bill",
      time: "5m ago",
      color: "from-blue-500 to-purple-500",
    },
    {
      id: "g2",
      name: "Roommates",
      members: 3,
      lastMessage: "Rent due next week",
      time: "2h ago",
      color: "from-purple-500 to-pink-500",
    },
    {
      id: "g3",
      name: "Dinner Club",
      members: 8,
      lastMessage: "Who's in for Friday?",
      time: "1d ago",
      color: "from-teal-500 to-blue-500",
    },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        <h2 className="text-xl font-medium mb-6">
          <GlowText color="rgba(138, 43, 226, 0.7)">Groups</GlowText>
        </h2>
        <div className="space-y-3">
          {groups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => onSelectGroup(group.id)}
              className="p-4 rounded-2xl bg-zinc-900/50 backdrop-blur-sm hover:bg-zinc-800/50 cursor-pointer transition-colors border border-zinc-800/30"
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`h-10 w-10 rounded-full bg-gradient-to-r ${group.color} flex items-center justify-center text-xs font-medium`}
                >
                  {group.members}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <p className="font-medium truncate">{group.name}</p>
                    <p className="text-xs text-zinc-500 font-light">{group.time}</p>
                  </div>
                  <p className="text-sm text-zinc-400 truncate font-light">{group.lastMessage}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
