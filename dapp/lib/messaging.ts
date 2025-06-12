// lib/messaging.ts
import { Client, Conversation, DecodedMessage } from "@xmtp/browser-sdk";

export const sendDirectMessage = async (
  client: Client,
  recipient: string,
  message: string
) => {
  const conversation = await client.conversations.newDm(recipient);
  await conversation.send(message);
};

export const sendGroupMessage = async (
  client: Client,
  recipients: string[],
  message: string
) => {
  const conversation = await client.conversations.newGroup(recipients);
  await conversation.send(message);
};

export const listConversations = async (client: Client) => {
  return client.conversations.list();
};

export const getMessages = async (conversation: Conversation) => {
  return conversation.messages();
};

export const streamAllMessages = async (
  client: any,
  callback: (message: DecodedMessage) => void
) => {
  const stream = await client.conversations.streamAllMessages();

  for await (const message of stream) {
    if (message && message.senderAddress !== client.address) {
      callback(message);
    }
  }
};
