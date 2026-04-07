import type { Response } from "express";

const clients = new Set<Response>();

export function addClient(res: Response) {
  clients.add(res);
  res.on("close", () => clients.delete(res));
}

export function emitEvent(type: string, payload?: unknown) {
  const data = JSON.stringify(payload !== undefined ? { type, payload } : { type });
  for (const res of clients) {
    res.write(`data: ${data}\n\n`);
  }
}
