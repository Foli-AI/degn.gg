# Fix Environment Variables Error

## The Error You're Seeing

```
❌ Missing critical server environment variables: [ 'SUPABASE_SERVICE_ROLE_KEY' ]
⚠️ ESCROW_PRIVATE_KEY not set - using temporary keypair
⚠️ MATCHMAKER_SECRET not set - using default
❌ Server environment not properly configured: [ 'SUPABASE_SERVICE_ROLE_KEY' ]
```

## Quick Fix Steps

### 1. **Set SUPABASE_SERVICE_ROLE_KEY** (REQUIRED)

This is the most critical one. Get it from Supabase:

1. Go to your Supabase project dashboard
2. Click **Project Settings** → **API**
3. Find the **`service_role` key** (it's the secret one, not the anon key)
4. Copy it

**For Local Development:**
Create/update `backend/matchmaker/.env`:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**For Production (Railway/Render):**
- Go to your backend service → Environment Variables
- Add: `SUPABASE_SERVICE_ROLE_KEY` = `your_service_role_key_here`

---

### 2. **Set ESCROW_PRIVATE_KEY** (OPTIONAL but recommended)

This is the wallet that holds player entry fees. If not set, it generates a temporary one (which is fine for testing).

**Generate a new wallet:**
```bash
# In Node.js console or script
const { Keypair } = require('@solana/web3.js');
const keypair = Keypair.generate();
console.log('ESCROW_PRIVATE_KEY=' + JSON.stringify(Array.from(keypair.secretKey)));
```

**Add to environment:**
```env
ESCROW_PRIVATE_KEY=[1,2,3,4,5,...,64]
```

**IMPORTANT:** Fund this wallet with SOL for payouts!

---

### 3. **Set MATCHMAKER_SECRET** (OPTIONAL)

Just a random secret string for security:
```env
MATCHMAKER_SECRET=your-random-secret-here
```

---

### 4. **Set HOUSE_WALLET_ADDRESS** (OPTIONAL)

Your personal wallet where house rake (10%) goes:
```env
HOUSE_WALLET_ADDRESS=YourSolanaWalletAddressHere
```

---

## Complete `.env` File Example

Create `backend/matchmaker/.env`:

```env
# Required
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional but recommended
ESCROW_PRIVATE_KEY=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64]
MATCHMAKER_SECRET=my-secret-key-123
HOUSE_WALLET_ADDRESS=YourWalletAddress1234567890...
SOLANA_RPC=https://api.devnet.solana.com

# Also needed (from Supabase dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

---

## For Production Deployment

### Railway:
1. Go to your project → **Variables** tab
2. Add each variable:
   - `SUPABASE_SERVICE_ROLE_KEY` = `your-key`
   - `ESCROW_PRIVATE_KEY` = `[1,2,3,...,64]`
   - `MATCHMAKER_SECRET` = `your-secret`
   - `HOUSE_WALLET_ADDRESS` = `YourAddress...`
3. **Redeploy** your service

### Render:
1. Go to your service → **Environment** tab
2. Add each variable (same as above)
3. **Manual Deploy** → **Deploy latest commit**

---

## Verify It's Fixed

After setting variables and restarting:

✅ **Should see:**
- `✅ Supabase client initialized`
- `🔑 Escrow wallet loaded: ...`
- `✅ Matchmaker running on http://localhost:3001`

❌ **Should NOT see:**
- `❌ Missing critical server environment variables`
- `❌ Server environment not properly configured`

---

## Testing

1. **Restart your backend server**
2. **Check the logs** - should see success messages
3. **Try joining a game** - should work now!

---

## Still Having Issues?

1. **Check your Supabase URL is correct:**
   - Should be: `https://xxxxx.supabase.co`
   - Not: `https://xxxxx.supabase.co/rest/v1/...`

2. **Check the service role key:**
   - Must be the `service_role` key (secret)
   - NOT the `anon` key (public)

3. **Make sure backend is running:**
   - Check: `http://localhost:3001/health`
   - Should return: `{ "status": "ok" }`

4. **Check frontend environment:**
   - Make sure `NEXT_PUBLIC_MATCHMAKER_URL` is set in your frontend `.env.local`
   - Should be: `http://localhost:3001` (local) or your production URL

