# Socket.IO API Endpoints

This directory contains API routes for match completion and payouts.

## Files

- `match/complete/route.ts` - Processes match completion and payouts

## Installation

1. **Set environment variables:**
   ```env
   SERVER_SECRET=your-server-secret-here
   NEXT_PUBLIC_URL=https://degn-gg.vercel.app
   ESCROW_PRIVATE_KEY=[1,2,3,...,64]  # Optional, for payouts
   SOLANA_RPC=https://api.devnet.solana.com
   ```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SERVER_SECRET` | Yes | Secret for server-to-server API calls (must match Socket.IO server) |
| `NEXT_PUBLIC_URL` | Yes | Base URL of Next.js app (used by Socket.IO server) |
| `ESCROW_PRIVATE_KEY` | No | Escrow wallet private key (JSON array) for payouts |
| `SOLANA_RPC` | No | Solana RPC endpoint (default: devnet) |

## Usage

### Match Complete

Called automatically by Socket.IO server when match ends. No client code needed.

**Expected Payload:**
```json
{
  "matchId": "match_lobby_123_1234567890",
  "lobbyId": "lobby_123",
  "winnerWallet": "ABC123...",
  "potSize": 0.8,
  "houseRake": 0.08,
  "players": [
    { "wallet": "ABC123...", "entryFee": 0.1 },
    { "wallet": "DEF456...", "entryFee": 0.1 }
  ]
}
```

**Authorization:**
- Header: `Authorization: Bearer <SERVER_SECRET>`

**Response:**
```json
{
  "success": true,
  "tx": "transaction_signature",
  "payout": 0.72
}
```

## Security Notes

- **SERVER_SECRET**: Must match between Socket.IO server and Next.js `/api/match/complete`
- **CORS**: Ensure Socket.IO server allows your Next.js origin
- **Authentication**: Socket.IO server authenticates using query parameters (matchKey, playerId, username, walletAddress, entryFee)

## Socket.IO Connection

Clients connect directly to the Socket.IO server using query parameters:

```javascript
import { io } from 'socket.io-client';

const socket = io('https://degn-socket-server.onrender.com', {
  transports: ['websocket'],
  query: {
    matchKey: 'lobby_123',
    playerId: 'player_456',
    username: 'Player1',
    walletAddress: 'ABC123...',
    entryFee: '0.1'
  }
});
```

## TODO / Customization Points

1. **Database Integration**: Replace placeholder lobby/player data with Supabase queries
2. **Wallet Lookup**: Fetch winner's wallet address from database
3. **Payout Logic**: Implement actual Solana transaction (currently mocked)
4. **Match Recording**: Save match results to database
5. **Error Handling**: Add retry logic and better error messages
