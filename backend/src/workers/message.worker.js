import { consumer } from "../config/kafka.js";
import prisma from "../config/db.js";
import { redisPub } from "../config/redis.js";
import { cacheInvalidate } from "../utils/cache.js";

// ─────────────────────────────────────────────────────────────
// KAFKA CONSUMER WORKER
// ─────────────────────────────────────────────────────────────
// This worker runs in the background. It listens to the
// "chat-messages" Kafka topic. When a message is received:
//   1. Saves it to PostgreSQL
//   2. Invalidates Redis cache
//   3. Publishes it to Redis Pub/Sub for cross-server delivery
//
// If the database is slow or down, Kafka will automatically
// retry processing later — no messages are lost!
// ─────────────────────────────────────────────────────────────

export async function startMessageWorker() {
  try {
    await consumer.connect();
    console.log("✅ Kafka Consumer connected");

    // Subscribe to the topic (fromBeginning: false means it only processes new messages)
    await consumer.subscribe({ topic: "chat-messages", fromBeginning: false });

    // Start listening for messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const rawMessage = message.value.toString();
          const data = JSON.parse(rawMessage);

          console.log(`📥 Kafka Consumer: Processing message from ${data.senderId} to ${data.receiverId}`);

          const senderIdInt = parseInt(data.senderId, 10);
          const receiverIdInt = data.receiverId ? parseInt(data.receiverId, 10) : null;

          // 1. CONNECTION CHECK (Decoupled from WebSocket)
          if (receiverIdInt) {
            const connection = await prisma.connections.findFirst({
              where: {
                OR: [
                  { requesterId: senderIdInt, addresseeId: receiverIdInt, status: "accepted" },
                  { requesterId: receiverIdInt, addresseeId: senderIdInt, status: "accepted" }
                ]
              }
            });

            if (!connection) {
              console.log(`⚠️ Kafka Consumer: Dropped message from ${senderIdInt} to ${receiverIdInt} (Not connected)`);
              return; // End processing for this message early
            }
          }

          // 2. SAVE TO DATABASE
          const msg = await prisma.message.create({
            data: {
              content: data.content,
              senderId: parseInt(data.senderId, 10),
              receiverId: data.receiverId ? parseInt(data.receiverId, 10) : null,
              // We use the timestamp from the Kafka event to preserve exact creation time
              createdAt: new Date(data.createdAt),
            },
          });

          // 2. INVALIDATE CHAT-LIST CACHES
          await cacheInvalidate(`cache:chat-users:${data.senderId}`);
          if (data.receiverId) {
            await cacheInvalidate(`cache:chat-users:${data.receiverId}`);
          }

          // 3. DELIVER VIA REDIS PUB/SUB
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

            // Publish to Redis. The WebSocket server that the receiver is
            // connected to will pick this up and deliver it via WebSocket.
            await redisPub.publish(`chat:user:${msg.receiverId}`, deliveryPayload);
            console.log(`✅ Kafka Consumer: Published to Redis chat:user:${msg.receiverId}`);
          } else {
            // Handle public messages if needed
            const enrichedMsg = JSON.stringify({ ...msg, type: "message" });
            await redisPub.publish(`chat:public`, enrichedMsg);
          }

        } catch (error) {
          console.error("❌ Kafka Consumer: Failed to process message:", error);
          // Throwing an error causes kafkajs to automatically retry the message
          // with exponential backoff.
          throw error;
        }
      },
    });

  } catch (error) {
    console.error("❌ Kafka Consumer failed to start:", error);
  }
}
