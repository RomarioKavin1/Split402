"use client"

import { motion } from "framer-motion"
import { GlowText } from "./glow-text"
import { useState } from "react"
import { Check } from "lucide-react"

interface PaymentCardProps {
  amount: string
  recipient: string
  date: string
  status: "pending" | "completed" | "failed"
  onClick?: () => void
}

export function PaymentCard({ amount, recipient, date, status, onClick }: PaymentCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const getStatusColor = () => {
    switch (status) {
      case "pending":
        return "text-yellow-400"
      case "completed":
        return "text-emerald-400"
      case "failed":
        return "text-red-400"
      default:
        return "text-zinc-400"
    }
  }

  const getStatusText = () => {
    switch (status) {
      case "pending":
        return "Pending"
      case "completed":
        return "Completed"
      case "failed":
        return "Failed"
      default:
        return "Unknown"
    }
  }

  const getCardGradient = () => {
    switch (status) {
      case "pending":
        return "from-yellow-500/10 to-orange-500/10 border-yellow-500/10"
      case "completed":
        return "from-emerald-500/10 to-teal-500/10 border-emerald-500/10"
      case "failed":
        return "from-red-500/10 to-pink-500/10 border-red-500/10"
      default:
        return "from-blue-500/10 to-purple-500/10 border-blue-500/10"
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className={`p-4 rounded-xl bg-gradient-to-r ${getCardGradient()} backdrop-blur-sm border cursor-pointer`}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-sm font-light text-zinc-400">To: {recipient}</p>
          <p className="text-lg font-medium">
            <GlowText color="rgba(65, 105, 225, 0.7)">${amount}</GlowText>
          </p>
        </div>
        <div
          className={`h-6 w-6 rounded-full flex items-center justify-center ${
            status === "completed" ? "bg-emerald-500/20" : "bg-zinc-800"
          }`}
        >
          {status === "completed" && <Check className="h-3 w-3 text-emerald-400" />}
        </div>
      </div>
      <div className="flex justify-between items-center mt-3">
        <p className="text-xs text-zinc-500 font-light">{date}</p>
        <p className={`text-xs ${getStatusColor()} font-medium`}>{getStatusText()}</p>
      </div>

      {isHovered && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 pt-3 border-t border-zinc-800/50">
          <p className="text-xs text-zinc-400 font-light">Tap to view details</p>
        </motion.div>
      )}
    </motion.div>
  )
}
