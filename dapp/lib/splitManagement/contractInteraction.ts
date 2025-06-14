import { ethers } from "ethers";

import PaymentSplitterRegistryAbi from "../../data/paymentSpiltterRegistryAbi.json";

const CONTRACT_ADDRESS = "0xEFa13721638c6d7A04aE12Ed0DBa560Eb7a29Dc2";

function getContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(
    CONTRACT_ADDRESS,
    PaymentSplitterRegistryAbi,
    signerOrProvider
  );
}

export async function   createSplit(
  signer: ethers.Signer,
  conversationId: string,
  messageId: string,
  totalAmount: string | number,
  initiatorAddress: string,
  initiatorAmount: string | number,
  memberAddresses: string[],
  memberAmounts: (string | number)[],
): Promise<ethers.TransactionResponse> {
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
  signer: ethers.Signer,
  conversationId: string,
  messageId: string,
  payer: string
): Promise<ethers.TransactionResponse> {
  const contract = getContract(signer);
  const tx = await contract.markAsPaid(conversationId, messageId, payer);
  return tx;
}

export async function getSplitDetails(
  provider: ethers.Provider,
  conversationId: string,
  messageId: string
): Promise<any> {
  const contract = getContract(provider);
  const result = await contract.getSplitDetails(conversationId, messageId);
  console.log(result);
  return {
    totalAmount: result.totalAmount ? result.totalAmount.toString() : result[0]?.toString(),
    initiatorAddress: result.initiatorAddress || result[1],
    initiatorAmount: result.initiatorAmount ? result.initiatorAmount.toString() : result[2]?.toString(),
    initiatorPaid: result.initiatorPaid !== undefined ? result.initiatorPaid : result[3],
    memberAddresses: result.memberAddresses || result[4],
    memberAmounts: result.memberAmounts ? result.memberAmounts.map((a:any) => a.toString()) : result[5]?.map((a:any) => a.toString()),
    memberPaids: result.memberPaids || result[6],
  };
}

export async function getSplitsByConversationId(
  provider: ethers.Provider,
  conversationId: string
): Promise<any[]> {
  const contract = getContract(provider);
  const splitsView = await contract.getSplitsByConversationId(conversationId);
  return splitsView.map((s: any) => ({
    messageId: s.messageId || s[0],
    totalAmount: s.totalAmount ? s.totalAmount.toString() : s[1]?.toString(),
    initiatorAddress: s.initiatorAddress || s[2],
    initiatorAmount: s.initiatorAmount ? s.initiatorAmount.toString() : s[3]?.toString(),
    initiatorPaid: s.initiatorPaid !== undefined ? s.initiatorPaid : s[4],
    memberAddresses: s.memberAddresses || s[5],
    memberAmounts: s.memberAmounts ? s.memberAmounts.map((a:any) => a.toString()) : s[6]?.map((a:any) => a.toString()),
    memberPaids: s.memberPaids || s[7],
  }));
}
