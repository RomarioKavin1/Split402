import { NextResponse } from "next/server";
import { createBillAgent } from "../create-bill-agent";
import { Message, generateId, generateText } from "ai";

const messages: Message[] = [];

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    const agent = await createBillAgent();
    
    // Add the bill text to messages with explicit JSON formatting instruction
    messages.push({ 
      id: generateId(), 
      role: "user", 
      content: `Analyze this bill text and return a JSON object with the following structure. Make sure to return ONLY the JSON object, no additional text or explanation:

{
  "title": "string",           // A concise title for the bill
  "description": "string",     // Brief description
  "totalAmount": number,       // Total amount
  "taxAmount": number,         // Tax amount
  "date": "string",           // Date in ISO format
  "merchant": "string",       // Merchant name
  "items": [                  // Array of items
    {
      "name": "string",       // Item name
      "quantity": number,     // Quantity
      "unitPrice": number,    // Price per unit
      "totalPrice": number,   // Total price
      "category": "string"    // Item category
    }
  ],
  "paymentMethod": "string",  // Payment method
  "confidence": number,       // Confidence score (0-1)
  "missingInfo": ["string"]   // Array of missing info
}

Bill text to analyze:
${text}` 
    });

    // Generate response using the agent
    const { text: responseText } = await generateText({
      ...agent,
      messages,
    });

    // Add the agent's response to messages
    messages.push({ 
      id: generateId(), 
      role: "assistant", 
      content: responseText 
    });

    // Clean the response text to ensure it's valid JSON
    const cleanedText = responseText.trim().replace(/^```json\n?|\n?```$/g, '');

    // Parse the JSON response
    let billData;
    try {
      billData = JSON.parse(cleanedText);
    } catch (error) {
      console.error("JSON Parse Error:", error);
      console.error("Raw Response:", responseText);
      return NextResponse.json({
        error: "Failed to parse bill data. The response was not valid JSON.",
        details: error instanceof Error ? error.message : "Unknown error",
      }, { status: 422 });
    }

    // Validate the required fields
    const requiredFields = ['title', 'totalAmount', 'items'];
    const missingFields = requiredFields.filter(field => !billData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        error: "Incomplete bill data",
        missingFields,
      }, { status: 422 });
    }

    return NextResponse.json(billData);
  } catch (error) {
    console.error("Error processing bill:", error);
    return NextResponse.json(
      { 
        error: "Failed to process bill",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 