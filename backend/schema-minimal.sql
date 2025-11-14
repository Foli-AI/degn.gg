-- DEGN.gg Minimal Schema - Test First
-- Run this first to test basic functionality

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create lobbies table
CREATE TABLE lobbies (
  id TEXT PRIMARY KEY,
  game_type TEXT NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 2,
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create entries table
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lobby_id TEXT NOT NULL,
  wallet TEXT NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  transaction_signature TEXT,
  amount_sol DECIMAL(10, 9),
  entry_amount DECIMAL(10, 9),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint after both tables exist
ALTER TABLE entries ADD CONSTRAINT fk_entries_lobby_id 
  FOREIGN KEY (lobby_id) REFERENCES lobbies(id) ON DELETE CASCADE;

-- Add unique constraint
ALTER TABLE entries ADD CONSTRAINT unique_lobby_wallet 
  UNIQUE(lobby_id, wallet);

-- Enable RLS with permissive policies for testing
ALTER TABLE lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on lobbies" ON lobbies FOR ALL USING (true);
CREATE POLICY "Allow all on entries" ON entries FOR ALL USING (true);
CREATE POLICY "Allow all on profiles" ON profiles FOR ALL USING (true);

-- Test data
INSERT INTO lobbies (id, game_type, max_players, status) VALUES 
('test_lobby_1', 'sol-bird', 4, 'waiting'),
('test_lobby_2', 'coinflip', 2, 'waiting');

-- Verify tables were created
SELECT 'lobbies' as table_name, count(*) as row_count FROM lobbies
UNION ALL
SELECT 'entries' as table_name, count(*) as row_count FROM entries
UNION ALL
SELECT 'profiles' as table_name, count(*) as row_count FROM profiles;
