"use client"

import { MessageSquare, Users, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

type View = "chats" | "groups" | "profile"

interface NavigationProps {
  activeView: View
  setActiveView: (view: View) => void
}

export function Navigation({ activeView, setActiveView }: NavigationProps) {
  const items = [
    { id: "chats", label: "Chats", icon: MessageSquare, color: "text-blue-400" },
    { id: "groups", label: "Groups", icon: Users, color: "text-purple-400" },
    { id: "profile", label: "Profile", icon: User, color: "text-teal-400" },
  ] as const

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="backdrop-blur-md bg-zinc-950/80 border-t border-zinc-900/50"
    >
      <div className="flex justify-around">
        {items.map((item) => {
          const isActive = activeView === item.id
          const Icon = item.icon

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "flex flex-1 flex-col items-center py-4 px-2 relative",
                isActive ? item.color : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Icon className="h-5 w-5" />
              </motion.div>
              <span className="text-xs mt-1 font-light">{item.label}</span>

              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className={cn("absolute bottom-0 w-12 h-0.5 rounded-full", item.color.replace("text", "bg"))}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </motion.nav>
  )
}
