"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface AnimatedBlobProps {
  className?: string
  color?: string
}

export function AnimatedBlob({ className = "", color = "rgba(138, 43, 226, 0.1)" }: AnimatedBlobProps) {
  const [path, setPath] = useState("")

  useEffect(() => {
    // Generate random blob path
    const generateBlobPath = () => {
      const size = 400
      const points = 8
      const center = size / 2
      const angleStep = (Math.PI * 2) / points
      const radiusMin = size * 0.3
      const radiusMax = size * 0.4

      let pathData = `M ${center + radiusMin * Math.cos(0)} ${center + radiusMin * Math.sin(0)}`

      for (let i = 1; i <= points; i++) {
        const angle = i * angleStep
        const radius = radiusMin + Math.random() * (radiusMax - radiusMin)
        const x = center + radius * Math.cos(angle)
        const y = center + radius * Math.sin(angle)

        pathData += ` L ${x} ${y}`
      }

      pathData += " Z"
      return pathData
    }

    setPath(generateBlobPath())

    const interval = setInterval(() => {
      setPath(generateBlobPath())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`absolute pointer-events-none ${className}`}>
      <svg width="400" height="400" viewBox="0 0 400 400">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <motion.path
          d={path}
          initial={{ opacity: 0.7 }}
          animate={{
            opacity: [0.5, 0.7, 0.5],
            scale: [1, 1.05, 1],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
          fill={color}
          filter="url(#glow)"
        />
      </svg>
    </div>
  )
}
