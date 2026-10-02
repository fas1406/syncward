// src/routes/auth.js
const express = require('express');
const db = require('../db/pool');
const { hashPassword, verifyPassword } = require('../auth/password');
const { sign } = require('../auth/tokens');
const { requireAuth, requireRole } = require('../auth/middleware');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }
console.log(username);
  try {
    const lookup = String(username).toLowerCase().trim(); 
    const { rows } = await db.query(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1',
      [lookup]
    );
    const user = rows[0];

    // IMPORTANT: same error for "no user" and "wrong password"
    // Prevents user enumeration attacks
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = sign({ id: user.id, username: user.username, role: user.role });

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error('POST /auth/login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me — return the current user
router.get('/me', requireAuth, (req, res) => {

  res.json({ user: req.user });
});

// POST /api/auth/users — admin-only: create a new user
router.post('/users', requireAuth, requireRole('admin'), async (req, res) => {
  const { username, password, role } = req.body || {};
  const finalUsername = String(username || '').toLowerCase().trim();

  if (!finalUsername || !password)  {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const allowedRoles = ['viewer', 'operator', 'admin'];
  const finalRole = role || 'viewer';
  if (!allowedRoles.includes(finalRole)) {
    return res.status(400).json({ error: `role must be one of: ${allowedRoles.join(', ')}` });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'password must be at least 8 characters' });
  }

  try {
    const hash = await hashPassword(password);
    const { rows } = await db.query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, username, role, created_at`,
      [finalUsername, hash, finalRole]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username already exists' });
    }
    console.error('POST /auth/users error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// GET /api/auth/users — admin-only: list users
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, username, role, created_at FROM users ORDER BY username'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /auth/users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});
// post /api/auth/chang-password 
router.post('/change-password', requireAuth, async(req,res) => {
  try { 
      const { currentPassword, newPassword } = req.body || {};
      // 1. Validate body fields presence and naming
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Bad Request as Both Current Passwor and New Password is Required.'});
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New Password Length must be at least 8 characters.'})
      }

      // 2. Look up the user by req.user.id
      const userResult = await db.query(`SELECT password_hash FROM users WHERE id = $1`,[req.user.id]);
      if (userResult.rowCount === 0) {
        return res.status(404).json({error : 'No Row Found in users table '});
      }
      const user = userResult.rows[0];
     
      // 3. Verify currentPassword against the stored hash  
      const isMatch = await verifyPassword(currentPassword,user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }
      // 4. Hash newPassword and update the row safely using parameterized queries
      const newHash = await hashPassword(newPassword);
      const updeteResult = await db.query(
        `UPDATE users SET password_hash = $1 WHERE id = $2`,
        [newHash,req.user.id]
      );
      // 5. Return the exact format requested
        return res.status(200).json({ ok: true });

      }  
  catch (err) {
          console.error('POST /api/auth/change-password error:', err);
          return res.status(500).json({ error: 'An internal server error occurred.' });
      }

});

module.exports = router;