// src/worker.js
require('dotenv').config();
const db = require('./db/pool');
const chalk = require('chalk');
const {
  claimNextJob,
  markSucceeded,
  markFailed,
  reapStuckJobs
} = require('./jobs/service');

const POLL_INTERVAL_MS = 2000;
//const JOB_TYPE = 'noop'; // change to 'sync' later
const JOB_TYPES = ['noop', 'sleep'];   // was: const JOB_TYPE = 'noop'<- change to 'sync' later

let shutdownRequested = false;

/**
 * Handle a job. Throws on failure.
 * Returns a result object on success.
 */
async function handleJob(job) {
  console.log(chalk.cyan(`\n▶ Picked up job #${job.id} (type=${job.type})`));
  console.log(chalk.gray(`  payload: ${JSON.stringify(job.payload)}`));

    switch (job.type) {
    case 'noop':
      return handleNoop(job);

    case 'sleep':
      return handleSleep(job);

    default:
      throw new Error(`No handler for job type: ${job.type}`);
  }
}

// ─────────────────────────────────────────────────────────────
// noop — your existing logic, unchanged in spirit
// ─────────────────────────────────────────────────────────────
async function handleNoop(job) {
  // Simulate work — pretend this takes a few seconds
  const steps = 5;
  for (let i = 1; i <= steps; i++) {
    await sleep(500);
    console.log(chalk.gray(`  step ${i}/${steps}`));
  }

  return { stepsCompleted: steps, note: 'noop completed' };
}
  
// ─────────────────────────────────────────────────────────────
// sleep — new job type
// ─────────────────────────────────────────────────────────────
async function handleSleep(job) {
  const seconds = job.payload?.seconds;

  // Worker-side safety net (API should have already validated)
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) {
    throw new Error('sleep job requires a numeric "seconds" field');
  }
  if (seconds < 0) {
    throw new Error(`sleep job "seconds" cannot be negative (got ${seconds})`);
  }
  if (seconds > 300) {
    throw new Error(`sleep job "seconds" is too large (max 300, got ${seconds})`);
  }

  console.log(chalk.gray(`  sleeping for ${seconds}s...`));
  await sleep(seconds * 1000);

  return { slept: seconds };
}

/**
 * The main loop. Polls for a job, runs it, repeats.
 */
async function runLoop() {
  const delay = 60_000; // 60 seconds
  console.log(chalk.green(` Worker started, polling for "${JOB_TYPES}" jobs every ${POLL_INTERVAL_MS}ms`));

 const reaperInterval = setInterval(async () => {
    try {
      const n = await reapStuckJobs(30);
      if (n > 0) console.log(chalk.yellow(`♻ Reaped ${n} stuck job(s)`));
    } catch (err) {
      console.error(chalk.red('Reaper error:'), err.message);
    }
  }, 60_000);
      
  while (!shutdownRequested) {
    let job = null;
    try {
      job = await claimNextJob(JOB_TYPES);
    } catch (err) {
      console.error(chalk.red('Error claiming job:'), err.message);
    }

    if (!job) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    try {
      const result = await handleJob(job);
      await markSucceeded(job.id, result);
      console.log(chalk.green(`✓ Job #${job.id} succeeded`));
    } catch (err) {
      console.error(chalk.red(`✗ Job #${job.id} failed: ${err.message}`));
      await markFailed(job.id, err.message);
    }
  }

// Clean up the timer when shutting down
  clearInterval(reaperInterval);

  await db.pool.end();
  console.log(chalk.gray('Worker shut down cleanly.'));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Graceful shutdown on Ctrl+C
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n⏹  Shutdown requested. Finishing current job...'));
  shutdownRequested = true;
});

runLoop().catch((err) => {
  console.error(chalk.red('Fatal worker error:'), err);
  process.exit(1);
});
