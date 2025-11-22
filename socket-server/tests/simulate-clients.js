/**
 * Client Simulation Script for Socket.IO Server Testing
 * 
 * Usage:
 *   node socket-server/tests/simulate-clients.js --num 3 --lobby test-lobby-1 --token <token> --socket http://localhost:3001
 * 
 * Options:
 *   --num N          Number of clients to simulate (default: 2)
 *   --lobby ID       Lobby ID (default: test-lobby-1)
 *   --token TOKEN    Auth token (default: dev-token)
 *   --socket URL     Socket.IO server URL (default: http://localhost:3001)
 *   --death-delay MS Delay before simulating death (default: 5000)
 */

const { io } = require('socket.io-client');

const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};

const numClients = parseInt(getArg('num', '2'));
const lobbyId = getArg('lobby', 'test-lobby-1');
const token = getArg('token', 'dev-token');
const serverUrl = getArg('socket', 'http://localhost:3001');
const deathDelay = parseInt(getArg('death-delay', '5000'));

console.log(`[TEST] Simulating ${numClients} clients`);
console.log(`[TEST] Lobby: ${lobbyId}`);
console.log(`[TEST] Server: ${serverUrl}`);
console.log('');

const clients = [];
let matchStarted = false;
let matchEnded = false;
let payoutCalled = false;

// Create clients
for (let i = 0; i < numClients; i++) {
  const userId = `test-user-${i + 1}`;
  const username = `TestPlayer${i + 1}`;

  console.log(`[TEST] Creating client ${i + 1}/${numClients}: ${userId}`);

  const socket = io(serverUrl, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: {
      token: token // In real scenario, this would be a valid JWT
    },
    query: {
      userId,
      lobbyId,
      username
    }
  });

  const client = {
    socket,
    userId,
    username,
    alive: true,
    id: i + 1
  };

  socket.on('connect', () => {
    console.log(`[CLIENT ${client.id}] ✅ Connected: ${socket.id}`);
  });

  socket.on('connect_error', (error) => {
    console.error(`[CLIENT ${client.id}] ❌ Connection error:`, error.message);
  });

  socket.on('lobby_update', (data) => {
    console.log(`[CLIENT ${client.id}] 📋 Lobby update:`, {
      players: data.players?.length || 0,
      bots: data.bots?.length || 0,
      total: data.totalPlayers,
      started: data.started
    });
  });

  socket.on('lobby_ready', (data) => {
    console.log(`[CLIENT ${client.id}] ⏰ Lobby ready, countdown: ${data.countdown}`);
  });

  socket.on('match_start', (data) => {
    console.log(`[CLIENT ${client.id}] 🚀 Match started!`);
    matchStarted = true;

    // Simulate player death after delay
    setTimeout(() => {
      if (client.alive && !matchEnded) {
        console.log(`[CLIENT ${client.id}] 💀 Simulating death...`);
        client.alive = false;
        socket.emit('player_death', {
          userId,
          lobbyId,
          ts: Date.now()
        });
      }
    }, deathDelay + (i * 1000)); // Stagger deaths
  });

  socket.on('player_update', (data) => {
    if (data.userId === userId) {
      console.log(`[CLIENT ${client.id}] 📊 Player update:`, data);
    }
  });

  socket.on('match_end', (data) => {
    console.log(`[CLIENT ${client.id}] 🏆 Match ended! Winner: ${data.winner}`);
    matchEnded = true;
  });

  socket.on('winner_payout', (data) => {
    console.log(`[CLIENT ${client.id}] 💰 Winner payout:`, {
      winner: data.winner,
      payout: data.payout,
      tx: data.tx
    });
    payoutCalled = true;
  });

  socket.on('disconnect', () => {
    console.log(`[CLIENT ${client.id}] 🔌 Disconnected`);
  });

  clients.push(client);
}

// Wait for all clients to connect
setTimeout(() => {
  console.log('\n[TEST] All clients connected. Waiting for match to start...\n');
}, 2000);

// Keep script running
process.on('SIGINT', () => {
  console.log('\n[TEST] Shutting down...');
  clients.forEach(client => {
    client.socket.disconnect();
  });
  process.exit(0);
});

// Test completion check
setTimeout(() => {
  console.log('\n[TEST] Test Results:');
  console.log(`  Match started: ${matchStarted ? '✅' : '❌'}`);
  console.log(`  Match ended: ${matchEnded ? '✅' : '❌'}`);
  console.log(`  Payout called: ${payoutCalled ? '✅' : '❌'}`);
  
  if (matchStarted && matchEnded) {
    console.log('\n[TEST] ✅ Test completed successfully!');
    process.exit(0);
  } else {
    console.log('\n[TEST] ⚠️ Test timeout - match did not complete');
    process.exit(1);
  }
}, 120000); // 2 minute timeout

