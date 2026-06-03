import { redis } from "../config/redis.js";

// ─────────────────────────────────────────────────────────────
// REDIS RATE LIMITER — Sliding Window Counter
// ─────────────────────────────────────────────────────────────
// Prevents a single user from flooding the chat with messages.
//
// How it works:
//   - Each user gets a key like "ratelimit:msg:42:1717410000"
//     (userId + current minute timestamp)
//   - Every message they send INCRements this counter
//   - The key auto-expires after 60 seconds
//   - If counter exceeds MAX_MESSAGES_PER_MINUTE → blocked
//
// Example in redis-cli:
//   User 42 sends 1st message:
//     > INCR ratelimit:msg:42:1717410000     → 1
//     > EXPIRE ratelimit:msg:42:1717410000 60
//   
//   User 42 sends 30th message:
//     > INCR ratelimit:msg:42:1717410000     → 30
//     (still allowed, max is 30)
//
//   User 42 sends 31st message:
//     > INCR ratelimit:msg:42:1717410000     → 31
//     → BLOCKED! Returns { allowed: false }
//
//   After 60 seconds: key expires, counter resets to 0
// ─────────────────────────────────────────────────────────────

const MAX_MESSAGES_PER_MINUTE = 30;
const WINDOW_SECONDS = 60;

/**
 * Check if a user is within their message rate limit.
 * 
 * @param {number} userId - The user's ID
 * @returns {{ allowed: boolean, remaining: number, total: number }}
 */
export async function checkMessageRateLimit(userId) {
  // Create a key that includes the current minute window
  const currentMinute = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
  const key = `ratelimit:msg:${userId}:${currentMinute}`;

  // INCR atomically increments and returns the new count
  const count = await redis.incr(key);

  // Set expiry only on the first increment (when count = 1)
  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }

  const allowed = count <= MAX_MESSAGES_PER_MINUTE;
  const remaining = Math.max(0, MAX_MESSAGES_PER_MINUTE - count);

  return { allowed, remaining, total: count };
}

/**
 * Rate limiter for HTTP routes (Express middleware)
 * Can be used for any API endpoint that needs throttling
 * 
 * Example usage:
 *   router.post("/api/some-action", httpRateLimiter(10, 60), handler);
 */
export function httpRateLimiter(maxRequests = 20, windowSeconds = 60) {
  return async (req, res, next) => {
    const userId = req.userId || req.ip;
    const currentWindow = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `ratelimit:http:${userId}:${currentWindow}`;

    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (count > maxRequests) {
      return res.status(429).json({
        error: "Too many requests. Please slow down.",
        retryAfterSeconds: windowSeconds,
      });
    }

    next();
  };
}
