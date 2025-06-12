import { AgentRequest, AgentResponse } from "@/app/types/api";
import { NextResponse } from "next/server";
import { createAgent } from "./create-agent";
import { Message, generateId, generateText } from "ai";

const messages: Message[] = [];

/**
 * Handles incoming POST requests to interact with the money splitting agent.
 * This function processes natural language requests about splitting expenses and returns structured JSON responses.
 *
 * @function POST
 * @param {Request & { json: () => Promise<AgentRequest> }} req - The incoming request object containing the user message.
 * @returns {Promise<NextResponse<AgentResponse>>} JSON response containing the structured split information or an error message.
 *
 * @description Processes natural language requests about splitting expenses and returns a structured JSON response
 * following the defined schema:
 * {
 *   title: string,           // A concise, descriptive title for the expense split
 *   description: string,     // Detailed description including what is being split and who initiated it
 *   totalAmount: number,     // Total amount to be split
 *   initiator: {             // Person who initiated the split
 *     name: string,          // Name of the initiator
 *     amount: number,        // Amount they need to pay
 *     proportion: number     // Their proportion of the total
 *   },
 *   members: Array<{         // Array of other people involved
 *     name: string,          // Name of the person
 *     amount: number,        // Amount they need to pay
 *     proportion: number     // Their proportion of the total
 *   }>,
 *   createdAt: string        // ISO timestamp of creation
 * }
 */
export async function POST(
  req: Request & { json: () => Promise<AgentRequest> },
): Promise<NextResponse<AgentResponse>> {
  try {
    // 1. Extract user message from the request body
    const { userMessage } = await req.json();

    // 2. Get the agent
    const agent = await createAgent();

    // 3. Start streaming the agent's response
    messages.push({ id: generateId(), role: "user", content: userMessage });
    const { text } = await generateText({
      ...agent,
      messages,
    });

    // 4. Parse the response to ensure it's valid JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(text);
    } catch (error) {
      return NextResponse.json({
        error: "The agent's response was not valid JSON. Please try again.",
      });
    }

    // 5. Add the agent's response to the messages
    messages.push({ id: generateId(), role: "assistant", content: text });

    // 6. Return the parsed JSON response
    return NextResponse.json({ response: parsedResponse });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({
      error:
        error instanceof Error
          ? error.message
          : "I'm sorry, I encountered an issue processing your message. Please try again later.",
    });
  }
}
