import { WebSocket } from "ws";
import prisma from "../../config/db.js";
import { redisPub } from "../../config/redis.js";
import { checkMessageRateLimit } from "../../middleware/rateLimiter.js";
import { cacheInvalidate } from "../../utils/cache.js";

// ─────────────────────────────────────────────────────────────
// MESSAGE HANDLER — Now with Redis Pub/Sub + Rate Limiting
// ─────────────────────────────────────────────────────────────

export async function handleMarkRead(ws, data, userId, clients) {
  await prisma.message.updateMany({
    where: { senderId: data.withUserId, receiverId: userId, read: false },
    data: { read: true, readAt: new Date() }
  });

  // Notify sender via Redis Pub/Sub (works cross-server)
  // Instead of: clients[data.withUserId].send(...)
  // We publish to Redis — any server with that user delivers it
  const readNotification = JSON.stringify({
    type: "messageRead",
    from: userId
  });

  // Try local delivery first (faster), fallback to Redis
  if (clients[data.withUserId] && clients[data.withUserId].readyState === WebSocket.OPEN) {
    clients[data.withUserId].send(readNotification);
  } else {
    // User might be on another server — publish via Redis
    await redisPub.publish(`chat:user:${data.withUserId}`, readNotification);
  }

  console.log(`Marked messages from ${data.withUserId} to ${userId} as read.`);
}

export async function handleMessage(ws, data, userId, clients) {
  try {
    // ── RATE LIMITING (Redis) ──
    // Check if the user has exceeded 30 messages per minute
    // Redis command: INCR ratelimit:msg:{userId}:{minute}
    const rateCheck = await checkMessageRateLimit(userId);
    if (!rateCheck.allowed) {
      ws.send(JSON.stringify({
        type: "error",
        message: `Rate limit exceeded. You can send ${30} messages per minute. Try again shortly.`,
        remaining: rateCheck.remaining,
      }));
      console.log(`⛔ Rate limited user ${userId} (${rateCheck.total} msgs this minute)`);
      return;
    }

    // ── CONNECTION CHECK ──
    const connection = await prisma.connections.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: data.receiverId, status: "accepted" },
          { requesterId: data.receiverId, addresseeId: userId, status: "accepted" }
        ]
      }
    });

    if (!connection) {
      console.log("User is not connected to the recipient");
      ws.send(JSON.stringify({
        type: "error",
        message: "You can only message users with whom you have an accepted connection."
      }));
      return;
    }

    // ── STORE MESSAGE IN DB ──
    const msg = await prisma.message.create({
      data: {
        content: data.content,
        senderId: userId,
        receiverId: data.receiverId || null,
      },
      include: { sender: true, receiver: true },
    });

    // ── INVALIDATE CHAT-LIST CACHE ──
    // Both sender's and receiver's chat-list cache are now stale
    await cacheInvalidate(`cache:chat-users:${userId}`);
    await cacheInvalidate(`cache:chat-users:${data.receiverId}`);

    // ── DELIVER VIA REDIS PUB/SUB ──
    // Instead of checking local clients[] only, we publish to Redis.
    // The server where the receiver is connected will pick it up.
    if (msg.receiverId) {
      const unreadCount = await prisma.message.count({
        where: {
          receiverId: msg.receiverId,
          senderId: msg.senderId,
          read: false,
        },
      });

      const deliveryPayload = JSON.stringify({
        type: "newMessage",
        from: msg.senderId,
        content: msg.content,
        timestamp: msg.createdAt,
        unreadCount,
      });

      // Try local delivery first (same server = faster)
      const receiverSocket = clients[msg.receiverId];
      if (receiverSocket && receiverSocket.readyState === WebSocket.OPEN) {
        receiverSocket.send(deliveryPayload);
        console.log(`📨 Direct delivery to user ${msg.receiverId} (same server)`);
      } else {
        // Receiver is on another server — publish to Redis
        await redisPub.publish(`chat:user:${msg.receiverId}`, deliveryPayload);
        console.log(`📨 Redis Pub/Sub delivery for user ${msg.receiverId} (cross-server)`);
      }
    }

    // Broadcast public messages
    if (!msg.receiverId) {
      const enrichedMsg = { ...msg, type: "message" };
      Object.entries(clients).forEach(([id, client]) => {
        if (id !== String(userId) && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(enrichedMsg));
        }
      });
    }

  } catch (err) {
    console.error("Error saving or sending message:", err);
    ws.send(JSON.stringify({
      type: "error",
      message: "Something went wrong while sending the message."
    }));
  }
}
