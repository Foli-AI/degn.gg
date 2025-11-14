-- DEGN.gg Supabase Schema - Step by Step
-- Run each section separately in your Supabase SQL editor

-- STEP 1: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- STEP 2: Create lobbies table first (no dependencies)
CREATE TABLE IF NOT EXISTS lobbies (
  id TEXT PRIMARY KEY,
  game_type TEXT NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 2,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'in-progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 3: Create profiles table (no dependencies)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 4: Create entries table (depends on lobbies)
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lobby_id TEXT NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
  wallet TEXT NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  transaction_signature TEXT,
  amount_sol DECIMAL(10, 9),
  entry_amount DECIMAL(10, 9),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lobby_id, wallet)
);

-- STEP 5: Create matches table (depends on lobbies)
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lobby_id TEXT NOT NULL REFERENCES lobbies(id),
  winner_wallet TEXT,
  pot_amount DECIMAL(10, 9),
  game_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 6: Create payments table (legacy compatibility - no foreign key constraints)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lobby_id TEXT NOT NULL,
  player_address TEXT NOT NULL,
  transaction_signature TEXT UNIQUE NOT NULL,
  amount_sol DECIMAL(10, 9) NOT NULL,
  entry_amount DECIMAL(10, 9) NOT NULL,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 7: Create indexes
CREATE INDEX IF NOT EXISTS idx_lobbies_status ON lobbies(status);
CREATE INDEX IF NOT EXISTS idx_lobbies_game_type ON lobbies(game_type);
CREATE INDEX IF NOT EXISTS idx_entries_lobby_id ON entries(lobby_id);
CREATE INDEX IF NOT EXISTS idx_entries_wallet ON entries(wallet);
CREATE INDEX IF NOT EXISTS idx_entries_paid ON entries(paid);
CREATE INDEX IF NOT EXISTS idx_matches_lobby_id ON matches(lobby_id);
CREATE INDEX IF NOT EXISTS idx_matches_winner ON matches(winner_wallet);
CREATE INDEX IF NOT EXISTS idx_payments_lobby_id ON payments(lobby_id);
CREATE INDEX IF NOT EXISTS idx_payments_player_address ON payments(player_address);
CREATE INDEX IF NOT EXISTS idx_payments_signature ON payments(transaction_signature);
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON profiles(wallet_address);

-- STEP 8: Enable RLS and create policies
ALTER TABLE lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on lobbies" ON lobbies FOR ALL USING (true);
CREATE POLICY "Allow all operations on entries" ON entries FOR ALL USING (true);
CREATE POLICY "Allow all operations on matches" ON matches FOR ALL USING (true);
CREATE POLICY "Allow all operations on payments" ON payments FOR ALL USING (true);
CREATE POLICY "Allow all operations on profiles" ON profiles FOR ALL USING (true);

-- STEP 9: Create update function and triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lobbies_updated_at BEFORE UPDATE ON lobbies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
