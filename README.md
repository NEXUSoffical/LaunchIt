# 🚀 Genesis Launchpad: Zero-Cost Solana Token-2022 Bonding Curve

A production-grade, full-stack Solana launchpad modeled after the bonding curve mechanics of pump.fun, but built with **SPL Token-2022** and architected to be **100% free to build, test, and host**.

---

## 🌟 Why This Architecture Is the Best & 100% Free

| Feature | Legacy Launchpads (e.g. Pump.fun) | **Genesis Token-2022 Launchpad** |
| :--- | :--- | :--- |
| **Token Standard** | Legacy SPL Token + Metaplex Metadata | **SPL Token-2022 (Native Embedded Metadata)** |
| **Cost Per Launch** | ~0.02 - 0.03 SOL ($3.00 - $4.50) in Metaplex rent | **~0.002 SOL ($0.30)** (Saves 90% in rent!) |
| **Backend Cost** | Paid VPS/AWS ($50 - $200+/mo) | **$0/mo** (Client-side direct RPC/WebSocket) |
| **Hosting Cost** | Paid Web Servers | **$0/mo** (Free Vercel / Cloudflare Pages) |
| **Test Network** | Paid Mainnet SOL required for testing | **$0** (Free unlimited Solana Devnet SOL) |
| **Rug Protection** | Variable | **100% Immutable**: Mint authority revoked at creation |
| **Graduation DEX** | Manual Raydium pool seeding | **Automated Raydium / Meteora** pool seeding on curve completion |

---

## 📐 Architecture Overview

```
                      ┌──────────────────────────────────────┐
                      │    Genesis Launchpad Frontend (Web)  │
                      │  (React 18 + Vite + Solana Web3.js)  │
                      └──────────────────┬───────────────────┘
                                         │
                   Direct RPC & WebSockets (Zero Server Cost)
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │        Solana Blockchain (Devnet)    │
                      └──────────────────┬───────────────────┘
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼                                                                 ▼
┌───────────────────────────────┐                       ┌─────────────────────────────────┐
│     Token-2022 Mint PDA       │                       │   Launchpad Anchor Program      │
├───────────────────────────────┤                       ├─────────────────────────────────┤
│ • Decimals: 6                 │                       │ • State: LaunchpadConfig PDA    │
│ • Supply: 1,000,000,000       │                       │ • State: BondingCurve PDA       │
│ • Metadata Pointer: On-chain  │                       │ • Math: Virtual Constant Product│
│ • Mint Authority: Revoked     │                       │ • Escrow: Curve Vault PDA       │
└───────────────────────────────┘                       └────────────────┬────────────────┘
                                                                         │
                                                   85 SOL Target Hit ───►│
                                                                         ▼
                                                        ┌─────────────────────────────────┐
                                                        │    Raydium / Meteora Liquidity  │
                                                        │  • 85 SOL + 200M tokens seeded  │
                                                        │  • LP tokens permanently burned │
                                                        └─────────────────────────────────┘
```

---

## 🧮 Bonding Curve Formula

The pricing follows a **Virtual Constant Product Invariant**:
$$k = (S_{\text{virtual}} + S_{\text{real}}) \times (T_{\text{virtual}} - T_{\text{sold}})$$

- **Initial Virtual SOL ($S_{\text{virtual}}$)**: `30 SOL` (Provides initial liquidity & pricing stability without needing creator upfront capital)
- **Initial Virtual Tokens ($T_{\text{virtual}}$)**: `1,073,000,000 Tokens`
- **Tokens for Sale on Curve**: `800,000,000 Tokens` (80% of supply)
- **Tokens Reserved for Raydium LP**: `200,000,000 Tokens` (20% of supply)
- **Graduation Threshold**: `85.0 SOL` raised
- **Platform Fee**: `1.00%` (transferred directly to protocol fee recipient)

---

## 📁 Repository Structure

```
solana-launchpad/
├── program/                 # On-Chain Anchor Smart Contract (Rust)
│   ├── Cargo.toml           # Anchor + Token-2022 dependencies
│   └── src/
│       ├── lib.rs           # Program instructions & entrypoints
│       ├── state.rs         # BondingCurve & Config PDAs
│       ├── curve.rs         # Safe u128 fixed-point math engine
│       ├── errors.rs        # Custom launchpad errors
│       └── instructions/    # initialize, create_token, buy, sell, graduate
├── client-sdk/              # TypeScript SDK & Web3 RPC Helpers
│   └── src/
│       ├── curve.ts         # TypeScript BigInt exact math mirror
│       ├── solana.ts        # PDA derivation & Token-2022 instructions
│       └── types.ts         # Data models
├── frontend/                # High-Performance Cyber DeFi Web App
│   ├── src/
│   │   ├── components/      # TradingTerminal, PriceChart, SwapWidget, etc.
│   │   ├── context/         # WalletContext with Devnet 1-click Airdrop
│   │   └── utils/           # Curve math & mock data
│   ├── index.html
│   └── package.json
└── README.md
```

---

## 🚀 How to Run & Deploy for $0 Free

### Step 1: Run the Frontend Locally

```bash
cd ~/solana-launchpad/frontend
npm install
npm run dev
```
Open **`http://localhost:5174`** in your browser. You can immediately:
- Connect wallet or use the embedded instant-test wallet.
- Click **`+1 Free SOL`** to top up Devnet funds.
- Launch new Token-2022 coins.
- Execute real-time buys & sells on the bonding curve with live charting.

### Step 2: Deploy Anchor Program for $0 via Solana Playground

No heavy local Rust/Solana installation required:
1. Go to **[beta.solpg.io](https://beta.solpg.io)** (Free browser Solana IDE).
2. Create a new Anchor project.
3. Copy the Rust files from `program/src/` into the Playground editor.
4. Click **Build** and **Deploy** to Devnet.
5. Solana Playground will airdrop free devnet SOL and deploy your program directly from the browser!

### Step 3: Deploy the Frontend for $0 to Vercel / Cloudflare Pages

1. Build the production bundle:
   ```bash
   cd ~/solana-launchpad/frontend
   npm run build
   ```
2. Push your project to GitHub.
3. Import the repo into **[Vercel](https://vercel.com)** or **[Cloudflare Pages](https://pages.cloudflare.com)**.
4. Set Root Directory to `frontend`.
5. Click **Deploy** — your launchpad will be live worldwide on a global CDN with free SSL!
