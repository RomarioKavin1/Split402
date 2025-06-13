"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Send, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { GlowText } from "../glow-text"
import { AnimatedGradient } from "../animated-gradient"

interface AIAssistantModalProps {
  isOpen: boolean
  onClose: () => void
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export function AIAssistantModal({ isOpen, onClose }: AIAssistantModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hi! I'm your Split402 AI assistant. I can help you split bills. Just describe the situation, and I'll create a fair split for you.",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSend = () => {
    if (!input.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateAIResponse(input),
      }

      setMessages((prev) => [...prev, aiResponse])
      setIsLoading(false)
    }, 1500)
  }

  const generateAIResponse = (userInput: string) => {
    if (userInput.toLowerCase().includes("dinner") || userInput.toLowerCase().includes("restaurant")) {
      return (
        "I've analyzed your dinner bill. Here's how I'd split it:\n\n" +
        "- Main courses: $78.50 (split equally between 3 people)\n" +
        "- Wine: $45.00 (split between 2 people who drank)\n" +
        "- Desserts: $24.00 (split based on individual orders)\n\n" +
        "Total per person:\n" +
        "- Person 1: $47.17\n" +
        "- Person 2: $69.67\n" +
        "- Person 3: $30.67\n\n" +
        "Would you like me to create this split request for you?"
      )
    } else if (userInput.toLowerCase().includes("trip") || userInput.toLowerCase().includes("vacation")) {
      return (
        "For your weekend trip expenses, here's a fair split:\n\n" +
        "- Accommodation: $450 (split equally)\n" +
        "- Car rental: $180 (driver pays extra 10%)\n" +
        "- Food: $320 (split based on meal attendance)\n" +
        "- Activities: $250 (split based on participation)\n\n" +
        "Total per person:\n" +
        "- You: $275.50\n" +
        "- Friend 1: $312.00\n" +
        "- Friend 2: $262.50\n" +
        "- Friend 3: $350.00\n\n" +
        "Should I create these splits for you?"
      )
    } else {
      return "I understand you need help splitting some expenses. Could you provide more details about what you paid for, who was involved, and any special considerations for the split?"
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <AnimatedGradient className="opacity-30" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="bg-zinc-900/90 backdrop-blur-md rounded-3xl w-[90%] max-w-md h-[80vh] flex flex-col border border-zinc-800/30"
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-800/50">
          <div className="flex items-center space-x-3">
            <div className="h-6 w-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-xs font-medium">AI</span>
            </div>
            <h2 className="font-medium">
              <GlowText color="rgba(138, 43, 226, 0.7)">Split Assistant</GlowText>
            </h2>
          </div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-zinc-800/50">
              <X className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.2 }}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                className={`max-w-[80%] rounded-2xl p-4 ${
                  message.role === "user"
                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-blue-500/10 text-white"
                    : "bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/10 text-white"
                }`}
              >
                <p className="whitespace-pre-line font-light">{message.content}</p>
              </motion.div>
            </motion.div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/10 rounded-2xl p-4">
                <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 border-t border-zinc-800/50">
          <div className="flex space-x-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about splitting bills..."
              className="bg-zinc-900/50 border-zinc-800/50 focus-visible:ring-purple-400/20 rounded-full h-12"
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
                disabled={!input.trim() || isLoading}
                className="rounded-full w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
