import { redis } from "../config/redis.js";

// ─────────────────────────────────────────────────────────────
// REDIS CACHING UTILITY
// ─────────────────────────────────────────────────────────────
// Caches expensive database query results in Redis to avoid
// hitting PostgreSQL on every request.
//
// How it works:
//   1. Check Redis for cached data → if found, return it (FAST)
//   2. If not found (cache miss) → query PostgreSQL → store in Redis
//   3. Key auto-expires after TTL seconds
//   4. When data changes, we invalidate (delete) the cache key
//
// Example — Caching the chat-users list:
//   First request (cache miss):
//     > GET cache:chat-users:42          → null (not cached)
//     → Query PostgreSQL (slow: 50–200ms)
//     > SET cache:chat-users:42 "[...]" EX 60  → OK
//     → Return data
//
//   Next 59 requests (cache hit):
//     > GET cache:chat-users:42          → "[...]" (instant!)
//     → Return cached data (fast: <1ms)
//
//   When user 42 sends/receives a message:
//     > DEL cache:chat-users:42          → Invalidated!
//     → Next request rebuilds the cache
// ─────────────────────────────────────────────────────────────

const DEFAULT_TTL = 60; // 60 seconds

/**
 * Get data from cache, or compute and store it
 * 
 * @param {string} key - Redis key (e.g., "cache:chat-users:42")
 * @param {Function} fetchFn - Async function that returns fresh data
 * @param {number} ttl - Time-to-live in seconds (default 60)
 * @returns {any} Cached or freshly fetched data
 */
export async function cacheGet(key, fetchFn, ttl = DEFAULT_TTL) {
  try {
    // Try to get from cache first
    const cached = await redis.get(key);
    if (cached) {
      console.log(`📦 Cache HIT: ${key}`);
      return JSON.parse(cached);
    }

    // Cache miss — fetch fresh data
    console.log(`🔍 Cache MISS: ${key}`);
    const freshData = await fetchFn();

    // Store in cache with expiry
    await redis.set(key, JSON.stringify(freshData), "EX", ttl);

    return freshData;
  } catch (err) {
    console.error(`Cache error for ${key}:`, err);
    // Fallback: if Redis is down, still fetch from DB
    return await fetchFn();
  }
}

/**
 * Invalidate (delete) a specific cache key
 * Call this when the underlying data changes
 * 
 * @param {string} key - Redis key to delete
 */
export async function cacheInvalidate(key) {
  await redis.del(key);
  console.log(`🗑️ Cache INVALIDATED: ${key}`);
}

/**
 * Invalidate all cache keys matching a pattern
 * Useful for clearing all user-related caches
 * 
 * Example: cacheInvalidatePattern("cache:chat-users:*")
 * → Deletes cache for ALL users' chat lists
 * 
 * @param {string} pattern - Redis key pattern with wildcards
 */
export async function cacheInvalidatePattern(pattern) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`🗑️ Cache INVALIDATED ${keys.length} keys matching: ${pattern}`);
  }
}
