# 💬 Real-Time Chat Application — Full-Stack Social Networking Platform

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://prisma.io)
[![WebSocket](https://img.shields.io/badge/WebSocket-ws-010101?style=for-the-badge)](https://github.com/websockets/ws)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](https://langchain.com)

> A **production-style real-time social chat platform** — users discover each other, send connection requests, chat privately after connecting, receive live notifications, and interact with a persistent-memory AI assistant powered by Google Gemini via LangChain.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Database Schema](#-database-schema)
- [WebSocket Event Map](#-websocket-event-map)
- [Authentication Flow](#-authentication-flow)
- [Connection & Messaging Flow](#-connection--messaging-flow)
- [Features](#-features)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [Key Implementation Details](#-key-implementation-details)
- [Schema Evolution (Migrations)](#-schema-evolution-migrations)
- [⚠️ Mistakes & Issues in the Project](#️-mistakes--issues-in-the-project)

---

## 🔍 Overview

This platform lets users:
- **Discover** all registered users and send connection requests
- **Chat privately** — only accepted connections can message each other
- **Get live notifications** for connection requests, acceptances, and rejections
- **See who's online** in real time via WebSocket presence tracking
- **Edit their profile** (name, bio, location, profile photo, password)
- **Talk to LangBot** — a persistent-memory AI assistant (Google Gemini + LangChain)

The backend is a single-file Express 5 server with an embedded WebSocket server, using PostgreSQL via Prisma ORM. The frontend is a React 19 SPA with four React Context providers managing global state.

---

## 🛠 Tech Stack

### Backend
| Technology | Role |
|---|---|
| **Node.js + Express 5** | HTTP REST API server |
| **ws (WebSocket)** | Real-time bidirectional communication (shared port with Express) |
| **PostgreSQL** | Relational database (hosted on Aiven Cloud) |
| **Prisma ORM** | Type-safe DB client + migrations |
| **bcryptjs** | Password hashing (salt rounds: 10) |
| **JWT + cookie-parser** | Auth via `httpOnly` cookies |
| **dotenv** | Environment variable management |

### Frontend
| Technology | Role |
|---|---|
| **React 19** | UI with hooks and Context API |
| **Vite** | Build tool & dev server |
| **React Router v7** | Client-side routing |
| **Axios** | HTTP client (`withCredentials: true` for cookies) |
| **Tailwind CSS** | Utility-first styling |
| **Framer Motion** | Animations |
| **Heroicons + Lucide + React Icons** | Icon libraries |
| **React Toastify** | Toast notifications |

### AI Chatbot
| Technology | Role |
|---|---|
| **Python + Flask** | Chatbot microservice on port 5001 |
| **LangChain** | LLM chaining and memory management |
| **Google Gemini 2.0 Flash** | Underlying LLM |
| **ConversationBufferMemory** | Per-session chat history |
| **flask-cors** | CORS for chatbot microservice |

---

## 🗺 System Architecture

```mermaid
graph TB
    subgraph Browser["🌐 Browser (React 19 SPA)"]
        direction TB
        WSCX["WebSocketContext\n(global WS connection)"]
        UCX["UserContext\n(auth state)"]
        NCX["NotificationContext\n(unread badge count)"]
        UMCX["UnreadMessagesContext\n(per-sender unread count)"]

        HP[Homepage\nDiscover Users]
        CP[ChatPage\nDM Interface]
        CU[ChatUsers\nInbox List]
        CO[ConnectedUsers\nFriends List]
        NP[Notifications]
        PP[ProfilePage\nEdit Profile]
        UP[UserProfile\nPublic View]
        CB[Chatbot\nLangBot UI]
    end

    subgraph Backend["⚙️ Node.js Backend (Port 3000)"]
        direction TB
        MW["authMiddleware\n(JWT from httpOnly cookie)"]
        REST["REST API Routes\n(Express 5)"]
        WSS["WebSocket Server\n(ws — same port)"]
        CM["clients Map\n{ userId → WebSocket }"]
        OU["onlineUsers Set"]
    end

    subgraph DB["🗄️ PostgreSQL (Aiven Cloud)"]
        U["User"]
        M["Message"]
        C["Connections"]
        N["Notification"]
    end

    subgraph AI["🤖 Python Chatbot (Port 5001)"]
        FL["Flask Server"]
        LC["LangChain LLMChain"]
        GM["Google Gemini 2.0 Flash"]
        MEM["ConversationBufferMemory\n(per session_id)"]
    end

    Browser -->|"HTTP REST\nwithCredentials: true\nCookie: token=..."| REST
    Browser -->|"WebSocket\nws://localhost:3000"| WSS
    CB -->|"HTTP POST /chat\nPython directly"| FL
    REST --> MW
    MW -->|"req.userId"| REST
    REST -->|"Prisma ORM"| DB
    WSS --> CM
    WSS --> OU
    WSS -->|"Prisma ORM"| DB
    FL --> LC --> GM
    LC --> MEM

    style Browser fill:#dbeafe,stroke:#3b82f6
    style Backend fill:#dcfce7,stroke:#16a34a
    style DB fill:#fef9c3,stroke:#ca8a04
    style AI fill:#f3e8ff,stroke:#9333ea
```

---

## 🗃 Database Schema

```mermaid
erDiagram
    User {
        Int     id          PK
        String  username    UK
        String  email       UK "optional"
        String  password
        String  name        "default empty"
        String  description "default empty"
        String  profilePhoto "default empty"
        String  location    "default empty"
        DateTime createdAt
    }

    Message {
        Int      id         PK
        String   content
        Int      senderId   FK
        Int      receiverId FK "nullable = public broadcast"
        Boolean  read       "default false"
        DateTime readAt     "nullable"
        DateTime createdAt
    }

    Connections {
        Int      id           PK
        Int      requesterId  FK
        Int      addresseeId  FK
        String   status       "pending | accepted | rejected"
        DateTime createdAt
        UNIQUE   requesterId_addresseeId
    }

    Notification {
        Int              id             PK
        Int              userId         FK  "recipient"
        Int              fromUserId     FK  "sender, nullable"
        NotificationType type           "message | connection_request | connection_accepted | connection_rejected"
        String           content
        Boolean          isRead         "default false"
        ResponseStatus   responseStatus "accepted | rejected, nullable"
        DateTime         createdAt
    }

    User ||--o{ Message    : "sends (messagesSent)"
    User ||--o{ Message    : "receives (messagesReceived)"
    User ||--o{ Connections : "requesterId"
    User ||--o{ Connections : "addresseeId"
    User ||--o{ Notification : "receives (userId)"
    User ||--o{ Notification : "triggers (fromUserId)"
```

---

## 🔌 WebSocket Event Map

```mermaid
sequenceDiagram
    participant C as Client (Browser)
    participant S as WS Server
    participant DB as PostgreSQL

    Note over C,S: ── CONNECTION & AUTH ──
    C->>S: { type: "auth", userId }
    S->>C: { type: "initialOnlineUsers", onlineUsers: [...] }
    S-->>All: { type: "userStatus", userId, isOnline: true }

    Note over C,S: ── SEND PRIVATE MESSAGE ──
    C->>S: { type: "message", content, receiverId }
    S->>DB: connections.findFirst (check accepted)
    S->>DB: message.create
    S->>C: { type: "newMessage", from, content, timestamp, unreadCount }

    Note over C,S: ── MARK MESSAGES READ ──
    C->>S: { type: "markRead", withUserId }
    S->>DB: message.updateMany (read=true, readAt=now)
    S->>C: { type: "messageRead", from: userId }

    Note over C,S: ── TYPING INDICATOR ──
    C->>S: { type: "typing", to: userId }
    S->>C: { type: "typing", from: userId }

    Note over C,S: ── CONNECTION REQUEST ──
    C->>S: { type: "connection_request", targetUserId }
    S->>DB: connections.create (status: "pending")
    S->>DB: notification.create (type: connection_request)
    S->>TargetClient: { type: "newNotification", notification, unreadCount }
    S->>TargetClient: { type: "connection-request-received", fromUserId }
    S->>C: { type: "connection-request-sent", toUserId }

    Note over C,S: ── CONNECTION RESPONSE ──
    C->>S: { type: "connection-response", fromUserId, response: "accepted|rejected" }
    S->>DB: connections.update (status: response)
    S->>DB: notification.create (connection_accepted|rejected for requester)
    S->>RequesterClient: { type: "newNotification", notification, unreadCount }
    S->>C: { type: "connection-response-confirmed", toUserId, response }
    S->>C: { type: "connection-established", withUserId }
    S->>RequesterClient: { type: "connection-established", withUserId }

    Note over C,S: ── DISCONNECT ──
    C-XS: connection closed
    Note over S: 2s delay, then:
    S-->>All: { type: "userStatus", userId, isOnline: false }
```

---

## 🔐 Authentication Flow

```mermaid
flowchart TD
    A([User submits credentials]) --> B{Endpoint}

    B -->|POST /api/signup| C[Validate username + password present]
    C --> D[Check username uniqueness in DB]
    D -->|Already exists| E[400 Username taken]
    D -->|Unique| F[bcrypt.hash password salt=10]
    F --> G[prisma.user.create]
    G --> H[jwt.sign userId expires 7d]
    H --> I[res.cookie token httpOnly sameSite=lax]
    I --> J[201 Return public user object]

    B -->|POST /api/signin| K[prisma.user.findUnique by username]
    K -->|Not found| L[401 Invalid credentials]
    K -->|Found| M[bcrypt.compare password]
    M -->|No match| L
    M -->|Match| N[jwt.sign userId expires 7d]
    N --> O[res.cookie token httpOnly]
    O --> P[200 Return user]

    B -->|GET /api/me| Q[authMiddleware]
    Q --> R{Cookie present?}
    R -->|No| S[401 Unauthorized]
    R -->|Yes| T[jwt.verify token]
    T -->|Invalid| U[401 Invalid token]
    T -->|Valid| V[req.userId = decoded.userId]
    V --> W[prisma.user.findUnique select safe fields]
    W --> X[200 Return user profile]

    B -->|POST /api/logout| Y[res.clearCookie token]
    Y --> Z[200 Logged out]

    style E fill:#fee2e2,stroke:#ef4444
    style L fill:#fee2e2,stroke:#ef4444
    style S fill:#fee2e2,stroke:#ef4444
    style U fill:#fee2e2,stroke:#ef4444
    style J fill:#dcfce7,stroke:#16a34a
    style P fill:#dcfce7,stroke:#16a34a
    style X fill:#dcfce7,stroke:#16a34a
    style Z fill:#dcfce7,stroke:#16a34a
```

---

## 🔗 Connection & Messaging Flow

```mermaid
flowchart LR
    subgraph Discovery["👥 Homepage — Discover Users"]
        A[User A sees User B card]
        A --> B[Click Send Request]
        B -->|WebSocket: connection_request| C[Server creates Connections pending]
        C -->|WebSocket: newNotification| D[User B sees bell badge]
    end

    subgraph Notification["🔔 Notifications Page"]
        D --> E[User B opens notifications]
        E --> F{Accept or Reject?}
        F -->|Accept| G[WebSocket: connection-response accepted]
        F -->|Reject| H[WebSocket: connection-response rejected]
        G --> I[DB: Connections.status = accepted]
        G --> J[Both users get connection-established event]
    end

    subgraph Chat["💬 Chat — Connected Users Only"]
        J --> K[User A visits /friends, sees User B]
        K --> L[Navigate to /chat/userId]
        L --> M[Fetch message history via REST]
        M --> N[Send message via WebSocket]
        N -->|Server checks connection status| O{Accepted connection?}
        O -->|No| P[Error: not connected]
        O -->|Yes| Q[DB: message.create]
        Q --> R[Real-time delivery to receiver]
        R --> S[Unread count badge updated]
    end

    style P fill:#fee2e2,stroke:#ef4444
    style Q fill:#dcfce7,stroke:#16a34a
```

---

## ✨ Features

### 👤 Authentication
- **Username + password** signup with bcrypt hashing (salt rounds: 10)
- JWT stored in **`httpOnly` cookie** — not accessible to JavaScript, resistant to XSS
- Cookie attributes: `sameSite: lax`, `secure` in production
- 7-day token expiry
- Clean logout via `clearCookie`

### 🌐 Real-Time WebSocket Features
- **Online presence** — users appear as online/offline across all views
- **Real-time messaging** — delivered instantly without polling
- **Typing indicators** — "Typing..." shown to recipient in real time
- **Live notifications** — bell badge updates without page refresh
- **Read receipts** — sender notified when messages are read
- **2-second offline grace period** — brief disconnects don't immediately mark user offline

### 🤝 Connection System (Friend Requests)
- Send connection requests from the homepage user grid
- Accept / reject via Notifications page
- Only **accepted connections** can exchange private messages (enforced server-side)
- Duplicate request prevention checked in DB

### 💬 Messaging
- **Private DMs** — one-on-one between connected users
- **Public broadcast** — messages with `receiverId: null` sent to all clients
- Message history fetched via REST on conversation open
- Unread count per sender shown on ChatUsers inbox list
- Mark-all-read when opening a conversation (REST + WebSocket signal)

### 🔔 Notifications
- Types: `connection_request`, `connection_accepted`, `connection_rejected`, `message`
- Unread badge on Navbar bell icon
- **Smart read marking on navigate away** — notifications marked read on unmount (not on refresh/tab close, using `beforeunload` detection)
- NotificationSkeleton loading state

### 👤 User Profiles
- Edit: username, display name, bio, location, profile photo URL
- Password change with **current password verification**
- Prisma unique conflict (`P2002`) gracefully mapped to 409 response
- Public profile view at `/user/:id`

### 🤖 AI Chatbot (LangBot)
- **Google Gemini 2.0 Flash** via LangChain
- **Per-session memory** using `ConversationBufferMemory` keyed by `user-{id}`
- Floating widget rendered globally — accessible on every page
- Flask microservice on port 5001

---

## 📁 Project Structure

```
resume-project-2/
│
├── backend/
│   ├── index.js                    # Express + WebSocket server (single file)
│   │                               # All routes + WS handlers + helper functions
│   ├── chatbot.py                  # Flask AI chatbot microservice (port 5001)
│   ├── prisma/
│   │   ├── schema.prisma           # Data models: User, Message, Connections, Notification
│   │   └── migrations/             # 14 SQL migrations tracking schema evolution
│   │       ├── 20250405044211_init/  # Initial: User + Message tables
│   │       ├── 20250406133714_init/  # Add: Message.readAt
│   │       ├── 20250406150232_init/  # Add: Message.read boolean
│   │       ├── 20250510113942_init/  # Add: Connections table
│   │       ├── 20250512102305_init/  # Add: email, bio, isOnline to User
│   │       ├── 20250513141100_init/  # Add: Notification table
│   │       ├── 20250716064244_init/  # Drop: ChatSession & ChatMessage tables
│   │       └── ...                 # Other incremental migrations
│   ├── .env                        # DATABASE_URL, JWT_SECRET, GOOGLE_API_KEY
│   └── package.json
│
└── frontend/
    └── frontend-project/
        ├── src/
        │   ├── App.jsx             # Route definitions + context provider wrappers
        │   ├── main.jsx            # React DOM root
        │   ├── contexts/
        │   │   ├── WebSocketContext.jsx      # WS connection lifecycle, online users, sendMessage
        │   │   ├── UserContext.jsx           # Global auth state from /api/me
        │   │   ├── NotificationContext.jsx   # Unread notification count badge
        │   │   └── UnreadMessagesContext.jsx # Per-sender unread message counts
        │   └── components/
        │       ├── Navbar.jsx           # Responsive nav with real-time badges
        │       ├── Homepage.jsx         # User discovery grid + send requests
        │       ├── ChatPage.jsx         # Private DM view with typing indicators
        │       ├── ChatUsers.jsx        # Inbox: list of conversations + unread counts
        │       ├── ConnectedUsers.jsx   # Friends list with search + sort
        │       ├── Notifications.jsx    # Notification feed + accept/reject actions
        │       ├── ProfilePage.jsx      # Edit own profile + change password
        │       ├── UserProfile.jsx      # Public view of another user's profile
        │       ├── Chatbot.jsx          # LangBot floating chat widget
        │       ├── UserCard.jsx         # User card with online status dot + request button
        │       ├── Avatar.jsx           # Avatar component with initials fallback
        │       ├── FriendRequestButton.jsx  # Send/sent state button
        │       ├── NotificationSkeleton.jsx # Loading placeholder for notifications
        │       ├── Signin.jsx           # Login form
        │       └── Signup.jsx           # Registration form
        ├── package.json
        ├── vite.config.js
        └── tailwind.config.js
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- PostgreSQL database (local or cloud — Aiven, Supabase, Neon, etc.)
- Python 3.9+ with pip
- Google AI API key (for Gemini)

---

### 1. Backend Setup

```bash
cd backend

# Install Node dependencies
npm install

# Create .env file
cat > .env << 'EOF'
DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"
JWT_SECRET=use_a_long_random_secret_here_minimum_32_chars
GOOGLE_API_KEY=your_google_generative_ai_key
GOOGLE_MODEL=gemini-2.0-flash
CLIENT_URL=http://localhost:5173
EOF

# Run Prisma migrations (creates all tables)
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Start the backend
node index.js
```

The server runs on `http://localhost:3000` and WebSocket on `ws://localhost:3000`.

---

### 2. AI Chatbot Setup

```bash
cd backend

# Install Python dependencies
pip install flask flask-cors langchain langchain-google-genai python-dotenv

# Start the chatbot microservice
python chatbot.py
```

The chatbot runs on `http://localhost:5001`.

---

### 3. Frontend Setup

```bash
cd frontend/frontend-project

# Install dependencies
npm install

# Start the Vite dev server
npm run dev
```

Frontend runs at `http://localhost:5173`.

---

## 📡 API Reference

### 🔐 Auth Routes
| Method | Endpoint | Body | Auth | Description |
|--------|----------|------|:----:|-------------|
| `POST` | `/api/signup` | `{ username, password }` | ❌ | Register new user |
| `POST` | `/api/signin` | `{ username, password }` | ❌ | Login, sets cookie |
| `POST` | `/api/logout` | — | ❌ | Clear auth cookie |
| `GET`  | `/api/me` | — | ✅ | Get current user |
| `PUT`  | `/user/:id` | Profile fields + optional password | ✅ | Update profile |

### 💬 Messaging
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/api/messages/:withUserId` | ✅ | Get DM history with user |
| `GET` | `/api/public-messages` | ✅ | Get all public broadcast messages |
| `POST` | `/messages/mark-read/:senderId` | ✅ | Mark all messages from sender as read |
| `GET` | `/unread-senders` | ✅ | List sender IDs with unread messages |
| `GET` | `/api/chat-users` | ✅ | Get inbox list with last message + unread counts |

### 👥 Users & Connections
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/api/users` | ✅ | All users except self |
| `GET` | `/user/:userid` | ❌ | Public profile by ID |
| `GET` | `/connected` | ❌* | Accepted connections list |

### 🔔 Notifications
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `GET` | `/api/notifications` | ❌* | All notifications for current user |
| `GET` | `/api/notifications/unreadCount` | ✅ | Unread notification count |
| `POST` | `/api/notifications/read` | ❌ | Mark notification as read |
| `POST` | `/api/notifications/respond` | ❌* | Respond to connection request notification |

### 🛠 Admin / Debug
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `DELETE` | `/api/delete-user/:userId` | ❌ | Delete user + all data |
| `DELETE` | `/api/delete-chats` | ❌ | Delete messages between two users |

> `❌*` = manually verifies JWT cookie inline instead of using `authMiddleware`

---

## 🧠 Key Implementation Details

### 1. WebSocket Multiplexed on HTTP Port
The WebSocket server (`ws` library) is attached to the Express `http.Server` instance directly — both HTTP and WS traffic share port 3000. No separate WebSocket port is needed.

```js
const server = app.listen(3000, ...);
const wss = new WebSocketServer({ server }); // shares same port
```

### 2. In-Memory Client Registry
Connected WebSocket clients are stored in a plain object `clients = {}` keyed by `userId`. This enables O(1) direct message delivery to a specific user without broadcasting to all.

```js
const clients = {};      // { userId: WebSocket }
const onlineUsers = new Set();
```

### 3. Connection Guard on Message Send
Before persisting any DM, the WS handler checks the `Connections` table for an accepted connection between sender and receiver. Messages between non-connected users are rejected server-side.

### 4. Graceful Offline Detection
When a WebSocket closes, the server waits **2 seconds** before marking the user offline. If the user reconnects within that window (e.g. page refresh), they're never announced as offline — cleaner UX.

### 5. Per-Session LangChain Memory
The Flask chatbot uses a `session_chains` dictionary keyed by `user-{id}`. Each session gets its own `ConversationBufferMemory`, so LangBot remembers the conversation across multiple messages within the same browser session.

### 6. Smart Notification Read-on-Leave
`Notifications.jsx` uses a `useRef` + `beforeunload` trick to distinguish **page navigation** (mark as read) from **page refresh / tab close** (don't mark as read). This prevents the badge from incorrectly resetting on refresh.

### 7. Prisma Schema Migrations
The project has **14 migration files** showing the full schema evolution — from a simple User+Message MVP, through adding Connections, Notifications, profile fields, and finally dropping the ChatSession tables when the AI chatbot was reimplemented as a standalone Flask service.

---

## 📈 Schema Evolution (Migrations)

```mermaid
timeline
    title Database Schema Evolution
    April 5 2025  : User table (id, username, password)
                  : Message table (content, senderId, receiverId)
    April 6 2025  : Add Message.readAt
                  : Add Message.read boolean
    May 10 2025   : Add Connections table (requesterId, addresseeId, status)
    May 12 2025   : Add email, bio, isOnline, lastSeen to User
                  : Add ConnectionStatus enum attempt
    May 13 2025   : Add Notification table
                  : Add NotificationType enum
    May 16 2025   : Add profilePhoto, location, name, description to User
    May 25 2025   : ResponseStatus enum for Notification
    May 28 2025   : Schema cleanup and consolidation
    July 16 2025  : Drop ChatSession + ChatMessage tables
                  : AI chat migrated to Flask microservice
```

---

## ⚠️ Mistakes & Issues in the Project

These are real bugs and design problems found by reading every file in the codebase. Each one is a talking point for interviews — showing you understand them is more impressive than not having made them.

---

### 🔴 Critical Bugs (Will Break at Runtime)

**1. `axios` used but never imported in `backend/index.js`**

The `/chatbot` REST route calls `axios.post(...)` to forward to the Python service, but `axios` is never imported. This throws a `ReferenceError: axios is not defined` at runtime whenever someone hits `POST /chatbot`.

```js
// ❌ In index.js — no import statement for axios
app.post("/chatbot", async (req, res) => {
  const response = await axios.post("http://localhost:5001/chat", ...); // ReferenceError!
});
```

**Fix:** Add `import axios from 'axios'` at the top, or replace with Node's native `fetch`.

---

**2. `UserProfile.jsx` — Friend request sent to a non-existent route**

`handleSendRequest` does a `fetch('/friend-request', { method: 'POST' })` — but this route doesn't exist anywhere in the backend. Connection requests are handled exclusively via WebSocket, not REST. This button silently fails with a 404.

```js
// ❌ /friend-request doesn't exist on the backend
await fetch(`/friend-request`, { method: "POST", body: ... });
```

---

**3. `UserProfile.jsx` — "Send Message" navigates to the backend port**

```js
// ❌ Sends user to the API server, not the frontend
window.location.href = `http://localhost:3000/chat/${id}`;
```

Should be `navigate('/chat/${id}')` using React Router, pointing to the frontend route.

---

### 🔴 Security Vulnerabilities

**4. No authentication on destructive admin routes**

`DELETE /api/delete-user/:userId` and `DELETE /api/delete-chats` have **zero authentication**. Any anonymous request can permanently delete any user's account or any conversation by knowing the ID. These routes should use `authMiddleware` and also verify the requester has permission.

**5. Real credentials committed to `.env` in the repository**

The `.env` file contains:
- A live **Aiven PostgreSQL connection string** with plaintext password
- A live **Google API key**
- A weak `JWT_SECRET` (`mySuperSecretKey`)

These should be rotated immediately and never committed to version control. Add `.env` to `.gitignore` and use a `.env.example` template instead.

**6. `CORS` set to `origin: true` with `credentials: true`**

```js
// ❌ Reflects any origin with cookies — dangerous in production
app.use(cors({ origin: true, credentials: true }));
```

This allows any domain to make credentialed requests. Fix by explicitly whitelisting: `origin: process.env.CLIENT_URL`.

**7. `/api/notifications/read` has no authentication**

Anyone who knows a notification ID can mark it as read, even if it belongs to another user. Add `authMiddleware` and verify `notification.userId === req.userId` before updating.

---

### 🟡 Design & Architecture Problems

**8. Inconsistent use of `authMiddleware`**

Multiple routes (`/api/notifications`, `/api/notifications/respond`, `/connected`) manually re-implement JWT verification by reading `req.cookies.token` and calling `jwt.verify()` inline instead of using the shared `authMiddleware`. This is a **DRY violation** — any change to auth logic must be updated in multiple places.

**9. N+1 Query Problem in `getChatUsers`**

For each user in the chat list, two separate DB queries run in a loop:
```js
for (const [userId, user] of chatUserMap.entries()) {
  const lastMsg = await prisma.message.findFirst(...);    // query per user
  const unreadCount = await prisma.message.count(...);   // query per user
}
```
With N chat partners this is 2N+2 queries. Fix with a single aggregation query using `groupBy` + `_count`.

**10. `Connections.status` is a plain `String` instead of an enum**

The Prisma schema defines `status String` in the `Connections` model, but the code writes `"pending"`, `"accepted"`, `"rejected"` as arbitrary strings. There's a `ResponseStatus` enum defined in the schema but it's only used for `Notification`. The `Connections` model should use its own proper enum to get type safety and DB-level constraint enforcement.

**11. Connection request state stored in `localStorage`**

`Homepage.jsx` stores sent request state in `localStorage`:
```js
localStorage.setItem(`sentRequests_user_${me.id}`, JSON.stringify(sentRequests));
```
This state is lost on a different browser/device, gets permanently stale (never cleared after acceptance/rejection), and can diverge from the DB. The source of truth should be fetched from the backend.

**12. No WebSocket reconnection logic**

`WebSocketContext.jsx` creates the WebSocket once and never attempts reconnection. On any network drop or server restart, the user's WS connection silently dies and they stop receiving messages and presence updates. Implement exponential backoff reconnection.

**13. Multiple components independently call `/api/me`**

`Navbar`, `Homepage`, `ChatPage`, `Notifications`, `WebSocketContext`, `Chatbot`, `ProfilePage` — all independently fetch `/api/me`. A `UserContext` exists but is bypassed by most components. This causes 5–7 redundant API calls on every page load.

**14. Notification content uses user ID, not username**

```js
content: `${userId} sent you a connection request.`
// User sees: "3 sent you a connection request." ← confusing
```

Should join the `User` table to get the username for display.

**15. No input validation on any route**

There is no Zod, Joi, or any schema validation on request bodies. Username could be empty (bypassing the client check), passwords have no minimum length enforced server-side, and profile photo URLs are not validated as URLs. Add server-side validation to every POST/PUT route.

**16. No rate limiting**

Auth routes (`/api/signup`, `/api/signin`) have no rate limiting, making them vulnerable to brute-force attacks. Add `express-rate-limit` with a strict limit (e.g. 5 attempts per 15 minutes) for auth endpoints.

**17. `WebSocketContext` exposes a stale `socket` reference**

`socketRef.current` is exposed directly from the context. Since `useRef` doesn't trigger re-renders, child components that destructure `socket` from context may hold a stale `null` reference from before the WebSocket connected. Using `socketConnected` as a state trigger is the right approach, but `socket` itself should be derived from state, not a ref.

---

### 🟢 Minor Issues

**18. `console.log` debug statements left in production code**

`index.js` has multiple `console.log("currentPassword", currentPassword)` statements logging sensitive data in the password update route. These should be removed.

**19. No `start` script in `backend/package.json`**

The backend has no `"start"` script — running `npm start` fails. Add `"start": "node index.js"`.

**20. `UserProfile.jsx` uses `fetch` while everything else uses `axios`**

Inconsistent HTTP clients across the codebase. `UserProfile` uses native `fetch` without `credentials: include`, which means the auth cookie isn't sent for authenticated requests from that component.

---

## 👨‍💻 Author

**Ayush Garg**
- GitHub: [@ayushgarg2005](https://github.com/ayushgarg2005)
- University: Netaji Subhas University of Technology, B.Tech CS & DS (2023–Present)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
