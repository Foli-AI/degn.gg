# DEGN.gg Phase 4: Phantom Wallet Testing Guide

## 🎯 Overview

This guide walks you through testing the complete Solana + Phantom wallet integration for DEGN.gg, including real SOL transactions on devnet.

## 🛠️ Prerequisites

### 1. Phantom Wallet Setup
- Install [Phantom Wallet](https://phantom.app/) browser extension
- Create or import a wallet
- Switch to **Devnet** network:
  - Open Phantom → Settings → Developer Settings → Change Network → Devnet

### 2. Get Devnet SOL
- Visit [Solana Faucet](https://faucet.solana.com/)
- Enter your Phantom wallet address
- Request 1-2 SOL for testing
- Or use CLI: `solana airdrop 1 <your-address> --url devnet`

### 3. Server Setup
```bash
# Backend matchmaker
cd backend/matchmaker
npm install
# Create .env file (see ENV_SETUP.md)
npm run dev

# Frontend
cd degn-arcade  
npm install
npm run dev
```

## 🧪 Testing Scenarios

### Scenario 1: Phantom Wallet Connection

1. **Open Find Game Page:**
   ```
   http://localhost:3000/find-game
   ```

2. **Connect Phantom:**
   - Click "Connect Wallet" button
   - Phantom popup should appear
   - Approve connection
   - Verify wallet address shows in header

3. **Expected Results:**
   - ✅ Green "Phantom Connected" status
   - ✅ Wallet address displayed (4 chars...4 chars)
   - ✅ "Devnet" network indicator

### Scenario 2: Balance Verification

1. **Select a Game with Entry Fee:**
   - Choose "Coinflip" or "Connect4"
   - Set entry amount (e.g., 0.1 SOL)
   - Create match or join existing

2. **Balance Check:**
   - System should verify you have sufficient SOL
   - If insufficient, error message appears
   - If sufficient, transaction prompt appears

3. **Expected Results:**
   - ✅ Balance checked before transaction
   - ✅ Clear error if insufficient funds
   - ✅ Transaction prompt if sufficient

### Scenario 3: Entry Fee Transaction

1. **Join a Match:**
   - Find or create a match with 0.1 SOL entry
   - Click "Join Game"
   - Phantom transaction popup appears

2. **Sign Transaction:**
   - Review transaction details in Phantom
   - Verify recipient (escrow wallet)
   - Verify amount (0.1 SOL + gas)
   - Click "Approve"

3. **Transaction Processing:**
   - Wait for confirmation (~5-10 seconds)
   - Check browser console for logs
   - Verify lobby join success

4. **Expected Results:**
   - ✅ Phantom shows correct transaction details
   - ✅ Transaction confirmed on-chain
   - ✅ Player joins lobby successfully
   - ✅ Backend logs "✅ Entry payment verified"

### Scenario 4: Match Completion & Payout

1. **Complete a Match:**
   - Join a Sol-Bird match (2+ players)
   - Play until match ends
   - One player should be declared winner

2. **Automatic Payout:**
   - Winner receives payout automatically
   - Check Phantom for incoming transaction
   - Verify amount received

3. **Expected Results:**
   - ✅ Winner receives SOL payout
   - ✅ Backend logs "💰 Payout sent"
   - ✅ Transaction appears in Phantom history

## 🔍 Debugging & Monitoring

### Browser Console Logs
Open DevTools (F12) and monitor console for:
```
🔌 Connected to matchmaker
💳 Entry transaction created  
✅ Transaction confirmed
💰 Payout received: 0.18 SOL
```

### Backend Server Logs
Monitor matchmaker terminal for:
```
🔑 Escrow wallet loaded: [address]
💳 Entry transaction created
✅ Entry payment verified  
🏁 Match completed
💰 Payout sent: 0.18 SOL to [winner], signature: [tx]
```

### Phantom Transaction History
Check Phantom → Activity for:
- Outgoing: Entry fee payments
- Incoming: Payout receipts
- All transactions should show "Confirmed" status

## 🚨 Common Issues & Solutions

### Issue: "Wallet not connected"
**Solution:** 
- Refresh page and reconnect Phantom
- Check if Phantom is on Devnet network
- Verify popup blockers aren't blocking Phantom

### Issue: "Insufficient balance"
**Solution:**
- Get more devnet SOL from faucet
- Check actual balance in Phantom
- Ensure you have extra SOL for gas fees

### Issue: "Transaction failed"
**Solution:**
- Check network connection
- Verify devnet RPC is working
- Try again after a few seconds
- Check Phantom for error details

### Issue: "Payout not received"
**Solution:**
- Check if match actually ended
- Verify you were the winner
- Check backend logs for payout errors
- Ensure escrow wallet has sufficient balance

## 📊 Test Scenarios Matrix

| Scenario | Entry Fee | Expected Outcome |
|----------|-----------|------------------|
| Free Play | 0 SOL | Join without transaction |
| Small Bet | 0.01 SOL | Micro-transaction test |
| Standard Bet | 0.1 SOL | Normal gameplay flow |
| Large Bet | 1.0 SOL | High-value transaction |
| Insufficient Balance | 10 SOL | Error handling |

## 🎮 End-to-End Test Flow

### Complete Test (15 minutes)

1. **Setup (2 min):**
   - Connect Phantom to devnet
   - Get 2 SOL from faucet
   - Start both servers

2. **Create Match (3 min):**
   - Open `/find-game`
   - Connect wallet
   - Create Coinflip match (0.1 SOL)
   - Sign entry transaction

3. **Join Match (3 min):**
   - Open second browser tab/profile
   - Connect different wallet
   - Join the created match
   - Sign entry transaction

4. **Complete Match (5 min):**
   - Both players in lobby
   - Match starts automatically
   - Simulate game completion
   - Verify winner payout

5. **Verification (2 min):**
   - Check transaction history
   - Verify balances updated
   - Review server logs

### Success Criteria
- ✅ Both players pay entry fees
- ✅ Match completes successfully  
- ✅ Winner receives 0.18 SOL (0.2 total - 10% rake)
- ✅ All transactions confirmed on-chain
- ✅ No errors in console/logs

## 🔗 Useful Links

- **Solana Explorer (Devnet):** https://explorer.solana.com/?cluster=devnet
- **Phantom Wallet:** https://phantom.app/
- **Solana Faucet:** https://faucet.solana.com/
- **Local Frontend:** http://localhost:3000/find-game
- **Backend Health:** http://localhost:3001/health

## 📝 Test Checklist

- [ ] Phantom wallet installed and configured for devnet
- [ ] Sufficient devnet SOL in wallet (1+ SOL)
- [ ] Both servers running (frontend:3000, backend:3001)
- [ ] Wallet connection successful
- [ ] Balance verification working
- [ ] Entry fee transactions signing and confirming
- [ ] Match completion triggering payouts
- [ ] All transactions visible in Phantom history
- [ ] Server logs showing expected messages
- [ ] No console errors or warnings

## 🎯 Next Steps

After successful testing:
1. **Production Setup:** Switch to mainnet RPC and real SOL
2. **Security Audit:** Review transaction handling and escrow security
3. **Performance:** Optimize transaction confirmation times
4. **Monitoring:** Add transaction failure alerts and retry logic
5. **UI/UX:** Improve transaction status feedback and error messages
