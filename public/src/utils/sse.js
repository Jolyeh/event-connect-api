// utils/sse.js
// Map des clients connectés : bookingId → Response
const clients = new Map();

export function addClient(bookingId, res) {
  // Headers SSE
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Nginx : désactive le buffering
  res.flushHeaders();

  // Ping toutes les 25s pour garder la connexion vivante
  const keepAlive = setInterval(() => res.write(": ping\n\n"), 25000);

  clients.set(bookingId, res);

  // Nettoyage à la déconnexion du client
  res.on("close", () => {
    clearInterval(keepAlive);
    clients.delete(bookingId);
  });
}

export function notifyClient(bookingId, data) {
  const res = clients.get(bookingId);
  if (!res) return; // client déjà déconnecté
  res.write(`data: ${JSON.stringify(data)}\n\n`);
  clients.delete(bookingId);
}