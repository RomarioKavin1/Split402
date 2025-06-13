import React, { useState } from "react";
import { createSplit } from "../lib/splitManagement/contractInteraction";
import { ethers } from "ethers";

interface AccountIdentifier {
  identifier: string;
  identifierKind: string;
}

interface Member {
  accountIdentifiers: AccountIdentifier[];
  [key: string]: any; // other props like inboxId, etc.
}

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  signer: ethers.Signer | null;
  initiatorAddress: string;
  conversationId: string;
  members: Member[];
  onSuccess?: (txHash: string) => void;
}

const SplitModal: React.FC<SplitModalProps> = ({
  isOpen,
  onClose,
  signer,
  initiatorAddress,
  conversationId,
  members,
  onSuccess,
}) => {
  const [splitTotal, setSplitTotal] = useState("");
  const [initiatorAmount, setInitiatorAmount] = useState("");
  const [memberAmounts, setMemberAmounts] = useState<string[]>(
    members.map(() => "")
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const ethereumAddresses = members.flatMap((member) =>
    member.accountIdentifiers
      .filter(
        (id) =>
          id.identifierKind === "Ethereum" &&
          id.identifier.toLowerCase() !== initiatorAddress.toLowerCase()
      )
      .map((id) => id.identifier)
  );

  const handleMemberAmountChange = (index: number, value: string) => {
    const updated = [...memberAmounts];
    updated[index] = value;
    setMemberAmounts(updated);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (!signer) throw new Error("No signer provided");
      if (!splitTotal || !initiatorAmount)
        throw new Error("Enter all required fields");
      if (members.length === 0) throw new Error("Add at least one member");
      if (!conversationId || !initiatorAddress)
        throw new Error("Missing context");

      setSuccess("Split simulated successfully!");
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1500);
    } catch (e: any) {
      setError(e.message || "Failed to create split");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create Split</h2>
        <div className="mb-2">
          <label className="block mb-1">Total Amount (ETH)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={splitTotal}
            onChange={(e) => setSplitTotal(e.target.value)}
            className="w-full px-3 py-2 rounded border dark:bg-gray-700"
          />
        </div>
        <div className="mb-2">
          <label className="block mb-1">Your Share (ETH)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={initiatorAmount}
            onChange={(e) => setInitiatorAmount(e.target.value)}
            className="w-full px-3 py-2 rounded border dark:bg-gray-700"
          />
        </div>
        <div className="mb-2">
          <label className="block mb-1">Member Shares</label>
          {ethereumAddresses.map((addr, i) => (
            <div key={addr} className="flex gap-2 mb-1 items-center">
              <span className="text-sm text-gray-500 w-52 truncate">
                {addr}
              </span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="Amount"
                value={memberAmounts[i]}
                onChange={(e) => handleMemberAmountChange(i, e.target.value)}
                className="w-24 px-2 py-1 rounded border dark:bg-gray-700"
              />
            </div>
          ))}
        </div>
        {error && <div className="text-red-500 mb-2">{error}</div>}
        {success && <div className="text-green-600 mb-2">{success}</div>}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded border">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Split"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SplitModal;
