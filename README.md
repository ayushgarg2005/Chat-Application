# 💬 Real-Time Chat Application

A full-stack, real-time social networking platform where users can discover friends, send connection requests, chat privately, and interact with an AI assistant.

## ✨ Features

- **Real-Time Messaging**: Instant private messaging using WebSockets.
- **Connection System**: Discover users and send/accept friend requests.
- **Live Notifications**: Get instant updates for messages and friend requests.
- **AI Chatbot (LangBot)**: A persistent AI assistant powered by Google Gemini and LangChain.
- **User Profiles**: Customizable profiles with avatars and bios.
- **Online Presence**: See who is online in real-time.

## 🛠 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, React Router
- **Backend**: Node.js, Express 5, WebSockets (ws), Prisma ORM
- **Database**: PostgreSQL
- **AI Microservice**: Python, Flask, LangChain, Google Gemini 2.0 Flash

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- Python 3.9+
- PostgreSQL database

### 1. Backend Setup
```bash
cd backend
npm install

# Create .env file with DATABASE_URL, JWT_SECRET, GOOGLE_API_KEY, GOOGLE_MODEL, CLIENT_URL
npx prisma migrate deploy
npx prisma generate
node index.js
```

### 2. AI Chatbot Setup
```bash
cd backend
pip install flask flask-cors langchain langchain-google-genai python-dotenv
python chatbot.py
```

### 3. Frontend Setup
```bash
cd frontend/frontend-project
npm install
npm run dev
```

## 👨‍💻 Author
**Ayush Garg**
GitHub: [@ayushgarg2005](https://github.com/ayushgarg2005)

## 📄 License
This project is open source and available under the MIT License.
