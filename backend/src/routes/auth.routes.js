import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import authMiddleware from "../middleware/auth.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;

// DELETE /api/delete-user
router.delete("/api/delete-user", authMiddleware, async (req, res) => {
  const userId = req.userId;

  try {
    // Delete all messages sent or received by the user
    await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      }
    });

    // Delete all connections involving the user
    await prisma.connections.deleteMany({
      where: {
        OR: [
          { requesterId: userId },
          { addresseeId: userId }
        ]
      }
    });

    // Delete all notifications for the user (as recipient)
    await prisma.notification.deleteMany({
      where: {
        userId: userId
      }
    });

    // Delete all notifications sent by the user (as sender) to prevent FK violations
    await prisma.notification.deleteMany({
      where: {
        fromUserId: userId
      }
    });

    // Finally, delete the user record
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({ message: "User and related data deleted successfully." });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Failed to delete user." });
  }
});

// POST /api/signup
router.post("/api/signup", async (req, res) => {
  const { username, password } = req.body;

  // Basic validation
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ error: "Username is already taken." });
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Create new user
    const user = await prisma.user.create({
      data: { username, password: hash }
    });

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    // Set cookie with token
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

    res.status(201).json({ user: { id: user.id, username: user.username } }); // Don't return password
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// POST /api/signin
router.post("/api/signin", async (req, res) => {
  const { username, password } = req.body;

  // 1. Basic validation
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    // 2. Find user
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 3. Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 4. JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });

    // 5. Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

    // 6. Return public-safe user object
    res.status(200).json({
      message: "Signed in successfully",
      user: { id: user.id, username: user.username }
    });
  } catch (err) {
    console.error("Signin error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// POST /api/logout
router.post("/api/logout", (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(400).json({ message: "Already logged out" });
  }

  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  }).json({ message: "Logged out successfully" });
});

// GET /api/me
router.get("/api/me", authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      description: true,
      location: true,
      profilePhoto: true,
      createdAt: true,
    },
  });

  // Generate a short-lived token for WebSocket authentication
  // This allows the frontend to authenticate over WebSocket without exposing
  // the main httpOnly session cookie to JavaScript.
  const wsToken = jwt.sign({ userId: req.userId }, JWT_SECRET, { expiresIn: "30s" });

  res.json({ ...user, wsToken });
});

export default router;
