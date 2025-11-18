# 💰 House Rake Setup Guide

**Status:** Needs to be configured in Supabase RPC function

---

## 🔍 **Current Status**

### ✅ **What's Working:**
- Backend calculates 10% house rake correctly
- Backend calls `payout_top3` RPC with `house_rake` parameter
- All payout amounts are calculated (75% / 10% / 5% / 10% rake)

### ⏳ **What Needs Setup:**
- **Supabase RPC function** needs to be created
- **Your wallet address** needs to be configured
- **SOL transfer logic** needs to be implemented

---

## 📋 **Two Options for Implementation**

### **Option 1: Supabase RPC Function (Recommended)**

Create a Supabase RPC function that handles all payouts. This is the cleanest approach.

**Pros:**
- All payout logic in one place
- Easy to audit
- Can use Supabase Edge Functions for Solana transfers

**Cons:**
- Requires Supabase Edge Functions setup
- Need to handle Solana Web3.js in Edge Function

### **Option 2: Backend Direct Transfer**

Handle payouts directly in the Node.js backend using the escrow wallet.

**Pros:**
- Already have escrow wallet setup
- Can use existing Solana Web3.js code
- More control

**Cons:**
- Escrow wallet needs to hold all pot funds
- More complex state management

---

## 🚀 **Recommended: Supabase RPC Function**

### **Step 1: Create Supabase Edge Function**

Create a Supabase Edge Function that handles Solana transfers:

```typescript
// supabase/functions/payout-top3/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Connection, PublicKey, SystemProgram, Transaction, Keypair, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from "@solana/web3.js"

const HOUSE_WALLET = Deno.env.get("HOUSE_WALLET_ADDRESS") || ""; // Your wallet address
const SOLANA_RPC = Deno.env.get("SOLANA_RPC") || "https://api.mainnet-beta.solana.com";

serve(async (req) => {
  const {
    lobby_id,
    first_place_wallet,
    first_place_payout,
    second_place_wallet,
    second_place_payout,
    third_place_wallet,
    third_place_payout,
    house_rake,
    pot_amount
  } = await req.json();

  const connection = new Connection(SOLANA_RPC, 'confirmed');
  
  // Load escrow wallet from env
  const escrowSecretKey = JSON.parse(Deno.env.get("ESCROW_PRIVATE_KEY") || "[]");
  const escrowKeypair = Keypair.fromSecretKey(Uint8Array.from(escrowSecretKey));

  const transactions = [];

  // Send to 1st place
  if (first_place_wallet && first_place_payout > 0) {
    const tx = SystemProgram.transfer({
      fromPubkey: escrowKeypair.publicKey,
      toPubkey: new PublicKey(first_place_wallet),
      lamports: Math.floor(first_place_payout * LAMPORTS_PER_SOL),
    });
    transactions.push({ tx, wallet: first_place_wallet, amount: first_place_payout });
  }

  // Send to 2nd place
  if (second_place_wallet && second_place_payout > 0) {
    const tx = SystemProgram.transfer({
      fromPubkey: escrowKeypair.publicKey,
      toPubkey: new PublicKey(second_place_wallet),
      lamports: Math.floor(second_place_payout * LAMPORTS_PER_SOL),
    });
    transactions.push({ tx, wallet: second_place_wallet, amount: second_place_payout });
  }

  // Send to 3rd place
  if (third_place_wallet && third_place_payout > 0) {
    const tx = SystemProgram.transfer({
      fromPubkey: escrowKeypair.publicKey,
      toPubkey: new PublicKey(third_place_wallet),
      lamports: Math.floor(third_place_payout * LAMPORTS_PER_SOL),
    });
    transactions.push({ tx, wallet: third_place_wallet, amount: third_place_payout });
  }

  // Send house rake to your wallet
  if (house_rake > 0) {
    const tx = SystemProgram.transfer({
      fromPubkey: escrowKeypair.publicKey,
      toPubkey: new PublicKey(HOUSE_WALLET),
      lamports: Math.floor(house_rake * LAMPORTS_PER_SOL),
    });
    transactions.push({ tx, wallet: HOUSE_WALLET, amount: house_rake });
  }

  // Execute all transactions
  const results = [];
  for (const { tx, wallet, amount } of transactions) {
    try {
      const transaction = new Transaction().add(tx);
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [escrowKeypair],
        { commitment: 'confirmed' }
      );
      results.push({ success: true, wallet, amount, signature });
    } catch (error) {
      results.push({ success: false, wallet, amount, error: error.message });
    }
  }

  return new Response(JSON.stringify({ success: true, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

### **Step 2: Create Supabase RPC Function (SQL)**

```sql
CREATE OR REPLACE FUNCTION payout_top3(
  lobby_id UUID,
  first_place_wallet TEXT,
  first_place_payout NUMERIC,
  second_place_wallet TEXT,
  second_place_payout NUMERIC,
  third_place_wallet TEXT,
  third_place_payout NUMERIC,
  house_rake NUMERIC,
  pot_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url TEXT := 'https://YOUR_PROJECT.supabase.co/functions/v1/payout-top3';
  service_role_key TEXT := current_setting('app.settings.service_role_key', true);
  response JSON;
BEGIN
  -- Call Supabase Edge Function to handle Solana transfers
  SELECT content::json INTO response
  FROM http_post(
    edge_function_url,
    json_build_object(
      'lobby_id', lobby_id,
      'first_place_wallet', first_place_wallet,
      'first_place_payout', first_place_payout,
      'second_place_wallet', second_place_wallet,
      'second_place_payout', second_place_payout,
      'third_place_wallet', third_place_wallet,
      'third_place_payout', third_place_payout,
      'house_rake', house_rake,
      'pot_amount', pot_amount
    )::text,
    'application/json',
    json_build_object('Authorization', 'Bearer ' || service_role_key)::text
  );

  -- Log payout
  INSERT INTO payouts (
    lobby_id,
    first_place_wallet,
    first_place_payout,
    second_place_wallet,
    second_place_payout,
    third_place_wallet,
    third_place_payout,
    house_rake,
    pot_amount,
    created_at
  ) VALUES (
    lobby_id,
    first_place_wallet,
    first_place_payout,
    second_place_wallet,
    second_place_payout,
    third_place_wallet,
    third_place_payout,
    house_rake,
    pot_amount,
    NOW()
  );

  RETURN response;
END;
$$;
```

---

## 🔧 **Alternative: Backend Direct Transfer**

If you prefer to handle payouts in the Node.js backend, we can modify the backend to use the escrow wallet directly. This would require:

1. **Escrow wallet holds all pot funds** (entry fees go to escrow)
2. **Backend transfers directly** when match ends
3. **Your wallet address** stored in environment variable

**Would you like me to implement this approach instead?**

---

## 📝 **What You Need to Provide**

1. **Your Solana wallet address** (where you want the 10% rake to go)
2. **Preferred approach** (Supabase RPC or Backend Direct)
3. **Escrow wallet setup** (if using backend direct)

---

## ✅ **Summary**

**Current Status:**
- ✅ Backend calculates 10% rake
- ✅ Backend passes rake amount to RPC
- ⏳ **RPC function needs to be created** (to actually send SOL to your wallet)

**Next Steps:**
1. Choose approach (Supabase RPC or Backend Direct)
2. Provide your wallet address
3. I'll implement the transfer logic

**The 10% rake is calculated and ready - we just need to set up the actual SOL transfer to your wallet!**

