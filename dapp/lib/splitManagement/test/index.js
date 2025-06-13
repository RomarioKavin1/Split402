import { ethers, parseEther } from "ethers";
import {
  createSplit,
  markAsPaid,
  getSplitDetails,
  getSplitsByConversationId
} from "../contractInteraction.js";

import dotenv from 'dotenv';
dotenv.config();

const PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY;
const RPC_URL = process.env.SEPOLIA_RPC_URL;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  if (!PRIVATE_KEY || !RPC_URL) {
    throw new Error("Please set SEPOLIA_PRIVATE_KEY and SEPOLIA_RPC_URL in your .env file");
  }

  // ethers v6 usage:
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  // --- Sample data ---
  const conversationId = "test-conv-986"
  const messageId = "msg-" + Math.floor(Math.random() * 10000);
  // --- Sample data ---
  const initiatorAddress = wallet.address;
  const initiatorAmount = parseEther("0.005");
  // Use a valid, non-special member address for testing
  const memberAddresses = ["0x1111111111111111111111111111111111111111"];
  const memberAmounts = [parseEther("0.005")];
  const totalAmount = (initiatorAmount + memberAmounts.reduce((a, b) => a + b, 0n)).toString();

  // Log arguments for debugging
  console.log("createSplit args:", {
    wallet: wallet.address,
    conversationId,
    messageId,
    totalAmount,
    initiatorAddress,
    initiatorAmount: initiatorAmount.toString(),
    memberAddresses,
    memberAmounts: memberAmounts.map(a => a.toString())
  });

  // --- Create a split ---
  console.log("Creating split...");
  const tx = await createSplit(
    wallet,
    conversationId,
    messageId,
    totalAmount,
    initiatorAddress,
    initiatorAmount.toString(),
    memberAddresses,
    memberAmounts.map(a => a.toString())
  );
  const receipt = await tx.wait();
  console.log("Split created. Tx hash:", tx.hash, "Status:", receipt.status);
  console.log("Full transaction receipt:", JSON.stringify(receipt, null, 2));
  if (receipt.status === 0) {
    throw new Error("Split creation transaction reverted. Check contract and arguments.");
  }
  await sleep(2000);

  // --- Get all splits for this conversationId ---
  console.log("Fetching all splits by conversationId...");
  const allSplits = await getSplitsByConversationId(provider, conversationId);
  console.log("All splits for conversation:", allSplits);
  await sleep(2000);

  // --- Get split details ---
  console.log("Fetching split details...");
  const details = await getSplitDetails(provider, conversationId, messageId);
  console.log("Split details:", details);
  await sleep(2000);

  // --- Mark as paid (initiator) ---
  console.log("Marking as paid (initiator)...");
  const txPaid = await markAsPaid(wallet, conversationId, messageId, "0x1111111111111111111111111111111111111111");
  await txPaid.wait();
  console.log("Marked as paid. Tx hash:", txPaid.hash);
  await sleep(2000);

  // --- Get all splits by conversationId ---
  console.log("Fetching all splits by conversationId...");
  const allSplitsAfterPaid = await getSplitsByConversationId(provider, conversationId);
  console.log("All splits:", allSplitsAfterPaid);
  await sleep(2000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
