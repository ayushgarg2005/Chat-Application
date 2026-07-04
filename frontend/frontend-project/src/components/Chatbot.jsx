import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { MessageSquarePlus, X, Send, Bot, Sparkles, User } from "lucide-react";

const Chatbot = () => {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! I'm LangBot, your intelligent AI assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("/api/me", {
          withCredentials: true,
        });
        setUser(res.data);
      } catch (err) {
        console.error("Error fetching user for chatbot:", err);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(
        "/api/chatbot",
        { message: currentInput },
        { withCredentials: true }
      );

      const botMsg = {
        sender: "bot",
        text: res.data.response || "I didn't quite catch that. Could you rephrase?",
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Chatbot API error:", err);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ I'm having trouble connecting to my AI core right now. Please try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Launcher Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-blue-500/30 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group relative border-2 border-white/20"
        title="Chat with LangBot AI"
      >
        {open ? (
          <X className="w-6 h-6 transition-transform rotate-90" />
        ) : (
          <>
            <Bot className="w-7 h-7 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse"></span>
          </>
        )}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="mt-3 w-80 sm:w-96 h-[500px] bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fadeInUp origin-bottom-right">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white px-5 py-4 flex justify-between items-center relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-inner">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-1.5 tracking-tight">
                  LangBot AI <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                </h3>
                <p className="text-[10px] text-blue-100 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Always online & ready
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors relative z-10"
              title="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/80 space-y-3.5">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-start gap-2.5 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "bot" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm text-xs font-bold">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm shadow-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.sender === "user"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs font-medium"
                      : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs font-normal"
                  }`}
                >
                  {msg.text}
                </div>
                {msg.sender === "user" && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 shadow-sm text-xs font-bold">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200/80 px-4 py-3 rounded-2xl rounded-bl-xs shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full typing-dot"></span>
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full typing-dot"></span>
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full typing-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask LangBot anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 px-4 py-2.5 bg-slate-100/80 border border-slate-200/80 rounded-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className={`p-2.5 rounded-full transition-all ${
                input.trim() && !loading
                  ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 hover:scale-105 active:scale-95"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
