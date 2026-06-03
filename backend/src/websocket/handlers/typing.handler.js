import { WebSocket } from "ws";
import { redisPub } from "../../config/redis.js";

// ─────────────────────────────────────────────────────────────
// TYPING HANDLER — Now with Redis Pub/Sub
// ─────────────────────────────────────────────────────────────
// When User A types in a chat with User B, we send a "typing"
// event. Previously this only worked if both were on the same
// server. Now we publish via Redis so it works across servers.
//
// Example:
//   User A types → WS sends { type: "typing", to: 42 }
//   Server 1: publish to Redis "chat:user:42"
//   Server 2 (where User 42 is): receives → forwards via WS
// ─────────────────────────────────────────────────────────────

export async function handleTyping(ws, data, userId, clients) {
  const to = data.to;
  if (!to) return;

  const typingPayload = JSON.stringify({
    type: data.type, // "typing" or "stop_typing"
    from: userId,
  });

  // Try local delivery first
  if (clients[to] && clients[to].readyState === WebSocket.OPEN) {
    clients[to].send(typingPayload);
  } else {
    // Cross-server delivery via Redis
    await redisPub.publish(`chat:user:${to}`, typingPayload);
  }
}
