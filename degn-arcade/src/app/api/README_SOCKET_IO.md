# Socket.IO API Endpoints

This directory contains API route stubs for Socket.IO token management and match completion.

## Files

- `socket/issue-token/route.ts` - Issues JWT tokens for Socket.IO authentication
- `socket/validate/route.ts` - Validates tokens (called by Socket.IO server)
- `match/complete/route.ts` - Processes match completion and payouts

## Installation

1. **Install dependencies:**
   ```bash
   npm install jsonwebtoken @types/jsonwebtoken
   ```

2. **Set environment variables:**
   ```env
   JWT_SECRET=your-secret-key-here
   SERVER_SECRET=your-server-secret-here
   NEXT_PUBLIC_URL=https://degn-gg.vercel.app
   ESCROW_PRIVATE_KEY=[1,2,3,...,64]  # Optional, for payouts
   SOLANA_RPC=https://api.devnet.solana.com
   ```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_SECRET` | Yes | Secret for signing JWT tokens (must match Socket.IO server) |
| `SERVER_SECRET` | Yes | Secret for server-to-server API calls (must match Socket.IO server) |
| `NEXT_PUBLIC_URL` | Yes | Base URL of Next.js app (used by Socket.IO server) |
| `ESCROW_PRIVATE_KEY` | No | Escrow wallet private key (JSON array) for payouts |
| `SOLANA_RPC` | No | Solana RPC endpoint (default: devnet) |

## Usage

### Issue Token

```typescript
// In your Next.js page/component
const response = await fetch('/api/socket/issue-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: currentUser.id,
    lobbyId: lobbyId,
    username: currentUser.username
  })
});
const { token } = await response.json();

// Send token to iframe via postMessage
iframeRef.current?.contentWindow?.postMessage({
  type: 'SOCKET_TOKEN',
  token
}, '*');
```

### Validate Token

Called automatically by Socket.IO server. No client code needed.

### Match Complete

Called automatically by Socket.IO server when match ends. No client code needed.

## Security Notes

- **JWT_SECRET**: Must match between Next.js and Socket.IO server
- **SERVER_SECRET**: Must match between Socket.IO server and Next.js `/api/match/complete`
- **Token TTL**: Default is 2 minutes - adjust if needed
- **CORS**: Ensure Socket.IO server allows your Next.js origin

## TODO / Customization Points

1. **Database Integration**: Replace placeholder lobby/player data with Supabase queries
2. **Wallet Lookup**: Fetch winner's wallet address from database
3. **Payout Logic**: Implement actual Solana transaction (currently mocked)
4. **Match Recording**: Save match results to database
5. **Error Handling**: Add retry logic and better error messages

