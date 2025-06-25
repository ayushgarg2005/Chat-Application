import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { useWebSocket } from "../contexts/WebSocketContext";
import { useNotification } from "../contexts/NotificationContext";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import Navbar from "./Navbar";
import NotificationSkeleton from "./NotificationSkeleton";
import {
  Bell,
  Check,
  X,
  Eye,
  UserPlus,
  CheckCircle,
  XCircle,
} from "lucide-react";

const Notifications = () => {
  const [me, setMe] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const { socket } = useWebSocket();
  const { unreadCount, setUnreadCount } = useNotification();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  // Refs to persist data between renders and in cleanup
  const isRefreshing = useRef(false);
  const notificationsRef = useRef(notifications);

  // Keep notificationsRef updated with latest notifications on every render
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    axios
      .get("http://localhost:3000/api/me", { withCredentials: true })
      .then((res) => setMe(res.data))
      .catch((err) => console.error("User not authenticated", err));
  }, []);

  useEffect(() => {
    if (!me || !socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "auth", userId: me.id }));
  }, [me, socket]);

  const fetchNotifications = useCallback(() => {
    setLoading(true);  // Start loading
    if (!me) return;
    axios
      .get("http://localhost:3000/api/notifications", {
        withCredentials: true,
      })
      .then((res) => {
        setNotifications(res.data);
        const unread = res.data.filter((n) => !n.isRead).length;
        setUnreadCount(unread);
      })
      .catch((err) => console.error("Failed to fetch notifications", err))
      .finally(() => setLoading(false));  // Stop loading
  }, [me, setUnreadCount]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Effect to handle marking notifications as read on unmount/navigation,
  // but NOT on refresh or tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      isRefreshing.current = true;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    const markReadOnLeave = () => {
      const toMark = notificationsRef.current.filter(
        (n) => !n.isRead && n.type !== "connection_request"
      );
      toMark.forEach((n) => {
        axios
          .post("http://localhost:3000/api/notifications/read", {
            notificationId: n.id,
          })
          .catch((err) => console.error("Failed to mark read", err));
      });
    };

    return () => {
      if (!isRefreshing.current) {
        markReadOnLeave();
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []); // Empty dependency array: run once on mount and cleanup on unmount

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      const data = JSON.parse(msg.data);

      if (
        data.type === "newNotification" &&
        data.notification?.userId === me?.id
      ) {
        setNotifications((prev) => [data.notification, ...prev]);
        setUnreadCount((prev) =>
          typeof data.unreadCount === "number" ? data.unreadCount : prev + 1
        );
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, me, setUnreadCount]);

  const handleConnectionResponse = useCallback(
    async (notification, response) => {
      if (!notification?.id) return;

      try {
        socket?.send(
          JSON.stringify({
            type: "connection-response",
            fromUserId: notification.fromUserId,
            response,
          })
        );

        await axios.post(
          "http://localhost:3000/api/notifications/respond",
          {
            notificationId: notification.id,
            responseStatus: response,
          },
          { withCredentials: true }
        );

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? { ...n, isRead: true, responseStatus: response }
              : n
          )
        );

        if (!notification.isRead) {
          setUnreadCount((prev) => Math.max(prev - 1, 0));
        }

        toast.success(
          `You have ${response === "accepted" ? "accepted" : "rejected"} the request.`,
          { icon: response === "accepted" ? "✅" : "❌" }
        );
      } catch (err) {
        console.error("Error handling connection response:", err);
        toast.error("Something went wrong while responding.");
      }
    },
    [socket, setUnreadCount]
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-100 py-12 px-4">
        <div className="max-w-3xl mx-auto bg-white shadow-2xl rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <Bell className="w-6 h-6 text-yellow-500" />
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="bg-yellow-500 text-white text-sm font-semibold px-3 py-1 rounded-full animate-pulse shadow">
                {unreadCount} new
              </span>
            )}
          </div>
            {loading ? (
            <NotificationSkeleton count={5} />
          ) : notifications.length === 0 ? (
            <p className="text-center text-gray-500">No notifications yet.</p>
          ) : (
            <ul className="space-y-4">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`p-4 rounded-xl border transition-all duration-300 shadow-sm hover:shadow-md ${
                    !n.isRead
                      ? "bg-yellow-50 border-yellow-400"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-1">
                      {n.type === "connection_request" ? (
                        <UserPlus className="text-blue-500 w-5 h-5" />
                      ) : (
                        <Bell className="text-gray-400 w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 leading-relaxed">{n.content}</p>

                      {n.type === "connection_request" && !n.isRead ? (
                        <div className="mt-4 flex gap-3">
                          <button
                            onClick={() =>
                              handleConnectionResponse(n, "accepted")
                            }
                            className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium shadow hover:scale-105 transition-transform"
                          >
                            <Check className="w-4 h-4" /> Accept
                          </button>
                          <button
                            onClick={() =>
                              handleConnectionResponse(n, "rejected")
                            }
                            className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium shadow hover:scale-105 transition-transform"
                          >
                            <X className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      ) : n.type === "connection_request" &&
                        n.responseStatus === "accepted" ? (
                        <div className="flex items-center gap-1 text-green-600 text-sm mt-2">
                          <CheckCircle className="w-4 h-4" />
                          Request accepted
                        </div>
                      ) : n.type === "connection_request" &&
                        n.responseStatus === "rejected" ? (
                        <div className="flex items-center gap-1 text-red-600 text-sm mt-2">
                          <XCircle className="w-4 h-4" />
                          Request rejected
                        </div>
                      ) : (
                        n.isRead && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                            <Eye className="w-4 h-4" />
                            Read
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};

export default Notifications;
























