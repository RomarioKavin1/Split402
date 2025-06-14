"use client";

import {
  Client,
  Conversation,
  DecodedMessage,
  Identifier,
} from "@xmtp/browser-sdk";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  Fragment,
  AwaitedReactNode,
  JSXElementConstructor,
  Key,
  ReactElement,
  ReactNode,
  ReactPortal,
} from "react";
import { useAccount, useConnectorClient, useWalletClient } from "wagmi";
import { ethers, Wallet } from "ethers";

import { initXMTP } from "../../lib/xmtpClient";
import { listConversations, getMessages } from "../../lib/messaging";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import SplitModal from "../../components/SplitModal";
import { Dialog, Transition } from "@headlessui/react";
import { withPaymentInterceptor, decodeXPaymentResponse } from "x402-axios";
import axios from "axios";
import { getSplitDetails } from "@/lib/splitManagement/contractInteraction";
// We need to extend the DecodedMessage type to include senderAddress, which is present at runtime
interface RuntimeDecodedMessage extends DecodedMessage {
  senderAddress: string;
}

enum NewConversationType {
  Direct = "direct",
  Group = "group",
}

// Define types
type AnyConversation = Conversation<any>;
type ConsentState = "allowed" | "denied" | "unknown";
export function useWagmiAccount() {
  const { data: walletClient } = useWalletClient();
  return walletClient; // Pass the entire walletClient, not just the account
}
export default function Home() {
  // const { address, isConnected } = useAccount();
  const { address, isConnected } = useAccount();
  const { data: connectorClient } = useConnectorClient();

  // For more advanced usage, you can get the full account from the connector
  const account = useWagmiAccount();
  const api = withPaymentInterceptor(
    axios.create({
      baseURL: process.env.NEXT_PUBLIC_BASE_URL,
    }),
    account as any
  );
  const [members, setMembers] = useState<any>([]);
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
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
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
  const [conversationMembers, setConversationMembers] = useState<string[]>([]);

  // Add state for rendered conversations
  const [renderedConversations, setRenderedConversations] = useState<
    JSX.Element[]
  >([]);

  // Add new state for sync status
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);

  // SplitModal state
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitSigner, setSplitSigner] = useState<ethers.Signer | null>(null);

  // Bottom nav state
  const [activeTab, setActiveTab] = useState<"dms" | "groups">("dms");

  // Helper to open modal and get signer
  const openSplitModal = async () => {
    if ((window as any).ethereum) {
      const members = await selectedConversation?.members();
      setMembers(members);
      console.log("members", members);
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      setSplitSigner(signer);
      setIsSplitModalOpen(true);
    } else {
      alert("No Ethereum wallet found.");
    }
  };

  const formatAddress = (addr: string | undefined): string =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";
  const renderMessageContent = (msg: RuntimeDecodedMessage): string =>
    typeof msg.content === "string"
      ? msg.content
      : "[Unsupported content type]";

  const getGroupMembersWithAddresses = async (convo: AnyConversation) => {
    if (!client || !convo) return [];

    try {
      const members = await (convo as any).members();
      if (!members || members.length <= 1) return [];

      // Filter out the current user and handle different member formats
      const otherMembers = members.filter((m: any) => {
        if (!m) return false;

        let memberAddress: string | undefined;
        if (typeof m === "string") {
          memberAddress = m;
        } else if (typeof m === "object" && m !== null) {
          memberAddress = m.address || m.identifier;
        }

        if (!memberAddress) return false;

        const currentAddress = (client as any).address;
        if (!currentAddress) return false;

        return memberAddress.toLowerCase() !== currentAddress.toLowerCase();
      });

      if (otherMembers.length === 0) return [];

      // Get inbox states for all members
      const inboxStates = await Promise.all(
        otherMembers.map(async (member: any) => {
          try {
            let memberAddress: string;
            if (typeof member === "string") {
              memberAddress = member;
            } else if (typeof member === "object" && member !== null) {
              memberAddress = member.address || member.identifier;
            } else {
              return "";
            }

            if (!memberAddress) return "";

            const inboxState = await client.preferences.inboxStateFromInboxIds([
              memberAddress,
            ]);
            return (
              inboxState[0]?.accountIdentifiers?.[0]?.identifier ||
              memberAddress
            );
          } catch (e) {
            console.error("Error getting inbox state for member:", e);
            return "";
          }
        })
      );

      return inboxStates.filter(Boolean);
    } catch (e) {
      console.error("Error getting group members:", e);
      return [];
    }
  };

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
          if (members.length === 1) {
            return "Empty Group";
          } else if (members.length === 2) {
            // For 2 members, show it as a DM
            const otherMember = members.find((m: any) => {
              if (!m) return false;

              let memberAddress: string | undefined;
              if (typeof m === "string") {
                memberAddress = m;
              } else if (typeof m === "object" && m !== null) {
                memberAddress = m.address || m.identifier;
              }

              if (!memberAddress) return false;

              const currentAddress = (client as any).address;
              if (!currentAddress) return false;

              return (
                memberAddress.toLowerCase() !== currentAddress.toLowerCase()
              );
            });

            if (otherMember) {
              let memberAddress: string;
              if (typeof otherMember === "string") {
                memberAddress = otherMember;
              } else if (
                typeof otherMember === "object" &&
                otherMember !== null
              ) {
                memberAddress = otherMember.address || otherMember.identifier;
              } else {
                return "Unknown";
              }

              return formatAddress(memberAddress);
            }
          }
          // For more than 2 members, show member count
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
          if (members.length === 1) {
            return "Empty Group";
          } else if (members.length === 2) {
            return "Direct Message";
          }
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

  const isGroupConversation = async (
    convo: AnyConversation
  ): Promise<boolean> => {
    if (!convo) return false;

    // Get the peer address from various possible locations
    const peerAddress =
      (convo as any).peerAddress ||
      (convo as any).peer?.address ||
      (convo as any).peerAddresses?.[0];

    // If it has a peer address, it's a direct message
    if (peerAddress) {
      return false;
    }

    // Check if it has members function and count them
    if (typeof (convo as any).members === "function") {
      try {
        const members = await (convo as any).members();
        if (members && members.length > 2) {
          return true;
        }
      } catch (e) {
        console.error("Error getting members for group check:", e);
      }
    }

    return false;
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
        // const [account] = await window.ethereum!.request({ method: 'eth_requestAccounts' });
        // setAccount(account);
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
        setConversationMembers((prevMembers) => {
          const newMembers = [...prevMembers, runtimeMessage.senderAddress];
          return newMembers;
        });

        // Ensure we have all required fields
        if (!runtimeMessage.senderAddress) {
          runtimeMessage.senderAddress =
            message.senderAddress || (client as any).address;
        }

        if (runtimeMessage.senderAddress !== (client as any).address) {
          if (runtimeMessage.conversationId === selectedConversation?.id) {
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
      if (!client) return;

      try {
        setSelectedConversation(conversation);
        setMessages([]);
        setLoading((prev) => ({ ...prev, messages: true }));

        // Sync the selected conversation
        await conversation.sync();

        const messages = await conversation.messages();
        setMessages(messages);
      } catch (error) {
        console.error("Error selecting conversation:", error);
      } finally {
        setLoading((prev) => ({ ...prev, messages: false }));
      }
    },
    [client]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }
      if (!client || !selectedConversation || !newMessage.trim()) return;

      try {
        setLoading((prev) => ({ ...prev, sending: true }));
        const messageId = await selectedConversation.send(newMessage);
        setLastMessageId(messageId.toString());

        setNewMessage("");

        // Sync the conversation after sending
        await selectedConversation.sync();
        const updatedMessages = await selectedConversation.messages();
        setMessages(updatedMessages);
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setLoading((prev) => ({ ...prev, sending: false }));
      }
    },
    [client, selectedConversation, newMessage]
  );

  const sendMessage = useCallback(
    async (message: string) => {
      if (!client) {
        console.error("Client is not initialized");
        return null;
      }
      if (!selectedConversation) {
        console.error("Selected conversation is not initialized");
        return null;
      }
      if (!message.trim()) {
        console.error("Message is empty");
        return null;
      }

      try {
        setLoading((prev) => ({ ...prev, sending: true }));
        const messageId = await selectedConversation.send(message);
        setLastMessageId(messageId.toString());
        console.log("Message sent with ID:", messageId);
        await selectedConversation.sync();
        const updatedMessages = await selectedConversation.messages();
        setMessages(updatedMessages);

        return messageId.toString();
      } catch (error) {
        console.error("Error sending message:", error);
        return null;
      } finally {
        setLoading((prev) => ({ ...prev, sending: false }));
      }
    },
    [client, selectedConversation]
  );

  const handleCreateConversation = async () => {
    if (!client || !newRecipient.trim()) return;
    try {
      if (newConversationType === NewConversationType.Direct) {
        const recipientAddress = ethers.getAddress(newRecipient.trim());
        console.log(
          "Checking if address is on XMTP network:",
          recipientAddress
        );

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

          const canMessage = canMessageMap.get(recipientAddress.toLowerCase());
          console.log("Can message this address:", canMessage);

          if (!canMessage) {
            alert(
              "Address is not on the XMTP network. Make sure the address has registered with XMTP."
            );
            return;
          }

          console.log("Creating new DM conversation with:", recipientAddress);
          const newConvo = await client.conversations.newDmWithIdentifier({
            identifier: recipientAddress,
            identifierKind: "Ethereum",
          });
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
        // Split addresses and trim whitespace
        const addresses = newRecipient.split(",").map((addr) => addr.trim());
        console.log("Processing addresses:", addresses);

        // Validate each address
        const recipients = addresses.map((addr) => {
          try {
            return ethers.getAddress(addr);
          } catch (e) {
            throw new Error(`Invalid address: ${addr}`);
          }
        });

        console.log("Validated addresses:", recipients);

        try {
          const canMessageMap = await Client.canMessage(
            recipients.map((recipient) => ({
              identifier: recipient,
              identifierKind: "Ethereum",
            })),
            "dev"
          );

          const allCanMessage = recipients.every((recipient) =>
            canMessageMap.get(recipient.toLowerCase())
          );

          if (!allCanMessage) {
            alert(
              "One or more addresses are not on the XMTP network. Make sure all addresses have registered with XMTP."
            );
            return;
          }

          console.log("Creating new group conversation with:", recipients);
          const newConvo = await client.conversations.newGroupWithIdentifiers(
            recipients.map((recipient) => ({
              identifier: recipient,
              identifierKind: "Ethereum",
            }))
          );
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

  const handleNewConversation = useCallback(
    async (address: string) => {
      if (!client) return;

      try {
        setLoading((prev) => ({ ...prev, newConversation: true }));

        // Create new conversation
        const conversation = await client.conversations.newDmWithIdentifier({
          identifier: address,
          identifierKind: "Ethereum",
        });

        // Sync all conversations
        await client.conversations.sync();

        // Update conversations list
        const updatedConversations = await client.conversations.list();
        setConversations(updatedConversations);

        // Select the new conversation
        setSelectedConversation(conversation);
        setMessages([]);

        setIsModalOpen(false);
      } catch (error) {
        console.error("Error creating conversation:", error);
        if (error instanceof Error) {
          alert(`Failed to create conversation: ${error.message}`);
        } else {
          alert("Failed to create conversation");
        }
      } finally {
        setLoading((prev) => ({ ...prev, newConversation: false }));
      }
    },
    [client]
  );

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

  const MessageItem = ({ message, isSent, senderAddress }: any) => {
    const [splitDetail, setSplitDetail] = useState<any>(null);
    const [isJSONParsable, setIsJSONParsable] = useState(false);
    const [parsedJSON, setParsedJSON] = useState<any>(null);
    const [showExecuteButton, setShowExecuteButton] = useState(false);

    useEffect(() => {
      const fetchSplitDetails = async () => {
        try {
          const provider = new ethers.JsonRpcProvider(
            process.env.NEXT_PUBLIC_RPC_URL
          );
          const result = await getSplitDetails(
            provider,
            message.conversationId,
            message.id
          );
          console.log(
            address,
            result.memberAddresses.findIndex(
              (address1: string) =>
                address1.toLowerCase() == address?.toLowerCase()
            )
          ); //amount
          if (
            !result.memberPaids[
              result.memberAddresses.findIndex(
                (address1: string) =>
                  address1.toLowerCase() == address?.toLowerCase()
              )
            ]
          ) {
            console.log("Not Paid");
          } else {
            console.log("Paid");
            setIsJSONParsable(false);
            message.content =
              "Already paid your split amount".toUpperCase() + message.content;
          }
        } catch (err) {
          console.error("Failed to get split details", err);
        }
      };

      const checkIfUserInSplit = (jsonData: any) => {
        // Check if this is a split message format
        if (
          jsonData.totalAmount &&
          jsonData.ethereumAddresses &&
          jsonData.parsedMemberAmts
        ) {
          // Check if current user's address is in the ethereumAddresses array
          const userAddress = address?.toLowerCase();
          const isUserInSplit = jsonData.ethereumAddresses.some(
            (addr: string) => addr.toLowerCase() === userAddress
          );

          console.log("Checking split message:", {
            userAddress,
            ethereumAddresses: jsonData.ethereumAddresses,
            isUserInSplit,
          });

          setShowExecuteButton(isUserInSplit);
          return isUserInSplit;
        }
        return false;
      };

      // Only if content is string and maybe JSON
      if (typeof message.content === "string") {
        try {
          const parsed = JSON.parse(message.content);
          setParsedJSON(parsed);
          setIsJSONParsable(true);

          // Check if user should see the execute button
          const isUserInSplit = checkIfUserInSplit(parsed);
          if (isUserInSplit) {
            fetchSplitDetails();
          }
        } catch {
          setIsJSONParsable(false);
          setShowExecuteButton(false);
        }
      } else if (
        typeof message.content === "object" &&
        message.content !== null
      ) {
        setParsedJSON(message.content);
        setIsJSONParsable(true);

        // Check if user should see the execute button
        const isUserInSplit = checkIfUserInSplit(message.content);
        if (isUserInSplit) {
          fetchSplitDetails();
        }
      }
    }, [message, address]);

    const formatEthAmount = (weiAmount: string) => {
      try {
        const ethAmount = ethers.formatEther(weiAmount);
        return parseFloat(ethAmount).toFixed(4);
      } catch {
        return "0.0000";
      }
    };

    const renderSplitMessage = () => {
      if (!parsedJSON || !isJSONParsable) return null;

      // Check if this is a split message
      if (
        parsedJSON.totalAmount &&
        parsedJSON.ethereumAddresses &&
        parsedJSON.parsedMemberAmts
      ) {
        const totalEth = formatEthAmount(parsedJSON.totalAmount);
        const initiatorEth = formatEthAmount(parsedJSON.initiatorAmt);
        const userAddress = address?.toLowerCase();
        const userIndex = parsedJSON.ethereumAddresses.findIndex(
          (addr: string) => addr.toLowerCase() === userAddress
        );
        const userAmount =
          userIndex !== -1
            ? formatEthAmount(parsedJSON.parsedMemberAmts[userIndex])
            : null;

        return (
          <div className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border border-green-500/30 rounded-2xl p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-5 h-5 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                />
              </svg>
              <span className="text-green-400 font-semibold text-sm">
                Split Payment
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm mr-2">Total Amount</span>
                <span className="text-white font-bold">{totalEth} ETH</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-300 text-sm">Initiator Paid</span>
                <span className="text-blue-400 font-medium">
                  {initiatorEth} ETH
                </span>
              </div>

              {userAmount && (
                <div className="flex justify-between items-center bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-2">
                  <span className="text-yellow-400 text-sm font-medium">
                    Your Share
                  </span>
                  <span className="text-yellow-300 font-bold">
                    {userAmount} ETH
                  </span>
                </div>
              )}

              <div className="border-t border-gray-600 pt-3">
                <span className="text-gray-300 text-xs">
                  Participants ({parsedJSON.ethereumAddresses.length + 1})
                </span>
                <div className="mt-2 space-y-1">
                  {parsedJSON.ethereumAddresses.map(
                    (addr: string, index: number) => (
                      <div
                        key={addr}
                        className="flex justify-between items-center text-xs"
                      >
                        <span
                          className={`font-mono ${
                            addr.toLowerCase() === userAddress
                              ? "text-yellow-400"
                              : "text-gray-400"
                          }`}
                        >
                          {addr.toLowerCase() === userAddress
                            ? "You"
                            : `${addr.slice(0, 6)}...${addr.slice(-4)}`}
                        </span>
                        <span className="text-gray-300">
                          {formatEthAmount(parsedJSON.parsedMemberAmts[index])}{" "}
                          ETH
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }

      return null;
    };

    const messageContent =
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content, null, 2);

    const words = messageContent.split(" ");
    const wrappedContent = words.reduce((acc: string[], word: string) => {
      if (acc.length === 0) return [word];
      const lastLine = acc[acc.length - 1];
      if (lastLine.length + word.length + 1 > 50) return [...acc, word];
      acc[acc.length - 1] = `${lastLine} ${word}`;
      return acc;
    }, []);

    const handleExecute = () => {
      console.log("Executing JSON message:", parsedJSON);
      api
        .get(
          `${process.env.NEXT_PUBLIC_BASE_URL}/x402?ConversationId=${message.conversationId}&MessageId=${message.id}&address=${address}`
        )
        .then((response) => {
          const paymentResponse = decodeXPaymentResponse(
            response.headers["x-payment-response"]
          );
          console.log(paymentResponse);
        })
        .catch(console.error);
    };

    return (
      <div className={`flex ${isSent ? "justify-end" : "justify-start"} mb-4`}>
        <div
          className={`max-w-[85%] rounded-2xl px-4 py-3.5 ${
            isSent
              ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md shadow-xl shadow-blue-500/25 border border-blue-500/30"
              : "bg-gradient-to-br from-gray-800/90 to-gray-900/90 text-gray-100 rounded-bl-md shadow-xl border border-gray-700/50 backdrop-blur-xl"
          }`}
        >
          <div className="space-y-1">
            {isJSONParsable && parsedJSON?.totalAmount ? (
              // Render split payment UI
              <>
                {renderSplitMessage()}
                {showExecuteButton && (
                  <button
                    onClick={handleExecute}
                    className={`mt-3 w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isSent
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg"
                        : "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg"
                    }`}
                  >
                    💳 Pay Your Share
                  </button>
                )}
              </>
            ) : (
              // Render regular message
              <>
                {wrappedContent.map(
                  (
                    line:
                      | string
                      | number
                      | bigint
                      | boolean
                      | ReactElement<any, string | JSXElementConstructor<any>>
                      | Iterable<ReactNode>
                      | ReactPortal
                      | Promise<AwaitedReactNode>
                      | null
                      | undefined,
                    i: Key | null | undefined
                  ) => (
                    <p
                      key={i}
                      className="text-sm leading-relaxed break-words whitespace-pre-wrap"
                    >
                      {line}
                    </p>
                  )
                )}
                {isJSONParsable && showExecuteButton && (
                  <button
                    onClick={handleExecute}
                    className={`mt-3 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 ${
                      isSent
                        ? "bg-blue-500 text-white hover:bg-blue-400"
                        : "bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-600"
                    } shadow-sm`}
                  >
                    Execute Payment
                  </button>
                )}
              </>
            )}
          </div>
          <p
            className={`text-xs mt-2 ${
              isSent ? "text-blue-100" : "text-gray-400"
            }`}
          >
            {isSent ? `You` : `${formatAddress(senderAddress)}`}
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
    const [conversationType, setConversationType] =
      useState<NewConversationType>(NewConversationType.Direct);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!address) return;

      setIsLoading(true);
      setError(null);

      try {
        if (conversationType === NewConversationType.Direct) {
          await handleNewConversation(address);
        } else {
          console.log("Creating group chat with addresses:", address);
          setNewConversationType(NewConversationType.Group);
          setNewRecipient(address);
          await handleCreateConversation();
        }
        setAddress("");
        onClose();
      } catch (e) {
        console.error("Failed to create conversation:", e);
        setError("Failed to create conversation");
      } finally {
        setIsLoading(false);
      }
    };

    const handleTypeChange = (type: NewConversationType) => {
      console.log("Changing conversation type to:", type);
      setConversationType(type);
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-80 flex items-end justify-center z-50 backdrop-blur-sm">
        <div className="bg-gray-900 rounded-t-3xl p-6 w-full max-w-md border-t border-gray-700 shadow-2xl">
          <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6"></div>
          <h2 className="text-xl font-bold mb-6 text-white text-center">
            New Conversation
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="flex gap-1 mb-4 bg-gray-800 rounded-full p-1">
                <button
                  type="button"
                  onClick={() => handleTypeChange(NewConversationType.Direct)}
                  className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all duration-200 ${
                    conversationType === NewConversationType.Direct
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Direct
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange(NewConversationType.Group)}
                  className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all duration-200 ${
                    conversationType === NewConversationType.Group
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Group
                </button>
              </div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-300 mb-3"
              >
                {conversationType === NewConversationType.Direct
                  ? "Ethereum Address"
                  : "Ethereum Addresses"}
              </label>
              <input
                type="text"
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={
                  conversationType === NewConversationType.Direct
                    ? "0x..."
                    : "0x..., 0x..., 0x..."
                }
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500"
                required
              />
              {conversationType === NewConversationType.Group && (
                <p className="mt-2 text-xs text-gray-500">
                  Enter multiple addresses separated by commas
                </p>
              )}
            </div>
            {error && (
              <div className="p-3 bg-red-900 border border-red-700 rounded-xl">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 text-gray-300 bg-gray-800 rounded-2xl hover:bg-gray-700 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !address}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  "Create"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const syncAll = async () => {
    if (!client || isSyncing) return;

    try {
      setIsSyncing(true);
      console.log("Starting sync...");

      // Sync all conversations and messages
      await client.conversations.syncAll();

      // Sync preferences
      await client.preferences.sync();

      // Update conversations list
      const updatedConversations = await client.conversations.list();
      setConversations(updatedConversations);

      // If there's a selected conversation, sync its messages
      if (selectedConversation) {
        await selectedConversation.sync();
        const updatedMessages = await selectedConversation.messages();
        setMessages(updatedMessages);
      }

      setLastSyncTime(Date.now());
      setIsInitialSyncDone(true);
      console.log("Sync completed successfully");
    } catch (error) {
      console.error("Error during sync:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Initial sync effect
  useEffect(() => {
    if (!client || isInitialSyncDone) return;

    syncAll();
  }, [client, isInitialSyncDone]);

  // Periodic sync effect
  useEffect(() => {
    if (!client || !isInitialSyncDone) return;

    const syncInterval = setInterval(() => {
      const now = Date.now();
      // Only sync if it's been more than 30 seconds since the last sync
      if (now - lastSyncTime > 30000) {
        syncAll();
      }
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [client, lastSyncTime, isInitialSyncDone]);

  // Reset initial sync when client changes
  useEffect(() => {
    setIsInitialSyncDone(false);
  }, [client]);

  // Update useEffect to handle conversation rendering
  useEffect(() => {
    const renderConversations = async () => {
      if (!client || loading.conversations) return;

      if (conversations.length === 0) {
        setRenderedConversations([
          <div key="empty" className="p-8 text-center">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-gray-400 mb-4">
              {activeTab === "dms" ? "No direct messages yet" : "No groups yet"}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-500 transition-all duration-200"
            >
              {activeTab === "dms" ? "Start messaging" : "Create group"}
            </button>
          </div>,
        ]);
        return;
      }

      try {
        // Filter conversations based on active tab
        const filteredConversations = await Promise.all(
          conversations.map(async (convo) => {
            const isGroup = await isGroupConversation(convo);
            return { convo, isGroup };
          })
        );

        const tabFilteredConversations = filteredConversations
          .filter(({ isGroup }) => {
            return activeTab === "groups" ? isGroup : !isGroup;
          })
          .map(({ convo }) => convo);

        if (tabFilteredConversations.length === 0) {
          setRenderedConversations([
            <div key="empty" className="p-8 text-center">
              <div className="mb-4">
                <svg
                  className="w-16 h-16 mx-auto text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <p className="text-gray-400 mb-4">
                {activeTab === "dms"
                  ? "No direct messages yet"
                  : "No groups yet"}
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-500 transition-all duration-200"
              >
                {activeTab === "dms" ? "Start messaging" : "Create group"}
              </button>
            </div>,
          ]);
          return;
        }

        const rendered = await Promise.all(
          tabFilteredConversations
            .sort(
              (a, b) =>
                new Date(b.createdAt || 0).getTime() -
                new Date(a.createdAt || 0).getTime()
            )
            .map(async (convo) => {
              try {
                const name = await formatConversationName(convo);
                const type = await getConversationType(convo);

                // Skip empty groups
                if (type === "Empty Group") return null;

                // For groups with 2 members, show it as a DM
                if (
                  type === "Direct Message" &&
                  typeof (convo as any).members === "function"
                ) {
                  const members = await getGroupMembersWithAddresses(convo);
                  if (members.length === 1) {
                    return (
                      <div
                        key={convo.id}
                        onClick={() => handleConversationSelect(convo)}
                        className={`mx-2 my-1 p-4 cursor-pointer rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${
                          selectedConversation?.id === convo.id
                            ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-400/50 shadow-lg shadow-blue-500/20"
                            : "bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/30 hover:border-gray-600/50 hover:bg-gray-700/50 backdrop-blur-sm"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                            <span className="text-sm font-bold text-white">
                              {name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white truncate text-lg">
                              {name}
                            </p>
                            <p className="text-sm text-gray-400 truncate flex items-center gap-2">
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                              </svg>
                              Direct Message
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <div className="w-3 h-3 bg-green-400 rounded-full shadow-sm"></div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                }

                // For other conversations
                return (
                  <div
                    key={convo.id}
                    onClick={() => handleConversationSelect(convo)}
                    className={`mx-2 my-1 p-4 cursor-pointer rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${
                      selectedConversation?.id === convo.id
                        ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-400/50 shadow-lg shadow-blue-500/20"
                        : "bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/30 hover:border-gray-600/50 hover:bg-gray-700/50 backdrop-blur-sm"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                        <span className="text-sm font-bold text-white">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate text-lg">
                          {name}
                        </p>
                        <p className="text-sm text-gray-400 truncate flex items-center gap-2">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                          {type}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-3 h-3 bg-green-400 rounded-full shadow-sm"></div>
                      </div>
                    </div>
                  </div>
                );
              } catch (e) {
                console.error("Error rendering conversation:", e);
                return null;
              }
            })
        );

        setRenderedConversations(rendered.filter(Boolean) as JSX.Element[]);
      } catch (e) {
        console.error("Error rendering conversations:", e);
        setRenderedConversations([
          <div key="error" className="p-4 text-center text-red-500">
            Error loading conversations
          </div>,
        ]);
      }
    };

    renderConversations();
  }, [
    client,
    conversations,
    loading.conversations,
    selectedConversation?.id,
    activeTab,
  ]);

  return (
    <>
      <div className="h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 text-white flex flex-col overflow-hidden">
        {/* Main Content Area */}
        <div className="flex flex-col flex-1 min-h-0">
          {!selectedConversation ? (
            /* Conversations List View */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Top Header */}
              <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-xl border-b border-gray-700/50 px-6 py-4 flex-shrink-0">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-bold">S402</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ConnectButton showBalance={false} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end items-center gap-2  p-4">
                <button
                  onClick={syncAll}
                  disabled={isSyncing}
                  className={`p-2.5 rounded-xl bg-gray-800/80 hover:bg-gray-700/80 transition-all duration-200 ${
                    isSyncing ? "opacity-50 cursor-not-allowed" : ""
                  } backdrop-blur-sm border border-gray-600/30`}
                  title={isSyncing ? "Syncing..." : "Sync conversations"}
                >
                  <svg
                    className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setIsModalOpen(true)}
                  disabled={!client}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all duration-200 disabled:opacity-50 shadow-lg border border-blue-500/30"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>
              {/* Conversations List */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full overflow-y-auto px-2 py-4 space-y-2">
                  {loading.conversations ? (
                    <div className="flex items-center justify-center p-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent"></div>
                        <p className="text-gray-400 text-sm">
                          Loading conversations...
                        </p>
                      </div>
                    </div>
                  ) : renderedConversations.length > 0 ? (
                    renderedConversations
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center p-8 max-w-sm">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl flex items-center justify-center border border-gray-700/50">
                          <svg
                            className="w-12 h-12 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">
                          {activeTab === "dms"
                            ? "No direct messages"
                            : "No groups yet"}
                        </h3>
                        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                          {activeTab === "dms"
                            ? "Start a conversation with friends and family"
                            : "Create a group to split expenses with multiple people"}
                        </p>
                        <button
                          onClick={() => setIsModalOpen(true)}
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:from-blue-500 hover:to-purple-500 transition-all duration-200 shadow-lg border border-blue-500/30"
                        >
                          {activeTab === "dms"
                            ? "Start messaging"
                            : "Create group"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Navigation */}
              <div className="bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-xl border-t border-gray-700/50 flex-shrink-0">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab("dms")}
                    className={`flex-1 py-4 px-6 transition-all duration-300 ${
                      activeTab === "dms"
                        ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-t-2 border-blue-400"
                        : "hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <svg
                        className={`w-5 h-5 ${
                          activeTab === "dms"
                            ? "text-blue-400"
                            : "text-gray-400"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      <span
                        className={`text-xs font-medium ${
                          activeTab === "dms"
                            ? "text-blue-400"
                            : "text-gray-400"
                        }`}
                      >
                        Messages
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab("groups")}
                    className={`flex-1 py-4 px-6 transition-all duration-300 ${
                      activeTab === "groups"
                        ? "bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-t-2 border-blue-400"
                        : "hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <svg
                        className={`w-5 h-5 ${
                          activeTab === "groups"
                            ? "text-blue-400"
                            : "text-gray-400"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span
                        className={`text-xs font-medium ${
                          activeTab === "groups"
                            ? "text-blue-400"
                            : "text-gray-400"
                        }`}
                      >
                        Groups
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Chat View */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-xl border-b border-gray-700/50 px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="p-2 rounded-xl hover:bg-gray-800/50 transition-all duration-200 border border-gray-700/30"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      />
                    </svg>
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold">
                        {conversationNames[selectedConversation.id]?.charAt(
                          0
                        ) || "?"}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white truncate max-w-[200px]">
                        {conversationNames[selectedConversation.id] ||
                          "Unknown"}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {conversationTypes[selectedConversation.id] || "Chat"}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={openSplitModal}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm rounded-xl font-medium hover:from-green-500 hover:to-emerald-500 transition-all duration-200 shadow-lg border border-green-500/30"
                >
                  💰 Split
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-hidden bg-gradient-to-b from-black/20 to-gray-950/20">
                <div className="h-full overflow-y-auto p-4 space-y-3">
                  {loading.messages ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                        <p className="text-gray-400 text-sm">
                          Loading messages...
                        </p>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center p-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center border border-gray-700/50">
                          <svg
                            className="w-8 h-8 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-200 mb-2">
                          Start the conversation
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Send the first message to get things started!
                        </p>
                      </div>
                    </div>
                  ) : (
                    messages.map((message, index) => {
                      // Cast message to RuntimeDecodedMessage type
                      const runtimeMessage = message as RuntimeDecodedMessage;

                      // Get the current user's inbox ID and address for comparison
                      const currentInboxId = client?.inboxId;
                      const currentAddress =
                        (client as any)?.address || address;

                      // Try multiple ways to determine if message is sent by current user
                      const isSent =
                        runtimeMessage.senderInboxId === currentInboxId ||
                        (runtimeMessage.senderAddress &&
                          currentAddress &&
                          runtimeMessage.senderAddress.toLowerCase() ===
                            currentAddress.toLowerCase()) ||
                        (messageAddresses[runtimeMessage.senderInboxId || ""] &&
                          currentAddress &&
                          messageAddresses[
                            runtimeMessage.senderInboxId || ""
                          ].toLowerCase() === currentAddress.toLowerCase());

                      const senderAddress =
                        messageAddresses[runtimeMessage.senderInboxId || ""] ||
                        runtimeMessage.senderAddress ||
                        "Unknown";

                      return (
                        <MessageItem
                          key={index}
                          message={runtimeMessage}
                          isSent={isSent}
                          senderAddress={senderAddress}
                        />
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <div className="bg-gradient-to-r from-gray-900/90 to-gray-800/90 backdrop-blur-xl border-t border-gray-700/50 p-4 flex-shrink-0">
                <form
                  onSubmit={(e) => handleSendMessage(e)}
                  className="flex gap-3"
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 rounded-2xl bg-gray-800/80 border border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-200"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || loading.send}
                    className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg border border-blue-500/30"
                  >
                    {loading.send ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        <SplitModal
          isOpen={isSplitModalOpen}
          onClose={() => setIsSplitModalOpen(false)}
          signer={splitSigner}
          initiatorAddress={address || ""}
          conversationId={selectedConversation?.id || ""}
          members={members}
          onBeforeCreate={async (input) => {
            console.log("onBeforeCreate", input);
            const id = await sendMessage(JSON.stringify(input));
            return id;
          }}
        />
      </div>
      <NewConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
