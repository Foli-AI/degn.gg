-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table for transaction tracking
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lobby_id TEXT NOT NULL,
  player_address TEXT NOT NULL,
  transaction_signature TEXT UNIQUE NOT NULL,
  amount_sol DECIMAL(10, 9) NOT NULL,
  entry_amount DECIMAL(10, 9) NOT NULL,
  status TEXT DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_payments_lobby_id ON payments(lobby_id);
CREATE INDEX IF NOT EXISTS idx_payments_player_address ON payments(player_address);
CREATE INDEX IF NOT EXISTS idx_payments_signature ON payments(transaction_signature);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (true);

CREATE POLICY "Payments are viewable by everyone" ON payments FOR SELECT USING (true);
CREATE POLICY "Payments can be inserted by anyone" ON payments FOR INSERT WITH CHECK (true);
