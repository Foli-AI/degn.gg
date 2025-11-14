-- DEGN.gg Supabase Schema
-- Run this in your Supabase SQL editor to create the required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Lobbies table
CREATE TABLE IF NOT EXISTS lobbies (
  id TEXT PRIMARY KEY,
  game_type TEXT NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 2,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'in-progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Entries table (tracks who joined and paid for each lobby)
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

-- Matches table (stores completed game results)
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lobby_id TEXT NOT NULL REFERENCES lobbies(id),
  winner_wallet TEXT,
  pot_amount DECIMAL(10, 9),
  game_duration INTEGER, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table (legacy - keeping for compatibility)
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

-- Profiles table (user profiles)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
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

-- Enable Row Level Security (RLS)
ALTER TABLE lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for now - adjust based on your security needs)
CREATE POLICY "Allow all operations on lobbies" ON lobbies FOR ALL USING (true);
CREATE POLICY "Allow all operations on entries" ON entries FOR ALL USING (true);
CREATE POLICY "Allow all operations on matches" ON matches FOR ALL USING (true);
CREATE POLICY "Allow all operations on payments" ON payments FOR ALL USING (true);
CREATE POLICY "Allow all operations on profiles" ON profiles FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_lobbies_updated_at BEFORE UPDATE ON lobbies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
-- INSERT INTO lobbies (id, game_type, max_players, status) VALUES 
-- ('test_lobby_1', 'sol-bird', 4, 'waiting'),
-- ('test_lobby_2', 'coinflip', 2, 'waiting');

COMMENT ON TABLE lobbies IS 'Game lobbies where players gather before matches start';
COMMENT ON TABLE entries IS 'Tracks which players joined and paid for each lobby';
COMMENT ON TABLE matches IS 'Completed game results and payouts';
COMMENT ON TABLE payments IS 'Transaction records for entry fee payments';
COMMENT ON TABLE profiles IS 'User profiles linked to wallet addresses';
