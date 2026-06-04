import { WebSocket } from "ws";
import prisma from "../../config/db.js";
import { redisPub } from "../../config/redis.js";
import { checkMessageRateLimit } from "../../middleware/rateLimiter.js";
import { cacheInvalidate } from "../../utils/cache.js";
import { producer } from "../../config/kafka.js";

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
    // ── INPUT VALIDATION ──
    if (!data.content || typeof data.content !== "string") {
      ws.send(JSON.stringify({ type: "error", message: "Message content must be a non-empty string." }));
      return;
    }

    const content = data.content.trim();
    if (content.length === 0) {
      ws.send(JSON.stringify({ type: "error", message: "Message cannot be empty." }));
      return;
    }

    if (content.length > 10000) {
      ws.send(JSON.stringify({ type: "error", message: "Message is too long (max 10,000 characters)." }));
      return;
    }

    if (data.receiverId !== undefined && data.receiverId !== null) {
      const parsedReceiverId = parseInt(data.receiverId, 10);
      if (isNaN(parsedReceiverId) || parsedReceiverId <= 0) {
        ws.send(JSON.stringify({ type: "error", message: "Invalid receiverId." }));
        return;
      }
    }

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

    // ── PUBLISH TO KAFKA ──
    // We send the message straight to Kafka. A background worker will consume it, 
    // verify the connection, save it, and deliver it via Redis Pub/Sub.
    const messageEvent = {
      content: content,
      senderId: userId,
      receiverId: data.receiverId ? parseInt(data.receiverId, 10) : null,
      createdAt: new Date().toISOString(),
    };

    // We use receiverId as the partition key to ensure all messages to the same user
    // are processed in order by the same Kafka partition/worker.
    await producer.send({
      topic: "chat-messages",
      messages: [
        {
          key: String(data.receiverId || "public"),
          value: JSON.stringify(messageEvent),
        },
      ],
    });

    // The sender's UI updates optimistically, so we don't need to ACK back.
    console.log(`🚀 Message queued in Kafka from ${userId} to ${data.receiverId}`);

  } catch (err) {
    console.error("Error queueing message to Kafka:", err);
    ws.send(JSON.stringify({
      type: "error",
      message: "Something went wrong while sending the message."
    }));
  }
}
