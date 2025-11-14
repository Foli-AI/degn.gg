-- Phase 2: Token Wagering, Match Outcomes, Payouts, Rake & Leaderboards
-- Migration for DEGN.gg Arcade Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS credits NUMERIC DEFAULT 1000,
ADD COLUMN IF NOT EXISTS wallet_address TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Create transactions table for all credit movements
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL, -- positive for credit in, negative for bets/fees
    type TEXT NOT NULL CHECK (type IN ('deposit', 'bet', 'payout', 'rake', 'refund', 'withdrawal')),
    meta JSONB DEFAULT '{}', -- arbitrary data (roomId, matchId, reason, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rooms table for game lobbies
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game TEXT NOT NULL,
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    min_entry NUMERIC NOT NULL DEFAULT 10,
    max_entry NUMERIC NOT NULL DEFAULT 1000,
    max_players INTEGER NOT NULL DEFAULT 4,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'running', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Create room_players table for tracking players in rooms
CREATE TABLE IF NOT EXISTS room_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bet_amount NUMERIC NOT NULL,
    position INTEGER, -- final position in match (1 = winner, 2 = second, etc.)
    payout NUMERIC DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'eliminated', 'winner')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- Create matches table for completed games
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    game TEXT NOT NULL,
    seed TEXT NOT NULL, -- provably fair seed used for simulation
    result JSONB NOT NULL DEFAULT '{}', -- ordered results, eliminations, winner
    total_pot NUMERIC NOT NULL DEFAULT 0,
    rake_collected NUMERIC NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rake_account table (single row to accumulate house rake)
