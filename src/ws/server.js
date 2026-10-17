// src/ws/server.js
const { WebSocketServer } = require('ws');
const { verify } = require('../auth/tokens');
const IORedis = require('ioredis');

function setupWebSocket(httpServer) {
  // Create WebSocket server at the /ws path
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  // --- Redis Subscriber ---
  const subClient = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
  const CHANNEL = 'syncward:events';

  subClient.subscribe(CHANNEL, (err) => {
    if (err) console.error('Failed to subscribe to Redis:', err);
    else console.log(' WebSocket Server subscribed to Redis events');
  });
  
  subClient.on('message', (channel, message) => {
    if (channel !== CHANNEL) return;

    // Broadcast the message to ALL connected clients
    // (In a future step, we could filter by jobId, but for now, broadcast to all)
    wss.clients.forEach((client) => {
      if (client.readyState === 1) { // 1 = OPEN
        client.send(message);
      }
    });
  });

  wss.on('connection', (ws, req) => {
    // 1. Authenticate the connection using a query parameter
    // Example: ws://localhost:3000/ws?token=eyJhbG...
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');

    try {
      const user = verify(token);
      ws.user = user;
      console.log(` WebSocket connected: ${user.username}`);
    } catch (err) {
      console.log(' WebSocket rejected: Invalid token');
      ws.close(4001, 'Unauthorized');
      return;
    }

    // 2. Handle client messages (optional for now)
    ws.on('message', (message) => {
      // We'll use this later if the client needs to subscribe to specific jobs.
      console.log(`Received message from ${ws.user.username}: ${message}`);
    });

    // 3. Handle disconnect
    ws.on('close', () => {
      console.log(` WebSocket disconnected: ${ws.user.username}`);
    });
  });

  return wss;
}

module.exports = { setupWebSocket };