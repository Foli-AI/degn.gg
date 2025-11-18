"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { GameRoomCard } from "@/components/game-room-card";

const GAME_ROOMS = [
  {
    id: 1,
    title: "Sol Bird",
    icon: "🐦",
    players: 8,
    maxPlayers: 10,
    entryBet: 0.1,
    status: "waiting" as const,
    color: "from-cyan-500 to-blue-600",
  },
  {
    id: 2,
    title: "Suroi",
    icon: "🎯",
    players: 15,
    maxPlayers: 20,
    entryBet: 0.25,
    status: "in_progress" as const,
    color: "from-purple-500 to-pink-600",
  },
  {
    id: 3,
    title: "Slither",
    icon: "🐍",
    players: 4,
    maxPlayers: 8,
    entryBet: 0.5,
    status: "waiting" as const,
    color: "from-green-500 to-emerald-600",
  },
  {
    id: 4,
    title: "Agar",
    icon: "⚪",
    players: 12,
    maxPlayers: 12,
    entryBet: 0.15,
    status: "completed" as const,
    color: "from-orange-500 to-red-600",
  },
  {
    id: 5,
    title: "Coinflip",
    icon: "🪙",
    players: 2,
    maxPlayers: 10,
    entryBet: 0.2,
    status: "waiting" as const,
    color: "from-yellow-500 to-amber-600",
  },
  {
    id: 6,
    title: "Sol Bird",
    icon: "🐦",
    players: 6,
    maxPlayers: 10,
    entryBet: 0.3,
    status: "in_progress" as const,
    color: "from-cyan-500 to-blue-600",
  },
];

export function GameGrid() {
  return (
    <div className="space-y-4">
      {/* Header with Create Room button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1 font-heading tracking-tight">
            Live Game Rooms
          </h2>
          <p className="text-sm text-muted-foreground">Join a room or create your own</p>
        </div>
        <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 neon-glow">
          <Plus className="w-4 h-4 mr-2" />
          Create Room
        </Button>
      </div>

      {/* Game rooms grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {GAME_ROOMS.map((room) => (
          <GameRoomCard key={room.id} room={room} />
        ))}
      </div>
    </div>
  );
}

