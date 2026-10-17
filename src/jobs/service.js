// src/jobs/service.js
const db = require('../db/pool');
const { jobsQueue } = require('../queue');

/**
 * Create a job row. Returns the created row.
 */
async function createJob({ type, payload = {}, createdBy = null ,delayMs = 0}) {
 // 1. Persist to Postgres — this is the source of truth
  const { rows } = await db.query(
    `INSERT INTO jobs (type, payload, created_by)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [type, payload, createdBy]
  );
  const job = rows[0];

  // 2. Enqueue to BullMQ — this is the transport
  try {
    await jobsQueue.add(
      type,                  // job name (BullMQ "name")
      { jobId: job.id },     // the payload — just the DB id
      {
        jobId: `db-${job.id}`,   // BullMQ's own id, so we can dedupe later
        attempts: 3,              // retry up to 3 times
        backoff: { type: 'exponential', delay: 2000 }, // 2s, 4s, 8s
        delay:  delayMs || undefined,   // ← only set if > 0 
        removeOnComplete: { age: 3600 },  // keep for 1 hour
        removeOnFail: { age: 86400 },     // keep failures for 1 day
      }
    );
  } catch (err) {
    // If we fail to enqueue, we have a stuck DB row.
    // Mark it failed so the user knows.
    console.error('Failed to enqueue job:', err);
    await db.query(
      `UPDATE jobs SET status='failed', error=$1, finished_at=NOW() WHERE id=$2`,
      [`Enqueue failed: ${err.message}`, job.id]
    );
    throw err;
  }

  return job;
}

/**
 * Atomically claim the oldest queued job of a given type.
 * Returns the job row, or null if none available.
 *
 * The magic is "FOR UPDATE SKIP LOCKED" — if two workers
 * poll at the same instant, only one gets the job.
 */
// NOTE: Replaced by BullMQ in Step 7.
// Kept for reference. Do not call from application code.
// async function claimNextJob(type) {
//   const { rows } = await db.query(
//     `UPDATE jobs
//      SET status = 'running', started_at = NOW()
//      WHERE id = (
//        SELECT id FROM jobs
//        WHERE status = 'queued' AND type = ANY($1::text[])
//        ORDER BY created_at
//        LIMIT 1
//        FOR UPDATE SKIP LOCKED
//      )
//      RETURNING *`,
//     [type]
//   );
//   return rows[0] || null;
// }

/**
 * Mark a job as succeeded with a result payload.
 */
async function markSucceeded(jobId, result = {}) {
  const { rows } = await db.query(
    `UPDATE jobs
     SET status = 'succeeded', result = $1, finished_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [result, jobId]
  );
  return rows[0];
}

/**
 * Mark a job as failed with an error message.
 */
async function markFailed(jobId, errorMessage) {
  const { rows } = await db.query(
    `UPDATE jobs
     SET status = 'failed', error = $1, finished_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [errorMessage, jobId]
  );
  return rows[0];
}

/**
 * Get a single job with its current state.
 */
async function getJob(jobId) {
  const { rows } = await db.query('SELECT * FROM jobs WHERE id = $1', [jobId]);
  return rows[0] || null;
}

/**
 * List recent jobs.
 */
async function listJobs(limit = 50) {
  const { rows } = await db.query(
    `SELECT j.*, u.username AS created_by_username
     FROM jobs j
     LEFT JOIN users u ON u.id = j.created_by
     ORDER BY j.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

/**
 * Reset jobs that have been stuck in 'running' for longer than maxMinutes.
 * Returns the number of jobs reset.
 */
// NOTE: Replaced by BullMQ in Step 7.
// Kept for reference. Do not call from application code.
// async function reapStuckJobs(maxMinutes = 30) {
//   const { rowCount } = await db.query(
//     `UPDATE jobs
//      SET status = 'queued', started_at = NULL
//      WHERE status = 'running'
//        AND started_at < NOW() - ($1 || ' minutes')::interval`,
//     [maxMinutes]
//   );
//   return rowCount;
// }

module.exports = {
  createJob,
 // claimNextJob,
  markSucceeded,
  markFailed,
  getJob,
  listJobs,
 // reapStuckJobs
};