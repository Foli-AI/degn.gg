import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { lobbyId, playerId } = await req.json();

    if (!lobbyId || !playerId) {
      return NextResponse.json(
        { error: "Missing lobbyId or playerId" },
        { status: 400 }
      );
    }

    const token = jwt.sign(
      { lobbyId, playerId },
      process.env.SERVER_SECRET as string,
      { expiresIn: "10m" }
    );

    return NextResponse.json({ token });
  } catch (err) {
    console.error("Issue-token error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
