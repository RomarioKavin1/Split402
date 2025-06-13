import { paymentMiddleware } from 'x402-express';
import { NextRequest, NextResponse } from 'next/server';
import {getSplitDetails, markAsPaid} from "@/lib/splitManagement/contractInteraction";
import {ethers} from "ethers";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ConversationId = searchParams.get("ConversationId") || "";
  const MessageId = searchParams.get("MessageId") || "";
  const address = searchParams.get("address") || "";
  console.log(address);
  const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
  const RPC_URL = process.env.RPC_URL || "";
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const splitDetails = await getSplitDetails(provider,ConversationId, MessageId);
  console.log(splitDetails.initiatorAddress);
  const receiver = splitDetails.initiatorAddress;
  var price = "";
  splitDetails.memberAddresses.forEach((memberAddress: string) => {
    if (memberAddress === address) {
      price = ethers.formatUnits(splitDetails.memberAmounts[splitDetails.memberAddresses.indexOf(memberAddress)], 18).toString();
    }
  });
  console.log(price);
  const middleware = paymentMiddleware(
    receiver,
    {
      "GET /api/x402": {
        price: `${price}`,
        network: `base-sepolia`,
        config: {
          description: "Split Payment",
        },
      },
    },
    {
      url: "https://x402.org/facilitator",
    }
  );

  const nodeReq = {
    ...req,
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers),
  } as any;

  const nodeRes: any = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    getHeader(name: string) {
      return this.headers[name];
    },
    end(body: any) {
      this.body = body;
    },
    write: () => {},
  };

  let handled = false;
  await new Promise<void>((resolve) => {
    middleware(nodeReq, nodeRes, () => {
      handled = true;
      resolve();
    });
  });

  if (!handled) {
    return new Response(nodeRes.body, {
      status: nodeRes.statusCode,
      headers: nodeRes.headers,
    });
  }

  // Payment succeeded, continue with normal logic
  return NextResponse.json({
    weather: "sunny",
    temperature: 72,
    charged: `$0`,
  });
}
