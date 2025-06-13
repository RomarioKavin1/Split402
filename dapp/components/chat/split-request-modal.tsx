"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Plus, DollarSign } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { GlowText } from "../glow-text"
import { ColorShiftButton } from "../color-shift-button"
import { AnimatedGradient } from "../animated-gradient"

interface SplitRequestModalProps {
  isOpen: boolean
  onClose: () => void
  isGroup: boolean
}

interface SplitItem {
  id: string
  name: string
  amount: string
  participants: string[]
}

export function SplitRequestModal({ isOpen, onClose, isGroup }: SplitRequestModalProps) {
  const [title, setTitle] = useState("")
  const [splitItems, setSplitItems] = useState<SplitItem[]>([
    { id: "1", name: "Dinner", amount: "120", participants: ["0", "1"] },
  ])

  // Mock data
  const participants = isGroup
    ? [
        { id: "0", name: "You" },
        { id: "1", name: "vitalik.base" },
        { id: "2", name: "alice.base" },
        { id: "3", name: "bob.base" },
      ]
    : [
        { id: "0", name: "You" },
        { id: "1", name: isGroup ? "Group member" : "vitalik.base" },
      ]

  const addItem = () => {
    const newItem = {
      id: Date.now().toString(),
      name: "",
      amount: "",
      participants: ["0", "1"],
    }
    setSplitItems([...splitItems, newItem])
  }

  const removeItem = (id: string) => {
    setSplitItems(splitItems.filter((item) => item.id !== id))
  }

  const updateItem = (id: string, field: keyof SplitItem, value: any) => {
    setSplitItems(splitItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const toggleParticipant = (itemId: string, participantId: string) => {
    setSplitItems(
      splitItems.map((item) => {
        if (item.id === itemId) {
          const participants = item.participants.includes(participantId)
            ? item.participants.filter((id) => id !== participantId)
            : [...item.participants, participantId]
          return { ...item, participants }
        }
        return item
      }),
    )
  }

  const calculateTotal = () => {
    return splitItems.reduce((sum, item) => sum + (Number.parseFloat(item.amount) || 0), 0).toFixed(2)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center">
      <AnimatedGradient className="opacity-30" />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="bg-zinc-900/90 backdrop-blur-md rounded-t-3xl w-full max-h-[90vh] overflow-y-auto border-t border-zinc-800/30"
      >
        <div className="sticky top-0 bg-zinc-900/90 backdrop-blur-md z-10 flex items-center justify-between p-6 border-b border-zinc-800/50">
          <h2 className="text-lg font-medium">
            <GlowText color="rgba(0, 206, 209, 0.7)">Create Split Request</GlowText>
          </h2>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-zinc-800/50">
              <X className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>

        <div className="p-6 space-y-8">
          <div className="space-y-3">
            <Label htmlFor="title" className="text-sm text-zinc-400 font-light">
              Title
            </Label>
            <Input
              id="title"
              placeholder="e.g. Dinner at Italian Restaurant"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-zinc-800/50 backdrop-blur-sm border-zinc-700/50 rounded-xl h-12 focus-visible:ring-blue-400/20"
            />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">
                <GlowText color="rgba(138, 43, 226, 0.7)">Items</GlowText>
              </h3>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="text-xs border-zinc-700/50 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-xl"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Item
                </Button>
              </motion.div>
            </div>

            <AnimatePresence>
              {splitItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  className="space-y-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-blue-500/10"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">
                      <GlowText color="rgba(65, 105, 225, 0.7)">Item {index + 1}</GlowText>
                    </h4>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="h-6 w-6 p-0 text-zinc-400 hover:text-white rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`item-name-${item.id}`} className="text-xs text-zinc-400 font-light">
                        Name
                      </Label>
                      <Input
                        id={`item-name-${item.id}`}
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, "name", e.target.value)}
                        className="bg-zinc-900/50 border-zinc-700/50 h-10 text-sm rounded-xl mt-1 focus-visible:ring-blue-400/20"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`item-amount-${item.id}`} className="text-xs text-zinc-400 font-light">
                        Amount
                      </Label>
                      <div className="relative mt-1">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-teal-400" />
                        <Input
                          id={`item-amount-${item.id}`}
                          type="number"
                          placeholder="0.00"
                          value={item.amount}
                          onChange={(e) => updateItem(item.id, "amount", e.target.value)}
                          className="bg-zinc-900/50 border-zinc-700/50 pl-8 h-10 text-sm rounded-xl focus-visible:ring-blue-400/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-zinc-400 font-light">Split with</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {participants.map((participant) => (
                        <motion.button
                          key={participant.id}
                          onClick={() => toggleParticipant(item.id, participant.id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`text-xs py-1.5 px-3 rounded-full transition-colors ${
                            item.participants.includes(participant.id)
                              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                              : "bg-zinc-700/50 text-zinc-300"
                          }`}
                        >
                          {participant.name}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="pt-6 border-t border-zinc-800/50">
            <div className="flex justify-between items-center mb-6">
              <span className="font-medium">Total</span>
              <span className="font-medium text-lg">
                <GlowText color="rgba(0, 206, 209, 0.7)">${calculateTotal()}</GlowText>
              </span>
            </div>

            <ColorShiftButton onClick={onClose} variant="primary">
              Send Split Request
            </ColorShiftButton>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
