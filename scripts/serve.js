// CORE BREACH: PIT — tiny static dev server. PORT env, default 8080.
// Refuses dotfiles (house security habit from Core-Breach-Zero).
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname + '/..';
const port = parseInt(process.env.PORT || '8080', 10);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.normalize(path.join(root, urlPath));
  if (!file.startsWith(path.normalize(root))) { res.writeHead(403); return res.end('forbidden'); }
  if (path.basename(file).startsWith('.') || urlPath.includes('/.')) { res.writeHead(404); return res.end('not found'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => console.log(`CORE BREACH: PIT serving on http://localhost:${port}`));
