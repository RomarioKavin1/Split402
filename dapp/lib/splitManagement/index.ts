import {createSplit, getSplitDetails, markAsPaid} from "./contractInteraction";
import {sendGroupMessage} from "../messaging";
import { ethers } from "ethers";
import { Client } from "@xmtp/browser-sdk";
import { stringify } from "querystring";

export function createSplitAndMessage(Provider: ethers.Provider | ethers.Signer,data:{
    title: string,
    totalAmount: ethers.BigNumberish,
    initiatorAddress: string,
    initiatorAmount: ethers.BigNumberish,
    memberAddresses: string[],
    memberAmounts: ethers.BigNumberish[]
},client: Client) {
    const splitId = createSplit(Provider as ethers.Signer,data.totalAmount,data.initiatorAddress,data.initiatorAmount,data.memberAddresses,data.memberAmounts);
    sendGroupMessage(client, [data.initiatorAddress,...data.memberAddresses],stringify({title:data.title,splitId:splitId.toString()}));
    return splitId;
}
