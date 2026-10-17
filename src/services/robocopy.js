// src/services/robocopy.js
const { spawn } = require('child_process');
const readline = require('readline');

/**
 * Run robocopy. 
 * Resolves with { code, summary, raw } on success (exit codes 0–7).
 * Rejects on failure (exit codes >= 8).
 */
function robocopy(source, dest, options = [], onLine = null) {
  return new Promise((resolve, reject) => {
    // Basic sanity check
    if (!source || !dest) {
      return reject(new Error('Source and destination are required'));
    }

    const args = [source, dest, ...options];
    
    // Spawn the process (no shell, safer)
    const child = spawn('robocopy', args, { windowsHide: true });
    
    const lines = [];

    // Robocopy outputs to stdout
    const rl = readline.createInterface({ input: child.stdout });
    rl.on('line', (line) => {
      lines.push(line);
      if (onLine) onLine(line);
    });

    // In case of stderr (rare, but possible if robocopy itself crashes)
    const rlErr = readline.createInterface({ input: child.stderr });
    rlErr.on('line', (line) => {
      if (onLine) onLine(`[STDERR] ${line}`);
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start robocopy: ${err.message}`));
    });

    child.on('close', (code) => {
      // Robocopy exit codes:
      // 0: No files copied (already in sync)
      // 1: Files copied successfully
      // 2: Extra files/dirs detected
      // 3: 1 + 2
      // 4: Mismatched files detected
      // 5, 6, 7: Combinations of the above
      // 8: Some files/dirs could not be copied (FAILURE)
      // 16: Fatal error (FAILURE)
      
      if (code >= 8) {
        const err = new Error(`Robocopy failed with exit code ${code}`);
        err.code = code;
        err.output = lines.join('\n');
        return reject(err);
      }

      resolve({ code, raw: lines.join('\n') });
    });
  });
}

module.exports = { robocopy };