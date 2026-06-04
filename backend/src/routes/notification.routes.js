import { Router } from "express";
import prisma from "../config/db.js";
import authMiddleware from "../middleware/auth.js";

const router = Router();

// GET /api/notifications
router.get("/api/notifications", authMiddleware, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(notifications);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/notifications/read
router.post("/api/notifications/read", authMiddleware, async (req, res) => {
  try {
    const { notificationId } = req.body;

    if (!notificationId || typeof notificationId !== "number") {
      return res.status(400).json({ error: "Valid notificationId is required." });
    }

    // Verify the notification belongs to the authenticated user
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existing || existing.userId !== req.userId) {
      return res.status(403).json({ error: "Access denied." });
    }

    // Mark the notification as read in the database
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    res.json(notification);
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/notifications/unreadCount
router.get("/api/notifications/unreadCount", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId; // Adjust this according to your auth middleware

    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error("Error fetching unread notification count:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/notifications/respond
router.post("/api/notifications/respond", authMiddleware, async (req, res) => {
  const { notificationId, responseStatus } = req.body;

  if (!notificationId || !["accepted", "rejected"].includes(responseStatus)) {
    return res.status(400).json({ error: "Invalid data" });
  }

  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== req.userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        responseStatus: responseStatus,
        isRead: true, // mark as read at the same time
      },
    });

    res.json({ message: "Response recorded" });
  } catch (err) {
    console.error("Error updating notification:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
