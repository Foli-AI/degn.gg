import type { PostgrestError } from "@supabase/supabase-js";

import { getSupabaseClient } from "./client";

export type LobbySnapshot = {
  playersOnline: number;
  totalWagered: number;
  jackpotPool: number;
  biggestWin: number;
};

export async function fetchLobbySnapshot(): Promise<LobbySnapshot | null> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return null;
    }

    const [{ count: playerCount, error: playersError }, sessionsResult, jackpotResult] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("game_sessions").select("wager,payout").limit(500),
      supabase.from("jackpot_pool").select("current_total").order("updated_at", { ascending: false }).limit(1)
    ]);

    validateError(playersError);
    validateError(sessionsResult.error);
    validateError(jackpotResult.error);

    const wagerData = sessionsResult.data ?? [];
    const totalWagered = wagerData.reduce((acc, session) => acc + Number(session.wager ?? 0), 0);
    const biggestWin = wagerData.reduce((acc, session) => Math.max(acc, Number(session.payout ?? 0)), 0);

    const jackpotValue = jackpotResult.data?.[0]?.current_total ? Number(jackpotResult.data[0].current_total) : 0;

    return {
      playersOnline: playerCount ?? 0,
      totalWagered,
      jackpotPool: jackpotValue,
      biggestWin
    };
  } catch (error) {
    console.error("Failed to fetch lobby snapshot", error);
    return null;
  }
}

function validateError(error: PostgrestError | null) {
  if (error) {
    throw error;
  }
}
