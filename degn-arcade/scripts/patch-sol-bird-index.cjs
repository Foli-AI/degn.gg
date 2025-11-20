// scripts/patch-sol-bird-index.cjs
// NOTE: This script is disabled - we're using Socket.IO now, not ws-glue.js
// Keeping it for reference but it no longer injects ws-glue.js

const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, '..', 'public', 'games', 'sol-bird', 'client');
const indexPath = path.join(clientDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.warn('[patch-sol-bird-index] index.html not found at', indexPath);
  process.exit(0);
}

// Check if bundle.js exists (Socket.IO version)
const bundlePath = path.join(clientDir, 'bundle.js');
if (fs.existsSync(bundlePath)) {
  console.log('[patch-sol-bird-index] Socket.IO bundle detected - skipping ws-glue.js injection');
  process.exit(0);
}

// If we get here, it's the old setup - but we shouldn't inject ws-glue anymore
console.log('[patch-sol-bird-index] No action needed - using Socket.IO');
process.exit(0);


