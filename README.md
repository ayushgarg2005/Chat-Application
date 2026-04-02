# 💬 Real-Time Chat Application

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![WebSocket](https://img.shields.io/badge/WebSocket_ws-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://github.com/websockets/ws)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](https://langchain.com)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini)
[![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white)](https://jwt.io)

> A **production-grade real-time social messaging platform** with a LinkedIn-style **connection system**, native **WebSocket** messaging, live **presence tracking**, **read receipts**, **in-app notifications**, and a session-aware **AI chatbot** powered by Google Gemini and LangChain — all running across a unified Node.js server and a decoupled Python Flask microservice.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Database Schema](#-database-schema)
- [WebSocket Lifecycle Diagram](#-websocket-lifecycle-diagram)
- [AI Chatbot Flow](#-ai-chatbot-flow)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Getting Started](#-getting-started)
- [Complete API Reference](#-complete-api-reference)
- [WebSocket Events Reference](#-websocket-events-reference)
- [Key Design Decisions](#-key-design-decisions)

---

## 🔍 Overview

This is not a basic chat application. It is a **full-stack social messaging platform** with three distinct layers:

1. **Node.js Server (port 3000)** — A unified Express + WebSocket server handling all REST API routes and real-time WebSocket events on a single `http.Server` instance.
2. **PostgreSQL + Prisma** — A relational database with a type-safe ORM layer managing Users, Messages, Connections, and Notifications with referential integrity.
3. **Python Flask AI Service (port 5001)** — A decoupled microservice running **LangChain + Google Gemini**, maintaining per-session conversation memory for a persistent AI chatbot experience.

Authentication uses **JWT stored in `httpOnly` cookies** — tokens are never exposed to JavaScript, eliminating XSS-based token theft. WebSocket connections are independently authenticated via an `auth` message event immediately after the socket opens, since the browser's native WebSocket API does not support custom headers.

Users must establish a **Connection** (like LinkedIn) before they can exchange messages — enforced at the server level on every message event.

---

## 🛠 Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | React.js + Tailwind CSS | UI, real-time state updates |
| **HTTP Server** | Node.js + Express.js | REST API, cookie auth, proxy to chatbot |
| **Real-Time** | `ws` (native WebSocket) | Bi-directional persistent messaging |
| **ORM** | Prisma | Type-safe DB queries, migrations |
| **Database** | PostgreSQL | Persistent storage for all entities |
| **Auth** | JWT + `httpOnly` cookies + bcryptjs | Secure stateless auth |
| **AI Chatbot** | Python Flask + LangChain + Google Gemini | Session-based AI conversation |
| **AI Memory** | `ConversationBufferMemory` (LangChain) | Per-session chat history for Gemini |

---

## 🗺 System Architecture

```mermaid
flowchart TD
    subgraph FE["⚛️ React + Tailwind Frontend"]
        UI[Chat UI / Notifications / Profile]
        WSC[Native WebSocket Client]
        REST_C[HTTP Client · Axios/Fetch]
    end

    subgraph NODE["🟢 Node.js Unified Server · Port 3000"]
        direction TB
        EXP[Express Router - 20+ REST Endpoints]
        AUTH_MW[authMiddleware - JWT Cookie to req.userId]
        WSS[WebSocket Server ws - clients map and onlineUsers Set]
    end

    subgraph WS_EVENTS["⚡ WebSocket Event Handlers"]
        EV_AUTH[auth]
        EV_MSG[message]
        EV_READ[markRead]
        EV_CREQ[connection_request]
        EV_CRES[connection-response]
        EV_TYPE[typing / stop_typing]
    end

    subgraph PRISMA["🔷 Prisma ORM · PostgreSQL"]
        direction LR
        M_USER[(User)]
        M_MSG[(Message)]
        M_CONN[(Connections)]
        M_NOTIF[(Notification)]
    end

    subgraph PYTHON["🤖 Python Flask AI Service · Port 5001"]
        FLASK[Flask /chat endpoint]
        LC[LangChain LLMChain]
        MEM[ConversationBufferMemory per session_id]
        GEMINI[Google Gemini - ChatGoogleGenerativeAI]
    end

    UI --> REST_C
    UI --> WSC

    REST_C -->|HTTP + Cookie| EXP
    EXP --> AUTH_MW
    AUTH_MW -->|req.userId set| EXP

    WSC <-->|Persistent WebSocket| WSS
    WSS --> WS_EVENTS

    EV_AUTH -->|Register socket + broadcast online| WSS
    EV_MSG -->|Verify connection + persist + deliver| PRISMA
    EV_READ -->|Update read status + notify sender| PRISMA
    EV_CREQ -->|Create pending Connection + Notification| PRISMA
    EV_CRES -->|Update status + notify + broadcast established| PRISMA
    EV_TYPE -->|Forward to target socket| WSS

    EXP --> PRISMA
    EXP -->|POST /chatbot proxy| FLASK

    FLASK --> LC
    LC --> MEM
    LC --> GEMINI
    GEMINI -->|AI response| FLASK
    FLASK -->|response JSON| EXP

    style FE fill:#1a1a2e,color:#61DAFB
    style NODE fill:#1b3a1b,color:#90EE90
    style PRISMA fill:#1a2a4a,color:#87CEEB
    style PYTHON fill:#3a2a00,color:#FFD700
    style WSS fill:#2a0a2a,color:#DDA0DD
```

---

## 🗄 Database Schema

```mermaid
erDiagram
    User {
        Int     id          PK
        String  username    UNIQUE
        String  email       UNIQUE_NULL
        String  password
        String  name
        String  description
        String  profilePhoto
        String  location
        DateTime createdAt
    }

    Message {
        Int      id          PK
        String   content
        Int      senderId    FK
        Int      receiverId  FK_NULL
        Boolean  read
        DateTime readAt      NULL
        DateTime createdAt
    }

    Connections {
        Int      id           PK
        Int      requesterId  FK
        Int      addresseeId  FK
        String   status
        DateTime createdAt
    }

    Notification {
        Int            id             PK
        Int            userId         FK
        Int            fromUserId     FK_NULL
        NotificationType type
        String         content
        Boolean        isRead
        ResponseStatus responseStatus NULL
        DateTime       createdAt
    }

    User ||--o{ Message        : "sends (SentMessages)"
    User ||--o{ Message        : "receives (ReceivedMessages)"
    User ||--o{ Connections    : "RequesterConnections"
    User ||--o{ Connections    : "AddresseeConnections"
    User ||--o{ Notification   : "receives"
    User ||--o{ Notification   : "triggers (NotificationFromUser)"
```

**Enums defined in schema:**
- `NotificationType`: `message` | `connection_request` | `connection_accepted` | `connection_rejected`
- `ResponseStatus`: `accepted` | `rejected`
- `Connections.status` (String): `"pending"` | `"accepted"` | `"rejected"`
- `Connections` composite unique constraint: `@@unique([requesterId, addresseeId])`
- `Message.receiverId = null` → **public message** (broadcast to all)

---

## ⚡ WebSocket Lifecycle Diagram

```mermaid
sequenceDiagram
    participant UA as 👤 User A
    participant SRV as ⚡ WS Server (Node.js)
    participant DB  as 🗄 Prisma / PostgreSQL
    participant UB  as 👤 User B

    rect rgb(20, 40, 20)
        Note over UA,UB: PHASE 1 — Connect & Authenticate
        UA->>SRV: WebSocket connect
        UA->>SRV: { type: "auth", userId: A }
        SRV->>SRV: clients[A] = socket · onlineUsers.add(A)
        SRV-->>UA: { type: "initialOnlineUsers", onlineUsers[] }
        SRV-->>UB: { type: "userStatus", userId: A, isOnline: true }
    end

    rect rgb(20, 20, 60)
        Note over UA,UB: PHASE 2 — Connection Request (LinkedIn-style)
        UA->>SRV: { type: "connection_request", targetUserId: B }
        SRV->>DB: connections.findUnique — check duplicate
        SRV->>DB: connections.create { status: "pending" }
        SRV->>DB: notification.create { type: "connection_request" }
        SRV->>DB: notification.count { isRead: false } → unreadCount
        SRV-->>UA: { type: "connection-request-sent", toUserId: B }
        SRV-->>UB: { type: "newNotification", notification{}, unreadCount }
        SRV-->>UB: { type: "connection-request-received", fromUserId: A }
    end

    rect rgb(60, 20, 20)
        Note over UA,UB: PHASE 3 — Accept / Reject
        UB->>SRV: { type: "connection-response", fromUserId: A, response: "accepted" }
        SRV->>DB: connections.update { status: "accepted" }
        SRV->>DB: notification.create { type: "connection_accepted" }
        SRV->>DB: notification.updateMany — mark original request as read
        SRV-->>UA: { type: "newNotification", unreadCount }
        SRV-->>UA: { type: "connection-established", withUserId: B }
        SRV-->>UB: { type: "connection-response-confirmed", response: "accepted" }
        SRV-->>UB: { type: "connection-established", withUserId: A }
    end

    rect rgb(20, 50, 50)
        Note over UA,UB: PHASE 4 — Messaging (only after accepted connection)
        UA->>SRV: { type: "typing", to: B }
        SRV-->>UB: { type: "typing", from: A }

        UA->>SRV: { type: "message", content: "Hello", receiverId: B }
        SRV->>DB: connections.findFirst — verify accepted connection
        SRV->>DB: message.create { senderId: A, receiverId: B }
        SRV->>DB: message.count { read: false } → unreadCount
        SRV-->>UB: { type: "newMessage", from: A, content, unreadCount }

        UA->>SRV: { type: "stop_typing", to: B }
        SRV-->>UB: { type: "stop_typing", from: A }
    end

    rect rgb(50, 40, 10)
        Note over UA,UB: PHASE 5 — Read Receipts
        UB->>SRV: { type: "markRead", withUserId: A }
        SRV->>DB: message.updateMany { read: true, readAt: now() }
        SRV-->>UA: { type: "messageRead", from: B }
    end

    rect rgb(40, 10, 40)
        Note over UA,UB: PHASE 6 — Disconnect (with grace period)
        UA->>SRV: [socket close]
        SRV->>SRV: delete clients[A]
        Note over SRV: setTimeout 2000ms — grace period
        SRV->>SRV: onlineUsers.delete(A)
        SRV-->>UB: { type: "userStatus", userId: A, isOnline: false }
    end
```

---

## 🤖 AI Chatbot Flow

```mermaid
flowchart LR
    A([User sends message]) -->|POST /chatbot| B[Node.js Express Proxy]

    B -->|axios POST localhost:5001/chat| C[Flask Server Port 5001]

    C --> D{session_id in session_chains?}

    D -->|No - first message| E[Create new LLMChain + ConversationBufferMemory]
    D -->|Yes - returning user| F[Load existing ConversationBufferMemory with history]

    E --> G[LLMChain.run - PromptTemplate fills history and input]
    F --> G

    G -->|API call| H[Google Gemini - ChatGoogleGenerativeAI]
    H -->|AI response text| G
    G -->|Save to memory| I[(session_chains - in-memory dict)]

    G -->|response string| C
    C -->|response JSON| B
    B -->|response JSON| A

    style H fill:#4285F4,color:#fff
    style C fill:#1a1a00,color:#FFD700
    style I fill:#2a0a0a,color:#FFB6C1
```

**Chatbot key behaviour:**
- Each `session_id` gets its own `ConversationBufferMemory` — Gemini remembers the full conversation history within a session
- Custom `PromptTemplate` gives the AI its persona: **"LangBot, a helpful AI assistant"**
- Sessions live in an **in-memory Python dict** (`session_chains`) — restarting the Flask server clears all session histories
- Node.js proxies the request, keeping the Gemini API key fully server-side (never exposed to the browser)

---

## ✨ Features

### 🔐 Auth System (Cookie-Based JWT)
- **Signup / Signin / Logout** via REST — passwords hashed with **bcryptjs (10 salt rounds)**
- JWT issued on login, stored in an **`httpOnly`, `SameSite: lax` cookie** — inaccessible to JavaScript, immune to XSS
- `authMiddleware` verifies the cookie and sets `req.userId` for every protected route
- Password change flow requires submitting `currentPassword` for verification before accepting a new hash
- Prisma `P2002` unique constraint violations are caught and returned as human-readable conflict errors

### 🤝 LinkedIn-Style Connection System
- Users **cannot message strangers** — a connection request must be sent and accepted first
- Connection state machine: `pending` → `accepted` | `rejected`
- Composite unique constraint `@@unique([requesterId, addresseeId])` prevents duplicate requests at the DB level
- Every state change triggers a **real-time WebSocket notification** to the target user with live unread count

### 💬 Direct & Public Messaging
- **Direct messages** — delivered exclusively to the target user's active WebSocket socket
- **Public messages** — `receiverId: null` in DB, broadcast to all connected clients
- Message delivery blocked at the server if no accepted connection exists (checked before every `message.create`)
- Real-time **unread message count** computed and sent with each new message delivery

### ✅ Read Receipts
- Client emits `markRead` when a conversation is opened
- Server updates `read: true` and `readAt: new Date()` via `message.updateMany`
- **Sender receives `messageRead` event** in real-time — enables double-tick UX

### 🟢 Live Presence Tracking
- `clients{}` object maps `userId → WebSocket` — O(1) targeted delivery
- `onlineUsers` Set tracks who is online
- On connect: broadcasts `userStatus: online` + sends `initialOnlineUsers[]` to the new socket
- On disconnect: **2-second grace period** via `setTimeout` before broadcasting offline — prevents false offline on brief reconnects

### ⌨️ Typing Indicators
- `typing` and `stop_typing` events forwarded directly to target socket
- Zero DB writes — pure in-memory event relay

### 🔔 Persistent Notification Engine
- `Notification` table with typed enum: `connection_request` | `connection_accepted` | `connection_rejected`
- Real-time delivery via WebSocket with live `unreadCount` update
- REST endpoints to fetch all notifications, get unread count, mark as read, and respond to requests
- On connection response, the **original request notification is auto-marked as read**

### 👤 Rich User Profiles
- Editable fields: `name`, `username`, `description`, `location`, `profilePhoto`
- Profile photo stored as URL string in DB
- Username uniqueness enforced at DB + friendly error returned to client

### 🤖 LangChain + Gemini AI Chatbot
- Per-session conversation memory via **`ConversationBufferMemory`** — each `session_id` maintains its own history
- Powered by **Google Gemini** (`ChatGoogleGenerativeAI`) through LangChain's `LLMChain`
- Custom **PromptTemplate** defines AI persona, history placeholder, and user input
- Node.js proxies all chatbot requests — **Gemini API key stays server-side**, never exposed to the browser

---

## 📁 Project Structure

```
Chat-Application/
│
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Models: User, Message, Connections, Notification
│   │                              # Enums: NotificationType, ResponseStatus
│   │                              # Provider: PostgreSQL
│   │
│   └── server.js                  # Single-file unified server
│       ├── Express setup          # CORS, JSON, cookie-parser
│       ├── authMiddleware         # JWT cookie → req.userId
│       ├── REST Routes (20+)      # Auth, users, messages, notifications, connections
│       ├── WebSocketServer (ws)   # All real-time event handlers
│       ├── clients{}              # userId → WebSocket map
│       ├── onlineUsers (Set)      # Presence tracking
│       └── Helpers                # broadcastUserStatus, sendCurrentOnlineUsers
│
├── chatbot/
│   └── chatbot.py                 # Flask AI microservice (port 5001)
│       ├── Flask /chat route      # Accepts { message, session_id }
│       ├── LangChain LLMChain     # Chains prompt + memory + LLM
│       ├── ConversationBufferMemory  # Per-session history dict
│       └── ChatGoogleGenerativeAI # Google Gemini integration
│
├── frontend/
│   └── frontend-project/          # React + Tailwind CSS
│       ├── src/
│       │   ├── components/        # ChatWindow, MessageBubble, RoomList,
│       │   │                      # TypingBadge, NotificationBell, UserCard
│       │   ├── context/           # WebSocket context (global WS instance)
│       │   ├── pages/             # Login, Signup, Chat, Profile, Connections
│       │   └── App.js
│       ├── tailwind.config.js
│       └── public/
│
└── README.md
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/chatdb
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

### Python Chatbot (`chatbot/.env`)

```env
GOOGLE_API_KEY=your_google_gemini_api_key
GOOGLE_MODEL=gemini-pro
```

---

## 🚀 Getting Started

### 1. Database Setup

```bash
cd backend
npm install

# Configure .env with DATABASE_URL and JWT_SECRET
npx prisma migrate dev --name init
npx prisma generate
```

### 2. Start Node.js Server

```bash
# From backend/
node server.js
# Runs Express REST API + WebSocket server on http://localhost:3000
```

### 3. Start Python Chatbot Service

```bash
cd chatbot
pip install flask flask-cors langchain langchain-google-genai python-dotenv

# Configure .env with GOOGLE_API_KEY and GOOGLE_MODEL
python chatbot.py
# Runs on http://localhost:5001
```

### 4. Start Frontend

```bash
cd frontend/frontend-project
npm install
npm start
# Runs on http://localhost:5173 (Vite) or http://localhost:3001 (CRA)
```

---

## 📡 Complete API Reference

### Auth

| Method | Endpoint | Body / Params | Auth | Description |
|--------|----------|--------------|:----:|-------------|
| `POST` | `/api/signup` | `{ username, password }` | ❌ | Register, sets JWT cookie |
| `POST` | `/api/signin` | `{ username, password }` | ❌ | Login, sets JWT cookie |
| `POST` | `/api/logout` | — | ❌ | Clears JWT cookie |
| `GET` | `/api/me` | — | ✅ | Get own profile |
| `PUT` | `/user/:id` | `{ name, username, description, location, profilePhoto, password, currentPassword }` | ✅ | Update profile / change password |
| `DELETE` | `/api/delete-user/:userId` | — | ❌ | Delete user + cascade messages, connections, notifications |

### Users & Connections

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/api/users` | ✅ | All users except self |
| `GET` | `/user/:userid` | ❌ | Public profile by ID |
| `GET` | `/connected` | Cookie | All accepted connections (deduped) |

### Messages

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/api/messages/:withUserId` | ✅ | DM history with a user (ordered asc) |
| `GET` | `/api/public-messages` | ✅ | All public messages (receiverId = null) |
| `GET` | `/api/chat-users` | ✅ | Recent chats: user + lastMessage + unreadCount |
| `GET` | `/unread-senders` | ✅ | Count + IDs of senders with unread messages |
| `POST` | `/messages/mark-read/:senderId` | ✅ | Mark all messages from sender as read |
| `DELETE` | `/api/delete-chats?userAId=&userBId=` | ❌ | Delete all messages between two users |

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/api/notifications` | Cookie | All notifications (ordered desc) |
| `GET` | `/api/notifications/unreadCount` | ✅ | Count of unread notifications |
| `POST` | `/api/notifications/read` | ❌ | Mark single notification as read |
| `POST` | `/api/notifications/respond` | Cookie | Set `responseStatus`: `accepted` / `rejected` |

### AI Chatbot

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/chatbot` | `{ message, session_id }` | Proxy to Python Flask AI service |

---

## 📡 WebSocket Events Reference

### Client → Server

| `type` | Key Fields | Description |
|--------|-----------|-------------|
| `auth` | `userId` | Authenticate socket — must be first message sent |
| `message` | `content`, `receiverId` | DM (receiverId set) or public broadcast (receiverId omitted) |
| `markRead` | `withUserId` | Mark all messages from this user as read |
| `connection_request` | `targetUserId` | Send a connection request |
| `connection-response` | `fromUserId`, `response` | `"accepted"` or `"rejected"` |
| `typing` | `to` | Notify target user you are composing |
| `stop_typing` | `to` | Notify target user you stopped composing |

### Server → Client

| `type` | Key Fields | Description |
|--------|-----------|-------------|
| `initialOnlineUsers` | `onlineUsers[]` | Snapshot of all online users on connect |
| `userStatus` | `userId`, `isOnline` | Presence change broadcast to all |
| `newMessage` | `from`, `content`, `timestamp`, `unreadCount` | Incoming DM with live unread count |
| `messageRead` | `from` | Target user opened your conversation |
| `newNotification` | `notification{}`, `unreadCount` | New notification with badge count |
| `connection-request-received` | `fromUserId` | Incoming connection request |
| `connection-request-sent` | `toUserId` | Confirms request was stored + sent |
| `connection-response-confirmed` | `toUserId`, `response` | Confirms accept/reject processed |
| `connection-established` | `withUserId` | Both users notified — chat is now unlocked |
| `error` | `message` | Server-side validation or runtime error |

---

## 🧠 Key Design Decisions

| Decision | Rationale |
|---|---|
| **Native `ws` over Socket.io** | Zero abstraction overhead; explicit control over every frame, event, and room |
| **Single unified Node.js server** | Express HTTP and WebSocket share one `http.Server` — no CORS issues, simpler deployment |
| **JWT in `httpOnly` cookies** | Tokens unreachable by JavaScript — eliminates XSS-based token theft entirely |
| **WS auth via `auth` message event** | Browser's native `WebSocket` API doesn't support custom headers; auth-on-open is the correct pattern |
| **Connection gate before messaging** | Verified via `connections.findFirst` on every `message` event — prevents spam at the protocol level |
| **2-second offline grace period** | `setTimeout(2000)` before broadcasting `offline` — handles mobile/flaky reconnects gracefully |
| **`receiverId: null` for public messages** | Single `Message` model handles both DM and broadcast — no separate table needed |
| **Python microservice for AI** | Keeps Python's AI ecosystem (LangChain, Gemini) decoupled from Node.js; independently scalable |
| **`ConversationBufferMemory` per session** | Each `session_id` maintains its own history dict — Gemini gets full conversation context every call |
| **Gemini API key proxy via Node.js** | API key lives only on the server — the browser never sees it, even in network requests |
| **Prisma over raw SQL** | Schema-as-code, type-safe queries, auto-generated client, and reproducible migrations |

---

## 🤝 Contributing

Pull requests are welcome. Please open an issue first to discuss major changes.

---

## 👨‍💻 Author

**Ayush Garg**
- GitHub: [@ayushgarg2005](https://github.com/ayushgarg2005)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
