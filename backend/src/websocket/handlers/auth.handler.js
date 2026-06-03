import { broadcastUserStatus, sendCurrentOnlineUsers } from "../../utils/broadcast.js";

export function handleAuth(ws, data, userId, clients, onlineUsers) {
  const authUserId = data.userId;
  if (!authUserId) {
    console.log("Auth failed: no userId");
    ws.close();
    return null;
  }

  clients[authUserId] = ws;
  onlineUsers.add(authUserId);
  console.log(`User ${authUserId} connected`);

  // Notify all users about the new user's online status
  broadcastUserStatus(clients, authUserId, true);
  sendCurrentOnlineUsers(ws, onlineUsers);

  return authUserId;
}
