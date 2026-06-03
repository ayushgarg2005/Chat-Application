import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// ─────────────────────────────────────────────────────────
// Redis Client #1 — General commands (GET, SET, INCR, etc.)
// Used for: caching, rate limiting, presence tracking
// ─────────────────────────────────────────────────────────
const redis = new Redis(REDIS_URL);

// ─────────────────────────────────────────────────────────
// Redis Client #2 — Publisher
// Used to PUBLISH messages to channels
// Example: when User A sends a message, we publish to "chat:user:B"
// ─────────────────────────────────────────────────────────
const redisPub = new Redis(REDIS_URL);

// ─────────────────────────────────────────────────────────
// Redis Client #3 — Subscriber
// Used to SUBSCRIBE to channels and listen for messages
// IMPORTANT: A Redis client in subscriber mode cannot run
// normal commands (GET, SET, etc.) — that's why we need
// separate clients.
// ─────────────────────────────────────────────────────────
const redisSub = new Redis(REDIS_URL);

// Connection event handlers
redis.on("connect", () => console.log("✅ Redis (commands) connected"));
redis.on("error", (err) => console.error("❌ Redis (commands) error:", err));

redisPub.on("connect", () => console.log("✅ Redis (publisher) connected"));
redisPub.on("error", (err) => console.error("❌ Redis (publisher) error:", err));

redisSub.on("connect", () => console.log("✅ Redis (subscriber) connected"));
redisSub.on("error", (err) => console.error("❌ Redis (subscriber) error:", err));

export { redis, redisPub, redisSub };
