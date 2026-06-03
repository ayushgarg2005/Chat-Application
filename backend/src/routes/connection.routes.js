import { Router } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;

// GET /connected
router.get("/connected", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

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
