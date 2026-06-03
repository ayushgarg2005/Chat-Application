import { WebSocket } from "ws";

export function broadcastUserStatus(clients, userId, isOnline) {
  const statusMessage = JSON.stringify({
    type: "userStatus",
    userId,
    isOnline,
  });

  Object.entries(clients).forEach(([id, client]) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(statusMessage);
    }
  });
}

export function sendCurrentOnlineUsers(ws, onlineUsers) {
  const onlineUserList = Array.from(onlineUsers);
  const onlineUsersMessage = JSON.stringify({
    type: "initialOnlineUsers",
    onlineUsers: onlineUserList,
  });

  ws.send(onlineUsersMessage);
}
