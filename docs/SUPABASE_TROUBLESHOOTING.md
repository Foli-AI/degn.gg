# Supabase Schema Troubleshooting Guide

## 🚨 Error: "column lobby_id does not exist"

This error typically occurs when:
1. Tables are created in the wrong order
2. Foreign key constraints fail
3. Previous schema runs left partial state

## 🔧 Quick Fix Steps

### Option 1: Clean Slate (Recommended)
1. **Drop existing tables** (if any exist):
   ```sql
   DROP TABLE IF EXISTS entries CASCADE;
   DROP TABLE IF EXISTS matches CASCADE;
   DROP TABLE IF EXISTS payments CASCADE;
   DROP TABLE IF EXISTS lobbies CASCADE;
   DROP TABLE IF EXISTS profiles CASCADE;
   ```

2. **Run minimal schema** (`backend/schema-minimal.sql`):
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click "Run"

3. **Verify success** - you should see:
   ```
   table_name | row_count
   -----------|-----------
   lobbies    | 2
   entries    | 0  
   profiles   | 0
   ```

### Option 2: Step-by-Step
Use `backend/schema-step-by-step.sql` and run each section separately:

1. **Step 1**: UUID extension
2. **Step 2**: Create lobbies table
3. **Step 3**: Create profiles table  
4. **Step 4**: Create entries table
5. Continue with remaining steps...

## 🔍 Debugging Commands

### Check if tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('lobbies', 'entries', 'matches', 'payments', 'profiles');
```

### Check table structure:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'entries'
ORDER BY ordinal_position;
```

### Check foreign key constraints:
```sql
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'entries';
```

## 🎯 Expected Final State

After successful schema creation, you should have:

**Tables:**
- ✅ `lobbies` (id, game_type, max_players, status, created_at, updated_at)
- ✅ `entries` (id, lobby_id, wallet, paid, transaction_signature, amount_sol, entry_amount, created_at)
- ✅ `profiles` (id, wallet_address, username, created_at, updated_at)
- ✅ `matches` (id, lobby_id, winner_wallet, pot_amount, game_duration, created_at)
- ✅ `payments` (id, lobby_id, player_address, transaction_signature, amount_sol, entry_amount, status, created_at)

**Constraints:**
- ✅ `entries.lobby_id` → `lobbies.id` (foreign key)
- ✅ `matches.lobby_id` → `lobbies.id` (foreign key)
- ✅ `profiles.wallet_address` (unique)
- ✅ `entries(lobby_id, wallet)` (unique together)

**Policies:**
- ✅ RLS enabled on all tables
- ✅ Permissive policies for development

## 🚀 Test the Schema

After creation, test with:
```sql
-- Insert test lobby
INSERT INTO lobbies (id, game_type, max_players) 
VALUES ('test123', 'coinflip', 2);

-- Insert test entry
INSERT INTO entries (lobby_id, wallet, paid) 
VALUES ('test123', 'test_wallet_123', true);

-- Verify relationship works
SELECT l.id, l.game_type, e.wallet, e.paid
FROM lobbies l
JOIN entries e ON l.id = e.lobby_id
WHERE l.id = 'test123';
```

Should return:
```
id      | game_type | wallet          | paid
--------|-----------|-----------------|------
test123 | coinflip  | test_wallet_123 | true
```

## 🆘 Still Having Issues?

1. **Check Supabase logs** in Dashboard → Logs
2. **Verify permissions** - make sure you're using the correct API keys
3. **Try browser incognito** - sometimes cached sessions cause issues
4. **Contact support** - Supabase has excellent support if schema issues persist

The key is to ensure `lobbies` table exists BEFORE creating `entries` table, since `entries` references `lobbies.id`.
