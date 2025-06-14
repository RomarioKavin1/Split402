# 💸 Split402 – Real-Time, Encrypted, AI-Powered Payment Splitting Platform

**Split402** transforms the painful, error-prone, and awkward process of splitting group expenses by combining:

* 🔗 **[Coinbase's X402 Protocol](https://docs.cloud.coinbase.com/x402/)** – for decentralized, programmable payments
* 🔐 **[XMTP Protocol](https://xmtp.org)** – for encrypted, wallet-based communication and split coordination
* 🧊 **[Base Network](https://base.org)** – for fast, low-cost, gas-efficient settlements using **Base USDC**
* 🧠 **AI + OCR** – for intelligent receipt parsing, item detection, and context-aware splitting

> 🟢 **Live on Base Mainnet**: [`0x4772dd21E368038682327fCa01E75f71666689cD`](https://basescan.org/address/0x4772dd21E368038682327fCa01E75f71666689cD)

---

## ❌ The Problem Split402 Solves

> Coordinating payments in group settings today is frustrating, manual, and often leads to social friction or exclusion.

### Current Reality:

* 😩 Friends avoid planning group activities due to messy payment logistics.
* 🧾 Splitting receipts manually is slow and error-prone.
* 🌍 International friends are excluded due to app incompatibility.
* 🤝 IOUs and chasing payments ruin relationships and cause awkward follow-ups.
* 💼 Business trips and shared expenses lead to complex, untracked reimbursements.

---

## ✅ What Split402 Enables

### 🤖 AI-Powered Smart Splitting

* Snap a receipt → AI extracts items, tips, taxes.
* Suggests intelligent, context-aware splits instantly (e.g., shared appetizers vs personal mains).
* No more arguments or manual calculations.

### 💸 Instant Settlement with Microtransactions

* Every participant pays their share in real-time—no IOUs or pending requests.
* Powered by **X402** micro-payment flows on **Base USDC**.

### 🔐 Encrypted, Wallet-Based Communication

* Uses **XMTP** for personal and group messaging.
* All communication is **end-to-end encrypted**, tamper-proof, and wallet-address-based (no phone numbers needed).

### 🌍 Borderless & Decentralized

* Works **globally** with any wallet that supports USDC on Base.
* No centralized app dependency—perfect for crypto-native or remote-first communities.

### 🤝 Privacy-First & Fair

* Keeps your payment data private and off centralized servers.
* Handles complex fairness logic: shared portions, custom splits, tax/tip breakdowns, etc.

---

## 🚀 Core Innovations

| # | Innovation                                       | Description                                                                              |
| - | ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 1 | 🔐 **Fully Encrypted Communication via XMTP**    | Every interaction—personal/group—is end-to-end encrypted and tamper-proof.               |
| 2 | 🧠 **AI-Driven Receipt Parsing**                 | OCR + AI extracts and understands receipts for smarter, fairer splits.                   |
| 3 | 🛠️ **Custom Dynamic X402 Request Handling**     | Backend dynamically builds and signs programmable payment flows based on encrypted data. |
| 4 | 🧊 **USDC-Native Settlement on Base**            | Stable, fast, and gas-efficient. Ideal for on-chain and real-world payment needs.        |
| 5 | 📬 **Wallet-Based Messaging (no phone numbers)** | Great for pseudonymous groups, remote teams, and crypto-native users.                    |
| 6 | 📊 **Context-Aware Fairness Logic**              | Understands portion sizes, group items, and who ordered what.                            |
| 7 | 🌍 **Cross-Border and Platform-Agnostic**        | Anyone with a wallet can use it—no app store or country lock-in.                         |

---

## 🔧 Tech Stack

* **Smart Contracts**: Solidity, Base, USDC, X402
* **Frontend**: Next.js, Wagmi, XMTP SDK
* **Backend**: Express.js for dynamic X402 handler
* **AI/OCR**: For intelligent receipt interpretation and split logic

---

## 📂 Project Structure

```
split402/
│
├── dapp/              # Next.js frontend for users to chat, split, and settle
├── contracts/         # Solidity contracts implementing Base USDC + X402 flows
└── x402-handler/      # Express backend to construct dynamic X402 requests
```

---

## ⚙️ Getting Started

### Frontend

```bash
cd dapp
npm install
npm run dev
```

### Contracts

* Located in `contracts/`
* Built with Hardhat, deployed to **Base Mainnet**

### Backend Handler

```bash
cd x402-handler
npm install
node index.js
```

---

## 🧪 Ideal For

* 💸 Crypto-native friend groups & DAOs
* 🌐 International teams or digital nomads
* 🍽️ Group dinners or travel with complex bills
* 📦 Shared subscriptions and recurring costs
* 🧾 Business trips with multi-party reimbursements
* 🫂 Anyone tired of chasing people for money

Split402 makes **"we'll figure out payments later"** a thing of the past.
Now it's just **"snap, split, settled."**

---

## 🧗 Challenges We Faced

* 🧩 **XMTP V3 Upgrade**: Adjusting to the new inbox-centric model took effort and experimentation.
* 🧪 **X402 Standard Maturity**: As an emerging protocol, integrating X402 required deep reading and creative implementation.
* 🔄 **Dynamic Flow Management**: Designing flexible payment logic that works across any group configuration and real-time context.

---

## 🔗 Resources

* 🔍 [Contract on Basescan](https://basescan.org/address/0x4772dd21E368038682327fCa01E75f71666689cD)
* 📄 [X402 Protocol Docs](https://docs.cloud.coinbase.com/x402/)
* 📘 [XMTP Developer Docs](https://xmtp.org/docs/)
* 🧊 [Base Official Website](https://base.org)

---

## Support

For any issues or questions:

- **Telegram**: [@romariokavin](https://t.me/romariokavin)
- **Email**: romario7kavin@gmail.com
- **Issues**: Open an issue in this repository

---
## 🙌 Contribute or Connect

Love the vision? Want to build on top of Split402?
We're happy to collaborate on integrations, features, or feedback. PRs and discussions welcome!
