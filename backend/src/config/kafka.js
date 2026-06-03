import { Kafka, Partitioners } from "kafkajs";

// ─────────────────────────────────────────────────────────────
// KAFKA CLIENT SETUP
// ─────────────────────────────────────────────────────────────
// Connects to the Kafka broker.
// Exports:
//   - producer: Used by message.handler.js to publish events
//   - consumer: Used by message.worker.js to process events
// ─────────────────────────────────────────────────────────────

const brokers = process.env.KAFKA_BROKERS
  ? process.env.KAFKA_BROKERS.split(",")
  : ["localhost:9092"];

export const kafka = new Kafka({
  clientId: "chat-app-backend",
  brokers: brokers,
  // Retry mechanism if broker is temporarily unavailable
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
});

// Configure the producer with the default legacy partitioner
// (required by newer kafkajs versions to avoid warnings)
export const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});

// Configure the consumer with a unique consumer group ID
// If you run 3 backend servers, they all use the same groupId
// so Kafka load-balances messages across them.
export const consumer = kafka.consumer({ groupId: "chat-message-workers" });

/**
 * Initializes Kafka connections and ensures required topics exist.
 */
export async function connectKafka() {
  try {
    console.log("⏳ Connecting to Kafka...");
    await producer.connect();
    console.log("✅ Kafka Producer connected");

    const admin = kafka.admin();
    await admin.connect();
    
    // Auto-create topic if it doesn't exist
    const topics = await admin.listTopics();
    if (!topics.includes("chat-messages")) {
      console.log("⏳ Creating 'chat-messages' topic...");
      await admin.createTopics({
        topics: [
          {
            topic: "chat-messages",
            numPartitions: 3, // Allow parallel processing by up to 3 workers
          },
        ],
      });
      console.log("✅ Topic 'chat-messages' created");
    }
    
    await admin.disconnect();
  } catch (error) {
    console.error("❌ Failed to connect to Kafka:", error);
    // Note: We don't crash the app here so it can retry or run without Kafka
    // if strictly needed for local dev, but in production this should probably throw.
  }
}
