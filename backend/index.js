import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from "dotenv";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Auth Middleware (inline)
const authMiddleware = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// AUTH ROUTES
app.delete("/api/delete-user/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid userId." });
  }

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

    // Delete all notifications for the user
    await prisma.notification.deleteMany({
      where: {
        userId: userId
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

app.post("/api/signup", async (req, res) => {
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

app.post("/api/signin", async (req, res) => {
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

app.post("/api/logout", (req, res) => {
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


app.get("/api/me", authMiddleware, async (req, res) => {
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
  res.json(user);
});

app.put("/user/:id", authMiddleware, async (req, res) => {
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
      console.log("currentPassword", currentPassword);
      console.log(typeof currentPassword);
      console.log(user.password);
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




// Example: DELETE /api/delete-chats?userAId=1&userBId=2
app.delete('/api/delete-chats', async (req, res) => {
  const { userAId, userBId } = req.query;

  const deleted = await prisma.message.deleteMany({
    where: {
      OR: [
        { senderId: Number(userAId), receiverId: Number(userBId) },
        { senderId: Number(userBId), receiverId: Number(userAId) },
      ],
    },
  });

  res.json({ message: 'Chats deleted', count: deleted.count });
});

// USERS & MESSAGES
app.get("/api/users", authMiddleware, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { id: { not: req.userId } },
    select: {
      id: true, username: true, email: true, name: true, location: true, profilePhoto: true,
      description: true, createdAt: true,
    },
  });
  res.json(users);
});

app.get("/api/messages/:withUserId", authMiddleware, async (req, res) => {
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

app.get("/api/public-messages", authMiddleware, async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { receiverId: null },
    orderBy: { createdAt: "asc" },
    include: { sender: true }
  });
  res.json(messages);
});

app.get("/api/notifications", async (req, res) => {
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


// Backend: Express route to mark notifications as read
app.post("/api/notifications/read", async (req, res) => {
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

app.get("/api/notifications/unreadCount",authMiddleware, async (req, res) => {
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

app.post("/api/notifications/respond", async (req, res) => {
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
// backend: GET /connected
app.get("/connected", async (req, res) => {
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

// GET /api/unread-senders
app.get('/unread-senders', authMiddleware, async (req, res) => {
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
//  /api/messages/mark-read/:senderId
app.post('/messages/mark-read/:senderId', authMiddleware, async (req, res) => {
  const userId = req.userId;
  const senderId = parseInt(req.params.senderId,10);

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


app.get("/user/:userid", async (req, res) => {
  const userid = parseInt(req.params.userid, 10); 

  try {
    const user = await prisma.user.findUnique({
      where: { id: userid }, // Prisma expects an integer ID
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

app.get('/api/chat-users', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.userId; // From authMiddleware
    const users = await getChatUsers(currentUserId);
    res.json(users);
  } catch (err) {
    console.error("Error fetching chat users:", err);
    res.status(500).json({ error: "Failed to fetch chat users." });
  }
});




app.post("/chatbot", async (req, res) => {
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



const server = app.listen(3000, () => {
  console.log("HTTP server running on http://localhost:3000");
});
// ----------------------------------------------websocket server----------------------------------------------
const wss = new WebSocketServer({ server });

const clients = {}; // userId -> WebSocket
const onlineUsers = new Set(); // To keep track of online users

wss.on("connection", (ws) => {
  let userId = null;

  ws.on("message", async (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.log("Invalid JSON received");
      return;
    }

    // --- Authentication ---
    if (data.type === "auth") {
      userId = data.userId;
      if (!userId) {
        console.log("Auth failed: no userId");
        ws.close();
        return;
      }

      clients[userId] = ws;
      onlineUsers.add(userId);
      console.log(`User ${userId} connected`);

      // Notify all users about the new user's online status
      broadcastUserStatus(userId, true);
      sendCurrentOnlineUsers(ws);
      return;
    }

    if (!userId) {
      console.log("Unauthenticated user tried to send a message");
      return;
    }

    // --- Handle message read status ---
    if (data.type === "markRead") {
      await prisma.message.updateMany({
        where: { senderId: data.withUserId, receiverId: userId, read: false },
        data: { read: true, readAt: new Date() }
      });

      // Optionally notify sender
      if (clients[data.withUserId]) {
        clients[data.withUserId].send(JSON.stringify({
          type: "messageRead",
          from: userId
        }));
      }

      
      console.log(`Marked notifications for ${userId} as read.`);
    }

    // --- Handle message send ---
    if (data.type === "message") {
      try {
        
        const connection = await prisma.connections.findFirst({
            where: {
              OR: [
                { requesterId: userId, addresseeId: data.receiverId, status: "accepted" },
                { requesterId: data.receiverId, addresseeId: userId, status: "accepted" }
              ]
            }
          });

          const isAccepted = !!connection; // true if any accepted connection found

          if (!isAccepted) {
            console.log("User is not connected to the recipient");
            ws.send(JSON.stringify({
              type: "error",
              message: "You can only message users with whom you have an accepted connection."
            }));
            return;
          }
        // Store the message
        const msg = await prisma.message.create({
          data: {
            content: data.content,
            senderId: userId,
            receiverId: data.receiverId || null,
          },
          include: { sender: true, receiver: true },
        });
        
        const enrichedMsg = { ...msg, type: "message" };
        

        if (msg.receiverId && clients[msg.receiverId]) {
          const receiverSocket = clients[msg.receiverId];
          if (receiverSocket.readyState === ws.OPEN) {
            // Fetch unread count for receiver
            const unreadCount = await prisma.message.count({
              where: {
                receiverId: msg.receiverId,
                senderId: msg.senderId,
                read: false,
              },
            });
            
            console.log("unread count", unreadCount);
        receiverSocket.send(JSON.stringify({
          type: "newMessage",
          from: msg.senderId,
          content: msg.content,
          timestamp: msg.createdAt, // or msg.timestamp if exists
          unreadCount,             // <-- send updated unread count here
        }));
      }
    }
        // Broadcast public message
        if (!msg.receiverId) {
          Object.entries(clients).forEach(([id, client]) => {
            if (id !== userId && client.readyState === ws.OPEN) {
              client.send(JSON.stringify(enrichedMsg));
            }
          });
        }

      } catch (err) {
        console.error("Error saving or sending message:", err);
        ws.send(JSON.stringify({
          type: "error",
          message: "Something went wrong while sending the message."
        }));
      }
    }

    
// --- Handle connection request ---
if (data.type === "connection_request") {
  try {
    const existingRequest = await prisma.connections.findUnique({
      where: {
        requesterId_addresseeId: {
          requesterId: userId,
          addresseeId: data.targetUserId,
        },
      },
    });
    
    if (existingRequest) {
      ws.send(JSON.stringify({
        type: "error",
        message: "You have already sent a connection request."
      }));
      return;
    }
    
    // Create new connection request with 'pending' status
    await prisma.connections.create({
      data: {
        requesterId: userId,
        addresseeId: data.targetUserId,
        status: "pending",
      },
    });
    
    // Create notification once
    const notification = await prisma.notification.create({
      data: {
        type: "connection_request",
        content: `${userId} sent you a connection request.`,
        userId: data.targetUserId,
        fromUserId: userId,
      },
    });
    
    // Count unread notifications for the recipient
    const unreadCount = await prisma.notification.count({
      where: {
        userId: data.targetUserId,
        isRead: false,
      },
    });
    
    // Notify target user if online and WebSocket is open
    const targetSocket = clients[data.targetUserId];
    if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
      // Send structured notification
      targetSocket.send(JSON.stringify({
        type: "newNotification",
        notification: {
          id: notification.id,
          userId: notification.userId,
          fromUserId: notification.fromUserId,  // included here
          type: notification.type,
          content: notification.content,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        },
        unreadCount,
      }));
      
      // Also notify specifically about connection request
      
      
      
      // ------------------------is this useful?------------------------
      targetSocket.send(JSON.stringify({
        type: "connection-request-received",
        fromUserId: userId,
      }));
    }
    // ---------------------------is this useful?------------------------
    
    
    
    
    // Confirm to sender that the request was sent
    ws.send(JSON.stringify({
      type: "connection-request-sent",
      toUserId: data.targetUserId,
    }));
    
    console.log("Notification created for connection request.");
  } catch (err) {
    console.error("Error sending connection request:", err);
    ws.send(JSON.stringify({
      type: "error",
      message: "Failed to send connection request."
    }));
  }
}

// --- Handle connection response ---
if (data.type === "connection-response") {
  try {
    const existingRequest = await prisma.connections.findUnique({
      where: {
        requesterId_addresseeId: {
          requesterId: data.fromUserId,
          addresseeId: userId,
        },
      },
    });
    
    if (!existingRequest || existingRequest.status !== "pending") {
      ws.send(JSON.stringify({
        type: "error",
        message: "No pending connection request found.",
      }));
      return;
    }
    
    // Update connection status to 'accepted' or 'rejected'
    const updatedConnection = await prisma.connections.update({
      where: {
        requesterId_addresseeId: {
          requesterId: data.fromUserId,
          addresseeId: userId,
        },
      },
      data: {
        status: data.response, // "accepted" or "rejected"
      },
    });
    
    // Create a notification for the user
    const notificationMessage = data.response === "accepted"
    ? `Your connection request was accepted by ${userId}.`
    : `Your connection request was rejected by ${userId}.`;
    
    const notification = await prisma.notification.create({
      data: {
        userId: data.fromUserId, // Notify the requester
        fromUserId: userId,       // The responder is the "fromUser"
        type: `connection_${data.response}`,
        content: notificationMessage,
      },
    });
    // Mark the original request notification as read
    await prisma.notification.updateMany({
      where: {
        userId: userId, // Responder (receiver of original request)
        type: "connection_request",
        content: {
          contains: `${data.fromUserId} sent you a connection request.`, // adjust based on your original message
        },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
    const unreadCount = await prisma.notification.count({
      where: {
        userId: data.fromUserId,
        isRead: false,
      },
    });
    // Notify the requester if they are online
    const requesterSocket = clients[data.fromUserId]; // Get the requester's socket
    if (requesterSocket) {
      requesterSocket.send(JSON.stringify({
      type: "newNotification",
      notification: {
        id: notification.id,
        userId: notification.userId,
        fromUserId: notification.fromUserId,
        type: notification.type,
        content: notification.content,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      },
      unreadCount, //  send count too
    }));
  }

  // Confirm response to the responder (current user)
  ws.send(JSON.stringify({
    type: "connection-response-confirmed",
    toUserId: data.fromUserId,
    response: data.response,
  }));
  
  // If accepted, notify both users that they are now connected
  if (data.response === "accepted") {
    const notifyConnected = (targetSocket, otherUserId) => {
        if (targetSocket?.readyState === WebSocket.OPEN) {
          targetSocket.send(JSON.stringify({
            type: "connection-established",
            withUserId: otherUserId,
          }));
        }
      };
      
      // Notify both users about the successful connection
      notifyConnected(ws, data.fromUserId);  // Responder
      notifyConnected(requesterSocket, userId);  // Requester
    }
  } catch (err) {
    console.error("Error updating connection request:", err);
    ws.send(JSON.stringify({
      type: "error",
      message: "Failed to respond to connection request.",
    }));
  }
}


// --- Typing indicator ---
if (data.type === "typing" || data.type === "stop_typing") {
  const to = data.to;
  if (to && clients[to] && clients[to].readyState === ws.OPEN) {
        clients[to].send(
          JSON.stringify({
            type: data.type,
            from: userId,
          })
        );
      }
    }
  });
  
  // --- Handle disconnect ---
  ws.on("close", () => {
    if (userId && clients[userId]) {
      delete clients[userId];
      
      // Delay marking the user offline by 5 seconds
      setTimeout(() => {
        if (!clients[userId]) {
          onlineUsers.delete(userId);
          console.log(`User ${userId} marked as offline`);
          broadcastUserStatus(userId, false);
        }
      }, 2000);
    }
  });
});

// --- Helper functions ---
function broadcastUserStatus(userId, isOnline) {
  const statusMessage = JSON.stringify({
    type: "userStatus",
    userId,
    isOnline,
  });
  
  Object.entries(clients).forEach(([id, client]) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(statusMessage);
    }
  });
}

function sendCurrentOnlineUsers(ws) {
  const onlineUserList = Array.from(onlineUsers);
  const onlineUsersMessage = JSON.stringify({
    type: "initialOnlineUsers",
    onlineUsers: onlineUserList,
  });
  
  ws.send(onlineUsersMessage);
}