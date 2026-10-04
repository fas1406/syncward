// src/routes/jobs.js
const express = require('express');
const db = require('../db/pool');
const { requireAuth, requireRole } = require('../auth/middleware');
const { createJob, getJob, listJobs } = require('../jobs/service');

const router = express.Router();

// Everything under /api/jobs requires auth
router.use(requireAuth);

  // Whitelist of allowed job types (for now)
const ALLOWED_TYPES = ['noop', 'sleep'];

// ─── Per-type payload validators ─────────────────────────────
// Each returns null if valid, or an error string if invalid.
const payloadValidators = {
  noop: () => null,   // noop accepts anything

  sleep: (payload) => {
    const seconds = payload?.seconds;

    if (typeof seconds !== 'number' || Number.isNaN(seconds)) {
      return 'sleep job requires a numeric "seconds" field';
    }
    if (seconds < 0) {
      return `sleep job "seconds" cannot be negative (got ${seconds})`;
    }
    if (seconds > 300) {
      return `sleep job "seconds" is too large (max 300, got ${seconds})`;
    }
    return null;
  },
};


// POST /api/jobs — create a new job
router.post('/', requireRole('operator', 'admin'), async (req, res) => {
  const { type, payload } = req.body || {};

  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: 'type is required' });
  }

 if (!ALLOWED_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${ALLOWED_TYPES.join(', ')}` });
  }
  const validationError = payloadValidators[type](payload);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const job = await createJob({
      type,
      payload: payload || {},
      createdBy: req.user.id,
    });
    // 202 Accepted — we've accepted the request but haven't done it yet
    res.status(202).json(job);
  } catch (err) {
    console.error('POST /api/jobs error:', err);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// GET /api/jobs — list recent jobs
router.get('/', async (req, res) => {
  try {
    const jobs = await listJobs(50);
    res.json(jobs);
  } catch (err) {
    console.error('GET /api/jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/jobs/:id — get one job
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const job = await getJob(id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    console.error(`GET /api/jobs/${id} error:`, err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

module.exports = router;