"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

interface GlowTextProps {
  children: ReactNode
  className?: string
  color?: string
}

export function GlowText({ children, className = "", color = "rgba(138, 43, 226, 0.7)" }: GlowTextProps) {
  return (
    <motion.span
      className={`relative inline-block ${className}`}
      animate={{
        textShadow: [`0 0 5px ${color}`, `0 0 10px ${color}`, `0 0 5px ${color}`],
      }}
      transition={{
        duration: 2,
        repeat: Number.POSITIVE_INFINITY,
        repeatType: "reverse",
      }}
    >
      {children}
    </motion.span>
  )
}
