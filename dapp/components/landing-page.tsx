"use client"
import { useRouter } from "next/navigation"
import { useState, useRef } from "react"
import { ConnectWalletButton } from "./connect-wallet-button"
import { motion, useScroll, useTransform, useInView } from "framer-motion"
import { AnimatedBackground } from "./animated-background"
import { AnimatedBlob } from "./animated-blob"
import { AnimatedGradient } from "./animated-gradient"
import { ArrowDown, ArrowRight } from "lucide-react"
import { PulseEffect } from "./pulse-effect"
import { GlowText } from "./glow-text"
import { ColorShiftButton } from "./color-shift-button"

export function LandingPage() {
  const router = useRouter()
  const [isConnecting, setIsConnecting] = useState(false)
  const featuresRef = useRef<HTMLDivElement>(null)
  const featuresSectionRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(featuresSectionRef, { once: false, amount: 0.3 })

  const { scrollYProgress } = useScroll({
    target: featuresRef,
    offset: ["start end", "end start"],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1])
  const y = useTransform(scrollYProgress, [0, 0.5], [50, 0])

  const handleConnect = () => {
    setIsConnecting(true)
    // Simulate wallet connection
    setTimeout(() => {
      setIsConnecting(false)
      router.push("/register")
    }, 1500)
  }

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <AnimatedBackground />
      <AnimatedGradient />

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center p-8">
        <AnimatedBlob className="top-10 right-10 opacity-50" color="rgba(65, 105, 225, 0.15)" />
        <AnimatedBlob className="bottom-20 left-10 opacity-30" color="rgba(138, 43, 226, 0.15)" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center space-y-8 relative z-10"
        >
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
            >
              <h1 className="text-5xl font-medium tracking-tight">
                <GlowText color="rgba(138, 43, 226, 0.7)">Split</GlowText>
                <GlowText color="rgba(0, 206, 209, 0.7)">402</GlowText>
              </h1>
            </motion.div>
            <p className="text-zinc-400 text-lg font-light">Split bills with friends using web3</p>
          </motion.div>

          <div className="flex flex-col items-center space-y-8 max-w-xs mx-auto">
            <p className="text-sm text-zinc-500 font-light">
              Powered by <span className="text-blue-400">x402</span>, <span className="text-purple-400">XMTP</span>, and{" "}
              <span className="text-teal-400">Base</span>
            </p>

            <ConnectWalletButton onClick={handleConnect} isLoading={isConnecting} />
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.5 }}
        >
          <button
            onClick={scrollToFeatures}
            className="flex flex-col items-center text-zinc-500 hover:text-blue-400 transition-colors"
          >
            <span className="text-sm mb-2">Learn more</span>
            <motion.div
              animate={{
                y: [0, 5, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            >
              <ArrowDown className="h-5 w-5" />
            </motion.div>
          </button>
        </motion.div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} className="min-h-screen py-20 px-8">
        <div className="max-w-4xl mx-auto">
          <motion.h2 style={{ opacity, y }} className="text-3xl font-medium mb-16 text-center">
            <GlowText color="rgba(0, 206, 209, 0.7)">Split bills seamlessly</GlowText>
          </motion.h2>

          <div ref={featuresSectionRef} className="space-y-24">
            <Feature
              title="Scan & Split"
              description="Scan receipts with your camera and automatically split expenses with friends"
              isInView={isInView}
              delay={0.2}
              index={0}
              color="rgba(0, 206, 209, 0.2)"
              emoji="📷"
            />

            <Feature
              title="Group Expenses"
              description="Create groups for trips, roommates, or events and track shared expenses"
              isInView={isInView}
              delay={0.4}
              index={1}
              color="rgba(138, 43, 226, 0.2)"
              emoji="👥"
            />

            <Feature
              title="AI Assistant"
              description="Let our AI assistant help you split complex bills with natural language"
              isInView={isInView}
              delay={0.6}
              index={2}
              color="rgba(65, 105, 225, 0.2)"
              emoji="🤖"
            />
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-20 px-8">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, amount: 0.3 }}
            className="relative"
          >
            <div className="relative h-[500px] w-full rounded-3xl overflow-hidden backdrop-blur-sm bg-zinc-900/30 border border-zinc-800/50">
              <div className="absolute inset-0 bg-[url('/placeholder.svg?height=1000&width=500')] bg-cover bg-center opacity-60"></div>

              <PulseEffect className="absolute top-1/4 left-1/4" size={100} delay={0} color="rgba(0, 206, 209, 0.3)" />
              <PulseEffect
                className="absolute bottom-1/3 right-1/3"
                size={80}
                delay={0.5}
                color="rgba(138, 43, 226, 0.3)"
              />
              <PulseEffect className="absolute top-2/3 left-1/2" size={120} delay={1} color="rgba(65, 105, 225, 0.3)" />

              <div className="absolute bottom-8 left-8 right-8 z-20">
                <h3 className="text-xl font-medium mb-2">Ready to get started?</h3>
                <p className="text-sm text-zinc-400 font-light mb-6">
                  Connect your wallet and start splitting bills with crypto
                </p>

                <ColorShiftButton onClick={() => router.push("/register")} variant="secondary">
                  <span>Get Started</span>
                  <motion.div
                    animate={{
                      x: [0, 3, 0],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                    className="ml-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </motion.div>
                </ColorShiftButton>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="py-8 text-center text-xs text-zinc-600 font-light">
        © 2023 Split402. All rights reserved.
      </footer>
    </div>
  )
}

interface FeatureProps {
  title: string
  description: string
  isInView: boolean
  delay: number
  index: number
  color: string
  emoji: string
}

function Feature({ title, description, isInView, delay, index, color, emoji }: FeatureProps) {
  const isEven = index % 2 === 0

  return (
    <motion.div
      initial={{ opacity: 0, x: isEven ? -30 : 30 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: isEven ? -30 : 30 }}
      transition={{ duration: 0.8, delay }}
      className={`flex flex-col ${isEven ? "md:flex-row" : "md:flex-row-reverse"} items-center gap-8`}
    >
      <div className="w-full md:w-1/2">
        <div
          className="aspect-square max-w-[250px] mx-auto rounded-2xl backdrop-blur-sm border border-zinc-800/50 flex items-center justify-center relative overflow-hidden"
          style={{ backgroundColor: color }}
        >
          <PulseEffect size={150} color={color} />
          <motion.div
            animate={{
              rotate: [0, 10, 0, -10, 0],
              scale: [1, 1.05, 1, 1.05, 1],
            }}
            transition={{
              duration: 10,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            className="text-4xl"
          >
            {emoji}
          </motion.div>
        </div>
      </div>

      <div className="w-full md:w-1/2 space-y-4">
        <h3 className="text-2xl font-medium">
          <GlowText color={color.replace("0.2", "0.7")}>{title}</GlowText>
        </h3>
        <p className="text-zinc-400 font-light">{description}</p>
      </div>
    </motion.div>
  )
}
