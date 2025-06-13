"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { PaymentCard } from "./payment-card"
import { GlowText } from "./glow-text"
import { X } from "lucide-react"
import { Button } from "./ui/button"

interface PaymentHistoryProps {
  isOpen: boolean
  onClose: () => void
}

export function PaymentHistory({ isOpen, onClose }: PaymentHistoryProps) {
  const [selectedPayment, setSelectedPayment] = useState<number | null>(null)

  const payments = [
    {
      id: 1,
      amount: "45.50",
      recipient: "vitalik.base",
      date: "Today, 2:30 PM",
      status: "completed" as const,
      description: "Dinner at Italian Restaurant",
      items: [
        { name: "Pasta Carbonara", price: 16.99 },
        { name: "Tiramisu", price: 7.5 },
        { name: "Wine (shared)", price: 21.01 },
      ],
    },
    {
      id: 2,
      amount: "120.00",
      recipient: "Weekend Trip Group",
      date: "Yesterday, 10:15 AM",
      status: "pending" as const,
      description: "Hotel reservation",
      items: [
        { name: "Room booking", price: 360.0 },
        { name: "Split 3 ways", price: 120.0 },
      ],
    },
    {
      id: 3,
      amount: "12.75",
      recipient: "alice.base",
      date: "May 15, 9:45 AM",
      status: "failed" as const,
      description: "Coffee and snacks",
      items: [
        { name: "Coffee", price: 4.5 },
        { name: "Sandwich", price: 8.25 },
      ],
    },
    {
      id: 4,
      amount: "35.00",
      recipient: "bob.base",
      date: "May 12, 7:20 PM",
      status: "completed" as const,
      description: "Movie tickets",
      items: [
        { name: "Movie tickets x2", price: 24.0 },
        { name: "Popcorn (shared)", price: 11.0 },
      ],
    },
  ]

  if (!isOpen) return null

  const selectedPaymentDetails = selectedPayment !== null ? payments.find((p) => p.id === selectedPayment) : null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="bg-zinc-900/90 backdrop-blur-md rounded-3xl w-[90%] max-w-md max-h-[80vh] overflow-hidden flex flex-col border border-zinc-800/30"
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-800/50">
          <h2 className="text-lg font-medium">
            <GlowText color="rgba(65, 105, 225, 0.7)">Payment History</GlowText>
          </h2>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-zinc-800/50">
              <X className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {selectedPayment === null ? (
              <motion.div
                key="payment-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {payments.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    amount={payment.amount}
                    recipient={payment.recipient}
                    date={payment.date}
                    status={payment.status}
                    onClick={() => setSelectedPayment(payment.id)}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="payment-details"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center space-x-3">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedPayment(null)}
                    className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </motion.div>
                  <h3 className="font-medium">Payment Details</h3>
                </div>

                {selectedPaymentDetails && (
                  <div className="space-y-6">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-blue-500/10">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-zinc-400 font-light">Amount</p>
                          <p className="text-2xl font-medium">
                            <GlowText color="rgba(65, 105, 225, 0.7)">${selectedPaymentDetails.amount}</GlowText>
                          </p>
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            selectedPaymentDetails.status === "completed"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : selectedPaymentDetails.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {selectedPaymentDetails.status.charAt(0).toUpperCase() +
                            selectedPaymentDetails.status.slice(1)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium">Details</p>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <p className="text-sm text-zinc-400 font-light">To</p>
                          <p className="text-sm font-light">{selectedPaymentDetails.recipient}</p>
                        </div>
                        <div className="flex justify-between">
                          <p className="text-sm text-zinc-400 font-light">Date</p>
                          <p className="text-sm font-light">{selectedPaymentDetails.date}</p>
                        </div>
                        <div className="flex justify-between">
                          <p className="text-sm text-zinc-400 font-light">Description</p>
                          <p className="text-sm font-light">{selectedPaymentDetails.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-medium">Items</p>
                      <div className="space-y-2">
                        {selectedPaymentDetails.items.map((item, index) => (
                          <div
                            key={index}
                            className="flex justify-between p-3 bg-zinc-800/50 backdrop-blur-sm rounded-lg"
                          >
                            <p className="text-sm font-light">{item.name}</p>
                            <p className="text-sm font-medium">${item.price.toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
