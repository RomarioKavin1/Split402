"use client"

import { motion } from "framer-motion"

interface PulseEffectProps {
  className?: string
  size?: number
  delay?: number
  color?: string
}

export function PulseEffect({
  className = "",
  size = 50,
  delay = 0,
  color = "rgba(255, 255, 255, 0.1)",
}: PulseEffectProps) {
  return (
    <div className={`relative ${className}`}>
      <motion.div
        className="absolute rounded-full"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{
          opacity: [0, 0.5, 0],
          scale: [0.5, 1.5, 2],
        }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          delay,
          ease: "easeOut",
        }}
        style={{
          width: size,
          height: size,
          left: `calc(50% - ${size / 2}px)`,
          top: `calc(50% - ${size / 2}px)`,
          backgroundColor: color,
        }}
      />
    </div>
  )
}
