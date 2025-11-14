import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  // Ensure this only runs at request time, not build time
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "ENV_MISSING: SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }
  
  const supabase = createAdminClient();
  const { data: round } = await supabase
    .from("crash_rounds")
    .select("id, crash_point, server_seed_hash, server_seed, client_seed, nonce, end_time")
    .eq("status", "crashed")
    .order("end_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!round) {
    return NextResponse.json({ error: "No finished rounds yet" }, { status: 404 });
  }

  return NextResponse.json({
    roundId: round.id,
    crashPoint: round.crash_point,
    serverSeedHash: round.server_seed_hash,
    serverSeed: round.server_seed,
    clientSeed: round.client_seed,
    nonce: round.nonce
  });
}
