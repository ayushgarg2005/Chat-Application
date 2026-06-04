import { Router } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/db.js";
import authMiddleware from "../middleware/auth.js";

const router = Router();

// GET /api/users — list all users except current
router.get("/api/users", authMiddleware, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { id: { not: req.userId } },
    select: {
      id: true, username: true, email: true, name: true, location: true, profilePhoto: true,
      description: true, createdAt: true,
    },
  });
  res.json(users);
});

// PUT /user/:id — update user profile
router.put("/user/:id", authMiddleware, async (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  // Ownership check: users can only update their own profile
  if (isNaN(targetId) || targetId !== req.userId) {
    return res.status(403).json({ message: "You can only update your own profile." });
  }

  const {
    name,
    description,
    location,
    profilePhoto,
    username,
    password,          // New password (optional)
    currentPassword,   // Must be provided to change password
  } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (location !== undefined) updateData.location = location;
  if (profilePhoto !== undefined) updateData.profilePhoto = profilePhoto;
  if (username !== undefined) updateData.username = username;

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (password !== undefined) {
      // Require currentPassword to be present and correct
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to update password." });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Current password is incorrect." });
      }

      const hashed = await bcrypt.hash(password, 10);
      updateData.password = hashed;
    }

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
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

    res.json(updated);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({
        message: `The ${err.meta?.target?.join(", ")} is already taken.`,
      });
    }
    res.status(500).json({ message: "Update failed", error: err });
  }
});

// GET /user/:userid — get public user profile
router.get("/user/:userid", async (req, res) => {
  const userid = parseInt(req.params.userid, 10);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userid },
      select: {
        id: true, username: true, email: true, name: true, location: true, profilePhoto: true,
        description: true, createdAt: true,
      },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
