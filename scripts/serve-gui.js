import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const PORT = 3000;
const distDir = path.join(process.cwd(), 'dist');

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
  const relativePath = requestUrl.pathname.replace(/^\/+/,'');
  let filePath = path.join(distDir, relativePath);

  if (!filePath.startsWith(distDir)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (err2, data) => {
      if (err2) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const contentTypeMap = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
      };
      res.setHeader('Content-Type', contentTypeMap[ext] || 'application/octet-stream');
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/gui/index.html`;
  console.log(`Serving ${distDir} at ${url}`);
  const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open';
  exec(`${openCmd} ${url}`);
});

