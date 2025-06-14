"use client";
import {
  Client,
  Identifier,
} from "@xmtp/browser-sdk";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { initXMTP } from "@/lib/xmtpClient";
import { Conversation, DecodedMessage } from "@xmtp/browser-sdk";
import axios from "axios";
import { useAccount, useConnectorClient } from "wagmi";
import { withPaymentInterceptor } from "x402-axios";
import { useWagmiAccount } from "../app/page";
import { ethers, Wallet } from "ethers";
import { listConversations } from "@/lib/messaging";
import { createSplit, getSplitDetails } from "@/lib/splitManagement/contractInteraction";
import { Provider } from "@radix-ui/react-toast";

interface BillItem {  
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
  assignedTo?: string;
}
interface RuntimeDecodedMessage extends DecodedMessage {
  senderAddress: string;
}

enum NewConversationType {
  Direct = "direct",
  Group = "group",
}
interface BillData {
  title: string;
  description: string;
  totalAmount: number;
  taxAmount: number;
  date: string;
  merchant: string;
  items: BillItem[];
  paymentMethod: string;
  confidence: number;
  missingInfo: string[];
}
// Define types
type AnyConversation = Conversation<any>;
type ConsentState = "allowed" | "denied" | "unknown";
interface Member {
  name: string;
  walletAddress: string;
  items: BillItem[];
  totalAmount: number;
  proportion: number;
  splitType: 'items' | 'proportional';
}

