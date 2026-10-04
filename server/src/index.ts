import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { WebSocketServer } from 'ws';
import { parseClientMessage } from '../../game/src/game/protocol';
import { SQLiteSessionStore } from './store';
import { SessionManager, type ClientConnection } from './SessionManager';

const PORT = Number(process.env.PORT || 8787);
const DB_PATH = process.env.DB_PATH || resolve(process.cwd(), 'data/sessions.db');
const CLIENT_DIST = process.env.CLIENT_DIST || resolve(process.cwd(), '../game/dist');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

export function startServer(port = PORT, dbPath = DB_PATH, clientDist = CLIENT_DIST) {
  const store = new SQLiteSessionStore(dbPath);
  const manager = new SessionManager(store);

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
      return;
    }

    const url = new URL(req.url ?? '/', `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(url.pathname);

    let filePath = join(clientDist, pathname);

    // Prevent directory traversal
    if (!filePath.startsWith(clientDist)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = join(filePath, 'index.html');
    }

    // SPA fallback: if file does not exist, serve index.html
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = join(clientDist, 'index.html');
    }

    if (!existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found (dist not built yet)');
      return;
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    createReadStream(filePath).pipe(res);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    const conn: ClientConnection = {
      ws,
      gameId: null,
      seat: null,
      token: null,
      isAlive: true,
    };

    ws.on('pong', () => {
      conn.isAlive = true;
    });

    ws.on('message', (data) => {
      const text = typeof data === 'string' ? data : data.toString('utf-8');
      const msg = parseClientMessage(text);
      if (!msg) {
        ws.send(JSON.stringify({ type: 'error', message: 'Malformed message' }));
        return;
      }
      manager.handleMessage(conn, msg);
    });

    ws.on('close', () => {
      manager.handleDisconnect(conn);
    });

    ws.on('error', () => {
      manager.handleDisconnect(conn);
    });
  });

  // Heartbeat ping interval
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as unknown as { isAlive?: boolean };
      if (client.isAlive === false) {
        ws.terminate();
        return;
      }
      client.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  server.listen(port, () => {
    console.log(`Quoridors server running at http://localhost:${port}`);
  });

  return { server, wss, manager, store };
}

// Start if run directly
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  startServer();
}
