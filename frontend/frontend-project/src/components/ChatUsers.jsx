import React, { useEffect, useState } from "react";
import axios from "axios";
import { useWebSocket } from "../contexts/WebSocketContext";
import { MessageSquareText, Clock, Search, Sparkles } from "lucide-react";
import Navbar from "./Navbar";
import Avatar from "./Avatar";
import { useNavigate } from "react-router-dom";

const ChatUsers = () => {
  const [chatUsers, setChatUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { socket, onlineUsers } = useWebSocket();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchChatUsers = async () => {
      try {
        const res = await axios.get("/api/chat-users", {
          withCredentials: true,
        });
        setChatUsers(res.data || []);
      } catch (err) {
        console.error("Failed to fetch chat users:", err);
        setError("Failed to load your conversations.");
      } finally {
        setLoading(false);
      }
    };
    fetchChatUsers();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "newMessage" || data.type === "message") {
          const senderId = data.from || data.senderId;
          setChatUsers((prev) => {
            const updated = [...prev];
            const index = updated.findIndex((item) => item.user?.id === senderId);

            if (index !== -1) {
              const existing = updated[index];
              updated.splice(index, 1);
              updated.unshift({
                ...existing,
                lastMessage: data.content,
                lastMessageAt: data.timestamp || data.createdAt || new Date(),
                unreadCount:
                  data.hasOwnProperty("unreadCount")
                    ? data.unreadCount
                    : (existing.unreadCount || 0) + 1,
              });
            } else {
              updated.unshift({
                user: { id: senderId, username: "New Message" },
                lastMessage: data.content,
                lastMessageAt: data.timestamp || data.createdAt || new Date(),
                unreadCount: 1,
              });
            }

            return updated;
          });
        }
      } catch (err) {
        console.error("Error parsing chat user update:", err);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket]);

  const filteredUsers = chatUsers.filter(({ user }) =>
    (user?.name || user?.username || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="max-w-3xl w-full mx-auto px-4 py-10 flex-1">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 rounded-3xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/20 mb-3 tracking-wide uppercase text-indigo-100">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Active Chats
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Messages
            </h1>
            <p className="text-indigo-100 text-sm mt-1">
              Stay connected and keep the conversation flowing.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 mb-6">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search conversations by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-medium text-slate-500">Loading conversations...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-600 font-semibold shadow-sm">
            {error}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto my-6 shadow-sm">
            <MessageSquareText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No messages yet</h3>
            <p className="text-sm text-slate-500">
              {searchQuery ? `No chats match "${searchQuery}".` : "Start chatting with your connected friends from the Friends tab!"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map(({ user, lastMessage, lastMessageAt, unreadCount }) => (
              <div
                key={user.id}
                onClick={() => navigate(`/chat/${user.id}`)}
                className={`flex items-center p-4 rounded-2xl border transition-all duration-200 cursor-pointer group ${
                  unreadCount > 0
                    ? "bg-indigo-50/50 border-indigo-200/80 shadow-md"
                    : "bg-white border-slate-200/80 hover:border-indigo-500/30 hover:shadow-md"
                }`}
              >
                <Avatar
                  user={user}
                  isOnline={!!onlineUsers[user.id]}
                  size="md"
                  className="mr-4 shrink-0 group-hover:scale-105 transition-transform duration-200"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-base text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                      {user.name || user.username}
                    </h3>
                    {lastMessageAt && (
                      <span className="text-xs font-medium text-slate-400 flex items-center gap-1 shrink-0 ml-2">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(lastMessageAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm truncate ${
                      unreadCount > 0 ? "font-semibold text-slate-800" : "text-slate-500"
                    }`}
                  >
                    {lastMessage || <span className="italic text-slate-400">No messages yet</span>}
                  </p>
                </div>

                {unreadCount > 0 && (
                  <div
                    className="ml-4 bg-gradient-to-r from-rose-500 to-red-600 text-white text-xs font-bold rounded-full min-w-[24px] h-6 px-2 flex items-center justify-center shadow-md animate-pulse shrink-0"
                    title={`${unreadCount} unread`}
                  >
                    {unreadCount}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ChatUsers;
