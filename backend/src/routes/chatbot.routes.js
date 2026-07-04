import { Router } from "express";
import axios from "axios";
import authMiddleware from "../middleware/auth.js";

const router = Router();

// POST /api/chatbot
router.post("/api/chatbot", authMiddleware, async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const response = await axios.post("http://localhost:5001/chat", {
      message,
      session_id: `user-${req.userId}`,
    });

    res.json({ response: response.data.response });
  } catch (err) {
    console.error("Chatbot error:", err.message);
    res.status(500).json({ error: "Failed to communicate with chatbot" });
  }
});

export default router;
