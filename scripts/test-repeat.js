#!/usr/bin/env node
const { execSync } = require('child_process');
const n = parseInt(process.argv[2], 10);
if (isNaN(n) || n < 1) {
  console.error('Usage: pnpm test:<N> (N must be a positive integer)');
  process.exit(1);
}
for (let i = 0; i < n; ++i) {
  console.log(`\n=== Test run ${i + 1} of ${n} ===`);
  try {
    execSync('pnpm test:once', { stdio: 'inherit' });
  } catch (e) {
    process.exit(e.status || 1);
  }
}
