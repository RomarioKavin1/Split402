"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Check, Loader2, X } from "lucide-react"
import { AnimatedBackground } from "./animated-background"
import { AnimatedBlob } from "./animated-blob"
import { AnimatedGradient } from "./animated-gradient"
import { GlowText } from "./glow-text"
import { ColorShiftButton } from "./color-shift-button"

export function RegistrationPage() {
  const router = useRouter()
  const [baseName, setBaseName] = useState("")
  const [isChecking, setIsChecking] = useState(false)
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [isClaiming, setIsClaiming] = useState(false)

  const handleCheck = () => {
    if (!baseName) return

    setIsChecking(true)
    // Simulate availability check
    setTimeout(() => {
      setIsChecking(false)
      setIsAvailable(baseName.length > 3)
    }, 1000)
  }

  const handleClaim = () => {
    if (!baseName || !isAvailable) return

    setIsClaiming(true)
    // Simulate claiming process
    setTimeout(() => {
      setIsClaiming(false)
      router.push("/app")
    }, 2000)
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white overflow-hidden">
      <AnimatedBackground />
      <AnimatedGradient />
      <AnimatedBlob className="top-20 right-10 opacity-30" color="rgba(65, 105, 225, 0.15)" />
      <AnimatedBlob className="bottom-20 left-10 opacity-20" color="rgba(138, 43, 226, 0.15)" />

      <header className="p-6 flex items-center relative z-10">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/")}
            className="text-zinc-400 hover:text-blue-400 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </motion.div>
      </header>

      <main className="flex-1 flex flex-col p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md mx-auto w-full space-y-10"
        >
          <div className="space-y-2">
            <motion.h1
              className="text-2xl font-medium"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <GlowText color="rgba(0, 206, 209, 0.7)">Claim your Base name</GlowText>
            </motion.h1>
            <motion.p
              className="text-zinc-400 text-sm font-light"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              Your Base name will be your identity in Split402
            </motion.p>
          </div>

          <motion.div
            className="space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            <div className="space-y-4">
              <label htmlFor="basename" className="text-sm text-zinc-400 font-light">
                Enter your Base name
              </label>
              <div className="flex space-x-3">
                <Input
                  id="basename"
                  placeholder="e.g. satoshi"
                  value={baseName}
                  onChange={(e) => {
                    setBaseName(e.target.value)
                    setIsAvailable(null)
                  }}
                  className="bg-zinc-900/50 backdrop-blur-sm border-zinc-800/50 focus-visible:ring-blue-400/20 rounded-xl h-12"
                />
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={handleCheck}
                    disabled={!baseName || isChecking}
                    variant="outline"
                    className="border-zinc-800/50 text-zinc-400 hover:text-blue-400 rounded-xl h-12"
                  >
                    {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
                  </Button>
                </motion.div>
              </div>

              <AnimatePresence mode="wait">
                {isAvailable !== null && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p
                      className={`text-xs ${isAvailable ? "text-teal-400" : "text-red-400"} font-light flex items-center`}
                    >
                      {isAvailable ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                            Available! You can claim this name.
                          </motion.span>
                        </>
                      ) : (
                        <>
                          <X className="h-3 w-3 mr-1" />
                          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                            This name is already taken. Try another one.
                          </motion.span>
                        </>
                      )}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ColorShiftButton onClick={handleClaim} disabled={!isAvailable || isClaiming} variant="primary">
              {isClaiming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Claiming...
                </>
              ) : (
                "Claim Base Name"
              )}
            </ColorShiftButton>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
