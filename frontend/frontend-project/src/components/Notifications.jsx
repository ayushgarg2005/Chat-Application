import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { useWebSocket } from "../contexts/WebSocketContext";
import { useNotification } from "../contexts/NotificationContext";
import { toast } from "react-toastify";
import Navbar from "./Navbar";
import NotificationSkeleton from "./NotificationSkeleton";
import {
  Bell,
  Check,
  X,
  Eye,
  UserPlus,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";

const Notifications = () => {
  const [me, setMe] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const { socket } = useWebSocket();
  const { unreadCount, setUnreadCount } = useNotification();
  const [loading, setLoading] = useState(true);
  const isRefreshing = useRef(false);
  const notificationsRef = useRef(notifications);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    axios
      .get("/api/me", { withCredentials: true })
      .then((res) => setMe(res.data))
      .catch((err) => console.error("User not authenticated", err));
  }, []);

  const fetchNotifications = useCallback(() => {
    setLoading(true);
    if (!me) return;
    axios
      .get("/api/notifications", {
        withCredentials: true,
      })
      .then((res) => {
        setNotifications(res.data || []);
        const unread = (res.data || []).filter((n) => !n.isRead).length;
        setUnreadCount(unread);
      })
      .catch((err) => console.error("Failed to fetch notifications", err))
      .finally(() => setLoading(false));
  }, [me, setUnreadCount]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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
          .post("/api/notifications/read", {
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
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      try {
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
      } catch (err) {
        console.error("Error parsing WebSocket notification:", err);
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
          "/api/notifications/respond",
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="max-w-3xl w-full mx-auto px-4 py-10 flex-1">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 rounded-3xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/20 mb-3 tracking-wide uppercase text-amber-100">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Activity Feed
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Notifications
              </h1>
              <p className="text-amber-100 text-sm mt-1">
                Stay updated on connection requests and community alerts.
              </p>
            </div>
            {unreadCount > 0 && (
              <span className="bg-white text-orange-600 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md animate-pulse shrink-0">
                {unreadCount} new
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6">
          {loading ? (
            <NotificationSkeleton count={5} />
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-700 mb-1">No notifications yet</h3>
              <p className="text-sm text-slate-500">When people send you connection requests or messages, you'll see them here.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 ${
                    !n.isRead
                      ? "bg-amber-50/60 border-amber-300/80 shadow-sm"
                      : "bg-slate-50/50 border-slate-200/80 hover:bg-slate-100/50"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl shrink-0 mt-0.5 bg-white shadow-sm border border-slate-100">
                      {n.type === "connection_request" ? (
                        <UserPlus className="text-blue-600 w-5 h-5" />
                      ) : (
                        <Bell className="text-amber-500 w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 leading-relaxed">{n.content}</p>

                      {n.type === "connection_request" && !n.isRead ? (
                        <div className="mt-3 flex flex-wrap gap-2.5">
                          <button
                            onClick={() => handleConnectionResponse(n, "accepted")}
                            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-4 py-1.5 rounded-xl text-xs font-semibold shadow-sm hover:shadow-md hover:shadow-emerald-500/20 active:scale-95 transition-all"
                          >
                            <Check className="w-3.5 h-3.5" /> Accept
                          </button>
                          <button
                            onClick={() => handleConnectionResponse(n, "rejected")}
                            className="inline-flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-1.5 rounded-xl text-xs font-semibold hover:shadow-sm active:scale-95 transition-all"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      ) : n.type === "connection_request" && n.responseStatus === "accepted" ? (
                        <div className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold mt-2.5 bg-emerald-50 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Request accepted
                        </div>
                      ) : n.type === "connection_request" && n.responseStatus === "rejected" ? (
                        <div className="inline-flex items-center gap-1 text-rose-600 text-xs font-semibold mt-2.5 bg-rose-50 px-2.5 py-1 rounded-full">
                          <XCircle className="w-3.5 h-3.5" /> Request rejected
                        </div>
                      ) : (
                        n.isRead && (
                          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 mt-2">
                            <Eye className="w-3.5 h-3.5" /> Read
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
      </main>
    </div>
  );
};

export default Notifications;
