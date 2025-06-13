import { ethers, parseEther } from "ethers";
import {
  createSplit,
  markAsPaid,
  getSplitDetails,
  getSplitsByConversationId
} from "../contractInteraction";

require('dotenv').config();

const PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY as string;
const RPC_URL = process.env.SEPOLIA_RPC_URL as string;

async function main() {
  if (!PRIVATE_KEY || !RPC_URL) {
    throw new Error("Please set SEPOLIA_PRIVATE_KEY and SEPOLIA_RPC_URL in your .env file");
  }

  // ethers v6 usage:
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  // --- Sample data ---
  const conversationId = "test-conv-" + Math.floor(Math.random() * 10000);
  const messageId = "msg-" + Math.floor(Math.random() * 10000);
  const totalAmount = parseEther("0.01").toString();
  const initiatorAddress = wallet.address;
  const initiatorAmount = parseEther("0.005").toString();
  const memberAddresses = ["0x000000000000000000000000000000000000dEaD"];
  const memberAmounts = [parseEther("0.005").toString()];

  // --- Create a split ---
  console.log("Creating split...");
  const tx: ethers.TransactionResponse = await createSplit(
    wallet,
    conversationId,
    messageId,
    totalAmount,
    initiatorAddress,
    initiatorAmount,
    memberAddresses,
    memberAmounts
  );
  await tx.wait();
  console.log("Split created. Tx hash:", tx.hash);

  // --- Get split details ---
  console.log("Fetching split details...");
  const details = await getSplitDetails(provider, conversationId, messageId);
  console.log("Split details:", details);

  // --- Mark as paid (initiator) ---
  console.log("Marking as paid (initiator)...");
  const txPaid: ethers.TransactionResponse = await markAsPaid(wallet, conversationId, messageId, wallet.address);
  await txPaid.wait();
  console.log("Marked as paid. Tx hash:", txPaid.hash);

  // --- Get all splits by conversationId ---
  console.log("Fetching all splits by conversationId...");
  const allSplits = await getSplitsByConversationId(provider, conversationId);
  console.log("All splits:", allSplits);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
