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
      .get("http://localhost:3000/api/me", { withCredentials: true })
      .then((res) => setMe(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!me || !socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "auth", userId: me.id }));
  }, [me, socket]);

  useEffect(() => {
    async function fetchUnreadData() {
      try {
        // Unread notifications
        const notifRes = await axios.get(
          "http://localhost:3000/api/notifications/unreadCount",
          { withCredentials: true }
        );
        setUnreadCount(notifRes.data.unreadCount || 0);

        // Unread messages
        const msgRes = await axios.get(
          "http://localhost:3000/unread-senders",
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
          {navItems.map(({ to, icon: Icon, label }) => (
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
          ))}
        </div>
      </div>
    </motion.nav>
  );
}
