'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 3000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.css':  'text/css',
  '.ico':  'image/x-icon',
};

http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  const file    = urlPath === '/' ? '/index.html' : urlPath;
  const full    = path.join(__dirname, file);

  // Prevent directory traversal
  if (!full.startsWith(__dirname + path.sep) && full !== __dirname) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ct = MIME[path.extname(full)] || 'text/plain';
    res.writeHead(200, { 'Content-Type': ct });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`GeoTrivia → http://localhost:${PORT}`);
});
