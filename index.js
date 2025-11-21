import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const PORT = process.env.PORT || 3001;
const NEXT_PUBLIC_URL = process.env.NEXT_PUBLIC_URL || "https://degn.gg";

// ---------------------------------------------
// STATE
// ---------------------------------------------
let lobbies = {}; // lobbyId -> { players: {}, bots: {}, aliveCount, started }
const MAX_PLAYERS = 8;

// ---------------------------------------------
// EXPRESS + SOCKET.IO SETUP
// ---------------------------------------------
const app = express();
app.use(cors());
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

// ---------------------------------------------
// HELPER FUNCTION: CREATE BOT
// ---------------------------------------------
function makeBot(lobbyId) {
  const botId = "bot-" + uuidv4().slice(0, 8);
  const bot = {
    id: botId,
    nickname: "Bot_" + botId.slice(4),
    isBot: true,
    alive: true,
  };

  lobbies[lobbyId].bots[botId] = bot;
  lobbies[lobbyId].aliveCount++;
  return bot;
}

// ---------------------------------------------
// CHECK WINNER (LAST MAN STANDING)
// ---------------------------------------------
function checkWinner(lobbyId) {
  const lobby = lobbies[lobbyId];
  if (!lobby) return;

  if (lobby.aliveCount <= 1) {
    // Find who is alive
    let winner = null;

    for (let p of Object.values(lobby.players)) {
      if (p.alive) winner = p;
    }
    for (let b of Object.values(lobby.bots)) {
      if (b.alive) winner = b;
    }

    io.to(lobbyId).emit("match_end", {
      winnerId: winner.id,
      isBot: winner.isBot ?? false,
    });

    console.log("🏆 MATCH ENDED", lobbyId, "winner →", winner.id);

    // Optionally call payout route on Next.js
    if (!winner.isBot) {
      fetch(`${NEXT_PUBLIC_URL}/api/match/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lobbyId,
          winnerId: winner.id,
        }),
      });
    }
  }
}

// ---------------------------------------------
// SOCKET.IO LOGIC
// ---------------------------------------------
io.on("connection", (socket) => {
  console.log("🔌 Player connected", socket.id);

  socket.on("join_lobby", ({ lobbyId, nickname }) => {
    if (!lobbies[lobbyId]) {
      lobbies[lobbyId] = {
        players: {},
        bots: {},
        aliveCount: 0,
        started: false,
      };
    }

    const lobby = lobbies[lobbyId];

    lobby.players[socket.id] = {
      id: socket.id,
      nickname,
      alive: true,
      isBot: false,
    };
    lobby.aliveCount++;

    socket.join(lobbyId);

    console.log(`👤 Player ${socket.id} joined lobby ${lobbyId}`);

    // Auto-fill with bots if < 8
    const missing = MAX_PLAYERS - (Object.keys(lobby.players).length + Object.keys(lobby.bots).length);
    for (let i = 0; i < missing; i++) {
      const bot = makeBot(lobbyId);
      console.log("🤖 Bot added:", bot.id);
    }

    // Notify all players
    io.to(lobbyId).emit("lobby_update", {
      players: lobby.players,
      bots: lobby.bots,
    });
  });

  // -----------------------------------------
  // PLAYER DIED
  // -----------------------------------------
  socket.on("player_death", ({ lobbyId }) => {
    const lobby = lobbies[lobbyId];
    if (!lobby) return;

    if (lobby.players[socket.id]) {
      lobby.players[socket.id].alive = false;
      lobby.aliveCount--;
      console.log("💀 Player died:", socket.id);
      checkWinner(lobbyId);
    }
  });

  // -----------------------------------------
  // DISCONNECT
  // -----------------------------------------
  socket.on("disconnect", () => {
    console.log("❌ Player disconnected", socket.id);

    for (let lobbyId in lobbies) {
      const lobby = lobbies[lobbyId];

      if (lobby.players[socket.id]) {
        if (lobby.players[socket.id].alive) {
          lobby.aliveCount--;
        }
        delete lobby.players[socket.id];
        checkWinner(lobbyId);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`🔥 DEGN Socket server running on :${PORT}`);
});
