import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";

const WebSocketContext = createContext(null);

const useWebSocket = () => useContext(WebSocketContext);

const WebSocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [userId, setUserId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({});

  // Fetch userId once on mount
  useEffect(() => {
    axios.get("http://localhost:3000/api/me", { withCredentials: true })
      .then((res) => {
        setUserId(res.data.id);
      })
      .catch((err) => {
        console.error("Failed to fetch user for WebSocket auth", err);
      });
  }, []);

  // Setup WebSocket once userId is available
  useEffect(() => {
    if (!userId) return;

    const ws = new WebSocket("ws://localhost:3000");
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      ws.send(JSON.stringify({ type: "auth", userId }));
      setSocketConnected(true);
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
      setSocketConnected(false);
      setOnlineUsers({}); // Clear online users on disconnect
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.type === "userStatus") {
        setOnlineUsers((prev) => ({
          ...prev,
          [data.userId]: data.isOnline,
        }));
      } else if (data.type === "initialOnlineUsers") {
        const initial = {};
        data.onlineUsers.forEach((id) => {
          initial[id] = true;
        });
        setOnlineUsers(initial);
      }
      // You can handle other message types here too
    };

    return () => {
      ws.close();
    };
  }, [userId]);

  const sendMessage = (message) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not open. Message not sent.");
    }
  };
  

  return (
    <WebSocketContext.Provider
      value={{
        socket: socketRef.current,
        sendMessage,
        connected: socketConnected,
        userId,
        onlineUsers,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export { WebSocketContext, WebSocketProvider, useWebSocket };












