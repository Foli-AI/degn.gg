# Quick Environment Variables Setup

## Required for Backend Matchmaker

These environment variables need to be set in your backend deployment (Railway, Render, etc.):

### 1. **SUPABASE_SERVICE_ROLE_KEY** (REQUIRED)
- Get this from your Supabase project dashboard
- Go to: Project Settings → API → `service_role` key (secret)
- This is needed for server-side database operations

### 2. **ESCROW_PRIVATE_KEY** (OPTIONAL but recommended)
- This is the private key for the escrow wallet that holds player entry fees
- Format: JSON array of numbers `[1,2,3,...,64]`
- Generate a new wallet keypair:
  ```bash
  # In Node.js
  const { Keypair } = require('@solana/web3.js');
  const keypair = Keypair.generate();
  console.log('ESCROW_PRIVATE_KEY=' + JSON.stringify(Array.from(keypair.secretKey)));
  ```
- **IMPORTANT:** Fund this wallet with SOL for payouts!

### 3. **MATCHMAKER_SECRET** (OPTIONAL)
- A secret string for securing matchmaker endpoints
- Can be any random string: `your-secret-key-here`

### 4. **HOUSE_WALLET_ADDRESS** (OPTIONAL)
- Your personal wallet address where house rake (10%) goes
- Format: Base58 Solana address
- Example: `YourWalletAddress1234567890...`

### 5. **SOLANA_RPC** (OPTIONAL)
- Custom Solana RPC endpoint
- Default: Uses public devnet/mainnet endpoints
- Recommended: Use a paid RPC like Helius, QuickNode, or Alchemy

---

## Setting Up in Railway/Render

### Railway:
1. Go to your project → Variables tab
2. Add each variable:
   - `SUPABASE_SERVICE_ROLE_KEY` = `your-key-here`
   - `ESCROW_PRIVATE_KEY` = `[1,2,3,...,64]`
   - `MATCHMAKER_SECRET` = `your-secret`
   - `HOUSE_WALLET_ADDRESS` = `YourAddress...`
   - `SOLANA_RPC` = `https://your-rpc-url.com`

### Render:
1. Go to your service → Environment tab
2. Add each variable (same as above)

---

## Quick Test

After setting variables, restart your backend and check logs:
- ✅ Should see: "✅ Server environment properly configured"
- ❌ Should NOT see: "❌ Missing critical server environment variables"

---

## For Local Development

Create `.env` file in `backend/matchmaker/`:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_key_here
ESCROW_PRIVATE_KEY=[1,2,3,...,64]
MATCHMAKER_SECRET=dev-secret
HOUSE_WALLET_ADDRESS=YourWalletAddress...
SOLANA_RPC=https://api.devnet.solana.com
```

