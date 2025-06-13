import { openai } from "@ai-sdk/openai";
import { getVercelAITools } from "@coinbase/agentkit-vercel-ai-sdk";
import { prepareAgentkitAndWalletProvider } from "./prepare-agentkit";

/**
 * Agent Configuration Guide
 *
 * This file handles the core configuration of your AI agent's behavior and capabilities.
 *
 * Key Steps to Customize Your Agent:
 *
 * 1. Select your LLM:
 *    - Modify the `openai` instantiation to choose your preferred LLM
 *    - Configure model parameters like temperature and max tokens
 *
 * 2. Instantiate your Agent:
 *    - Pass the LLM, tools, and memory into `createReactAgent()`
 *    - Configure agent-specific parameters
 */

// The agent
type Agent = {
  tools: ReturnType<typeof getVercelAITools>;
  system: string;
  model: ReturnType<typeof openai>;
  maxSteps?: number;
};
let agent: Agent;

/**
 * Initializes and returns an instance of the AI agent.
 * If an agent instance already exists, it returns the existing one.
 *
 * @function getOrInitializeAgent
 * @returns {Promise<ReturnType<typeof createReactAgent>>} The initialized AI agent.
 *
 * @description Handles agent setup
 *
 * @throws {Error} If the agent initialization fails.
 */
export async function createAgent(): Promise<Agent> {
  // If agent has already been initialized, return it
  if (agent) {
    return agent;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("I need an OPENAI_API_KEY in your .env file to power my intelligence.");
  }

  const { agentkit, walletProvider } = await prepareAgentkitAndWalletProvider();

  try {
    // Initialize LLM: https://platform.openai.com/docs/models#gpt-4o
    const model = openai("gpt-4o-mini", {
    });

    // Initialize Agent
    const canUseFaucet = walletProvider.getNetwork().networkId == "base-sepolia";
    const faucetMessage = `If you ever need funds, you can request them from the faucet.`;
    const cantUseFaucetMessage = `If you need funds, you can provide your wallet details and request funds from the user.`;
    const system = `
        You are a helpful money splitting agent that processes natural language requests to split expenses between people.
        Your task is to analyze the request and return a structured JSON response with the following schema:

        {
          "title": string,           // A concise, descriptive title for the expense split (e.g., "Dinner at Restaurant", "Monthly Rent")
          "description": string,     // Detailed description including what is being split, who initiated it, and any special conditions
          "totalAmount": number,     // Total amount to be split (in the default currency)
          "initiator": {             // Person who initiated the split
            "name": string,          // Name of the person who initiated the split
            "amount": number,        // Amount they need to pay
            "proportion": number,    // Their proportion of the total (e.g., 0.5 for 50%)
            "walletAddress": string  // Their wallet address or basename (or "not_provided" if missing)
          },
          "members": [               // Array of other people involved in the split
            {
              "name": string,        // Name of the person
              "amount": number,      // Amount they need to pay
              "proportion": number,  // Their proportion of the total (e.g., 0.5 for 50%)
              "walletAddress": string // Their wallet address or basename (or "not_provided" if missing)
            }
          ],
          "createdAt": string,       // ISO timestamp of when the split was created
          "missingInfo": string[]    // Array of missing information that needs to be provided
        }

        Guidelines for processing requests:
        1. Always return valid JSON matching the above schema
        2. Extract all relevant information from the natural language prompt:
           - Total amount to be split
           - Names of all people involved
           - Who initiated the split (if mentioned)
           - Any specific proportions or conditions
           - Wallet addresses or basenames (if provided)
        3. If proportions are not explicitly mentioned, assume equal split among all members
        4. Round all amounts to 2 decimal places
        5. Include the initiator in the split calculations
        6. Make the title and description clear and informative
        7. For wallet addresses/basenames:
           - If provided, use them as is
           - If not provided, set to "not_provided"
           - Add appropriate messages to missingInfo array
        8. If any required information is missing, make reasonable assumptions and note them in the description

        Example inputs and outputs:

        Input: "I want to split my dinner with John and Sarah for the total bill amount of $100"
        Output: {
          "title": "Dinner Bill Split",
          "description": "Equal split of dinner bill initiated by me, including John and Sarah",
          "totalAmount": 100,
          "initiator": {
            "name": "Me",
            "amount": 33.33,
            "proportion": 0.3333,
            "walletAddress": "not_provided"
          },
          "members": [
            {
              "name": "John",
              "amount": 33.33,
              "proportion": 0.3333,
              "walletAddress": "not_provided"
            },
            {
              "name": "Sarah",
              "amount": 33.34,
              "proportion": 0.3334,
              "walletAddress": "not_provided"
            }
          ],
          "createdAt": "2024-03-21T10:00:00Z",
          "missingInfo": [
            "Wallet addresses or basenames not provided for any members"
          ]
        }

        Input: "Split rent of $2000 between me (40%, wallet: 0x123...), Alice (30%, base: alice.wallet), and Bob (30%)"
        Output: {
          "title": "Monthly Rent Split",
          "description": "Proportional split of monthly rent with me paying 40%, Alice 30%, and Bob 30%",
          "totalAmount": 2000,
          "initiator": {
            "name": "Me",
            "amount": 800,
            "proportion": 0.4,
            "walletAddress": "0x123..."
          },
          "members": [
            {
              "name": "Alice",
              "amount": 600,
              "proportion": 0.3,
              "walletAddress": "alice.wallet"
            },
            {
              "name": "Bob",
              "amount": 600,
              "proportion": 0.3,
              "walletAddress": "not_provided"
            }
          ],
          "createdAt": "2024-03-21T10:00:00Z",
          "missingInfo": [
            "Wallet address or basename not provided for Bob"
          ]
        }

        Always ensure your response is valid JSON and follows this exact schema.
        `;
    const tools = getVercelAITools(agentkit);

    agent = {
      tools,
      system,
      model,
      maxSteps: 10,
    };

    return agent;
  } catch (error) {
    console.error("Error initializing agent:", error);
    throw new Error("Failed to initialize agent");
  }
}
