import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export function serve(port = 0) {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname === '/') { res.writeHead(302, { Location: '/demo/index.html' }); res.end(); return; }
      const path = resolve(root, `.${pathname === '/' ? '/demo/index.html' : pathname}`);
      if (!path.startsWith(root + sep) || !['.html', '.js', '.css', '.png'].includes(extname(path))) { res.writeHead(404); res.end(); return; }
      const data = await readFile(path);
      res.writeHead(200, { 'Content-Type': ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png' })[extname(path)], 'Cache-Control': 'no-store' });
      res.end(data);
    } catch { res.writeHead(404); res.end(); }
  });
  return new Promise(resolveServer => server.listen(port, '127.0.0.1', () => resolveServer(server)));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await serve(Number(process.env.PORT ?? 4173)); console.log(`Demo: http://127.0.0.1:${server.address().port}/`);
}
