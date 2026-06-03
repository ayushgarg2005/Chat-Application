import { Router } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import authMiddleware from "../middleware/auth.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;

// GET /api/notifications
router.get("/api/notifications", async (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const notifications = await prisma.notification.findMany({
      where: {
        userId: userId,
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
router.post("/api/notifications/read", async (req, res) => {
  try {
    const { notificationId } = req.body;

    // Mark the notification as read in the database
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    res.json(notification);
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).send("Internal Server Error");
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
router.post("/api/notifications/respond", async (req, res) => {
  const token = req.cookies.token;
  const { notificationId, responseStatus } = req.body;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!notificationId || !["accepted", "rejected"].includes(responseStatus)) {
    return res.status(400).json({ error: "Invalid data" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
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
