import { Router } from "express";
import axios from "axios";

const router = Router();

// POST /chatbot
router.post("/chatbot", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const response = await axios.post("http://localhost:5001/chat", {
      message,
    });

    res.json({ response: response.data.response });
  } catch (err) {
    console.error("Chatbot error:", err.message);
    res.status(500).json({ error: "Failed to communicate with chatbot" });
  }
});

export default router;
