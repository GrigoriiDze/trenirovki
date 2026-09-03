/* Локальный мост под api/*, чтобы не ставить vercel CLI.
   `npm run dev:api` — Vite проксирует /api сюда (см. vite.config.ts).
   Вызывает те же default-обработчики (req, res), что и Vercel. */

import { createServer } from "node:http";
import syncHandler from "../api/sync.ts";

const PORT = 3001;
const ROUTES = { "/api/sync": syncHandler };

createServer(async (req, res) => {
  const path = (req.url ?? "").split("?")[0];
  const handler = ROUTES[path];
  if (!handler) {
    res.writeHead(404).end("not found");
    return;
  }

  // тело как в Vercel: JSON → объект
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    req.body = raw && req.headers["content-type"]?.includes("application/json") ? JSON.parse(raw) : raw;
  } catch {
    req.body = raw;
  }

  // минимальные хелперы VercelResponse
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(obj));
  };

  try {
    await handler(req, res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: String(e) }));
  }
}).listen(PORT, () => console.log(`api dev → http://localhost:${PORT}`));
