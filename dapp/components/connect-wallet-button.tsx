"use client"

import { Loader2 } from "lucide-react"
import { ColorShiftButton } from "./color-shift-button"

interface ConnectWalletButtonProps {
  onClick: () => void
  isLoading?: boolean
}

export function ConnectWalletButton({ onClick, isLoading = false }: ConnectWalletButtonProps) {
  return (
    <ColorShiftButton onClick={onClick} disabled={isLoading} variant="primary">
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        "Connect Wallet"
      )}
    </ColorShiftButton>
  )
}
