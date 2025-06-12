// lib/xmtpClient.ts
import { Client } from "@xmtp/browser-sdk";
import { Signer, getBytes } from "ethers";

export const initXMTP = async (signer: Signer) => {
  const address = await signer.getAddress();

  // Create a signer that is compatible with the XMTP SDK.
  // This is an EOA signer.
  const xmtpSigner = {
    type: "EOA" as const,
    getIdentifier: () => ({
      identifier: address,
      identifierKind: "Ethereum" as const,
    }),
    signMessage: async (message: string) => {
      const signature = await signer.signMessage(message);
      return getBytes(signature);
    },
  };

  const client = await Client.create(xmtpSigner, { env: "dev" });
  return client;
};
