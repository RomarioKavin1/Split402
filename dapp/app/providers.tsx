"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import {
  base,
} from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import React from "react";

// TODO: Replace with your own project ID from https://cloud.walletconnect.com
const projectId = "YOUR_PROJECT_ID";

const config = getDefaultConfig({
  appName: "My RainbowKit App",
  projectId: projectId,
  chains: [base],
  ssr: true,
});
const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#3B82F6",
            accentColorForeground: "white",
            borderRadius: "large",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
