// scripts/patch-sol-bird-index.cjs
const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, '..', 'public', 'games', 'sol-bird', 'client');
const indexPath = path.join(clientDir, 'index.html');
const glueSrc = './ws-glue.js';
const scriptTag = `<script src="${glueSrc}"></script>`;


if (!fs.existsSync(indexPath)) {

  console.warn('[patch-sol-bird-index] index.html not found at', indexPath);

  process.exit(0);

}



let html = fs.readFileSync(indexPath, 'utf8');

if (html.includes(scriptTag)) {

  console.log('[patch-sol-bird-index] ws-glue already present');

  process.exit(0);

}



// inject before </body>

const newHtml = html.replace(/<\/body>/i, `  ${scriptTag}\n</body>`);

fs.writeFileSync(indexPath, newHtml, 'utf8');

console.log('[patch-sol-bird-index] injected ws-glue.js into index.html');


