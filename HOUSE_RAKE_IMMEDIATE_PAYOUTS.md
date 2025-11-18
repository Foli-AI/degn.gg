# 💰 House Rake - Immediate Payouts

**Status:** ✅ **IMPLEMENTED** - Rake sent immediately after every match

---

## ⚡ **How Often: IMMEDIATE (Every Match)**

**Answer:** The 10% house rake is sent to your wallet **immediately after every single match finishes**. 

**Not weekly, not daily - INSTANT after each game!**

---

## 🎯 **How It Works**

### **When a Match Ends:**
1. Backend calculates payouts:
   - 1st place: 75% of pot
   - 2nd place: 10% of pot
   - 3rd place: 5% of pot
   - **House rake: 10% of pot** → **Your wallet**

2. **Immediate SOL transfers:**
   - ✅ 1st place gets paid (75%)
   - ✅ 2nd place gets paid (10%)
   - ✅ 3rd place gets paid (5%)
   - ✅ **You get paid (10% rake)** ← **IMMEDIATELY**

3. All transfers happen in **real-time** via Solana blockchain
4. Transaction signatures logged for verification

---

## 💵 **Example**

**Match:** 8 players × 0.5 SOL = 4.0 SOL pot

**After match ends:**
- 1st place: **3.0 SOL** sent immediately
- 2nd place: **0.4 SOL** sent immediately
- 3rd place: **0.2 SOL** sent immediately
- **Your wallet: 0.4 SOL** sent immediately ← **10% rake**

**Total:** 4.0 SOL (100%)

---

## 🔧 **Configuration**

### **Your Wallet Address:**
```
35PgFHXEgryH9MD3PMotVYYjayCGbSywKBN1Pmyq8GWY
```

This is **hardcoded as default** in the backend, but you can also set it via environment variable:

```bash
HOUSE_WALLET_ADDRESS=35PgFHXEgryH9MD3PMotVYYjayCGbSywKBN1Pmyq8GWY
```

---

## 📊 **Benefits of Immediate Payouts**

### ✅ **For You:**
- **Real-time revenue** - see rake accumulate immediately
- **No waiting** - funds available instantly
- **Transparent** - every transaction logged
- **No batching** - each match = separate transfer

### ✅ **For Players:**
- **Instant payouts** - winners get paid immediately
- **Trust** - see transactions on blockchain
- **No delays** - no waiting for weekly/daily batches

---

## 🔍 **Transaction Logging**

Every payout is logged with:
- Transaction signature (on-chain proof)
- Amount sent
- Recipient wallet
- Timestamp

**Example log:**
```
💰 House rake sent: 0.4 SOL to 35PgFHXEgryH9MD3PMotVYYjayCGbSywKBN1Pmyq8GWY, signature: 5j7s8...
```

---

## ⚠️ **Important Notes**

1. **Escrow Wallet Must Have Balance:**
   - Entry fees go to escrow wallet
   - Escrow wallet pays out winners + your rake
   - Make sure escrow has enough SOL for payouts

2. **Network Fees:**
   - Each transfer costs ~0.000005 SOL in fees
   - Fees come from escrow wallet
   - Very minimal cost

3. **Mainnet vs Devnet:**
   - Set `SOLANA_RPC` environment variable
   - Mainnet: Real SOL transfers
   - Devnet: Test SOL (free)

---

## ✅ **Summary**

- ✅ **Frequency:** **IMMEDIATE** - every match
- ✅ **Your Wallet:** `35PgFHXEgryH9MD3PMotVYYjayCGbSywKBN1Pmyq8GWY`
- ✅ **Amount:** 10% of every pot
- ✅ **Method:** Direct Solana transfer via escrow wallet
- ✅ **Logging:** All transactions logged with signatures

**You'll see rake accumulate in real-time as matches finish! 🚀**

