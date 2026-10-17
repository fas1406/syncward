// src/services/sync-handler.js
const path = require('path');
const { robocopy } = require('./robocopy');

/**
 * Handles a sync job.
 * @param {Object} job - The DB job row.
 * @param {Object} bullJob - The BullMQ job (for progress updates).
 */
async function handleSync(dbJob, bullJob) {
  const { source, target, mirror = false } = dbJob.payload;

  if (!source || !target) {
    throw new Error('Payload must include "source" and "target" paths');
  }

  console.log(`[Sync] Starting: ${source} -> ${target}`);

//   // Build robocopy arguments
//   const args = [
//     '/E',             // Copy subdirectories, including empty ones
//     '/R:3',           // Retry 3 times on locked files
//     '/W:5',           // Wait 5 seconds between retries
//     '/NP',            // No progress percentage (we handle it)
//     '/NDL',           // No directory lists (keeps logs clean)
//     '/NJH',           // No job header
//     '/NJS',           // No job summary
//     '/MT:16',         // Multithreaded (16 threads)
//   ];
// Build robocopy arguments based on your custom command
  const args = [
    '/E',                 // Copy subdirectories, including empty ones
    '/Z',                 // Restartable mode (great for network shares)
    '/XO',                // Exclude older files
    '/FFT',               // Assume FAT file times (fixes timestamp drift with NAS/SMB)
    '/COPY:DAT',          // Copy Data, Attributes, and Timestamps
    '/DCOPY:DAT',         // Copy Directory Data, Attributes, and Timestamps
    '/R:3',               // Retry 3 times on locked files
    '/W:5',               // Wait 5 seconds between retries
    '/MT:16',             // Multithreaded (speeds up file transfers)
    '/NP',                // No progress percentage (handled by your wrapper)
    '/NDL',               // No directory lists (keeps logs clean)
    '/NJH',               // No job header
    '/NJS',               // No job summary
    
    // Optional: Keep these only if you want a physical log file written to disk
    // Make sure the directory exists and your Node app has write permissions!
    // '/TEE',
    // '/LOG:C:\\Temp\\RemoteToLocal_Sync.log'
  ];

  if (mirror) {
    // /MIR is equivalent to /E plus /PURGE (deletes extra files in target)
    args.push('/MIR');
  }

  let fileCount = 0;

  try {
    const result = await robocopy(source, target, args, (line) => {
      // Robocopy is noisy. We only log files being copied.
      // A typical copy line looks like: "	  New File  		    1.2 m	file.txt"
      if (line.includes('New File') || line.includes('Newer')) {
        fileCount++;
        console.log(`[Sync] Copied: ${line.trim()}`);
        // Update BullMQ progress occasionally (every 10 files)
        if (fileCount % 10 === 0) {
          bullJob.updateProgress(`Copied ${fileCount} files...`);
        }
      }
    });

    console.log(`[Sync] Complete. Exit code: ${result.code}`);
    
    return {
      exitCode: result.code,
      filesCopied: fileCount,
      source,
      target,
      mirror,
    };

  } catch (err) {
    console.error(`[Sync] Failed: ${err.message}`);
    // Truncate output so we don't blow up the DB if it's massive
    const truncatedOutput = (err.output || '').slice(0, 2000);
    throw new Error(`Robocopy failed: ${err.message}\nOutput: ${truncatedOutput}`);
  }
}

module.exports = { handleSync };