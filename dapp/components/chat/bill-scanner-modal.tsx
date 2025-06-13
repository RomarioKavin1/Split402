"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Camera, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { GlowText } from "../glow-text"
import { ColorShiftButton } from "../color-shift-button"
import { AnimatedGradient } from "../animated-gradient"

interface BillScannerModalProps {
  isOpen: boolean
  onClose: () => void
}

export function BillScannerModal({ isOpen, onClose }: BillScannerModalProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)
  const [scannedItems, setScannedItems] = useState<Array<{ name: string; price: number }>>([])
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (isOpen) {
      startCamera()
    }

    return () => {
      stopCamera()
    }
  }, [isOpen])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error("Error accessing camera:", err)
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const scanBill = () => {
    setIsScanning(true)

    // Simulate OCR processing
    setTimeout(() => {
      setIsScanning(false)
      setHasScanned(true)
      setScannedItems([
        { name: "Pasta Carbonara", price: 16.99 },
        { name: "Margherita Pizza", price: 14.5 },
        { name: "Caesar Salad", price: 9.99 },
        { name: "Tiramisu", price: 7.5 },
        { name: "Sparkling Water", price: 3.99 },
      ])
    }, 2000)
  }

  const handleClose = () => {
    stopCamera()
    onClose()
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
        className="bg-zinc-900/90 backdrop-blur-md rounded-3xl w-[90%] max-w-md max-h-[80vh] overflow-hidden flex flex-col border border-zinc-800/30"
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-800/50">
          <h2 className="text-lg font-medium">
            <GlowText color="rgba(65, 105, 225, 0.7)">Scan Receipt</GlowText>
          </h2>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full hover:bg-zinc-800/50">
              <X className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!hasScanned ? (
            <div className="relative">
              <div className="aspect-[3/4] bg-black relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  onCanPlay={() => videoRef.current?.play()}
                />

                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{
                      boxShadow: [
                        "0 0 0 rgba(65, 105, 225, 0.4)",
                        "0 0 20px rgba(65, 105, 225, 0.6)",
                        "0 0 0 rgba(65, 105, 225, 0.4)",
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "easeInOut",
                    }}
                    className="border-2 border-blue-500 w-[80%] h-[60%] rounded-lg flex items-center justify-center"
                  >
                    {isScanning && (
                      <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>

              <div className="p-6 flex justify-center">
                <ColorShiftButton onClick={scanBill} disabled={isScanning} variant="secondary">
                  {isScanning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      Scan Receipt
                    </>
                  )}
                </ColorShiftButton>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              <h3 className="font-medium">
                <GlowText color="rgba(0, 206, 209, 0.7)">Scanned Items</GlowText>
              </h3>

              <div className="space-y-3">
                {scannedItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-blue-500/10 rounded-xl"
                  >
                    <span className="font-light">{item.name}</span>
                    <span className="font-medium text-teal-400">${item.price.toFixed(2)}</span>
                  </motion.div>
                ))}
              </div>

              <div className="pt-6 border-t border-zinc-800/50 flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="font-medium text-lg">
                  <GlowText color="rgba(0, 206, 209, 0.7)">
                    ${scannedItems.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                  </GlowText>
                </span>
              </div>

              <ColorShiftButton onClick={handleClose} variant="primary">
                Create Split Request
              </ColorShiftButton>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
