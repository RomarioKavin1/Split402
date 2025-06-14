import React, { useState, useEffect } from "react";
import { createSplit } from "../lib/splitManagement/contractInteraction";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";

interface AccountIdentifier {
  identifier: string;
  identifierKind: string;
}

interface Member {
  accountIdentifiers: AccountIdentifier[];
  [key: string]: any; // For inboxId, etc.
}

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  signer: ethers.Signer | null;
  initiatorAddress: string;
  conversationId: string;
  members: Member[];
  onSuccess?: (txHash: string) => void;
  onBeforeCreate?: (input: OnBeforeCreateInput) => Promise<string | null>;
}

interface OnBeforeCreateInput {
  totalAmount: string;
  initiatorAmt: string;
  ethereumAddresses: string[];
  parsedMemberAmts: string[];
}

const SplitModal: React.FC<SplitModalProps> = ({
  isOpen,
  onClose,
  signer,
  initiatorAddress,
  conversationId,
  members,
  onSuccess,
  onBeforeCreate,
}) => {
  const [splitTotal, setSplitTotal] = useState("");
  const [initiatorAmount, setInitiatorAmount] = useState("");
  const [memberAmounts, setMemberAmounts] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const ethereumAddresses = members
    .map(
      (m) =>
        m.accountIdentifiers.find((id) => id.identifierKind === "Ethereum")
          ?.identifier
    )
    .filter(
      (addr): addr is string =>
        typeof addr === "string" &&
        addr.toLowerCase() !== initiatorAddress.toLowerCase()
    );

  // Ensure memberAmounts length matches addresses
  useEffect(() => {
    setMemberAmounts(ethereumAddresses.map(() => ""));
  }, [ethereumAddresses.length]);

  // Auto-calculate equal splits
  useEffect(() => {
    if (splitType === "equal" && splitTotal && ethereumAddresses.length > 0) {
      const totalMembers = ethereumAddresses.length + 1; // +1 for initiator
      const equalAmount = (parseFloat(splitTotal) / totalMembers).toFixed(4);
      setInitiatorAmount(equalAmount);
      setMemberAmounts(ethereumAddresses.map(() => equalAmount));
    }
  }, [splitTotal, splitType, ethereumAddresses.length]);

  const handleMemberAmountChange = (index: number, value: string) => {
    const updated = [...memberAmounts];
    updated[index] = value;
    setMemberAmounts(updated);
  };

  const formatAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const getTotalAssigned = () => {
    const initiator = parseFloat(initiatorAmount) || 0;
    const members = memberAmounts.reduce(
      (sum, amt) => sum + (parseFloat(amt) || 0),
      0
    );
    return initiator + members;
  };

  const getRemainingAmount = () => {
    const total = parseFloat(splitTotal) || 0;
    const assigned = getTotalAssigned();
    return total - assigned;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!signer) throw new Error("No signer provided");
      if (!splitTotal || !initiatorAmount)
        throw new Error("Enter all required fields");
      if (!conversationId || !initiatorAddress)
        throw new Error("Missing context");
      if (ethereumAddresses.length === 0)
        throw new Error("No valid member addresses");

      // Validate amounts match total
      const remaining = getRemainingAmount();
      if (Math.abs(remaining) > 0.0001) {
        throw new Error(
          `Amounts don't match total. ${
            remaining > 0 ? "Missing" : "Excess"
          }: ${Math.abs(remaining).toFixed(4)} ETH`
        );
      }

      const totalAmount = ethers.parseEther(splitTotal).toString();
      const initiatorAmt = ethers.parseEther(initiatorAmount).toString();

      // Validate and parse member amounts
      const parsedMemberAmts = memberAmounts.map((amt, i) => {
        if (!amt)
          throw new Error(
            `Missing amount for member ${formatAddress(ethereumAddresses[i])}`
          );
        return ethers.parseEther(amt).toString();
      });

      let messageId = `split-${Date.now()}`;
      if (onBeforeCreate) {
        const maybeId = await onBeforeCreate({
          totalAmount,
          initiatorAmt,
          ethereumAddresses,
          parsedMemberAmts,
        });
        if (maybeId) {
          messageId = maybeId;
        }
      }

      const tx = await createSplit(
        signer,
        conversationId,
        messageId,
        totalAmount,
        initiatorAddress,
        initiatorAmt,
        ethereumAddresses,
        parsedMemberAmts
      );

      await tx.wait();
      setSuccess("Split created successfully!");
      if (onSuccess) onSuccess(tx.hash);

      setTimeout(() => {
        setSuccess(null);
        onClose();
        // Reset form
        setSplitTotal("");
        setInitiatorAmount("");
        setMemberAmounts([]);
        setSplitType("equal");
      }, 2000);
    } catch (e: any) {
      setError(e.message || "Failed to create split");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden border border-gray-700/50"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-700/50 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
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
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Create Split
                    </h2>
                    <p className="text-sm text-gray-400">
                      Split expenses with your group
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-gray-700/50 transition-colors text-gray-400 hover:text-white"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Total Amount */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Total Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={splitTotal}
                    onChange={(e) => setSplitTotal(e.target.value)}
                    placeholder="0.0000"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 text-white placeholder-gray-400 pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                    ETH
                  </span>
                </div>
              </div>

              {/* Split Type Toggle */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                  Split Type
                </label>
                <div className="flex gap-1 bg-gray-800/50 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setSplitType("equal")}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                      splitType === "equal"
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    Equal Split
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType("custom")}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                      splitType === "custom"
                        ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    Custom Split
                  </button>
                </div>
              </div>

              {/* Your Share */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Your Share
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.0001"
                    value={initiatorAmount}
                    onChange={(e) => setInitiatorAmount(e.target.value)}
                    placeholder="0.0000"
                    disabled={splitType === "equal"}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 text-white placeholder-gray-400 pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                    ETH
                  </span>
                </div>
              </div>

              {/* Member Shares */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                  Member Shares ({ethereumAddresses.length} members)
                </label>
                <div className="space-y-3">
                  {ethereumAddresses.map((addr, i) => (
                    <motion.div
                      key={addr}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-xl border border-gray-700/30"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">
                          {addr.charAt(2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {formatAddress(addr)}
                        </p>
                        <p className="text-xs text-gray-400">Member {i + 1}</p>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.0001"
                          placeholder="0.0000"
                          value={memberAmounts[i] || ""}
                          onChange={(e) =>
                            handleMemberAmountChange(i, e.target.value)
                          }
                          disabled={splitType === "equal"}
                          className="w-24 px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white placeholder-gray-400 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="absolute -bottom-5 right-0 text-xs text-gray-500">
                          ETH
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Amount Summary */}
              {splitTotal && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-4"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">
                        Total Amount:
                      </span>
                      <span className="text-sm font-medium text-white">
                        {splitTotal} ETH
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Assigned:</span>
                      <span className="text-sm font-medium text-white">
                        {getTotalAssigned().toFixed(4)} ETH
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Remaining:</span>
                      <span
                        className={`text-sm font-medium ${
                          Math.abs(getRemainingAmount()) < 0.0001
                            ? "text-green-400"
                            : "text-yellow-400"
                        }`}
                      >
                        {getRemainingAmount().toFixed(4)} ETH
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Error/Success Messages */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-red-900/20 border border-red-500/30 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-5 h-5 text-red-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="text-sm text-red-300">{error}</p>
                    </div>
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-green-900/20 border border-green-500/30 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-5 h-5 text-green-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <p className="text-sm text-green-300">{success}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="bg-gray-900/50 border-t border-gray-700/50 p-6">
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-3 px-4 text-gray-300 bg-gray-800/50 rounded-xl hover:bg-gray-700/50 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={
                    loading ||
                    !splitTotal ||
                    !initiatorAmount ||
                    Math.abs(getRemainingAmount()) > 0.0001
                  }
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Creating...
                    </>
                  ) : (
                    <>
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
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                        />
                      </svg>
                      Create Split
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SplitModal;
