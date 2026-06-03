import { WebSocket } from "ws";
import prisma from "../../config/db.js";
import { redisPub } from "../../config/redis.js";

// ─────────────────────────────────────────────────────────────
// CONNECTION HANDLER — Now with Redis Pub/Sub
// ─────────────────────────────────────────────────────────────
// Connection requests and responses generate notifications.
// Previously, these only worked if both users were on the
// same server. Now we publish via Redis for cross-server.
// ─────────────────────────────────────────────────────────────

export async function handleConnectionRequest(ws, data, userId, clients) {
  try {
    const existingRequest = await prisma.connections.findUnique({
      where: {
        requesterId_addresseeId: {
          requesterId: userId,
          addresseeId: data.targetUserId,
        },
      },
    });

    if (existingRequest) {
      ws.send(JSON.stringify({
        type: "error",
        message: "You have already sent a connection request."
      }));
      return;
    }

    // Create new connection request with 'pending' status
    await prisma.connections.create({
      data: {
        requesterId: userId,
        addresseeId: data.targetUserId,
        status: "pending",
      },
    });

    // Create notification once
    const notification = await prisma.notification.create({
      data: {
        type: "connection_request",
        content: `${userId} sent you a connection request.`,
        userId: data.targetUserId,
        fromUserId: userId,
      },
    });

    // Count unread notifications for the recipient
    const unreadCount = await prisma.notification.count({
      where: {
        userId: data.targetUserId,
        isRead: false,
      },
    });

    // Notify target user — try local first, fallback to Redis Pub/Sub
    const notificationPayload = JSON.stringify({
      type: "newNotification",
      notification: {
        id: notification.id,
        userId: notification.userId,
        fromUserId: notification.fromUserId,
        type: notification.type,
        content: notification.content,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      },
      unreadCount,
    });

    const connectionRequestPayload = JSON.stringify({
      type: "connection-request-received",
      fromUserId: userId,
    });

    const targetSocket = clients[data.targetUserId];
    if (targetSocket && targetSocket.readyState === WebSocket.OPEN) {
      targetSocket.send(notificationPayload);
      targetSocket.send(connectionRequestPayload);
    } else {
      // Cross-server delivery via Redis
      await redisPub.publish(`chat:user:${data.targetUserId}`, notificationPayload);
      await redisPub.publish(`chat:user:${data.targetUserId}`, connectionRequestPayload);
    }
    // ---------------------------is this useful?------------------------

    // Confirm to sender that the request was sent
    ws.send(JSON.stringify({
      type: "connection-request-sent",
      toUserId: data.targetUserId,
    }));

    console.log("Notification created for connection request.");
  } catch (err) {
    console.error("Error sending connection request:", err);
    ws.send(JSON.stringify({
      type: "error",
      message: "Failed to send connection request."
    }));
  }
}

export async function handleConnectionResponse(ws, data, userId, clients) {
  try {
    const existingRequest = await prisma.connections.findUnique({
      where: {
        requesterId_addresseeId: {
          requesterId: data.fromUserId,
          addresseeId: userId,
        },
      },
    });

    if (!existingRequest || existingRequest.status !== "pending") {
      ws.send(JSON.stringify({
        type: "error",
        message: "No pending connection request found.",
      }));
      return;
    }

    // Update connection status to 'accepted' or 'rejected'
    const updatedConnection = await prisma.connections.update({
      where: {
        requesterId_addresseeId: {
          requesterId: data.fromUserId,
          addresseeId: userId,
        },
      },
      data: {
        status: data.response, // "accepted" or "rejected"
      },
    });

    // Create a notification for the user
    const notificationMessage = data.response === "accepted"
      ? `Your connection request was accepted by ${userId}.`
      : `Your connection request was rejected by ${userId}.`;

    const notification = await prisma.notification.create({
      data: {
        userId: data.fromUserId, // Notify the requester
        fromUserId: userId,       // The responder is the "fromUser"
        type: `connection_${data.response}`,
        content: notificationMessage,
      },
    });

    // Mark the original request notification as read
    await prisma.notification.updateMany({
      where: {
        userId: userId, // Responder (receiver of original request)
        type: "connection_request",
        content: {
          contains: `${data.fromUserId} sent you a connection request.`,
        },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: data.fromUserId,
        isRead: false,
      },
    });

    // Notify the requester — try local first, fallback to Redis
    const responsePayload = JSON.stringify({
      type: "newNotification",
      notification: {
        id: notification.id,
        userId: notification.userId,
        fromUserId: notification.fromUserId,
        type: notification.type,
        content: notification.content,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      },
      unreadCount,
    });

    const requesterSocket = clients[data.fromUserId];
    if (requesterSocket && requesterSocket.readyState === WebSocket.OPEN) {
      requesterSocket.send(responsePayload);
    } else {
      await redisPub.publish(`chat:user:${data.fromUserId}`, responsePayload);
    }

    // Confirm response to the responder (current user)
    ws.send(JSON.stringify({
      type: "connection-response-confirmed",
      toUserId: data.fromUserId,
      response: data.response,
    }));

    // If accepted, notify both users that they are now connected
    if (data.response === "accepted") {
      const notifyConnected = (targetSocket, otherUserId) => {
        if (targetSocket?.readyState === WebSocket.OPEN) {
          targetSocket.send(JSON.stringify({
            type: "connection-established",
            withUserId: otherUserId,
          }));
        }
      };

      // Notify both users about the successful connection
      notifyConnected(ws, data.fromUserId);  // Responder
      notifyConnected(requesterSocket, userId);  // Requester
    }
  } catch (err) {
    console.error("Error updating connection request:", err);
    ws.send(JSON.stringify({
      type: "error",
      message: "Failed to respond to connection request.",
    }));
  }
}
