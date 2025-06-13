import { ethers } from "ethers";

import PaymentSplitterRegistryAbi from "../../data/paymentSpiltterRegistryAbi.json";

const CONTRACT_ADDRESS = "0x7f11FaBA56818C6bA26C52b845C03317C5e5B253";

function getContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(
    CONTRACT_ADDRESS,
    PaymentSplitterRegistryAbi,
    signerOrProvider
  );
}

export async function createSplit(
  signer: ethers.Signer,
  totalAmount: ethers.BigNumberish,
  initiatorAddress: string,
  initiatorAmount: ethers.BigNumberish,
  memberAddresses: string[],
  memberAmounts: ethers.BigNumberish[]
): Promise<string> {
  const contract = getContract(signer);
  const tx = await contract.createSplit(
    totalAmount,
    initiatorAddress,
    initiatorAmount,
    memberAddresses,
    memberAmounts
  );
  const receipt = await tx.wait();
  const event = receipt.events?.find((e: any) => e.event === "SplitCreated");
  if (!event) throw new Error("SplitCreated event not found");
  return event.args.splitId;
}

export async function getSplitDetails(
  provider: ethers.Provider,
  splitId: string
): Promise<{
  totalAmount: string;
  initiator: { address: string; amount: string; paid: boolean };
  members: { address: string; amount: string; paid: boolean }[];
}> {
  const contract = getContract(provider);
  const [
    totalAmount,
    initiatorAddress,
    initiatorAmount,
    initiatorPaid,
    memberAddresses,
    memberAmounts,
    memberPaid
  ] = await contract.getSplitDetails(splitId);

  const members = memberAddresses.map((address: string, i: number) => ({
    address,
    amount: memberAmounts[i].toString(),
    paid: memberPaid[i],
  }));

  return {
    totalAmount: totalAmount.toString(),
    initiator: {
      address: initiatorAddress,
      amount: initiatorAmount.toString(),
      paid: initiatorPaid,
    },
    members,
  };
}

export async function markAsPaid(
  signer: ethers.Signer,
  splitId: string,
  payer: string
): Promise<void> {
  const contract = getContract(signer);
  const tx = await contract.markAsPaid(splitId, payer);
  await tx.wait();
}
