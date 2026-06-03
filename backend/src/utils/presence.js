import { redis } from "../config/redis.js";

// ─────────────────────────────────────────────────────────────
// REDIS PRESENCE TRACKING
// ─────────────────────────────────────────────────────────────
// Instead of storing online users in a Node.js `Set` (which
// only works on ONE server), we store them in Redis with TTL.
//
// How it works:
//   - When a user connects:  SET user:online:42 "1" EX 30
//   - Heartbeat every 20s:   EXPIRE user:online:42 30  (refresh TTL)
//   - When user disconnects: DEL user:online:42
//   - If server crashes:     The key auto-expires after 30s!
//
// Example in redis-cli:
//   > SET user:online:42 1 EX 30      → OK
//   > EXISTS user:online:42            → 1 (online)
//   > TTL user:online:42               → 25 (25 seconds left)
//   ... 30 seconds pass without refresh ...
//   > EXISTS user:online:42            → 0 (offline!)
// ─────────────────────────────────────────────────────────────

const PRESENCE_TTL = 30; // seconds
const PRESENCE_PREFIX = "user:online:";

/**
 * Mark a user as online in Redis
 * Sets a key with 30-second TTL
 */
export async function setUserOnline(userId) {
  await redis.set(`${PRESENCE_PREFIX}${userId}`, "1", "EX", PRESENCE_TTL);
}

/**
 * Mark a user as offline in Redis
 * Immediately removes the key
 */
export async function setUserOffline(userId) {
  await redis.del(`${PRESENCE_PREFIX}${userId}`);
}

/**
 * Check if a single user is online
 * Returns true/false
 */
export async function isUserOnline(userId) {
  const result = await redis.exists(`${PRESENCE_PREFIX}${userId}`);
  return result === 1;
}

/**
 * Refresh the TTL for a user (called on heartbeat)
 * Resets the expiry to 30s — keeps the user "alive"
 */
export async function refreshPresence(userId) {
  await redis.expire(`${PRESENCE_PREFIX}${userId}`, PRESENCE_TTL);
}

/**
 * Get all currently online user IDs
 * Uses KEYS scan — fine for moderate user counts (<10k)
 * For large scale, switch to Redis SCAN or maintain a Redis Set
 */
export async function getAllOnlineUsers() {
  const keys = await redis.keys(`${PRESENCE_PREFIX}*`);
  return keys.map((key) => parseInt(key.replace(PRESENCE_PREFIX, ""), 10));
}
