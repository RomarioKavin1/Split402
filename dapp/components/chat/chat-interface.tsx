"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Camera, Send, Plus, DollarSign, Clock } from "lucide-react"
import { SplitRequestModal } from "./split-request-modal"
import { BillScannerModal } from "./bill-scanner-modal"
import { AIAssistantModal } from "./ai-assistant-modal"
import { motion, AnimatePresence } from "framer-motion"
import { AnimatedBackground } from "../animated-background"
import { AnimatedGradient } from "../animated-gradient"
import { GlowText } from "../glow-text"
import { PaymentHistory } from "../payment-history"

interface ChatInterfaceProps {
  chatId: string
  onBack: () => void
}

export function ChatInterface({ chatId, onBack }: ChatInterfaceProps) {
  const [message, setMessage] = useState("")
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [showScannerModal, setShowScannerModal] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [showPaymentHistory, setShowPaymentHistory] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Mock data
  const isGroup = chatId.startsWith("g")
  const chatName = isGroup
    ? chatId === "g1"
      ? "Weekend Trip"
      : chatId === "g2"
        ? "Roommates"
        : "Dinner Club"
    : chatId === "1"
      ? "vitalik.base"
      : chatId === "2"
        ? "alice.base"
        : "bob.base"

  const [messages, setMessages] = useState([
    { id: 1, sender: "other", content: "Hey, how's it going?", time: "10:30 AM" },
    { id: 2, sender: "me", content: "Good! Just got back from the restaurant.", time: "10:32 AM" },
    { id: 3, sender: "other", content: "Nice! How was it?", time: "10:33 AM" },
    { id: 4, sender: "me", content: "Great! We should split the bill though.", time: "10:35 AM" },
    { id: 5, sender: "other", content: "Sure, how much do I owe you?", time: "10:36 AM" },
  ])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSend = () => {
    if (!message.trim()) return

    // Add the new message
    const newMessage = {
      id: Date.now(),
      sender: "me",
      content: message,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    }

    setMessages([...messages, newMessage])
    setMessage("")

    // Simulate reply after a delay
    setTimeout(() => {
      const replyMessage = {
        id: Date.now() + 1,
        sender: "other",
        content: "I'll check the receipt and let you know!",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages((prev) => [...prev, replyMessage])
    }, 2000)
  }

  return (
    <div className="flex flex-col h-screen bg-black">
      <AnimatedBackground className="opacity-20" />
      <AnimatedGradient />

      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="px-6 py-4 backdrop-blur-md bg-zinc-950/80 flex items-center justify-between border-b border-zinc-900/50"
      >
        <div className="flex items-center space-x-3">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="text-zinc-400 hover:text-blue-400 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </motion.div>
          <div className="flex items-center space-x-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-sm font-medium"
            >
              {chatName.charAt(0).toUpperCase()}
            </motion.div>
            <div>
              <motion.h2
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="font-medium"
              >
                <GlowText color="rgba(65, 105, 225, 0.7)">{chatName}</GlowText>
              </motion.h2>
              {isGroup && (
                <motion.p
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="text-xs text-zinc-500 font-light"
                >
                  5 members
                </motion.p>
              )}
            </div>
          </div>
        </div>

        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowPaymentHistory(true)}
            className="text-zinc-400 hover:text-blue-400 rounded-full"
          >
            <Clock className="h-5 w-5" />
          </Button>
        </motion.div>
      </motion.header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => (
          <motion.div
            key={msg.id}
            className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              className={`max-w-[80%] rounded-2xl p-4 ${
                msg.sender === "me"
                  ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-blue-500/10 text-white"
                  : "bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/30 text-white"
              }`}
            >
              <p className="font-light">{msg.content}</p>
              <p className="text-xs text-zinc-500 text-right mt-1 font-light">{msg.time}</p>
            </motion.div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="p-4 backdrop-blur-md bg-zinc-950/80 border-t border-zinc-900/50"
      >
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flex space-x-3 mb-4"
            >
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full w-10 h-10 border-zinc-800 bg-gradient-to-r from-green-500/20 to-teal-500/20 hover:bg-zinc-800/50"
                  onClick={() => {
                    setShowActions(false)
                    setShowSplitModal(true)
                  }}
                >
                  <DollarSign className="h-4 w-4 text-teal-400" />
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full w-10 h-10 border-zinc-800 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:bg-zinc-800/50"
                  onClick={() => {
                    setShowActions(false)
                    setShowScannerModal(true)
                  }}
                >
                  <Camera className="h-4 w-4 text-blue-400" />
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  size="icon"
                  variant="outline"
                  className="rounded-full w-10 h-10 border-zinc-800 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:bg-zinc-800/50"
                  onClick={() => {
                    setShowActions(false)
                    setShowAIModal(true)
                  }}
                >
                  <span className="text-xs font-medium text-purple-400">AI</span>
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex space-x-3">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              size="icon"
              variant="outline"
              className="rounded-full w-10 h-10 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/50"
              onClick={() => setShowActions(!showActions)}
            >
              <motion.div animate={{ rotate: showActions ? 45 : 0 }} transition={{ duration: 0.2 }}>
                <Plus className="h-4 w-4" />
              </motion.div>
            </Button>
          </motion.div>

          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message"
            className="bg-zinc-900/50 border-zinc-800 focus-visible:ring-blue-400/20 rounded-full h-10"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />

          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!message.trim()}
              className="rounded-full w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {showSplitModal && (
        <SplitRequestModal isOpen={showSplitModal} onClose={() => setShowSplitModal(false)} isGroup={isGroup} />
      )}

      {showScannerModal && <BillScannerModal isOpen={showScannerModal} onClose={() => setShowScannerModal(false)} />}

      {showAIModal && <AIAssistantModal isOpen={showAIModal} onClose={() => setShowAIModal(false)} />}

      {showPaymentHistory && (
        <PaymentHistory isOpen={showPaymentHistory} onClose={() => setShowPaymentHistory(false)} />
      )}
    </div>
  )
}
