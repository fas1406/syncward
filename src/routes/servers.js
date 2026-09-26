// src/routes/servers.js
const express = require('express');
const db = require('../db/pool');

const router = express.Router();

// GET /api/servers — list all servers
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM servers ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /servers error:', err);
    res.status(500).json({ error: 'Failed to fetch servers' });
  }
});

//api/servers/enabled
router.get('/enabled', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM servers WHERE enabled = TRUE ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /enabled servers error:', err);
    res.status(500).json({ error: 'Failed to fetch enabled servers' });
  }
});

// GET /api/servers/:id — get one server by ID Or /api/servers/:role  — get one server by ROLE
router.get('/:idorrole', async (req, res) => {
  const rawParam = req.params.idorrole; // Keep the original string (e.g., "12" or "admin")

  // SCENARIO 1: Check if the parameter is a pure numeric ID string
  if (/^\d+$/.test(rawParam)){
    const numericId = parseInt(rawParam, 10); // Safe to convert to a number now

    try {
      const { rows } = await db.query(
        'SELECT * FROM servers WHERE id = \$1',
        [numericId]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Server not found' });
      return res.json(rows[0]);
    } catch (err) {
      console.error(`GET /servers/${rawParam} error:`, err);
      return res.status(500).json({ error: 'Failed to fetch server' });
    }
  } 
  
  // SCENARIO 2: Check if the parameter is a letters-only string role
  else if (/^[a-zA-Z]+$/.test(rawParam)) {
    try {
      const { rows } = await db.query(
        'SELECT * FROM servers WHERE role = \$1',
        [rawParam] // Passes the clean text string (like "admin") directly to the DB
      );
      if (!rows[0]) {
        return res.status(404).json({ error: `Server not found with ${rawParam} role.` });
      }
      return res.json(rows); 
    } catch (err) {
      console.error(`GET /servers/${rawParam} error:`, err);
      return res.status(500).json({ error: 'Failed to fetch server' });
    }
  } 
  
  // SCENARIO 3: It is mixed data, a symbol, or otherwise invalid
  else {
    return res.status(400).json({ error: 'Invalid format. Must be a numeric ID or a letters-only role.' });
  }
});



// POST /api/servers — create a new server
router.post('/', async (req, res) => {
    console.log(req.body);
  const { name, host, remote_path, backup_path, service_name, role, enabled } = req.body || {};

  // Simple validation
  if (!name || !host || !remote_path) {
    return res.status(400).json({
      error: 'name, host, and remote_path are required',
    });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO servers (name, host, remote_path, backup_path, service_name, role, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, TRUE))
       RETURNING *`,
      [
        name,
        host,
        remote_path,
        backup_path ?? null,
        service_name ?? null,
        role ?? 'secondary',
        enabled ?? null,  // COALESCE in SQL handles null → TRUE
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    // 23505 = unique_violation in Postgres
    if (err.code === '23505') {
      return res.status(409).json({ error: `Server "${name}" already exists` });
    }
    console.error('POST /servers error:', err);
    res.status(500).json({ error: 'Failed to create server' });
  }
});

// PATCH /api/servers/:id — update fields
router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  // Whitelist updatable fields — never trust user input directly
  const allowed = ['name', 'host', 'remote_path', 'backup_path', 'service_name', 'role', 'enabled'];
  const provided = Object.keys(req.body || {});
  const fields = provided.filter(k => allowed.includes(k));

  if (fields.length === 0) {
    return res.status(400).json({
      error: `No valid fields to update. Allowed: ${allowed.join(', ')}`,
    });
  }

  // Build "SET col1 = $1, col2 = $2, ..." safely
  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
  const values = fields.map(f => req.body[f]);
  values.push(id); // last parameter = WHERE id = $N

  try {
    const { rows } = await db.query(
      `UPDATE servers SET ${setClause} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Server not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A server with that name already exists' });
    }
    console.error(`PATCH /servers/${id} error:`, err);
    res.status(500).json({ error: 'Failed to update server' });
  }
});

// DELETE /api/servers/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const { rows } = await db.query(
      'DELETE FROM servers WHERE id = $1 RETURNING name',
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Server not found' });
    res.status(204).send(); // no body on successful delete
  } catch (err) {
    console.error(`DELETE /servers/${id} error:`, err);
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

module.exports = router;