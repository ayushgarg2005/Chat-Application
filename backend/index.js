import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from "./src/routes/auth.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import messageRoutes from "./src/routes/message.routes.js";
import notificationRoutes from "./src/routes/notification.routes.js";
import connectionRoutes from "./src/routes/connection.routes.js";
import chatbotRoutes from "./src/routes/chatbot.routes.js";

// Import WebSocket setup
import { setupWebSocket } from "./src/websocket/index.js";

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Mount routes
app.use(authRoutes);
app.use(userRoutes);
app.use(messageRoutes);
app.use(notificationRoutes);
app.use(connectionRoutes);
app.use(chatbotRoutes);

// Start HTTP server
const server = app.listen(3000, () => {
  console.log("HTTP server running on http://localhost:3000");
});

// Attach WebSocket server
setupWebSocket(server);