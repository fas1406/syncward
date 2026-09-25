// src/server.js
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// Route 1 — the classic
app.get('/hello', (req, res) => {
  res.send('Hello from SyncWard!');
});

// Route 2 — prove it's running in real time
app.get('/time', (req, res) => {
  res.json({
    now: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
});
console.log( Intl.DateTimeFormat().toString());
// Route 3 — a version endpoint (useful later for health checks)
app.get('/api/version', (req, res) => {
  res.json({
    name: 'syncward',
    version: '0.1.0',
    status: 'ok',
  });
});

// Catch-all for anything else
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

app.listen(PORT, () => {
  console.log(`🚀 SyncWard server listening on http://localhost:${PORT}`);
});