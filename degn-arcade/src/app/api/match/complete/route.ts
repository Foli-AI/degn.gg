import { NextResponse } from "next/server";

// Called by socket-server when match ends
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Received match completion payload:", body);

    // TODO: lookup lobby, payout winner, update DB, etc.
    // Example:
    // await processPayout(body.lobbyId, body.winner);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Match completion error:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
