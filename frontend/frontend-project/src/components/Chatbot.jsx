import React, { useState, useEffect } from "react";
import axios from "axios";
import { BsChatDotsFill } from "react-icons/bs";

const Chatbot = () => {
  const [user, setUser] = useState(null); // Store user info
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! I'm LangBot. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Fetch user on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get("http://localhost:3000/api/me", {
          withCredentials: true,
        });
        setUser(res.data);
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    };

    fetchUser();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || !user?.id) return;

    const userMsg = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5001/chat", {
        message: input,
        session_id: `user-${user.id}`, // Send session_id from user ID
      });

      const botMsg = {
        sender: "bot",
        text: res.data.response || "I didn't understand that.",
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Error: Could not reach server." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 transition flex items-center justify-center"
        title="Chat with LangBot"
      >
        <BsChatDotsFill size={16} />
      </button>

      {/* Chatbox */}
      {open && (
        <div className="mt-2 w-72 h-[460px] bg-white border border-gray-300 rounded-xl shadow-lg flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-2 flex justify-between items-center text-base font-medium">
            LangBot
            <button
              onClick={() => setOpen(false)}
              className="text-lg hover:text-red-300"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 bg-gray-50 space-y-1">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[75%] px-3 py-2 rounded-lg text-sm shadow ${
                  msg.sender === "user"
                    ? "ml-auto bg-blue-100 text-right"
                    : "mr-auto bg-gray-200"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-2 border-t border-gray-200 flex gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              className="flex-1 px-3 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-blue-600 text-white rounded-full px-3 py-1.5 hover:bg-blue-700 transition disabled:opacity-60"
            >
              {loading ? "..." : "➤"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
