import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";

const WebSocketContext = createContext(null);

const useWebSocket = () => useContext(WebSocketContext);

const WebSocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const heartbeatRef = useRef(null); // For Redis presence heartbeat
  const [socketConnected, setSocketConnected] = useState(false);
  const [userId, setUserId] = useState(null);
  const [wsToken, setWsToken] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({});

  // Fetch userId and wsToken once on mount
  useEffect(() => {
    axios.get("/api/me", { withCredentials: true })
      .then((res) => {
        setUserId(res.data.id);
        setWsToken(res.data.wsToken);
      })
      .catch((err) => {
        console.error("Failed to fetch user for WebSocket auth", err);
      });
  }, []);

  // Setup WebSocket once userId and wsToken are available
  useEffect(() => {
    if (!userId || !wsToken) return;

    const ws = new WebSocket("ws://localhost:3000");
    socketRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      ws.send(JSON.stringify({ type: "auth", token: wsToken }));
      setSocketConnected(true);

      // ── HEARTBEAT: keeps Redis presence TTL alive ──
      // Sends { type: "heartbeat" } every 20 seconds
      // The backend refreshes the Redis key: EXPIRE user:online:{userId} 30
      // Without this, the user would appear offline after 30s!
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "heartbeat" }));
        }
      }, 20000); // Every 20 seconds
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
      setSocketConnected(false);
      setOnlineUsers({}); // Clear online users on disconnect
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
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
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      ws.close();
    };
  }, [userId, wsToken]);

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












