"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface BillItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
  assignedTo?: string;
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

interface Member {
  name: string;
  walletAddress: string;
  items: BillItem[];
  totalAmount: number;
  proportion: number;
  splitType: 'items' | 'proportional';
}

export default function SplitPage() {
  const router = useRouter();
  const [billData, setBillData] = useState<BillData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberWallet, setNewMemberWallet] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitMode, setSplitMode] = useState<'items' | 'proportional'>('items');

  // Load bill data from localStorage on mount
  useEffect(() => {
    const savedBillData = localStorage.getItem("billData");
    if (savedBillData) {
      setBillData(JSON.parse(savedBillData));
    }
  }, []);

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

  const calculateUnassignedAmount = () => {
    if (!billData) return 0;
    const assignedAmount = members.reduce((sum, m) => sum + m.totalAmount, 0);
    return billData.totalAmount - assignedAmount;
  };

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

      // Save to localStorage for the main page to process
      localStorage.setItem("splitData", JSON.stringify(splitData));
      
      // Navigate to main page
      router.push("/");
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
