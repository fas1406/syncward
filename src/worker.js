// src/worker.js
require('dotenv').config();
const { handleSync } = require('./services/sync-handler');
const { Worker } = require('bullmq');
const chalk = require('chalk');
const db = require('./db/pool');
const { connection } = require('./queue');

/**
 * Handle a job. Throws on failure.
 * `job.data.jobId` is the ID of the DB row.
 */
async function handleJob(bullJob) {
  const dbJobId = bullJob.data.jobId;

  // 1. Load the full job from Postgres
  const { rows } = await db.query('SELECT * FROM jobs WHERE id = $1', [dbJobId]);
  const dbJob = rows[0];
  if (!dbJob) {
    throw new Error(`Job #${dbJobId} not found in database`);
  }

  console.log(chalk.cyan(`\n▶ Picked up job #${dbJob.id} (type=${dbJob.type})`));
  console.log(chalk.gray(`  payload: ${JSON.stringify(dbJob.payload)}`));

  // 2. Mark running in Postgres
  await db.query(
    `UPDATE jobs SET status='running', started_at=NOW() WHERE id=$1`,
    [dbJobId]
  );

  // 3. Do the work — simulate for now
  // const steps = 5;
  // for (let i = 1; i <= steps; i++) {
  //   await sleep(500);
  //   await bullJob.updateProgress(Math.round((i / steps) * 100));
  //   console.log(chalk.gray(`  step ${i}/${steps}`));

  // }
  let result;

  try {
    if (dbJob.type === 'noop') {
      // Simulate work
      await new Promise((r) => setTimeout(r, 2000));
      result = { stepsCompleted: 1, note: 'noop completed' };
      
    } else if (dbJob.type === 'sync') {
      // Real work
      result = await handleSync(dbJob, bullJob);
      
    } else {
      throw new Error(`Unknown job type: ${dbJob.type}`);
    }

  // 4. Mark succeeded in Postgres
  await db.query(
      `UPDATE jobs SET status='succeeded', result=$1, finished_at=NOW() WHERE id=$2`,
      [result, dbJobId]
    );

  return result;

} catch (err) {
    // We let BullMQ handle the error/retry logic.
    // We do NOT mark the DB as failed here (the worker 'failed' event handles that on final attempt).
    throw err; 
  }
}


function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Create the BullMQ worker
const worker = new Worker('jobs', handleJob, {
  connection,
  concurrency: 1,
});

worker.on('completed', (job) => {
  console.log(chalk.green(`✓ BullMQ job ${job.id} completed`));
});

worker.on('failed', async (job, err) => {
  const isFinalAttempt = job.attemptsMade >= (job.opts.attempts || 1);
  console.error(chalk.red(`✗ Job ${job.id} failed (attempt ${job.attemptsMade}): ${err.message}`));

  if (isFinalAttempt && job?.data?.jobId) {
    try {
      await db.query(
        `UPDATE jobs SET status='failed', error=$1, finished_at=NOW() WHERE id=$2`,
        [err.message, job.data.jobId]
      );
    } catch (dbErr) {
      console.error('Failed to update DB on final failure:', dbErr.message);
    }
  }
});

console.log(chalk.green('👷 BullMQ worker started, listening on queue "jobs"'));

// Graceful shutdown
async function shutdown() {
  console.log(chalk.yellow('\n⏹  Shutting down...'));
  await worker.close();
  await connection.quit();
  await db.pool.end();
  console.log(chalk.gray('Worker shut down cleanly.'));
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);