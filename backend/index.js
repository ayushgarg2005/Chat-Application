import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from "./src/routes/auth.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import messageRoutes from "./src/routes/message.routes.js";
import notificationRoutes from "./src/routes/notification.routes.js";
import connectionRoutes from "./src/routes/connection.routes.js";
import chatbotRoutes from "./src/routes/chatbot.routes.js";

// Import WebSocket setup
import { setupWebSocket } from "./src/websocket/index.js";

// Import Kafka and Workers
import { connectKafka, producer, consumer } from "./src/config/kafka.js";
import { startMessageWorker } from "./src/workers/message.worker.js";

// Import Redis clients for graceful shutdown
import { redis, redisPub, redisSub } from "./src/config/redis.js";

// Initialize Express app
const app = express();

// Middleware
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Mount routes
app.use(authRoutes);
app.use(userRoutes);
app.use(messageRoutes);
app.use(notificationRoutes);
app.use(connectionRoutes);
app.use(chatbotRoutes);

// Start HTTP server and Infrastructure
const server = app.listen(3000, async () => {
  console.log("HTTP server running on http://localhost:3000");

  try {
    // Start Kafka infrastructure
    await connectKafka();
    
    // Start the background worker process
    await startMessageWorker();
  } catch (err) {
    console.error("⚠️ Infrastructure startup error (app still running):", err.message);
  }
});

// Attach WebSocket server
setupWebSocket(server);

// ── Graceful Shutdown ──
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  // 1. Stop accepting new connections
  server.close(() => {
    console.log("✅ HTTP server closed");
  });

  try {
    // 2. Disconnect Kafka producer and consumer
    await producer.disconnect();
    console.log("✅ Kafka producer disconnected");
  } catch (err) {
    console.error("Kafka producer disconnect error:", err.message);
  }

  try {
    await consumer.disconnect();
    console.log("✅ Kafka consumer disconnected");
  } catch (err) {
    console.error("Kafka consumer disconnect error:", err.message);
  }

  try {
    // 3. Close Redis connections
    redis.disconnect();
    redisPub.disconnect();
    redisSub.disconnect();
    console.log("✅ Redis connections closed");
  } catch (err) {
    console.error("Redis disconnect error:", err.message);
  }

  console.log("Shutdown complete.");
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));