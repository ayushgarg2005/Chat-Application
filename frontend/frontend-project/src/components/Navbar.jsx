import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  HomeIcon,
  BellIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  UserGroupIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "react-toastify";
import { useWebSocket } from "../contexts/WebSocketContext";
import { useNotification } from "../contexts/NotificationContext";
import { useUnreadMessages } from "../contexts/UnreadMessagesContext";

const navItems = [
  { to: "/", icon: HomeIcon, label: "Home" },
  { to: "/friends", icon: UserGroupIcon, label: "Friends" },
  { to: "/notifications", icon: BellIcon, label: "Notifications" },
  { to: "/messages", icon: ChatBubbleOvalLeftEllipsisIcon, label: "Messages" },
  { to: "/profile", icon: UserCircleIcon, label: "Profile" },
];

export default function Navbar() {
  const [me, setMe] = useState(null);
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const { socket } = useWebSocket();
  const { unreadCount, setUnreadCount } = useNotification();
  const { unreadCounts, setUnreadCounts } = useUnreadMessages();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    axios
      .get("/api/me", { withCredentials: true })
      .then((res) => setMe(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchUnreadData() {
      try {
        // Unread notifications
        const notifRes = await axios.get(
          "/api/notifications/unreadCount",
          { withCredentials: true }
        );
        setUnreadCount(notifRes.data.unreadCount || 0);

        // Unread messages
        const msgRes = await axios.get(
          "/api/unread-senders",
          { withCredentials: true }
        );
        const senders = msgRes.data.senders || [];
        const senderUnreadMap = {};
        senders.forEach((id) => {
          senderUnreadMap[id] = 1;
        });
        setUnreadCounts(senderUnreadMap);
      } catch (err) {
        console.error("Failed fetching unread data", err);
      }
    }

    fetchUnreadData();
  }, []);

  useEffect(() => {
  if (!socket) return;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (
        data.type === "newNotification" &&
        data.notification?.userId === me?.id
      ) {
        setUnreadCount((prev) => prev + 1);

        // Show real-time toast for connection responses
        const notifType = data.notification.type;
        if (notifType === "connection_accepted") {
          toast.success(data.notification.content, { icon: "✅" });
        } else if (notifType === "connection_rejected") {
          toast.info(data.notification.content, { icon: "❌" });
        } else if (notifType === "connection_request") {
          toast.info(data.notification.content, { icon: "👤" });
        }
      }




      // -----------------------------------------------------------------------------------------
      // if (
      //   data.type === "notificationCountUpdate" &&
      //   typeof data.unreadCount === "number"
      // ) {
      //   setUnreadCount(data.unreadCount);
      // }
      // ------------------------------------------------------------------------------------------



      // <-- UPDATE this part to handle newMessage event -->
      if (
        data.type === "newMessage" &&
        data.from && // senderId
        me?.id // receiverId implicitly me
      ) {
        setUnreadCounts((prev) => ({
          ...prev,
          [data.from]: data.unreadCount ?? 1, // use unreadCount from backend
        }));
      }

    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
    }
  };

  socket.addEventListener("message", handleMessage);
  return () => socket.removeEventListener("message", handleMessage);
}, [socket, me]);


  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/search?query=${search}`);
      setSearch("");
    }
  };

  const totalUnreadSenders = Object.keys(unreadCounts).length;

  return (
    <motion.nav
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 backdrop-blur-md bg-white border-b border-gray-200 shadow-sm"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3 bg-white">
        {/* Logo */}
        <Link to="/" className="text-2xl font-bold text-blue-600 tracking-tight">
          ChatApp
        </Link>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className={`relative transition-all duration-300 ${
            searchFocused ? "w-64" : "w-44"
          }`}
        >
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="pl-10 pr-4 py-2 rounded-full w-full bg-white border border-gray-300 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 placeholder-gray-500"
          />
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute top-2.5 left-3" />
        </form>

        {/* Nav Icons */}
        <div className="flex items-center gap-6 bg-white">
          {navItems.map(({ to, icon: Icon, label }) => {
            if (label === "Profile") {
              return (
                <div key={label} className="relative group">
                  <Link to={to} className="relative group block pb-2 -mb-2">
                    <Icon
                      className={`w-6 h-6 transition-colors ${
                        location.pathname === to
                          ? "text-blue-600"
                          : "text-gray-500 group-hover:text-blue-500"
                      }`}
                    />
                  </Link>
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-4 w-48 bg-white rounded-xl shadow-xl py-2 border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right scale-95 group-hover:scale-100">
                    <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-slate-50 transition-colors">
                      View Profile
                    </Link>
                    <button
                      onClick={async () => {
                        try {
                          await axios.post("/api/logout", {}, { withCredentials: true });
                          window.location.href = "/signin";
                        } catch (err) {
                          toast.error("Logout failed");
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <Link key={label} to={to} className="relative group">
                <Icon
                  className={`w-6 h-6 transition-colors ${
                    location.pathname === to
                      ? "text-blue-600"
                      : "text-gray-500 group-hover:text-blue-500"
                  }`}
                />
                {label === "Notifications" && unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-semibold px-1.5 rounded-full shadow">
                    {unreadCount}
                  </span>
                )}
                {label === "Messages" && totalUnreadSenders > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-semibold px-1.5 rounded-full shadow">
                    {totalUnreadSenders}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
