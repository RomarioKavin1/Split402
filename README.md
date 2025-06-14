# 💸 Split402 – Real-Time Encrypted Payment Splitting & Settlement Platform

**Split402** is a real-time, end-to-end encrypted payment splitting platform built on top of:

* 🔗 **[Coinbase's X402 Protocol](https://docs.cloud.coinbase.com/x402/)** – for trustless and programmable settlement flows(Custom made Dynamic payment detail interceptor)
* 🔐 **[XMTP Protocol](https://xmtp.org)** – for encrypted messaging and tamper-proof split metadata
* 🧊 **[Base Network](https://base.org)** – for low-cost, scalable stablecoin transactions using **Base USDC**

> 🟢 **Deployed Contract**: [`0x4772dd21E368038682327fCa01E75f71666689cD`](https://basescan.org/address/0x4772dd21E368038682327fCa01E75f71666689cD)

---

## 🧩 Core Dependencies

Split402 **requires and fully depends on** the following:

### ✅ XMTP (Required)

* Used for **all communication**, including:

  * Personal and group conversations
  * Approvals, messages, and split metadata
* Provides **end-to-end encryption** for tamper-proof split coordination
* No centralized servers or plaintext storage – **everything is secure and decentralized**

### ✅ Base Network (Required)

* All transactions and settlements occur on **Base L2**
* Uses **Base USDC** as the native token for predictable, stable payments
* Enables **low gas fees** and **fast confirmation** times

---

## 💡 Key Innovations

| # | Innovation                                     | Description                                                                                      |
| - | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1 | 🔐 **End-to-End Encrypted Splitting**          | All split metadata is shared via XMTP – nothing is stored or transmitted in plaintext.           |
| 2 | 💬 **Group-Based Split Coordination**          | Group conversations on XMTP are used to approve and verify shared expenses.                      |
| 3 | 🧮 **Dynamic Payment Amount Processing**       | Amounts are computed dynamically in the backend based on messages – not pre-defined percentages. |
| 4 | 🛠️ **Tamper-Proof Split Management via XMTP** | Messages and approvals are cryptographically tied to settlements.                                |
| 5 | 💰 **USDC-Native Transaction Flow**            | Users transact directly in USDC – stable and widely adopted in crypto and fintech ecosystems.    |
| 6 | ⚙️ **Custom X402 Handler Integration**         | Dynamic construction of X402 payment instructions based on encrypted message inputs.             |
| 7 | ⚡ **Optimized for Base L2**                    | Reduces gas costs and enables near-instant settlements compared to Ethereum L1.                  |

---

## 🏗️ Architecture

```
split402/
│
├── dapp/              # Next.js frontend: connects to wallet, XMTP, and shows encrypted split UIs
├── contracts/         # Solidity contracts: handle USDC splits on Base with X402 compatibility
└── x402-handler/      # Express backend: reads XMTP messages and dynamically builds X402 calls
```

---

## 🧪 Getting Started

### 🖥️ Frontend (dapp)

```bash
cd dapp
npm install
npm run dev
```

* Built using **Next.js + Wagmi + XMTP SDK**
* UI for wallet connect, chat loading, and initiating X402 transactions

---

### 🧾 Smart Contracts

* Written in Solidity, deployed on Base
* Compatible with **X402 payment flows**
* Stores and emits metadata tied to XMTP conversations

---

### ⚙️ Backend – X402 Handler

```bash
cd x402-handler
npm install
node index.js
```

* Reads encrypted XMTP messages
* Computes split amounts dynamically
* Returns signed X402-compatible payment instructions

---

## 🧠 Use Cases

* 👥 **Group Settlements** – e.g., dinner bills, group travel expenses
* 💼 **Revenue Sharing** – influencer collabs, shared product revenue
* 🛠️ **Freelance Workflows** – auto-splitting fees based on encrypted task approvals

---

## 🔗 Resources

* 🔍 [Smart Contract on Basescan](https://basescan.org/address/0x4772dd21E368038682327fCa01E75f71666689cD)
* 📄 [Coinbase X402 Docs](https://docs.cloud.coinbase.com/x402/)
* 📘 [XMTP Developer Docs](https://xmtp.org/docs/)
* 🧊 [Base Official Site](https://base.org)


