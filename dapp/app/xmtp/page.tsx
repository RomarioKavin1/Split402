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

      // Only if content is string and maybe JSON
      if (typeof message.content === "string") {
        try {
          const parsed = JSON.parse(message.content);
          setParsedJSON(parsed);
          setIsJSONParsable(true);
          fetchSplitDetails();
        } catch {
          setIsJSONParsable(false);
        }
      } else if (
        typeof message.content === "object" &&
        message.content !== null
      ) {
        setParsedJSON(message.content);
        setIsJSONParsable(true);
        fetchSplitDetails();
      }
    }, [message]);

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
      <div
        key={message.id}
        className={`flex ${isSent ? "justify-end" : "justify-start"} mb-4`}
      >
        <div
          className={`max-w-[70%] rounded-2xl p-3 ${
            isSent
              ? "bg-blue-500 text-white rounded-br-none"
              : "bg-gray-200 text-gray-800 rounded-bl-none"
          } shadow-sm`}
        >
          <div className="space-y-1">
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
                <p key={i} className="text-sm break-words whitespace-pre-wrap">
                  {line}
                </p>
              )
            )}
            {isJSONParsable && (
              <button
                onClick={handleExecute}
                className={`mt-2 px-3 py-1 rounded text-xs font-medium ${
                  isSent
                    ? "bg-blue-300 text-blue-900"
                    : "bg-gray-300 text-gray-700"
                } hover:opacity-90`}
              >
                Execute
              </button>
            )}
          </div>
          <p
            className={`text-xs mt-2 ${
              isSent ? "text-blue-100" : "text-gray-500"
            }`}
          >
            {isSent
              ? `You (${formatAddress(senderAddress)})`
              : `${formatAddress(senderAddress)}`}
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">New Conversation</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <div className="flex gap-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value={NewConversationType.Direct}
                    checked={conversationType === NewConversationType.Direct}
                    onChange={() =>
                      handleTypeChange(NewConversationType.Direct)
                    }
                    className="mr-2"
                  />
                  Direct Message
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value={NewConversationType.Group}
                    checked={conversationType === NewConversationType.Group}
                    onChange={() => handleTypeChange(NewConversationType.Group)}
                    className="mr-2"
                  />
                  Group Chat
                </label>
              </div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                {conversationType === NewConversationType.Direct
                  ? "Ethereum Address"
                  : "Ethereum Addresses (comma-separated)"}
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
              {conversationType === NewConversationType.Group && (
                <p className="mt-1 text-sm text-gray-500">
                  Enter multiple addresses separated by commas
                </p>
              )}
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
          <div key="empty" className="p-4 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No conversations yet
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-2 text-blue-500 hover:text-blue-600 font-medium"
            >
              Start a conversation
            </button>
          </div>,
        ]);
        return;
      }

      try {
        const rendered = await Promise.all(
          conversations
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
                        className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 ${
                          selectedConversation?.id === convo.id
                            ? "bg-blue-50 dark:bg-blue-900/50"
                            : ""
                        }`}
                      >
                        <p className="font-semibold">{name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Direct Message
                        </p>
                      </div>
                    );
                  }
                }

                // For other conversations
                return (
                  <div
                    key={convo.id}
                    onClick={() => handleConversationSelect(convo)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 ${
                      selectedConversation?.id === convo.id
                        ? "bg-blue-50 dark:bg-blue-900/50"
                        : ""
                    }`}
                  >
                    <p className="font-semibold">{name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {type}
                    </p>
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
  }, [client, conversations, loading.conversations, selectedConversation?.id]);

  return (
    <>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 py-6">
        <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-lg flex h-[90vh]">
          <div className="w-1/3 border-r dark:border-gray-700 flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold">Conversations</h2>
              <div className="flex gap-2">
                <button
                  onClick={syncAll}
                  disabled={isSyncing}
                  className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    isSyncing ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  title={isSyncing ? "Syncing..." : "Sync conversations"}
                >
                  <svg
                    className={`w-5 h-5 ${isSyncing ? "animate-spin" : ""}`}
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
                  className="text-blue-500 hover:text-blue-600 font-semibold disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto">
              {loading.conversations ? (
                <div className="p-4 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                renderedConversations
              )}
            </div>
            <div className="p-4 border-t dark:border-gray-700">
              <ConnectButton showBalance={false} />
            </div>
          </div>
          <div className="w-2/3 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Split Button */}
                <div className="p-4 border-b dark:border-gray-700 flex justify-end">
                  <button
                    onClick={openSplitModal}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Create Split
                  </button>
                </div>
                <SplitModal
                  isOpen={isSplitModalOpen}
                  onClose={() => setIsSplitModalOpen(false)}
                  signer={splitSigner}
                  initiatorAddress={address || ""}
                  conversationId={selectedConversation.id}
                  members={members}
                  onBeforeCreate={async (input) => {
                    console.log("onBeforeCreate", input);
                    const id = await sendMessage(JSON.stringify(input));
                    return id; // ensure lastMessageId is set after send
                  }}
                />

                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Conversation with {selectedConversation.id}
                    </h3>
                  </div>
                  <button
                    onClick={syncAll}
                    disabled={!client || isSyncing}
                    className="text-blue-500 hover:text-blue-600 font-semibold disabled:opacity-50"
                    title="Sync conversation"
                  >
                    {isSyncing ? "Syncing..." : "↻"}
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
                    messages.map((message, index) => {
                      // Cast message to RuntimeDecodedMessage type
                      const runtimeMessage = message as RuntimeDecodedMessage;

                      // Get the current user's inbox ID and address for comparison
                      const currentInboxId = client?.inboxId;
                      const currentAddress =
                        (client as any)?.address || address;

                      // Debug logging to understand the message structure
                      console.log("Message debug:", {
                        senderInboxId: runtimeMessage.senderInboxId,
                        currentInboxId,
                        senderAddress: runtimeMessage.senderAddress,
                        currentAddress,
                        messageId: runtimeMessage.id,
                      });

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
                </div>
                <div className="p-4 border-t dark:border-gray-700">
                  <form
                    onSubmit={(e) => handleSendMessage(e)}
                    className="flex gap-2"
                  >
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
