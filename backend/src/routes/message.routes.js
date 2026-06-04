import { Router } from "express";
import prisma from "../config/db.js";
import authMiddleware from "../middleware/auth.js";
import { cacheGet } from "../utils/cache.js";

// ─────────────────────────────────────────────────────────────
// MESSAGE ROUTES — Now with Redis Caching
// ─────────────────────────────────────────────────────────────
// The GET /api/chat-users endpoint runs N+1 queries (one per
// chat partner). We cache the result in Redis for 60 seconds.
//
// Example:
//   1st request: Cache MISS → query PostgreSQL → store in Redis
//   2nd request: Cache HIT  → return from Redis in <1ms
//   New message sent → Cache INVALIDATED → next request rebuilds
// ─────────────────────────────────────────────────────────────

const router = Router();

// GET /api/messages/:withUserId
router.get("/api/messages/:withUserId", authMiddleware, async (req, res) => {
  const withUserId = parseInt(req.params.withUserId);
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: req.userId, receiverId: withUserId },
        { senderId: withUserId, receiverId: req.userId }
      ]
    },
    orderBy: { createdAt: "asc" },
    include: { sender: true, receiver: true }
  });
  res.json(messages);
});

// GET /api/public-messages
router.get("/api/public-messages", authMiddleware, async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { receiverId: null },
    orderBy: { createdAt: "asc" },
    include: { sender: true }
  });
  res.json(messages);
});

// DELETE /api/delete-chats
router.delete('/api/delete-chats', authMiddleware, async (req, res) => {
  const { userAId, userBId } = req.query;
  const parsedA = Number(userAId);
  const parsedB = Number(userBId);

  if (isNaN(parsedA) || isNaN(parsedB)) {
    return res.status(400).json({ error: 'Invalid user IDs.' });
  }

  // Ensure the authenticated user is one of the two parties
  if (req.userId !== parsedA && req.userId !== parsedB) {
    return res.status(403).json({ error: 'You can only delete your own chats.' });
  }

  const deleted = await prisma.message.deleteMany({
    where: {
      OR: [
        { senderId: parsedA, receiverId: parsedB },
        { senderId: parsedB, receiverId: parsedA },
      ],
    },
  });

  res.json({ message: 'Chats deleted', count: deleted.count });
});

// GET /api/unread-senders
router.get('/api/unread-senders', authMiddleware, async (req, res) => {
  const userId = req.userId;

  const unreadMessages = await prisma.message.findMany({
    where: {
      receiverId: userId,
      read: false,
    },
    select: {
      senderId: true,
    },
  });

  // Get unique sender IDs
  const uniqueSenderIds = [...new Set(unreadMessages.map(msg => msg.senderId))];

  res.json({ count: uniqueSenderIds.length, senders: uniqueSenderIds });
});

// POST /api/messages/mark-read/:senderId
router.post('/api/messages/mark-read/:senderId', authMiddleware, async (req, res) => {
  const userId = req.userId;
  const senderId = parseInt(req.params.senderId, 10);

  const updated = await prisma.message.updateMany({
    where: {
      senderId,
      receiverId: userId,
      read: false,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });

  res.json({ updated: updated.count });
});

// Helper: get chat users with last message and unread count
const getChatUsers = async (currentUserId) => {
  // Get all unique users the current user has chatted with
  const sent = await prisma.message.findMany({
    where: { senderId: currentUserId },
    select: {
      receiver: {
        select: { id: true, username: true },
      },
    },
  });

  const received = await prisma.message.findMany({
    where: { receiverId: currentUserId },
    select: {
      sender: {
        select: { id: true, username: true },
      },
    },
  });

  const chatUserMap = new Map();

  sent.forEach(({ receiver }) => {
    if (receiver) chatUserMap.set(receiver.id, receiver);
  });

  received.forEach(({ sender }) => {
    if (sender) chatUserMap.set(sender.id, sender);
  });

  const chatUsers = [];

  for (const [userId, user] of chatUserMap.entries()) {
    const lastMsg = await prisma.message.findFirst({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: userId },
          { senderId: userId, receiverId: currentUserId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    const unreadCount = await prisma.message.count({
      where: {
        senderId: userId,
        receiverId: currentUserId,
        read: false,
      },
    });

    chatUsers.push({
      user,
      lastMessage: lastMsg?.content || '',
      lastMessageAt: lastMsg?.createdAt || null,
      unreadCount,
    });
  }

  return chatUsers;
};

// GET /api/chat-users (cached in Redis for 60s)
router.get('/api/chat-users', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.userId; // From authMiddleware

    // Use Redis cache — avoids running N+1 queries on every page load
    // Cache key: "cache:chat-users:{userId}" — unique per user
    // TTL: 60 seconds — automatically refreshes
    // Invalidated by: message.handler.js when a new message is sent
    const users = await cacheGet(
      `cache:chat-users:${currentUserId}`,
      () => getChatUsers(currentUserId),
      60 // cache for 60 seconds
    );

    res.json(users);
  } catch (err) {
    console.error("Error fetching chat users:", err);
    res.status(500).json({ error: "Failed to fetch chat users." });
  }
});

export default router;
