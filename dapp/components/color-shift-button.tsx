"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import type { ReactNode } from "react"

interface ColorShiftButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
  variant?: "primary" | "secondary" | "outline"
}

export function ColorShiftButton({
  children,
  onClick,
  disabled = false,
  className = "",
  variant = "primary",
}: ColorShiftButtonProps) {
  const getBackgroundClass = () => {
    switch (variant) {
      case "primary":
        return "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white"
      case "secondary":
        return "bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 text-white"
      case "outline":
        return "bg-transparent border border-zinc-700 text-white"
      default:
        return "bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white"
    }
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`rounded-xl overflow-hidden ${disabled ? "opacity-50" : ""}`}
    >
      <Button
        onClick={onClick}
        disabled={disabled}
        className={`w-full py-6 font-medium text-sm relative overflow-hidden ${getBackgroundClass()} ${className}`}
      >
        {children}
        {!disabled && variant !== "outline" && (
          <motion.div
            className="absolute inset-0 bg-white/10"
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: "100%", opacity: 0.5 }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 1.5,
              ease: "easeInOut",
              repeatDelay: 1,
            }}
          />
        )}
      </Button>
    </motion.div>
  )
}