CREATE TABLE IF NOT EXISTS rake_account (
    id SERIAL PRIMARY KEY,
    balance NUMERIC NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial rake account row
INSERT INTO rake_account (balance) VALUES (0) ON CONFLICT DO NOTHING;

-- Create leaderboard materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard AS
SELECT 
    u.id as user_id,
    u.username,
    COALESCE(SUM(CASE WHEN t.type = 'payout' THEN t.amount ELSE 0 END), 0) as total_won,
    COALESCE(SUM(CASE WHEN t.type = 'bet' THEN ABS(t.amount) ELSE 0 END), 0) as total_bet,
    COALESCE(COUNT(CASE WHEN rp.position = 1 THEN 1 END), 0) as wins,
    MAX(t.created_at) as last_active
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
LEFT JOIN room_players rp ON u.id = rp.user_id AND rp.position = 1
GROUP BY u.id, u.username;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_game ON rooms(game);
CREATE INDEX IF NOT EXISTS idx_room_players_room_id ON room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_room_players_user_id ON room_players(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_room_id ON matches(room_id);
CREATE INDEX IF NOT EXISTS idx_matches_completed_at ON matches(completed_at DESC);

-- Create function to refresh leaderboard
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW leaderboard;
END;
$$ LANGUAGE plpgsql;

-- Create RPC functions for atomic operations

-- Function to place a bet (atomic)
CREATE OR REPLACE FUNCTION place_bet(
    p_user_id UUID,
    p_room_id UUID,
    p_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_user_credits NUMERIC;
    v_room_status TEXT;
    v_room_max_players INTEGER;
    v_current_players INTEGER;
    v_min_entry NUMERIC;
    v_max_entry NUMERIC;
    v_result JSONB;
BEGIN
    -- Start transaction
    BEGIN
        -- Lock user row to prevent race conditions
        SELECT credits INTO v_user_credits
        FROM users 
        WHERE id = p_user_id
        FOR UPDATE;
        
        IF v_user_credits IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'User not found');
        END IF;
        
        -- Check room status and limits
        SELECT status, max_players, min_entry, max_entry 
        INTO v_room_status, v_room_max_players, v_min_entry, v_max_entry
        FROM rooms 
        WHERE id = p_room_id
        FOR UPDATE;
        
        IF v_room_status IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Room not found');
        END IF;
        
        IF v_room_status != 'waiting' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Room is not accepting players');
        END IF;
        
        -- Check bet amount limits
        IF p_amount < v_min_entry OR p_amount > v_max_entry THEN
            RETURN jsonb_build_object('success', false, 'error', 'Bet amount outside room limits');
        END IF;
        
        -- Check user has enough credits
        IF v_user_credits < p_amount THEN
            RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits');
        END IF;
        
        -- Check room capacity
        SELECT COUNT(*) INTO v_current_players
        FROM room_players 
        WHERE room_id = p_room_id;
        
        IF v_current_players >= v_room_max_players THEN
            RETURN jsonb_build_object('success', false, 'error', 'Room is full');
        END IF;
        
        -- Check if user already in room
        IF EXISTS (SELECT 1 FROM room_players WHERE room_id = p_room_id AND user_id = p_user_id) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Already joined this room');
        END IF;
        
        -- Deduct credits from user
        UPDATE users 
        SET credits = credits - p_amount 
        WHERE id = p_user_id;
        
        -- Add player to room
        INSERT INTO room_players (room_id, user_id, bet_amount)
        VALUES (p_room_id, p_user_id, p_amount);
        
        -- Record transaction
        INSERT INTO transactions (user_id, amount, type, meta)
        VALUES (p_user_id, -p_amount, 'bet', jsonb_build_object('roomId', p_room_id));
        
        -- Get updated user credits
        SELECT credits INTO v_user_credits FROM users WHERE id = p_user_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'userCredits', v_user_credits,
            'playersInRoom', v_current_players + 1
        );
        
        RETURN v_result;
        
    EXCEPTION WHEN OTHERS THEN
        -- Rollback handled automatically
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to complete a match and distribute payouts (atomic)
CREATE OR REPLACE FUNCTION complete_match(
    p_room_id UUID,
    p_seed TEXT,
    p_result JSONB,
    p_rake_percent NUMERIC DEFAULT 0.08
) RETURNS JSONB AS $$
DECLARE
    v_total_pot NUMERIC := 0;
    v_rake_amount NUMERIC;
    v_payout_amount NUMERIC;
    v_winner_id UUID;
    v_match_id UUID;
    player_record RECORD;
    v_result JSONB;
BEGIN
    BEGIN
        -- Calculate total pot
        SELECT SUM(bet_amount) INTO v_total_pot
        FROM room_players
        WHERE room_id = p_room_id;
        
        IF v_total_pot IS NULL OR v_total_pot = 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'No bets found for room');
        END IF;
        
        -- Calculate rake and payout
        v_rake_amount := v_total_pot * p_rake_percent;
        v_payout_amount := v_total_pot - v_rake_amount;
        
        -- Get winner from result
        v_winner_id := (p_result->>'winner')::UUID;
        
        IF v_winner_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'No winner specified in result');
        END IF;
        
        -- Create match record
        INSERT INTO matches (room_id, game, seed, result, total_pot, rake_collected)
        VALUES (p_room_id, (SELECT game FROM rooms WHERE id = p_room_id), p_seed, p_result, v_total_pot, v_rake_amount)
        RETURNING id INTO v_match_id;
        
        -- Update room status
        UPDATE rooms 
        SET status = 'completed', completed_at = NOW()
        WHERE id = p_room_id;
        
        -- Update player positions based on result
        FOR player_record IN 
            SELECT user_id, 
                   (p_result->'positions'->>(user_id::TEXT))::INTEGER as position
            FROM room_players 
            WHERE room_id = p_room_id
        LOOP
            UPDATE room_players
            SET position = player_record.position,
                status = CASE 
                    WHEN player_record.position = 1 THEN 'winner'
                    ELSE 'eliminated'
                END,
                payout = CASE 
                    WHEN player_record.position = 1 THEN v_payout_amount
                    ELSE 0
                END
            WHERE room_id = p_room_id AND user_id = player_record.user_id;
        END LOOP;
        
        -- Pay out winner
        UPDATE users 
        SET credits = credits + v_payout_amount
        WHERE id = v_winner_id;
        
        -- Record payout transaction
        INSERT INTO transactions (user_id, amount, type, meta)
        VALUES (v_winner_id, v_payout_amount, 'payout', 
                jsonb_build_object('matchId', v_match_id, 'roomId', p_room_id));
        
        -- Update rake account
        UPDATE rake_account 
        SET balance = balance + v_rake_amount, last_updated = NOW()
        WHERE id = 1;
        
        -- Record rake transaction
        INSERT INTO transactions (user_id, amount, type, meta)
        VALUES (v_winner_id, v_rake_amount, 'rake', 
                jsonb_build_object('matchId', v_match_id, 'roomId', p_room_id));
        
        -- Refresh leaderboard
        PERFORM refresh_leaderboard();
        
        v_result := jsonb_build_object(
            'success', true,
            'matchId', v_match_id,
            'totalPot', v_total_pot,
            'rakeCollected', v_rake_amount,
            'payoutAmount', v_payout_amount,
            'winnerId', v_winner_id
        );
        
        RETURN v_result;
        
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to refund a match (admin only)
CREATE OR REPLACE FUNCTION refund_match(
    p_match_id UUID,
    p_reason TEXT DEFAULT 'Admin refund'
) RETURNS JSONB AS $$
DECLARE
    v_room_id UUID;
    player_record RECORD;
    v_refunded_count INTEGER := 0;
BEGIN
    BEGIN
        -- Get room_id from match
        SELECT room_id INTO v_room_id
        FROM matches
        WHERE id = p_match_id;
        
        IF v_room_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Match not found');
        END IF;
        
        -- Refund all players
        FOR player_record IN 
            SELECT user_id, bet_amount
            FROM room_players 
            WHERE room_id = v_room_id
        LOOP
            -- Add credits back to user
            UPDATE users 
            SET credits = credits + player_record.bet_amount
            WHERE id = player_record.user_id;
            
            -- Record refund transaction
            INSERT INTO transactions (user_id, amount, type, meta)
            VALUES (player_record.user_id, player_record.bet_amount, 'refund', 
                    jsonb_build_object('matchId', p_match_id, 'reason', p_reason));
            
            v_refunded_count := v_refunded_count + 1;
        END LOOP;
        
        RETURN jsonb_build_object(
            'success', true,
            'refundedPlayers', v_refunded_count
        );
        
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
    END;
END;
$$ LANGUAGE plpgsql;


