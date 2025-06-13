"use client";

import {
  Client,
  Conversation,
  DecodedMessage,
  Identifier,
} from "@xmtp/browser-sdk";
import { useCallback, useEffect, useRef, useState, Fragment } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";

import { initXMTP } from "../../lib/xmtpClient";
import { listConversations, getMessages } from "../../lib/messaging";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Dialog, Transition } from "@headlessui/react";

type AnyConversation = Conversation<any>;
// We need to extend the DecodedMessage type to include senderAddress, which is present at runtime
interface RuntimeDecodedMessage extends DecodedMessage {
  senderAddress: string;
  conversation: Conversation<any>;
}

enum NewConversationType {
  Direct = "direct",
  Group = "group",
}

export default function Home() {
  const { address, isConnected } = useAccount();

  const [client, setClient] = useState<Client | null>(null);
  const [conversations, setConversations] = useState<AnyConversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<AnyConversation | null>(null);
  const [messages, setMessages] = useState<DecodedMessage<any>[]>([]);
  const [conversationNames, setConversationNames] = useState<
    Record<string, string>
  >({});
  const [conversationTypes, setConversationTypes] = useState<
    Record<string, string>
  >({});
  const [messageAddresses, setMessageAddresses] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState({
    client: false,
    conversations: false,
    messages: false,
    send: false,
  });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const isStreamingRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newConversationType, setNewConversationType] =
    useState<NewConversationType>(NewConversationType.Direct);
  const [newRecipient, setNewRecipient] = useState("");
  const [syncing, setSyncing] = useState(false);

  const formatAddress = (addr: string | undefined): string =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";
  const renderMessageContent = (msg: RuntimeDecodedMessage): string =>
    typeof msg.content === "string"
      ? msg.content
      : "[Unsupported content type]";

  const formatConversationName = async (
    convo: AnyConversation
  ): Promise<string> => {
    if (!convo) return "Unknown";

    // Get the peer address from various possible locations
    const peerAddress =
      (convo as any).peerAddress ||
      (convo as any).peer?.address ||
      (convo as any).peerAddresses?.[0];

    console.log("Formatting conversation:", {
      id: convo.id,
      peerAddress,
      topic: (convo as any).topic,
      type: (convo as any).type,
      hasMembers: typeof (convo as any).members === "function",
    });

    // For direct messages
    if (peerAddress) {
      return formatAddress(peerAddress);
    }

    // For group messages
    if (typeof (convo as any).members === "function") {
      try {
        const members = await (convo as any).members();
        if (members && members.length > 0) {
          return `Group (${members.length} members)`;
        }
      } catch (e) {
        console.error("Error getting members:", e);
      }
    }

    // Try to get the topic as a fallback
    if ((convo as any).topic) {
      return `Group ${formatAddress((convo as any).topic)}`;
    }

    return "Unknown";
  };

  const getConversationType = async (
    convo: AnyConversation
  ): Promise<string> => {
    if (!convo) return "Unknown";

    // Get the peer address from various possible locations
    const peerAddress =
      (convo as any).peerAddress ||
      (convo as any).peer?.address ||
      (convo as any).peerAddresses?.[0];

    console.log("Getting conversation type:", {
      id: convo.id,
      peerAddress,
      topic: (convo as any).topic,
      type: (convo as any).type,
      hasMembers: typeof (convo as any).members === "function",
    });

    if (peerAddress) {
      return "Direct Message";
    }
    if (typeof (convo as any).members === "function") {
      try {
        const members = await (convo as any).members();
        if (members && members.length > 0) {
          return "Group Chat";
        }
      } catch (e) {
        console.error("Error getting members:", e);
      }
    }
    if ((convo as any).topic) {
      return "Group Chat";
    }
    return "Unknown";
  };

  const loadConversations = useCallback(async () => {
    if (!client) return;
    setLoading((prev) => ({ ...prev, conversations: true }));
    try {
      const convos = await listConversations(client);
      console.log(
        "Loaded conversations:",
        convos.map((convo) => ({
          id: convo.id,
          peerAddress: (convo as any).peerAddress,
          topic: (convo as any).topic,
          type: (convo as any).type,
          hasMembers: typeof (convo as any).members === "function",
        }))
      );
      setConversations(convos);

      // Load names and types for all conversations
      const names: Record<string, string> = {};
      const types: Record<string, string> = {};
      for (const convo of convos) {
        names[convo.id] = await formatConversationName(convo);
        types[convo.id] = await getConversationType(convo);
      }
      setConversationNames(names);
      setConversationTypes(types);
    } catch (e) {
      console.error("Failed to load conversations:", e);
      setError("Failed to load conversations");
    } finally {
      setLoading((prev) => ({ ...prev, conversations: false }));
    }
  }, [client]);

  const initClient = useCallback(async () => {
    if (isConnected && address && !client) {
      setLoading((prev) => ({ ...prev, client: true }));
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const xmtp = await initXMTP(signer);
        setClient(xmtp);
        // Load conversations after client is initialized
        await loadConversations();
      } catch (e) {
        console.error("Failed to initialize XMTP client:", e);
        setClient(null);
        setError("Failed to initialize XMTP client");
      } finally {
        setLoading((prev) => ({ ...prev, client: false }));
      }
    }
  }, [address, isConnected, client, loadConversations]);

  // Add cleanup function
  const cleanupStates = useCallback(() => {
    setClient(null);
    setConversations([]);
    setSelectedConversation(null);
    setMessages([]);
    setConversationNames({});
    setConversationTypes({});
    setNewMessage("");
    setError(null);
    isStreamingRef.current = false;
  }, []);

  // Update useEffect to handle connection changes
  useEffect(() => {
    if (!isConnected) {
      cleanupStates();
    } else if (isConnected && address && !client) {
      initClient();
    }
  }, [isConnected, address, client, initClient, cleanupStates]);

  // Update streamMessages to handle cleanup
  const streamMessages = useCallback(async () => {
    if (!client || isStreamingRef.current) return;
    isStreamingRef.current = true;
    let stream: any;
    try {
      console.log("Starting message stream...");
      stream = await (client as any).conversations.streamAllMessages();
      for await (const message of stream) {
        const runtimeMessage = message as RuntimeDecodedMessage;
        console.log("Raw message:", message);

        // Ensure we have all required fields
        if (!runtimeMessage.senderAddress) {
          runtimeMessage.senderAddress =
            message.senderAddress || (client as any).address;
        }
        if (!runtimeMessage.conversation) {
          runtimeMessage.conversation = message.conversation;
        }

        console.log("Processed message:", {
          from: runtimeMessage.senderAddress,
          to: (client as any).address,
          content: runtimeMessage.content,
          conversationId: runtimeMessage.conversation?.id,
        });

        if (runtimeMessage.senderAddress !== (client as any).address) {
          if (runtimeMessage.conversation?.id === selectedConversation?.id) {
            setMessages((prevMessages) => [...prevMessages, runtimeMessage]);
          } else {
            console.log(
              "Message received for different conversation, reloading conversations"
            );
            await loadConversations();
          }
        }
      }
    } catch (e) {
      console.error("Error in stream:", e);
      setError("Error in message stream");
    } finally {
      isStreamingRef.current = false;
      if (stream) {
        try {
          await stream.return();
        } catch (e) {
          console.error("Error closing stream:", e);
        }
      }
    }
  }, [client, selectedConversation, loadConversations]);

  // Update useEffect for message streaming
  useEffect(() => {
    if (client && !isStreamingRef.current) {
      streamMessages();
    }
    return () => {
      isStreamingRef.current = false;
    };
  }, [client, streamMessages]);

  const loadMessages = useCallback(
    async (conversation: AnyConversation) => {
      if (!client || !conversation) return;
      setLoading((prev) => ({ ...prev, messages: true }));
      try {
        console.log("Loading messages for conversation:", conversation.id);
        const messages = await conversation.messages();
        console.log("Loaded messages:", messages);
        setMessages(messages);

        // Set up message streaming
        const stream = await conversation.messages();
        for await (const message of stream) {
          console.log("Received new message:", message);
          setMessages((prev) => {
            // Check if message already exists
            const exists = prev.some((m) => m.id === message.id);
            if (exists) return prev;
            return [...prev, message];
          });
        }
      } catch (e) {
        console.error("Failed to load messages:", e);
      } finally {
        setLoading((prev) => ({ ...prev, messages: false }));
      }
    },
    [client]
  );

  // Update the conversation selection handler
  const handleConversationSelect = useCallback(
    async (conversation: AnyConversation) => {
      setSelectedConversation(conversation);
      await loadMessages(conversation);
    },
    [loadMessages]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !client) return;
    setLoading((prev) => ({ ...prev, send: true }));
    try {
      console.log("Sending message to conversation:", selectedConversation.id);
      const sentMessage = await selectedConversation.send(newMessage);
      console.log("Message sent successfully:", sentMessage);
      setNewMessage("");

      // Add the sent message to the local state
      const runtimeMessage: RuntimeDecodedMessage = {
        content: newMessage,
        senderAddress: (client as any).address,
        conversation: selectedConversation,
        id:
          typeof sentMessage === "string"
            ? sentMessage
            : Math.random().toString(36).substring(7),
      } as RuntimeDecodedMessage;

      setMessages((prevMessages) => [...prevMessages, runtimeMessage]);

      // Reload messages to ensure synchronization
      const newMsgs = await getMessages(selectedConversation);
      console.log("Reloaded messages:", newMsgs);
      setMessages(newMsgs as RuntimeDecodedMessage[]);
    } catch (e) {
      console.error("Failed to send message:", e);
      alert("Failed to send message: " + (e as Error).message);
    } finally {
      setLoading((prev) => ({ ...prev, send: false }));
    }
  };

  const handleCreateConversation = async () => {
    if (!client || !newRecipient.trim()) return;
    try {
      if (newConversationType === NewConversationType.Direct) {
        const recipientAddress = ethers.getAddress(newRecipient.trim());
        console.log(
          "Checking if address is on XMTP network:",
          recipientAddress
        );
        console.log("Client environment:", (client as any).env);

        try {
          const canMessageMap = await Client.canMessage(
            [
              {
                identifier: recipientAddress,
                identifierKind: "Ethereum",
              },
            ],
            "dev"
          );

          console.log("Can message result:", canMessageMap);
          // Convert both addresses to lowercase for comparison
          const canMessage = canMessageMap.get(recipientAddress.toLowerCase());
          console.log("Can message this address:", canMessage);

          if (!canMessage) {
            console.log("Address not found on XMTP network:", recipientAddress);
            alert(
              "Address is not on the XMTP network. Make sure the address has registered with XMTP."
            );
            return;
          }

          console.log("Creating new DM conversation with:", recipientAddress);
          const newConvo = await (client as any).conversations.newDm(
            recipientAddress,
            { env: "dev" }
          );
          console.log("New conversation created:", newConvo);
          await loadConversations();
          setSelectedConversation(newConvo);
        } catch (error) {
          console.error(
            "Error checking address or creating conversation:",
            error
          );
          alert("Error: " + (error as Error).message);
          return;
        }
      } else {
        const recipients = newRecipient
          .split(",")
          .map((r) => ethers.getAddress(r.trim()));
        console.log("Checking if addresses are on XMTP network:", recipients);
        console.log("Client environment:", (client as any).env);

        try {
          const canMessageMap = await Client.canMessage(
            recipients.map((recipient) => ({
              identifier: recipient,
              identifierKind: "Ethereum",
            })),
            "dev"
          );

          console.log("Can message results:", canMessageMap);
          // Convert all addresses to lowercase for comparison
          const allCanMessage = recipients.every((recipient) =>
            canMessageMap.get(recipient.toLowerCase())
          );
          console.log("Can message all addresses:", allCanMessage);

          if (!allCanMessage) {
            console.log("One or more addresses not found on XMTP network");
            alert(
              "One or more addresses are not on the XMTP network. Make sure all addresses have registered with XMTP."
            );
            return;
          }

          console.log("Creating new group conversation with:", recipients);
          const newConvo = await (
            client as any
          ).conversations.newGroupWithIdentifiers(recipients, { env: "dev" });
          console.log("New group conversation created:", newConvo);
          await loadConversations();
          setSelectedConversation(newConvo);
        } catch (error) {
          console.error(
            "Error checking addresses or creating group conversation:",
            error
          );
          alert("Error: " + (error as Error).message);
          return;
        }
      }
      setIsModalOpen(false);
      setNewRecipient("");
    } catch (e) {
      console.error("Failed to create conversation:", e);
      alert("Error: " + (e as Error).message);
    }
  };

  const handleNewConversation = async (address: string) => {
    if (!client || !address) return;
    setLoading((prev) => ({ ...prev, newConversation: true }));
    try {
      // Check if we can message this address
      const canMessage = await client.canMessage([
        {
          identifier: address,
          identifierKind: "Ethereum",
        },
      ]);

      if (!canMessage.get(address.toLowerCase())) {
        setError("This address is not on the XMTP network");
        return;
      }

      // First, try to find an existing conversation with this address
      const existingConversations = await listConversations(client);
      console.log("Checking existing conversations:", existingConversations);

      const existingConversation = existingConversations.find((convo) => {
        // Get the peer address from the conversation object
        const peerAddress =
          (convo as any).peerAddress ||
          (convo as any).peer?.address ||
          (convo as any).peerAddresses?.[0];

        console.log("Checking conversation:", {
          id: convo.id,
          peerAddress,
          targetAddress: address,
        });

        return (
          peerAddress && peerAddress.toLowerCase() === address.toLowerCase()
        );
      });

      if (existingConversation) {
        console.log("Found existing conversation:", existingConversation.id);
        setSelectedConversation(existingConversation);
        setIsModalOpen(false);
        return;
      }

      // If no existing conversation, create a new one directly with the address
      console.log("Creating new DM conversation with address:", address);
      const conversation = await client.conversations.newDmWithIdentifier({
        identifier: address,
        identifierKind: "Ethereum",
      });
      console.log("Created new conversation:", {
        id: conversation.id,
        peerAddress:
          (conversation as any).peerAddress ||
          (conversation as any).peer?.address ||
          (conversation as any).peerAddresses?.[0],
      });

      // Add the new conversation to the list
      setConversations((prev) => [conversation, ...prev]);
      setSelectedConversation(conversation);

      // Format the conversation name and type
      const name = await formatConversationName(conversation);
      const type = await getConversationType(conversation);
      setConversationNames((prev) => ({ ...prev, [conversation.id]: name }));
      setConversationTypes((prev) => ({ ...prev, [conversation.id]: type }));

      setIsModalOpen(false);
    } catch (e) {
      console.error("Failed to create conversation:", e);
      if ((e as Error).message.includes("NoModificationAllowedError")) {
        setError(
          "Please try again in a few seconds. The system is currently busy."
        );
      } else {
        setError("Failed to create conversation: " + (e as Error).message);
      }
    } finally {
      setLoading((prev) => ({ ...prev, newConversation: false }));
    }
  };

  // Add effect to fetch addresses for messages
  useEffect(() => {
    const fetchMessageAddresses = async () => {
      if (!client || messages.length === 0) return;

      const newAddresses: Record<string, string> = {};
      for (const message of messages) {
        if (!message.senderInboxId || messageAddresses[message.senderInboxId])
          continue;

        try {
          const inboxState = await client.preferences.inboxStateFromInboxIds([
            message.senderInboxId,
          ]);
          const addressFromInboxId =
            inboxState[0]?.accountIdentifiers?.[0]?.identifier;
          if (addressFromInboxId) {
            newAddresses[message.senderInboxId] = addressFromInboxId;
          }
        } catch (e) {
          console.error("Error fetching address for message:", e);
        }
      }

      if (Object.keys(newAddresses).length > 0) {
        setMessageAddresses((prev) => ({ ...prev, ...newAddresses }));
      }
    };

    fetchMessageAddresses();
  }, [client, messages, messageAddresses]);

  const renderMessage = (message: any, index: number) => {
    if (!message) return null;

    // Get the current user's inbox ID
    const currentInboxId = client?.inboxId;
    const isSent = message.senderInboxId === currentInboxId;
    const senderAddress =
      messageAddresses[message.senderInboxId || ""] || message.senderAddress;

    // Handle different types of message content
    let messageContent = "[Unsupported content type]";
    if (typeof message.content === "string") {
      messageContent = message.content;
    } else if (message.content && typeof message.content === "object") {
      messageContent = JSON.stringify(message.content);
    }

    return (
      <div
        key={message.id || index}
        className={`flex ${isSent ? "justify-end" : "justify-start"}`}
      >
        <div
          className={`max-w-[70%] rounded-lg p-3 ${
            isSent ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-800"
          }`}
        >
          <p className="text-sm">{messageContent}</p>
          <p className="text-xs mt-1 opacity-70">
            {isSent ? "You" : formatAddress(senderAddress)}
          </p>
        </div>
      </div>
    );
  };

  const NewConversationModal = ({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) => {
    const [address, setAddress] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!address) return;

      setIsLoading(true);
      setError(null);

      try {
        await handleNewConversation(address);
        setAddress("");
        onClose();
      } catch (e) {
        console.error("Failed to create conversation:", e);
        setError("Failed to create conversation");
      } finally {
        setIsLoading(false);
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">New Conversation</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Ethereum Address
              </label>
              <input
                type="text"
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !address}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const syncAllConversations = async () => {
    if (!client) return;
    setSyncing(true);
    try {
      console.log("Syncing all conversations...");
      await client.conversations.sync();
      await loadConversations();
      console.log("All conversations synced successfully");
    } catch (e) {
      console.error("Failed to sync conversations:", e);
    } finally {
      setSyncing(false);
    }
  };

  const syncCurrentConversation = async () => {
    if (!client || !selectedConversation) return;
    setSyncing(true);
    try {
      console.log("Syncing current conversation:", selectedConversation.id);
      await selectedConversation.sync();
      await loadMessages(selectedConversation);
      console.log("Current conversation synced successfully");
    } catch (e) {
      console.error("Failed to sync conversation:", e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 py-6">
        <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-lg flex h-[90vh]">
          <div className="w-1/3 border-r dark:border-gray-700 flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold">Conversations</h2>
              <div className="flex gap-2">
                <button
                  onClick={syncAllConversations}
                  disabled={!client || syncing}
                  className="text-blue-500 hover:text-blue-600 font-semibold disabled:opacity-50"
                  title="Sync all conversations"
                >
                  {syncing ? "Syncing..." : "↻"}
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  disabled={!client}
                  className="text-blue-500 hover:text-blue-600 font-semibold disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto">
              {loading.conversations ? (
                <p className="p-4">Loading...</p>
              ) : conversations.length === 0 ? (
                <p className="p-4 text-gray-500 dark:text-gray-400">
                  No conversations yet
                </p>
              ) : (
                conversations
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt || 0).getTime() -
                      new Date(a.createdAt || 0).getTime()
                  )
                  .map((convo) => (
                    <div
                      key={convo.id}
                      onClick={() => handleConversationSelect(convo)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        selectedConversation?.id === convo.id
                          ? "bg-blue-50 dark:bg-blue-900/50"
                          : ""
                      }`}
                    >
                      <p className="font-semibold">
                        {conversationNames[convo.id] || "Loading..."}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {conversationTypes[convo.id] || "Loading..."}
                      </p>
                    </div>
                  ))
              )}
            </div>
            <div className="p-4 border-t dark:border-gray-700">
              <ConnectButton showBalance={false} />
            </div>
          </div>
          <div className="w-2/3 flex flex-col">
            {selectedConversation ? (
              <>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {conversationNames[selectedConversation.id] ||
                        "Loading..."}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {conversationTypes[selectedConversation.id] ||
                        "Loading..."}
                    </p>
                  </div>
                  <button
                    onClick={syncCurrentConversation}
                    disabled={!client || syncing}
                    className="text-blue-500 hover:text-blue-600 font-semibold disabled:opacity-50"
                    title="Sync conversation"
                  >
                    {syncing ? "Syncing..." : "↻"}
                  </button>
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                  {loading.messages ? (
                    <p>Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">
                      No messages yet. Start the conversation!
                    </p>
                  ) : (
                    messages.map((message, index) =>
                      renderMessage(message, index)
                    )
                  )}
                </div>
                <div className="p-4 border-t dark:border-gray-700">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-grow px-4 py-2 rounded-lg border dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || loading.send}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading.send ? "Sending..." : "Send"}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-grow flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">
                  Select a conversation or start a new one
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <NewConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
