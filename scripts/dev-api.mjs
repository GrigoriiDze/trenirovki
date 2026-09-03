/* Локальный мост под api/*, чтобы не ставить vercel CLI.
   `npm run dev:api` — Vite проксирует /api сюда (см. vite.config.ts). */

import { createServer } from "node:http";
import { Buffer } from "node:buffer";
import * as sync from "../api/sync.ts";

const PORT = 3001;

const ROUTES = {
  "/api/sync": sync,
};

createServer(async (req, res) => {
  const path = (req.url ?? "").split("?")[0];
  const mod = ROUTES[path];
  try {
    if (!mod) {
      res.writeHead(404).end("not found");
      return;
    }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const request = new Request(`http://localhost:${PORT}${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks),
    });
    const handler = mod[req.method];
    const response = handler
      ? await handler(request)
      : new Response("method not allowed", { status: 405 });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.error(e);
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: String(e) }));
  }
}).listen(PORT, () => console.log(`api dev → http://localhost:${PORT}`));
