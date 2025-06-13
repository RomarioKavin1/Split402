import { openai } from "@ai-sdk/openai";
import { getVercelAITools } from "@coinbase/agentkit-vercel-ai-sdk";
import { prepareAgentkitAndWalletProvider } from "./prepare-agentkit";

type BillAgent = {
  tools: ReturnType<typeof getVercelAITools>;
  system: string;
  model: ReturnType<typeof openai>;
  maxSteps?: number;
};

let billAgent: BillAgent;

export async function createBillAgent(): Promise<BillAgent> {
  if (billAgent) {
    return billAgent;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("I need an OPENAI_API_KEY in your .env file to power my intelligence.");
  }

  if (!process.env.OPENAI_API_BASE) {
    process.env.OPENAI_API_BASE = "https://openrouter.ai/api/v1";
  }

  const { agentkit, walletProvider } = await prepareAgentkitAndWalletProvider();

  try {
    const model = openai("gpt-4o-mini", {});

    const system = `
      You are a specialized bill recognition agent that processes OCR text from receipts and bills.
      Your task is to analyze the text and return a structured JSON response with the following schema:

      {
        "title": string,           // A concise title for the bill (e.g., "Grocery Shopping", "Restaurant Bill")
        "description": string,     // Brief description of the bill
        "totalAmount": number,     // Total amount of the bill
        "taxAmount": number,       // Tax amount if found
        "date": string,           // Date of the bill in ISO format
        "merchant": string,       // Name of the merchant/store
        "items": [                // Array of items found in the bill
          {
            "name": string,       // Name of the item
            "quantity": number,   // Quantity of the item
            "unitPrice": number,  // Price per unit
            "totalPrice": number, // Total price for this item
            "category": string    // Category of the item (e.g., "Food", "Beverage", "Tax")
          }
        ],
        "paymentMethod": string,  // Payment method if found
        "confidence": number,     // Confidence score (0-1) of the parsing
        "missingInfo": string[]   // Array of missing or unclear information
      }

      Guidelines for processing bill text:
      1. Always return valid JSON matching the above schema
      2. Extract all relevant information from the OCR text:
         - Individual items and their prices
         - Total amount and tax
         - Date and merchant information
         - Payment method if available
      3. For items:
         - Try to identify quantities and unit prices
         - Categorize items when possible
         - Include tax items separately
      4. Handle missing information:
         - Set missing fields to null or empty arrays
         - Add missing information to the missingInfo array
      5. Calculate confidence based on:
         - Clarity of text
         - Completeness of information
         - Consistency of prices
      6. Format dates in ISO format (YYYY-MM-DD)
      7. Ensure all monetary values are numbers
      8. Clean and normalize text:
         - Remove special characters
         - Convert to lowercase where appropriate
         - Fix common OCR errors
    `;

    billAgent = {
      tools: getVercelAITools(agentkit),
      system,
      model,
      maxSteps: 5,
    };

    return billAgent;
  } catch (error) {
    console.error("Error creating bill agent:", error);
    throw error;
  }
} 