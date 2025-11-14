# Environment Setup for DEGN.gg Matchmaker

## Required Environment Variables

Create a `.env` file in the `backend/matchmaker` directory with the following variables:

```bash
# Solana Configuration
SOLANA_RPC=https://api.devnet.solana.com
ESCROW_PRIVATE_KEY=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64]
ESCROW_PUBLIC_KEY=YourEscrowWalletPublicKeyHere

# Server Configuration  
PORT=3001

# Optional: Database (for production)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## Generating an Escrow Wallet

### Option 1: Development (Auto-generated)
If you don't set `ESCROW_PRIVATE_KEY`, the server will:
- Generate a temporary keypair automatically
- Request a devnet airdrop for testing
- Print the wallet address to console

### Option 2: Production (Manual)
For production, generate a dedicated escrow wallet:

```bash
# Install Solana CLI
npm install -g @solana/cli

# Generate new keypair
solana-keygen new --outfile escrow-keypair.json

# Get the public key
solana-keygen pubkey escrow-keypair.json

# Convert to environment format
node -e "
const fs = require('fs');
const keypair = JSON.parse(fs.readFileSync('escrow-keypair.json'));
console.log('ESCROW_PRIVATE_KEY=' + JSON.stringify(Array.from(keypair)));
"
```

## Security Notes

⚠️ **NEVER commit private keys to version control**
⚠️ **Use a dedicated escrow wallet for production**
⚠️ **Keep private keys secure and backed up**

## Development Setup

1. **Copy environment template:**
   ```bash
   cp ENV_SETUP.md .env
   # Edit .env with your values
   ```

2. **Start the server:**
   ```bash
   npm run dev
   ```

3. **Verify setup:**
   - Check console for "🔑 Escrow wallet loaded" message
   - Test API endpoints at http://localhost:3001/health

## Devnet Testing

For development on Solana devnet:

1. **Get devnet SOL:**
   ```bash
   solana airdrop 2 <your-escrow-address> --url devnet
   ```

2. **Connect Phantom to devnet:**
   - Open Phantom wallet
   - Settings → Developer Settings → Change Network → Devnet

3. **Get test SOL for players:**
   - Use Solana faucet: https://faucet.solana.com/
   - Or airdrop via CLI: `solana airdrop 1 <player-address> --url devnet`
