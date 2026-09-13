import http from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { newestParPatchName } from './dist/parpatch.js';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const patchRoot = fileURLToPath(new URL('../Stat-Editor/Gecko-Codes/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.txt': 'text/plain', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if(pathname === '/api/parpatch') {
      try {
        const filename = newestParPatchName(await readdir(patchRoot));
        if(!filename) throw new Error('No ParPatch file found in JDCLSuite/Stat-Editor/Gecko-Codes.');
        const path = resolve(patchRoot,filename);
        const [code,info] = await Promise.all([readFile(path,'utf8'),stat(path)]);
        res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({code,filename,source:'local',sourceLabel:'Live JDCLSuite working copy',sourcePath:`JDCLSuite/Stat-Editor/Gecko-Codes/${filename}`,updatedAt:info.mtime.toISOString()}));
      } catch {
        res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({error:'Could not read the live ParPatch in JDCLSuite/Stat-Editor/Gecko-Codes.'}));
      }
      return;
    }
    const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(resolve(root) + sep)) { res.writeHead(403).end(); return; }
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }).end(data);
  } catch { res.writeHead(404).end('Not found'); }
});
const port = Number(process.env.PORT || 4173);
server.listen(port, '0.0.0.0', () => {
  console.log(`Local:  http://127.0.0.1:${port}`);
  console.log(`LAN:    http://<this-pc-ip>:${port}  (same Wi‑Fi/Ethernet as your phone)`);
});