export default function SplitPage() {
  const { address, isConnected } = useAccount();
    const { data: connectorClient } = useConnectorClient();
    useEffect(() => {
      const savedBillData = localStorage.getItem("billData");
      if (savedBillData) {
        setBillData(JSON.parse(savedBillData));
      }
    }, []);
  
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
    
   
      const [splitSigner, setSplitSigner] = useState<ethers.Signer | null>(null);

      // Bottom nav state
    
      // Helper to open modal and get signer
      const initSplitModal = async () => {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const signer = await provider.getSigner();
          setSplitSigner(signer);
      };
    // For more advanced usage, you can get the full account from the connector
    const account = useWagmiAccount();
    const api = withPaymentInterceptor(
      axios.create({
        baseURL: process.env.NEXT_PUBLIC_BASE_URL,
      }),
      account as any
    );
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
  
    // Bottom nav state
    const [activeTab, setActiveTab] = useState<"dms" | "groups">("dms");
  
  const router = useRouter();
  const [billData, setBillData] = useState<BillData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberWallet, setNewMemberWallet] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitMode, setSplitMode] = useState<'items' | 'proportional'>('items');

  // Load bill data from localStorage on mount

  const addMember = () => {
    if (!newMemberName.trim()) {
      toast.error("Please enter a member name");
      return;
    }

    const newMember: Member = {
      name: newMemberName,
      walletAddress: newMemberWallet,
      items: [],
      totalAmount: 0,
      proportion: 0,
      splitType: splitMode
    };

    setMembers([...members, newMember]);
    setNewMemberName("");
    setNewMemberWallet("");
  };

  const assignItem = (item: BillItem, memberName: string) => {
    if (!billData) return;

    // Remove item from previous assignee if any
    const updatedMembers = members.map(m => ({
      ...m,
      items: m.items.filter(i => i.name !== item.name),
      totalAmount: m.items.reduce((sum, i) => i.name !== item.name ? sum + i.totalPrice : sum, 0)
    }));

    // Assign item to new member
    const finalMembers = updatedMembers.map(m => {
      if (m.name === memberName) {
        const newItems = [...m.items, item];
        return {
          ...m,
          items: newItems,
          totalAmount: newItems.reduce((sum, i) => sum + i.totalPrice, 0)
        };
      }
      return m;
    });

    setMembers(finalMembers);
  };

  const handleProportionChange = (memberName: string, proportion: number) => {
    if (!billData) return;

    const updatedMembers = members.map(m => {
      if (m.name === memberName) {
        return {
          ...m,
          proportion,
          totalAmount: billData.totalAmount * proportion
        };
      }
      return m;
    });

    setMembers(updatedMembers);
  };

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
    }
  

  const calculateUnassignedAmount = () => {
    if (!billData) return 0;
    const assignedAmount = members.reduce((sum, m) => sum + m.totalAmount, 0);
    return billData.totalAmount - assignedAmount;
  };

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


  useEffect(() => {
    console.log("isConnected", isConnected);
    console.log("address", address);
    console.log("client", client);
    if (!isConnected) {
      cleanupStates();
    } else if (isConnected && address && !client) {
      initClient();
    }
  }, [isConnected, address, client, initClient, cleanupStates]);

  useEffect(() => {
    const savedBillData = localStorage.getItem("billData");
    if (savedBillData) {
      setBillData(JSON.parse(savedBillData));
    }
  }, []);
  function toFixed18String(amount: string | number): string {
    return ethers.parseUnits(amount.toString(), 18).toString();
  }
  const handleSubmit = async () => {
    if (!billData) return;

    setIsProcessing(true);
    try {
      // Validate split
      const unassignedAmount = calculateUnassignedAmount();
      if (unassignedAmount > 0.01) { // Allow for small floating point differences
        toast.error(`There is still $${unassignedAmount.toFixed(2)} unassigned`);
        setIsProcessing(false);
        return;
      }

      // Create split data
      const splitData = {
        title: billData.title,
        description: billData.description,
        totalAmount: billData.totalAmount,
        initiator: {
          name: members[0]?.name || "Unknown",
          amount: members[0]?.totalAmount || 0,
          proportion: members[0]?.proportion || 0,
          walletAddress: members[0]?.walletAddress || "not_provided",
        },
        members: members.slice(1).map((m) => ({
          name: m.name,
          amount: m.totalAmount,
          proportion: m.proportion,
          walletAddress: m.walletAddress || "not_provided",
        })),
        createdAt: new Date().toISOString(),
        missingInfo: billData.missingInfo,
      };
      setNewConversationType(NewConversationType.Group);
      
      //get all members addressesinside members array
      initClient()
      if(client){
         await loadConversations()
      await listConversations(client)
      }
      initSplitModal()
      const allMembersAddresses = members.map((m) => m.walletAddress);
      setNewRecipient(allMembersAddresses.join(","));
      console.log("New Recipient:", newRecipient);
      handleCreateConversation()
      handleConversationSelect(selectedConversation!)
      const totalAmount = billData.totalAmount;
      const initiatorAmt: string = splitData.initiator.amount.toString();

      const ethereumAddresses: string[] = members.map((m) => m.walletAddress);

      const initiatorAmt18 = toFixed18String(splitData.initiator.amount);
      
      // Make sure all member amounts are strings
      const parsedMemberAmts: string[] = members.map((m) => m.totalAmount.toString());
      
      sendMessage(JSON.stringify({
        totalAmount,
        initiatorAmt,
        ethereumAddresses,
        parsedMemberAmts,
      }))
      initSplitModal()
      createSplit(
        splitSigner!,
        selectedConversation?.id!,
        lastMessageId!,
        totalAmount!, // likely string
        address!, // initiator address
        initiatorAmt18, // ✅ parse string to BigInt (wei)
        ethereumAddresses!,
        parsedMemberAmts.map((amt) => toFixed18String(amt)) // ✅ each member amt parsed to wei
      );
            // Save to localStorage for the main page to process
      localStorage.setItem("splitData", JSON.stringify(splitData));
      router.push("/app");
      // Navigate to main page
    } catch (error) {
      console.error("Error creating split:", error);
      toast.error("Failed to create split");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!billData) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
            No Bill Data Found
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400">
            Please scan a bill first to proceed with splitting.
          </p>
        </div>
      </div>
    );
  }

  const unassignedAmount = calculateUnassignedAmount();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          Split Bill
        </h1>

        {/* Split Mode Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Split Mode</h2>
          <div className="flex space-x-4">
            <Button
              onClick={() => setSplitMode('items')}
              variant={splitMode === 'items' ? 'default' : 'outline'}
              className="flex-1"
            >
              Split by Items
            </Button>
            <Button
              onClick={() => setSplitMode('proportional')}
              variant={splitMode === 'proportional' ? 'default' : 'outline'}
              className="flex-1"
            >
              Proportional Split
            </Button>
          </div>
        </div>

        {/* Bill Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md mb-8">
          <h2 className="text-2xl font-semibold mb-4">{billData.title}</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {billData.description}
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">Merchant</p>
              <p className="font-medium">{billData.merchant}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium">
                {new Date(billData.date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="font-medium text-green-600">
                ${billData.totalAmount.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tax</p>
              <p className="font-medium">${billData.taxAmount.toFixed(2)}</p>
            </div>
          </div>
          {unassignedAmount > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
              <p className="text-yellow-800 dark:text-yellow-200">
                Unassigned Amount: ${unassignedAmount.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        {/* Items List */}
        {splitMode === 'items' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4">Items</h2>
            <div className="space-y-4">
              {billData.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      {item.quantity}x ${item.unitPrice.toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <p className="font-medium text-green-600">
                      ${item.totalPrice.toFixed(2)}
                    </p>
                    <select
                      value={members.find(m => m.items.some(i => i.name === item.name))?.name || ""}
                      onChange={(e) => assignItem(item, e.target.value)}
                      className="p-2 border rounded"
                    >
                      <option value="">Assign to...</option>
                      {members.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Members Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Members</h2>
          
          {/* Add Member Form */}
          <div className="flex space-x-4 mb-6">
            <Input
              type="text"
              placeholder="Member Name"
              value={newMemberName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMemberName(e.target.value)}
              className="flex-1"
            />
            <Input
              type="text"
              placeholder="Wallet Address (optional)"
              value={newMemberWallet}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMemberWallet(e.target.value)}
              className="flex-1"
            />
            <Button onClick={addMember}>Add Member</Button>
          </div>

          {/* Members List */}
          <div className="space-y-4">
            {members.map((member, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg"
              >
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="font-medium">{member.name}</p>
                    {member.walletAddress && (
                      <p className="text-sm text-gray-500">
                        {member.walletAddress}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    {splitMode === 'proportional' && (
                      <div>
                        <p className="text-sm text-gray-500">Proportion</p>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={member.proportion}
                          onChange={(e) =>
                            handleProportionChange(member.name, parseFloat(e.target.value))
                          }
                          className="w-24 p-2 border rounded"
                        />
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="font-medium text-green-600">
                        ${member.totalAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
                {member.items.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">Assigned Items:</p>
                    <ul className="list-disc list-inside">
                      {member.items.map((item, i) => (
                        <li key={i} className="text-sm">
                          {item.name} - ${item.totalPrice.toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={isProcessing || members.length === 0 || unassignedAmount > 0.01}
            className="px-8 py-3"
          >
            {isProcessing ? "Creating Split..." : "Create Split"}
          </Button>
        </div>
      </div>
    </div>
  );
} 
