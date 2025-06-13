import { ethers } from "ethers";

import { readFileSync } from 'fs';
const PaymentSplitterRegistryAbi = JSON.parse(
  readFileSync(new URL('../data/paymentSpiltterRegistryAbi.json', import.meta.url))
);

const CONTRACT_ADDRESS = "0xEFa13721638c6d7A04aE12Ed0DBa560Eb7a29Dc2";

function getContract(signerOrProvider) {
  return new ethers.Contract(
    CONTRACT_ADDRESS,
    PaymentSplitterRegistryAbi,
    signerOrProvider
  );
}

export async function createSplit(
  signer,
  conversationId,
  messageId,
  totalAmount,
  initiatorAddress,
  initiatorAmount,
  memberAddresses,
  memberAmounts,
) {
  const contract = getContract(signer);
  const tx = await contract.createSplit(
    conversationId,
    messageId,
    totalAmount,
    initiatorAddress,
    initiatorAmount,
    memberAddresses,
    memberAmounts
  );
  return tx;
}

export async function markAsPaid(
  signer,
  conversationId,
  messageId,
  payer,
) {
  const contract = getContract(signer);
  const tx = await contract.markAsPaid(conversationId, messageId, payer);
  return tx;
}

export async function getSplitDetails(
  provider,
  conversationId,
  messageId,
) {
  const contract = getContract(provider);
  const result = await contract.getSplitDetails(conversationId, messageId);

  return {
    totalAmount: result.totalAmount ? result.totalAmount.toString() : result[0]?.toString(),
    initiatorAddress: result.initiatorAddress || result[1],
    initiatorAmount: result.initiatorAmount ? result.initiatorAmount.toString() : result[2]?.toString(),
    initiatorPaid: result.initiatorPaid !== undefined ? result.initiatorPaid : result[3],
    memberAddresses: result.memberAddresses || result[4],
    memberAmounts: result.memberAmounts ? result.memberAmounts.map((a) => a.toString()) : result[5]?.map((a) => a.toString()),
    memberPaids: result.memberPaids || result[6],
  };
}

export async function getSplitsByConversationId(
  provider,
  conversationId,
) {
  const contract = getContract(provider);
  const splitsView = await contract.getSplitsByConversationId(conversationId);
  return splitsView.map((s) => ({
    messageId: s.messageId || s[0],
    totalAmount: s.totalAmount ? s.totalAmount.toString() : s[1]?.toString(),
    initiatorAddress: s.initiatorAddress || s[2],
    initiatorAmount: s.initiatorAmount ? s.initiatorAmount.toString() : s[3]?.toString(),
    initiatorPaid: s.initiatorPaid !== undefined ? s.initiatorPaid : s[4],
    memberAddresses: s.memberAddresses || s[5],
    memberAmounts: s.memberAmounts ? s.memberAmounts.map((a) => a.toString()) : s[6]?.map((a) => a.toString()),
    memberPaids: s.memberPaids || s[7],
  }));
}
