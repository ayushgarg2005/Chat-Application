import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useWebSocket } from "../contexts/WebSocketContext";
import Navbar from "./Navbar";
import Avatar from "./Avatar";
import { Send, ArrowLeft, Sparkles } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useUnreadMessages } from "../contexts/UnreadMessagesContext";

const ChatPage = () => {
  const { id } = useParams();
  const selectedUserId = parseInt(id, 10);
  const { userId, sendMessage, socket, onlineUsers } = useWebSocket();
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [typingStatus, setTypingStatus] = useState("");
  const { setUnreadCounts } = useUnreadMessages();
  const messageEndRef = useRef();
  const navigate = useNavigate();

  // Fetch selected user info
  useEffect(() => {
    if (!selectedUserId) return;
    axios
      .get(`/user/${selectedUserId}`, { withCredentials: true })
      .then((res) => setSelectedUser(res.data))
      .catch((err) => console.error("Failed to fetch user:", err));
  }, [selectedUserId]);

  // Fetch messages and mark read
  useEffect(() => {
    if (!selectedUser) return;

    axios
      .get(`/api/messages/${selectedUser.id}`, { withCredentials: true })
      .then((res) => {
        setMessages(res.data || []);

        axios
          .post(`/api/messages/mark-read/${selectedUser.id}`, {}, { withCredentials: true })
          .then(() => {
            sendMessage({ type: "markRead", withUserId: selectedUser.id });
            setUnreadCounts((prev) => {
              const newCounts = { ...prev };
              delete newCounts[selectedUser.id];
              return newCounts;
            });
          });
      })
      .catch((err) => console.error("Failed to fetch messages:", err));
  }, [selectedUser, sendMessage, setUnreadCounts]);

  // WebSocket message & typing handler
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type === "message" || data.type === "newMessage") {
          const senderId = data.senderId || data.from;

          if (senderId === selectedUser?.id) {
            setMessages((prev) => [
              ...prev,
              {
                senderId: senderId,
                receiverId: userId,
                content: data.content,
                createdAt: data.createdAt || data.timestamp || new Date(),
              },
            ]);
            sendMessage({ type: "markRead", withUserId: senderId });
            setUnreadCounts((prev) => {
              const newCounts = { ...prev };
              delete newCounts[senderId];
              return newCounts;
            });
          } else {
            setUnreadCounts((prev) => ({
              ...prev,
              [senderId]: (prev[senderId] || 0) + 1,
            }));
          }
        }

        if (data.type === "typing" && data.from === selectedUser?.id) {
          setTypingStatus("is typing");
          setTimeout(() => setTypingStatus(""), 2500);
        }
      } catch (err) {
        console.error("Error parsing WebSocket message in chat:", err);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, selectedUser, sendMessage, setUnreadCounts, userId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingStatus]);

  const handleSend = () => {
    if (!newMsg.trim() || !selectedUser) return;

    sendMessage({
      type: "message",
      content: newMsg,
      receiverId: selectedUser.id,
    });

    setMessages((prev) => [
      ...prev,
      {
        senderId: userId,
        receiverId: selectedUser.id,
        content: newMsg,
        createdAt: new Date(),
        sender: { username: "You" },
      },
    ]);

    setNewMsg("");
  };

  const handleTyping = () => {
    if (selectedUser) {
      sendMessage({ type: "typing", to: selectedUser.id });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();

    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";

    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  let lastDate = null;
  const isUserOnline = selectedUserId && onlineUsers[selectedUserId];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />
      
      <div className="flex-1 max-w-5xl w-full mx-auto p-0 sm:p-4 flex flex-col h-[calc(100vh-64px)]">
        <div className="flex-1 bg-white sm:rounded-3xl border-0 sm:border border-slate-200/80 shadow-xl flex flex-col overflow-hidden">
          {/* Header */}
          <header className="px-6 py-4 bg-white/95 backdrop-blur-md border-b border-slate-100 flex items-center justify-between z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/messages")}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors sm:hidden"
                title="Back to messages"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {selectedUser ? (
                <div
                  onClick={() => navigate(`/profile/${selectedUser.id}`)}
                  className="flex items-center gap-3.5 cursor-pointer group"
                >
                  <Avatar user={selectedUser} isOnline={!!isUserOnline} size="sm" />
                  <div>
                    <h2 className="text-base font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                      {selectedUser.name || selectedUser.username}
                    </h2>
                    <p className="text-xs font-medium flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`w-2 h-2 rounded-full inline-block ${
                          isUserOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                        }`}
                      ></span>
                      <span className={isUserOnline ? "text-emerald-600 font-semibold" : "text-slate-400"}>
                        {isUserOnline ? "Online" : "Offline"}
                      </span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                  <div>
                    <div className="h-4 w-24 bg-slate-200 rounded mb-1"></div>
                    <div className="h-3 w-16 bg-slate-100 rounded"></div>
                  </div>
                </div>
              )}
            </div>

            {selectedUser && (
              <button
                onClick={() => navigate(`/profile/${selectedUser.id}`)}
                className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" /> View Profile
              </button>
            )}
          </header>

          {/* Messages Area */}
          <section className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-4">
            {selectedUser && messages.length === 0 && (
              <div className="text-center my-16 p-8 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 max-w-sm mx-auto shadow-sm">
                <Avatar user={selectedUser} size="lg" className="mx-auto mb-4" />
                <h3 className="font-bold text-slate-800 mb-1">Say hello to {selectedUser.name || selectedUser.username}!</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  You are now connected. Start the conversation by sending a friendly message below.
                </p>
              </div>
            )}

            {messages.map((msg, idx) => {
              const msgDateStr = formatDate(msg.createdAt);
              const showDateHeader = msgDateStr !== lastDate;
              lastDate = msgDateStr;
              const isMe = msg.senderId === userId;

              return (
                <React.Fragment key={idx}>
                  {showDateHeader && (
                    <div className="flex justify-center my-6">
                      <span className="px-3.5 py-1 bg-slate-200/70 text-slate-600 rounded-full text-xs font-semibold shadow-sm">
                        {msgDateStr}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-2 group`}>
                    {!isMe && (
                      <Avatar user={selectedUser} size="sm" className="mb-1 shrink-0 hidden sm:inline-block" />
                    )}
                    <div
                      className={`px-4 py-3 rounded-2xl max-w-[85%] sm:max-w-md shadow-sm whitespace-pre-wrap break-words transition-all ${
                        isMe
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs"
                          : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <div
                        className={`text-[10px] mt-1 text-right font-medium ${
                          isMe ? "text-blue-100" : "text-slate-400"
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {typingStatus && (
              <div className="flex items-center gap-2 text-slate-500 text-xs font-medium pl-2">
                <Avatar user={selectedUser} size="sm" className="shrink-0" />
                <div className="bg-white border border-slate-200 px-3 py-2 rounded-2xl rounded-bl-xs shadow-sm flex items-center gap-1.5">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full typing-dot"></span>
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full typing-dot"></span>
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full typing-dot"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messageEndRef} />
          </section>

          {/* Footer Input */}
          {selectedUser && (
            <footer className="p-4 bg-white border-t border-slate-100">
              <div className="flex items-center gap-3 bg-slate-100/80 rounded-2xl px-4 py-1.5 border border-slate-200/80 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-inner">
                <input
                  type="text"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={handleTyping}
                  placeholder={`Message @${selectedUser.username}...`}
                  className="flex-1 bg-transparent py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!newMsg.trim()}
                  className={`p-2.5 rounded-xl transition-all ${
                    newMsg.trim()
                      ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 hover:scale-105 active:scale-95"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
