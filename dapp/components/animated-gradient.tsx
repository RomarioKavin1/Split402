"use client"

import { useEffect, useRef } from "react"

interface AnimatedGradientProps {
  className?: string
}

export function AnimatedGradient({ className = "" }: AnimatedGradientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    let gradient: CanvasGradient
    let hue = 240 // Start with blue hue

    const createGradient = () => {
      gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width)
      gradient.addColorStop(0, `hsla(${hue}, 70%, 10%, 0.4)`)
      gradient.addColorStop(0.5, `hsla(${hue + 30}, 60%, 5%, 0.3)`)
      gradient.addColorStop(1, `hsla(${hue + 60}, 50%, 3%, 0.2)`)
    }

    const animate = () => {
      // Slowly change hue
      hue = (hue + 0.1) % 360

      createGradient()

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      requestAnimationFrame(animate)
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
      createGradient()
    }

    window.addEventListener("resize", handleResize)
    createGradient()
    animate()

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} className={`fixed inset-0 pointer-events-none ${className}`} style={{ zIndex: -10 }} />
}
