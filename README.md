# 💬 Real-Time Chat Application

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=websocket&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org)
[![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white)](https://jwt.io)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

> A **production-grade real-time chat platform** built with native **WebSockets (`ws`)**, **Prisma ORM**, and **JWT cookie-based auth**. Features include a LinkedIn-style **connection system**, **live presence tracking**, **typing indicators**, **unread message counts**, an **in-app notification engine**, and a **Python-powered AI chatbot** integration — all on a single Node.js server.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Architecture & Flow Diagram](#-architecture--flow-diagram)
- [WebSocket Event Lifecycle](#-websocket-event-lifecycle)
- [Features](#-features)
- [Database Schema](#-database-schema)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Complete API Reference](#-complete-api-reference)
- [WebSocket Events Reference](#-websocket-events-reference)
- [Key Design Decisions](#-key-design-decisions)

---

## 🔍 Overview

This is not a basic chat app. It is a **social messaging platform** where users must first establish a **connection** (like LinkedIn) before they can message each other. The backend runs a unified **Express + WebSocket server** — both HTTP REST and WebSocket traffic share a single Node.js `http.Server` instance, keeping deployment simple.

Authentication uses **JWT stored in httpOnly cookies**, which are automatically sent with every REST request. WebSocket connections are authenticated via an explicit `auth` event immediately after the socket opens.

---

## 🛠 Tech Stack

| Layer | Technology | Why This Choice |
|---|---|---|
| **Runtime** | Node.js | Non-blocking I/O — ideal for real-time |
| **HTTP Framework** | Express.js | REST API routing + middleware |
| **WebSocket** | `ws` (native) | Lightweight, no abstraction overhead vs Socket.io |
| **ORM** | Prisma | Type-safe DB queries, auto migrations |
| **Auth** | JWT + `httpOnly` cookies | Secure, XSS-resistant token storage |
| **Password Hashing** | bcryptjs | Industry-standard salted hashing |
| **Frontend** | React.js + CSS3 | Component-driven real-time UI |
| **AI Chatbot** | Python service (port 5001) | Decoupled microservice for chatbot logic |

---

## 🗺 Architecture & Flow Diagram

```mermaid
flowchart TD
    subgraph CLIENT["⚛️ React Frontend"]
        UI[Chat UI]
        WC[Native WebSocket Client]
        RC[REST Client · Axios/Fetch]
    end

    subgraph SERVER["🟢 Unified Node.js Server · Port 3000"]
        EX[Express REST Router]
        MW[Auth Middleware\nJWT Cookie Verify]
        WSS[WebSocket Server · ws\nclients map: userId → socket]
        ONL[Online Users Set]
    end

    subgraph WSEVENTS["⚡ WebSocket Event Bus"]
        AUTH_EV[auth]
        MSG_EV[message]
        MARK_EV[markRead]
        CONN_REQ[connection_request]
        CONN_RES[connection-response]
        TYPING_EV[typing · stop_typing]
    end

    subgraph ORM["🔷 Prisma ORM"]
        PC[Prisma Client]
    end

    subgraph DB["🗄 Database"]
        TU[(User)]
        TM[(Message)]
        TC[(Connections)]
        TN[(Notification)]
    end

    subgraph BOT["🤖 Python Chatbot\nPort 5001"]
        PY[/chat endpoint/]
    end

    UI --> RC
    UI --> WC

    RC -->|HTTP + Cookie| EX
    EX --> MW
    MW -->|Authenticated| EX
    EX --> PC

    WC <-->|Persistent WS| WSS
    WSS --> WSEVENTS

    AUTH_EV -->|Register socket| ONL
    MSG_EV -->|Check connection\nStore + Broadcast| PC
    MARK_EV -->|Update read status| PC
    CONN_REQ -->|Create pending\nNotify target| PC
    CONN_RES -->|Update status\nNotify requester| PC
    TYPING_EV -->|Forward to target| WSS

    PC --> TU
    PC --> TM
    PC --> TC
    PC --> TN

    EX -->|POST /chatbot| BOT
    BOT -->|AI response| EX

    style CLIENT fill:#20232A,color:#61DAFB
    style WSS fill:#1a1a2e,color:#fff
    style DB fill:#1e3a5f,color:#fff
    style BOT fill:#3d5a00,color:#fff
    style ONL fill:#4a0000,color:#fff
    style MW fill:#5c3d00,color:#fff
```

---

## ⚡ WebSocket Event Lifecycle

```mermaid
sequenceDiagram
    participant UA as 👤 User A (Client)
    participant WS as ⚡ WS Server
    participant DB as 🗄 Prisma / DB
    participant UB as 👤 User B (Client)

    Note over UA, UB: 1 — CONNECTION & AUTH
    UA->>WS: WebSocket connect
    UA->>WS: { type: "auth", userId }
    WS-->>UA: { type: "initialOnlineUsers", onlineUsers[] }
    WS-->>UB: { type: "userStatus", userId, isOnline: true }

    Note over UA, UB: 2 — CONNECTION REQUEST (LinkedIn-style)
    UA->>WS: { type: "connection_request", targetUserId }
    WS->>DB: connections.create({ status: "pending" })
    WS->>DB: notification.create({ type: "connection_request" })
    WS-->>UA: { type: "connection-request-sent" }
    WS-->>UB: { type: "newNotification", unreadCount }
    WS-->>UB: { type: "connection-request-received", fromUserId }

    Note over UA, UB: 3 — ACCEPT / REJECT
    UB->>WS: { type: "connection-response", response: "accepted" }
    WS->>DB: connections.update({ status: "accepted" })
    WS->>DB: notification.create({ type: "connection_accepted" })
    WS-->>UA: { type: "newNotification" }
    WS-->>UA: { type: "connection-established", withUserId }
    WS-->>UB: { type: "connection-established", withUserId }

    Note over UA, UB: 4 — MESSAGING (only after accepted connection)
    UA->>WS: { type: "typing", to: UB }
    WS-->>UB: { type: "typing", from: UA }

    UA->>WS: { type: "message", content, receiverId }
    WS->>DB: connections.findFirst — verify accepted connection
    WS->>DB: message.create(...)
    WS-->>UB: { type: "newMessage", content, unreadCount }

    Note over UA, UB: 5 — READ RECEIPTS
    UB->>WS: { type: "markRead", withUserId: UA }
    WS->>DB: message.updateMany({ read: true })
    WS-->>UA: { type: "messageRead", from: UB }

    Note over UA, UB: 6 — DISCONNECT
    UA->>WS: [connection closed]
    Note over WS: 2s grace period timeout
    WS-->>UB: { type: "userStatus", isOnline: false }
```

---

## ✨ Features

### 🔐 Auth System
- **Signup / Signin / Logout** via REST API
- Passwords hashed with **bcryptjs** (10 salt rounds)
- JWT issued on login and stored in **httpOnly, SameSite cookie** — invisible to JavaScript, XSS-resistant
- Token is **verified on every protected REST route** via `authMiddleware`
- WebSocket connections authenticate by sending `{ type: "auth", userId }` immediately after opening — unauthenticated messages are silently dropped

### 🤝 LinkedIn-Style Connection System
- Users cannot message strangers — they must send a **connection request** first
- Request creates a `Connections` record with `status: "pending"` in the DB
- Target user receives a **real-time notification** via WebSocket
- On accept/reject, the connection status is updated and **both users** are notified
- Message delivery is **blocked at the server level** if no accepted connection exists

### 💬 Real-Time Direct & Public Messaging
- **Direct Messages** — sent only to the target user's active WebSocket
- **Public messages** — broadcast to all connected users (receiverId is null)
- Every message is **persisted in the database** via Prisma before delivery
- Real-time **unread message count** sent to receiver with each new message

### 📖 Read Receipts
- Client sends `markRead` WebSocket event when opening a conversation
- Server updates `read: true` and `readAt` for all relevant messages
- **Sender is notified** in real-time via `messageRead` event

### 🟢 Live Presence Tracking
- A `Set<userId>` tracks online users server-side
- On connect: broadcasts `userStatus: online` + sends full `initialOnlineUsers` list to the new client
- On disconnect: **2-second grace period** before broadcasting offline — handles brief reconnections gracefully

### ⌨️ Typing Indicators
- `typing` and `stop_typing` events forwarded directly to the target user's socket
- Zero database writes — pure in-memory event forwarding

### 🔔 Notification Engine
- Persistent notifications stored in the `Notification` table
- Types: `connection_request`, `connection_accepted`, `connection_rejected`
- Real-time delivery via WebSocket with live **unread count** update
- REST endpoints to fetch, mark as read, and respond to notifications

### 👤 Rich User Profiles
- Users can update: `name`, `username`, `description`, `location`, `profilePhoto`
- Password change requires submitting the **current password** for verification
- Prisma's `P2002` unique constraint error is caught and returned as a friendly message

### 🤖 AI Chatbot Integration
- POST `/chatbot` proxies to a **Python microservice** running on port 5001
- Decoupled architecture — chatbot can be upgraded independently

---

## 🗄 Database Schema

```
User
├── id, username (unique), password, email
├── name, description, location, profilePhoto
└── createdAt

Message
├── id, content
├── senderId → User
├── receiverId → User (null = public message)
├── read (bool), readAt
└── createdAt

Connections
├── requesterId → User
├── addresseeId → User
├── status: "pending" | "accepted" | "rejected"
└── createdAt
     [Unique: requesterId + addresseeId]

Notification
├── id, type, content
├── userId → User (recipient)
├── fromUserId → User (sender)
├── isRead (bool), responseStatus
└── createdAt
```

---

## 📁 Project Structure

```
Chat-Application/
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma         # User, Message, Connections, Notification models
│   ├── server.js                 # Entire backend: Express + WS server (port 3000)
│   │   ├── REST routes           # Auth, users, messages, notifications, connections
│   │   ├── authMiddleware        # Inline JWT cookie verification
│   │   ├── WebSocketServer       # ws event handlers
│   │   ├── clients{}             # userId → WebSocket live map
│   │   ├── onlineUsers (Set)     # Real-time presence tracking
│   │   └── Helper functions      # broadcastUserStatus, sendCurrentOnlineUsers
│   └── .env                      # JWT_SECRET, DATABASE_URL, NODE_ENV
│
├── frontend/
│   └── frontend-project/         # React application
│       ├── src/
│       │   ├── components/       # ChatWindow, MessageBubble, UserList, Notifications
│       │   ├── context/          # WebSocket context (global WS instance)
│       │   ├── pages/            # Login, Signup, Chat, Profile
│       │   └── App.js
│       └── public/
│
├── *.py                          # Python chatbot microservice (port 5001)
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v16+
- A Prisma-compatible database (PostgreSQL recommended)
- Python 3 (for the chatbot service)

### Backend Setup

```bash
cd backend

npm install

# Configure environment
echo "DATABASE_URL=postgresql://user:pass@localhost:5432/chatdb
JWT_SECRET=your_super_secret_key
NODE_ENV=development" > .env

# Run DB migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Start server (REST + WebSocket on port 3000)
node server.js
```

### Frontend Setup

```bash
cd frontend/frontend-project

npm install
npm start
```

### Python Chatbot (Optional)

```bash
# From root directory
python chatbot.py   # Starts on port 5001
```

---

## 📡 Complete API Reference

### Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| `POST` | `/api/signup` | Register new user, sets JWT cookie | ❌ |
| `POST` | `/api/signin` | Login, sets JWT cookie | ❌ |
| `POST` | `/api/logout` | Clears JWT cookie | ❌ |
| `GET` | `/api/me` | Get current user profile | ✅ |
| `PUT` | `/user/:id` | Update profile / change password | ✅ |
| `DELETE` | `/api/delete-user/:userId` | Delete user + all related data | ❌ |

### Users & Connections

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| `GET` | `/api/users` | List all users (except self) | ✅ |
| `GET` | `/user/:userid` | Get public profile by ID | ❌ |
| `GET` | `/connected` | Get all accepted connections | ✅ |

### Messages

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| `GET` | `/api/messages/:withUserId` | Fetch DM history with a user | ✅ |
| `GET` | `/api/public-messages` | Fetch all public messages | ✅ |
| `GET` | `/api/chat-users` | Get recent chats with last msg + unread count | ✅ |
| `GET` | `/unread-senders` | Count senders with unread messages | ✅ |
| `POST` | `/messages/mark-read/:senderId` | Mark all messages from sender as read | ✅ |
| `DELETE` | `/api/delete-chats` | Delete all messages between two users | ❌ |

### Notifications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| `GET` | `/api/notifications` | Fetch all notifications | Cookie |
| `GET` | `/api/notifications/unreadCount` | Get unread notification count | ✅ |
| `POST` | `/api/notifications/read` | Mark a notification as read | ❌ |
| `POST` | `/api/notifications/respond` | Accept/reject a connection request | Cookie |

### Other

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|:----:|
| `POST` | `/chatbot` | Proxy message to Python AI chatbot | ❌ |

---

## 📡 WebSocket Events Reference

### Client → Server

| Event `type` | Key Payload Fields | Description |
|---|---|---|
| `auth` | `userId` | Authenticate socket immediately after connecting |
| `message` | `content`, `receiverId` | Send a DM (`receiverId` set) or public message (null) |
| `markRead` | `withUserId` | Mark all DMs from a user as read |
| `connection_request` | `targetUserId` | Send a connection request |
| `connection-response` | `fromUserId`, `response` | Accept / reject a connection (`"accepted"` or `"rejected"`) |
| `typing` | `to` | Notify a user you are typing |
| `stop_typing` | `to` | Notify a user you stopped typing |

### Server → Client

| Event `type` | Key Payload Fields | Description |
|---|---|---|
| `initialOnlineUsers` | `onlineUsers[]` | Full online user list on first connect |
| `userStatus` | `userId`, `isOnline` | Presence update broadcast |
| `newMessage` | `from`, `content`, `timestamp`, `unreadCount` | Incoming DM notification |
| `messageRead` | `from` | Receiver has read your messages |
| `newNotification` | `notification{}`, `unreadCount` | New in-app notification |
| `connection-request-received` | `fromUserId` | Incoming connection request |
| `connection-request-sent` | `toUserId` | Confirms your request was sent |
| `connection-response-confirmed` | `toUserId`, `response` | Confirms your accept/reject was processed |
| `connection-established` | `withUserId` | Both users notified of successful connection |
| `error` | `message` | Server-side error feedback |

---

## 🧠 Key Design Decisions

| Decision | Rationale |
|---|---|
| **Native `ws` over Socket.io** | No abstraction overhead; fine-grained control over every event and connection lifecycle |
| **Single unified server** | Express HTTP and WebSocket share one `http.Server` — simpler deployment, no CORS/port issues |
| **JWT in httpOnly cookies** | Tokens cannot be accessed by JavaScript — eliminates XSS-based token theft |
| **WS auth via message, not headers** | Browser WebSocket API does not support custom headers; auth message on open is the correct pattern |
| **Accepted connection required to message** | Prevents spam; mirrors real-world platforms like LinkedIn |
| **2-second offline grace period** | Handles brief network flaps/reconnects without falsely broadcasting offline status |
| **Python chatbot as a microservice** | Keeps AI logic decoupled; can be scaled or swapped independently of the Node.js server |
| **Prisma over raw SQL** | Type-safe queries, auto-generated client, and schema-as-code with migrations |

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---

## 👨‍💻 Author

**Ayush Garg**
- GitHub: [@ayushgarg2005](https://github.com/ayushgarg2005)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
