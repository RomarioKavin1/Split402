import express from "express";
import { paymentMiddleware } from 'x402-express';
import {getSplitDetails,markAsPaid} from "./lib/contractInteraction.js";
import {ethers} from "ethers";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();
const app = express();
//cors
app.use(cors());
app.get("/x402", async (req, res,next) => {
  const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
  const ConversationId = searchParams.get("ConversationId") || "";
  const MessageId = searchParams.get("MessageId") || "";
  const address = searchParams.get("address") || "";
  const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
  const RPC_URL = process.env.RPC_URL || "";
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const splitDetails = await getSplitDetails(provider,ConversationId, MessageId);
  console.log(splitDetails.initiatorAddress);
  const receiver = splitDetails.initiatorAddress;
  var price = "";
  splitDetails.memberAddresses.forEach((memberAddress) => {
    if (memberAddress === address) {
      price = ethers.formatUnits(splitDetails.memberAmounts[splitDetails.memberAddresses.indexOf(memberAddress)], 18).toString();
    }
  });
  console.log(price);
  const tx = await markAsPaid(signer,ConversationId, MessageId, address);
  console.log(tx);
  const dynamicMiddleware = paymentMiddleware(
    receiver,
    {
      "GET /x402": {
        price: `$${price}`,
        network: "base-sepolia",
      },
    },
    {
      url: "https://x402.org/facilitator",
    }
  );

  dynamicMiddleware(req, res, () => {
    res.send({
      report: {
        status: "success",
        charged: `$${price}`,
      },
    });
  });
});

app.listen(4021, () => {
  console.log(`Server listening at http://localhost:4021`);
});
