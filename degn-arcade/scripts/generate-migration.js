#!/usr/bin/env node

/**
 * Generate Supabase migration script based on schema validation
 * Run with: node scripts/generate-migration.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function generateMigration() {
  try {
    console.log('🔍 Checking schema and generating migration...');
    
    // Import the schema validator (this requires the Next.js app to be built)
    // For now, we'll generate a complete migration script
    
    const migrationSQL = `-- DEGN.gg Complete Schema Migration
-- Generated on ${new Date().toISOString()}
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (be careful in production!)
-- DROP TABLE IF EXISTS entries CASCADE;
-- DROP TABLE IF EXISTS matches CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS lobbies CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lobbies table
CREATE TABLE IF NOT EXISTS lobbies (
  id TEXT PRIMARY KEY,
  game_type TEXT NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 2,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'in-progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create entries table
CREATE TABLE IF NOT EXISTS entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lobby_id TEXT NOT NULL,
  wallet TEXT NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  transaction_signature TEXT,
  amount_sol DECIMAL(10, 9),
  entry_amount DECIMAL(10, 9),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lobby_id, wallet)
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lobby_id TEXT NOT NULL,
  winner_wallet TEXT,
  pot_amount DECIMAL(10, 9),
  game_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table (legacy compatibility)
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

-- Add foreign key constraints
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_entries_lobby_id'
  ) THEN
    ALTER TABLE entries ADD CONSTRAINT fk_entries_lobby_id 
      FOREIGN KEY (lobby_id) REFERENCES lobbies(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_matches_lobby_id'
  ) THEN
    ALTER TABLE matches ADD CONSTRAINT fk_matches_lobby_id 
      FOREIGN KEY (lobby_id) REFERENCES lobbies(id);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_lobbies_status ON lobbies(status);
CREATE INDEX IF NOT EXISTS idx_lobbies_game_type ON lobbies(game_type);
CREATE INDEX IF NOT EXISTS idx_entries_lobby_id ON entries(lobby_id);
CREATE INDEX IF NOT EXISTS idx_entries_wallet ON entries(wallet);
CREATE INDEX IF NOT EXISTS idx_entries_paid ON entries(paid);
CREATE INDEX IF NOT EXISTS idx_matches_lobby_id ON matches(lobby_id);
CREATE INDEX IF NOT EXISTS idx_matches_winner ON matches(winner_wallet);
CREATE INDEX IF NOT EXISTS idx_payments_lobby_id ON payments(lobby_id);
CREATE INDEX IF NOT EXISTS idx_payments_player_address ON payments(player_address);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development (adjust for production)
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Allow all on profiles" ON profiles;
  DROP POLICY IF EXISTS "Allow all on lobbies" ON lobbies;
  DROP POLICY IF EXISTS "Allow all on entries" ON entries;
  DROP POLICY IF EXISTS "Allow all on matches" ON matches;
  DROP POLICY IF EXISTS "Allow all on payments" ON payments;
  
  -- Create new policies
  CREATE POLICY "Allow all on profiles" ON profiles FOR ALL USING (true);
  CREATE POLICY "Allow all on lobbies" ON lobbies FOR ALL USING (true);
  CREATE POLICY "Allow all on entries" ON entries FOR ALL USING (true);
  CREATE POLICY "Allow all on matches" ON matches FOR ALL USING (true);
  CREATE POLICY "Allow all on payments" ON payments FOR ALL USING (true);
END $$;

-- Create update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lobbies_updated_at ON lobbies;
CREATE TRIGGER update_lobbies_updated_at 
  BEFORE UPDATE ON lobbies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert test data
INSERT INTO lobbies (id, game_type, max_players, status) VALUES 
  ('test_lobby_1', 'sol-bird', 4, 'waiting'),
  ('test_lobby_2', 'coinflip', 2, 'waiting')
ON CONFLICT (id) DO NOTHING;

-- Verify schema
SELECT 
  'Schema verification' as status,
  (SELECT count(*) FROM information_schema.tables WHERE table_name IN ('profiles', 'lobbies', 'entries', 'matches', 'payments')) as tables_created,
  (SELECT count(*) FROM lobbies) as test_lobbies;

COMMENT ON TABLE profiles IS 'User profiles linked to wallet addresses';
COMMENT ON TABLE lobbies IS 'Game lobbies where players gather before matches start';
COMMENT ON TABLE entries IS 'Tracks which players joined and paid for each lobby';
COMMENT ON TABLE matches IS 'Completed game results and payouts';
COMMENT ON TABLE payments IS 'Transaction records for entry fee payments';

-- Success message
SELECT '✅ DEGN.gg schema migration completed successfully!' as result;
`;

    // Ensure scripts directory exists
    const scriptsDir = path.join(__dirname);
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }

    // Write migration file
    const migrationFile = path.join(scriptsDir, 'sync-schema.sql');
    fs.writeFileSync(migrationFile, migrationSQL);

    console.log('✅ Migration script generated successfully!');
    console.log(`📄 File: ${migrationFile}`);
    console.log('');
    console.log('🚀 Next steps:');
    console.log('1. Copy the contents of scripts/sync-schema.sql');
    console.log('2. Paste into your Supabase SQL Editor');
    console.log('3. Click "Run" to execute the migration');
    console.log('4. Verify all tables are created successfully');

  } catch (error) {
    console.error('❌ Failed to generate migration:', error);
    process.exit(1);
  }
}

generateMigration();
