import { NextRequest } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

// Global socket server instance
let io: SocketIOServer | null = null;

export async function GET(req: NextRequest) {
  if (!io) {
    // Initialize Socket.IO server
    const httpServer = new HTTPServer();
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    // Socket event handlers
    io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Join room
      socket.on('join-room', async (roomId: string) => {
        try {
          socket.join(roomId);
          console.log(`👤 ${socket.id} joined room ${roomId}`);
          
          // Broadcast to room that player joined
          socket.to(roomId).emit('player-joined', {
            roomId,
            player: { id: socket.id, username: 'Anonymous', betAmount: 0, status: 'active' }
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to join room' });
        }
      });

      // Leave room
      socket.on('leave-room', (roomId: string) => {
        socket.leave(roomId);
        console.log(`👤 ${socket.id} left room ${roomId}`);
        
        socket.to(roomId).emit('player-left', {
          roomId,
          playerId: socket.id
        });
      });

      // Place bet
      socket.on('place-bet', async (data: { roomId: string; amount: number }) => {
        try {
          console.log(`💰 ${socket.id} placed bet: ${data.amount} in room ${data.roomId}`);
          
          // Broadcast bet to room
          io?.to(data.roomId).emit('bet-placed', {
            roomId: data.roomId,
            playerId: socket.id,
            amount: data.amount
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to place bet' });
        }
      });

      // Start match
      socket.on('start-match', async (roomId: string) => {
        try {
          console.log(`🎮 Starting match in room ${roomId}`);
          
          // Broadcast match start
          io?.to(roomId).emit('match-started', {
            roomId,
            startsAt: new Date(Date.now() + 10000).toISOString() // 10 second countdown
          });

          // Simulate match progress
          setTimeout(() => {
            io?.to(roomId).emit('match-progress', {
              roomId,
              progress: 0.5,
              eliminations: []
            });
          }, 15000);

          // Simulate match completion
          setTimeout(() => {
            io?.to(roomId).emit('match-completed', {
              matchId: `match_${Date.now()}`,
              roomId,
              winner: {
                id: socket.id,
                username: 'Winner',
                payout: 1000
              },
              positions: [
                { playerId: socket.id, username: 'Winner', position: 1, payout: 1000 }
              ],
              totalPot: 1000,
              rakeCollected: 80,
              seed: 'demo_seed_123',
              completedAt: new Date().toISOString()
            });
          }, 30000);
        } catch (error) {
          socket.emit('error', { message: 'Failed to start match' });
        }
      });

      // Request rooms list
      socket.on('request-rooms', () => {
        // Mock rooms data for now
        const mockRooms = [
          {
            id: 'room_1',
            game: 'CoinRaid',
            name: 'Beginner Lobby',
            host: { id: 'host_1', username: 'GameMaster' },
            players: [
              { id: 'player_1', username: 'Alice', betAmount: 100, status: 'active' as const },
              { id: 'player_2', username: 'Bob', betAmount: 150, status: 'active' as const }
            ],
            status: 'waiting' as const,
            minEntry: 50,
            maxEntry: 500,
            maxPlayers: 4,
            totalPot: 250,
            createdAt: new Date().toISOString()
          },
          {
            id: 'room_2',
            game: 'Sol Serpent Royale',
            name: 'High Stakes Arena',
            host: { id: 'host_2', username: 'ProGamer' },
            players: [
              { id: 'player_3', username: 'Charlie', betAmount: 500, status: 'active' as const }
            ],
            status: 'waiting' as const,
            minEntry: 200,
            maxEntry: 1000,
            maxPlayers: 6,
            totalPot: 500,
            createdAt: new Date().toISOString()
          }
        ];

        socket.emit('rooms-list', mockRooms);
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });

    // Start server on port 3001
    httpServer.listen(3001, () => {
      console.log('🚀 Socket.IO server running on port 3001');
    });
  }

  return new Response('Socket.IO server initialized', { status: 200 });
}

