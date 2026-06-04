import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { broadcastUserStatus } from "../utils/broadcast.js";
import { handleMessage, handleMarkRead } from "./handlers/message.handler.js";
import { handleConnectionRequest, handleConnectionResponse } from "./handlers/connection.handler.js";
import { handleTyping } from "./handlers/typing.handler.js";
import { setUserOnline, setUserOffline, refreshPresence, getAllOnlineUsers } from "../utils/presence.js";
import { redisSub } from "../config/redis.js";

const JWT_SECRET = process.env.JWT_SECRET;

// ─────────────────────────────────────────────────────────────
// REDIS PUB/SUB FOR CROSS-SERVER WEBSOCKET
// ─────────────────────────────────────────────────────────────
// Problem: `clients{}` is a local Map on THIS server only.
//          If you run 2 servers, Server A can't deliver to 
//          users connected to Server B.
//
// Solution: When a message needs to reach User 42:
//   1. PUBLISH to Redis channel "chat:user:42"
//   2. ALL servers receive it via SUBSCRIBE
//   3. The server where User 42 is connected delivers it
//
// Example flow (User A on Server 1 → User B on Server 2):
//   Server 1: redis.publish("chat:user:B", JSON.stringify(msg))
//   Server 2: redisSub.on("message", ...) → receives it
//   Server 2: clients[B].send(msg) → delivered to User B!
// ─────────────────────────────────────────────────────────────

const clients = {}; // userId -> WebSocket (local to this server instance)

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, maxPayload: 1 * 1024 * 1024 /* 1 MB */ });

  // ── Redis Subscriber: Listen for messages from other servers ──
  redisSub.on("message", (channel, message) => {
    // Channel format: "chat:user:{userId}"
    const targetUserId = channel.replace("chat:user:", "");
    const targetSocket = clients[targetUserId];

    if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
      targetSocket.send(message);
      console.log(`📨 Redis Pub/Sub → Delivered to user ${targetUserId} (local)`);
    }
  });

  wss.on("connection", (ws) => {
    let userId = null;

    ws.on("message", async (raw) => {
      let data;
      try {
        data = JSON.parse(raw);
      } catch (err) {
        console.log("Invalid JSON received");
        return;
      }

      // ── Authentication (JWT-verified) ──
      if (data.type === "auth") {
        const token = data.token;
        if (!token) {
          console.log("Auth failed: no token provided");
          ws.send(JSON.stringify({ type: "error", message: "Authentication token required." }));
          ws.close();
          return;
        }

        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          userId = decoded.userId;
        } catch (err) {
          console.log("Auth failed: invalid token");
          ws.send(JSON.stringify({ type: "error", message: "Invalid or expired token." }));
          ws.close();
          return;
        }

        clients[userId] = ws;

        // Mark online in REDIS (not in-memory Set)
        await setUserOnline(userId);
        console.log(`User ${userId} connected`);

        // Subscribe this server to messages for this user
        redisSub.subscribe(`chat:user:${userId}`);

        // Broadcast online status to all local clients
        broadcastUserStatus(clients, userId, true);

        // Send current online users list (from Redis)
        const onlineUserIds = await getAllOnlineUsers();
        ws.send(JSON.stringify({
          type: "initialOnlineUsers",
          onlineUsers: onlineUserIds,
        }));

        return;
      }

      if (!userId) {
        console.log("Unauthenticated user tried to send a message");
        return;
      }

      // ── Heartbeat: refresh presence TTL ──
      // Client sends { type: "heartbeat" } every 20s
      // This keeps the Redis presence key alive
      if (data.type === "heartbeat") {
        await refreshPresence(userId);
        return;
      }

      // ── Handle message read status ──
      if (data.type === "markRead") {
        await handleMarkRead(ws, data, userId, clients);
      }

      // ── Handle message send ──
      if (data.type === "message") {
        await handleMessage(ws, data, userId, clients);
      }

      // ── Handle connection request ──
      if (data.type === "connection_request") {
        await handleConnectionRequest(ws, data, userId, clients);
      }

      // ── Handle connection response ──
      if (data.type === "connection-response") {
        await handleConnectionResponse(ws, data, userId, clients);
      }

      // ── Typing indicator ──
      if (data.type === "typing" || data.type === "stop_typing") {
        handleTyping(ws, data, userId, clients);
      }
    });

    // ── Handle disconnect ──
    ws.on("close", () => {
      if (userId && clients[userId]) {
        delete clients[userId];

        // Unsubscribe from Redis channel for this user
        redisSub.unsubscribe(`chat:user:${userId}`);

        // Delay marking offline (handles brief reconnects)
        setTimeout(async () => {
          if (!clients[userId]) {
            await setUserOffline(userId);
            console.log(`User ${userId} marked as offline (Redis)`);
            broadcastUserStatus(clients, userId, false);
          }
        }, 2000);
      }
    });
  });

  return wss;
}
