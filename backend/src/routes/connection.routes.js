import { Router } from "express";
import prisma from "../config/db.js";
import authMiddleware from "../middleware/auth.js";

const router = Router();

// GET /connected
router.get("/connected", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const sentConnections = await prisma.connections.findMany({
      where: {
        requesterId: userId,
        status: "accepted",
      },
      select: {
        createdAt: true,
        addressee: {
          select: { id: true, username: true },
        },
      },
    });

    const receivedConnections = await prisma.connections.findMany({
      where: {
        addresseeId: userId,
        status: "accepted",
      },
      select: {
        createdAt: true,
        requester: {
          select: { id: true, username: true },
        },
      },
    });

    const combinedUsers = [
      ...sentConnections.map((c) => ({
        ...c.addressee,
        connectedAt: c.createdAt,
      })),
      ...receivedConnections.map((c) => ({
        ...c.requester,
        connectedAt: c.createdAt,
      })),
    ];

    // Deduplicate users by id
    const uniqueUsersMap = new Map();
    combinedUsers.forEach((user) => {
      if (!uniqueUsersMap.has(user.id)) {
        uniqueUsersMap.set(user.id, user);
      }
    });

    const connectedUsers = Array.from(uniqueUsersMap.values());

    res.json({ connectedUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

export default router;
