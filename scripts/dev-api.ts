/* Локальный мост под api/*, чтобы не ставить vercel CLI.
   `npm run dev:api` (tsx) — Vite проксирует /api сюда (vite.config.ts).
   Зовёт тот же default-обработчик (req, res), что и Vercel. */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Buffer } from "node:buffer";
import syncHandler from "../api/sync.js";

const PORT = 3001;
const ROUTES: Record<string, unknown> = { "/api/sync": syncHandler };

createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const path = (req.url ?? "").split("?")[0]!;
  const handler = ROUTES[path] as
    | ((req: unknown, res: unknown) => Promise<void>)
    | undefined;
  if (!handler) {
    res.writeHead(404).end("not found");
    return;
  }

  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");

  const vreq = req as IncomingMessage & { body?: unknown };
  try {
    vreq.body =
      raw && req.headers["content-type"]?.includes("application/json")
        ? JSON.parse(raw)
        : raw;
  } catch {
    vreq.body = raw;
  }

  const vres = res as ServerResponse & {
    status: (c: number) => typeof vres;
    json: (o: unknown) => void;
  };
  vres.status = (code: number) => {
    res.statusCode = code;
    return vres;
  };
  vres.json = (obj: unknown) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(obj));
  };

  try {
    await handler(vreq, vres);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: String(e) }));
  }
}).listen(PORT, () => console.log(`api dev → http://localhost:${PORT}`));
