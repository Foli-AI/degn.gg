/**
 * Build script for BirdMMO client game
 * 
 * This script:
 * 1. Builds the client-game/birdmmo React app using webpack
 * 2. Copies the build output to public/games/sol-bird-birdmmo/dist/client/
 * 3. Ensures the new Network.js (with production socket server) is included
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const clientGameDir = path.join(__dirname, '..', 'client-game', 'birdmmo');
const outputDir = path.join(__dirname, '..', 'public', 'games', 'sol-bird-birdmmo', 'dist', 'client');

console.log('[BUILD] 🏗️  Building BirdMMO client...');
console.log(`[BUILD] Source: ${clientGameDir}`);
console.log(`[BUILD] Output: ${outputDir}`);

// Check if source directory exists
if (!fs.existsSync(clientGameDir)) {
  console.error(`[BUILD] ❌ Source directory not found: ${clientGameDir}`);
  process.exit(1);
}

// Check if Network.js exists with production URL
const networkJsPath = path.join(clientGameDir, 'Network.js');
if (fs.existsSync(networkJsPath)) {
  const networkContent = fs.readFileSync(networkJsPath, 'utf8');
  if (!networkContent.includes('degn-socket-server.onrender.com')) {
    console.warn('[BUILD] ⚠️  Network.js may not have production socket URL');
  } else {
    console.log('[BUILD] ✅ Network.js has production socket URL');
  }
} else {
  console.error(`[BUILD] ❌ Network.js not found: ${networkJsPath}`);
  process.exit(1);
}

try {
  // Change to client-game/birdmmo directory
  process.chdir(clientGameDir);
  
  // Install dependencies if node_modules doesn't exist
  if (!fs.existsSync(path.join(clientGameDir, 'node_modules'))) {
    console.log('[BUILD] 📦 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  }
  
  // Build the client
  console.log('[BUILD] 🔨 Running webpack build...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Verify build output
  const buildOutput = path.join(clientGameDir, 'dist', 'bundle.js');
  if (!fs.existsSync(buildOutput)) {
    console.error(`[BUILD] ❌ Build output not found: ${buildOutput}`);
    process.exit(1);
  }
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Copy build files to public directory
  console.log('[BUILD] 📋 Copying build files to public directory...');
  
  // Copy bundle.js
  const bundleSource = path.join(clientGameDir, 'dist', 'bundle.js');
  const bundleDest = path.join(outputDir, 'bundle.js');
  fs.copyFileSync(bundleSource, bundleDest);
  console.log(`[BUILD] ✅ Copied bundle.js`);
  
  // Copy bundle.js.LICENSE.txt if it exists
  const licenseSource = path.join(clientGameDir, 'dist', 'bundle.js.LICENSE.txt');
  if (fs.existsSync(licenseSource)) {
    const licenseDest = path.join(outputDir, 'bundle.js.LICENSE.txt');
    fs.copyFileSync(licenseSource, licenseDest);
    console.log(`[BUILD] ✅ Copied bundle.js.LICENSE.txt`);
  }
  
  // Copy index.html (create new one without interceptor)
  const indexDest = path.join(outputDir, 'index.html');
  const indexContent = `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>BirdMMO - DEGN.gg</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                overflow: hidden;
                background: #0b0c10;
            }
            #root {
                width: 100vw;
                height: 100vh;
            }
        </style>
    </head>
    <body>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <div id="root"></div>
        <script src="bundle.js"></script>
    </body>
</html>`;
  fs.writeFileSync(indexDest, indexContent);
  console.log(`[BUILD] ✅ Created index.html (no interceptor)`);
  
  // Copy assets (img, models, fonts) if they exist
  const assetsToCopy = ['img', 'models', 'fonts'];
  for (const asset of assetsToCopy) {
    const assetSource = path.join(clientGameDir, asset);
    const assetDest = path.join(outputDir, asset);
    if (fs.existsSync(assetSource)) {
      // Copy directory recursively
      copyRecursiveSync(assetSource, assetDest);
      console.log(`[BUILD] ✅ Copied ${asset}/`);
    }
  }
  
  console.log('[BUILD] ✅ BirdMMO client build complete!');
  console.log(`[BUILD] 📍 Output location: ${outputDir}`);
  
} catch (error) {
  console.error('[BUILD] ❌ Build failed:', error.message);
  process.exit(1);
}

// Helper function to copy directories recursively
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

