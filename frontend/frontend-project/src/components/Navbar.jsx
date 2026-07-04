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
        const notifRes = await axios.get(
          "/api/notifications/unreadCount",
          { withCredentials: true }
        );
        setUnreadCount(notifRes.data.unreadCount || 0);

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
  }, [setUnreadCount, setUnreadCounts]);

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

          const notifType = data.notification.type;
          if (notifType === "connection_accepted") {
            toast.success(data.notification.content, { icon: "✅" });
          } else if (notifType === "connection_rejected") {
            toast.info(data.notification.content, { icon: "❌" });
          } else if (notifType === "connection_request") {
            toast.info(data.notification.content, { icon: "👤" });
          }
        }

        if (
          data.type === "newMessage" &&
          data.from &&
          me?.id
        ) {
          setUnreadCounts((prev) => ({
            ...prev,
            [data.from]: data.unreadCount ?? 1,
          }));
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, me, setUnreadCount, setUnreadCounts]);

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
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 backdrop-blur-md bg-white/85 border-b border-slate-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)]"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group no-underline">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform duration-200">
            C
          </div>
          <span className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
            ChatApp
          </span>
        </Link>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className={`relative transition-all duration-300 ${
            searchFocused ? "w-72" : "w-48 sm:w-56"
          }`}
        >
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="pl-10 pr-4 py-2 rounded-full w-full bg-slate-100/80 border border-slate-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-sm placeholder-slate-400 transition-all shadow-inner"
          />
          <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute top-3 left-3.5" />
        </form>

        {/* Nav Icons */}
        <div className="flex items-center gap-2 sm:gap-4">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));

            if (label === "Profile") {
              return (
                <div key={label} className="relative group ml-2">
                  <Link
                    to={to}
                    className={`flex items-center gap-2 p-1.5 rounded-full border transition-all ${
                      isActive
                        ? "border-blue-500 bg-blue-50/50 text-blue-600 ring-2 ring-blue-500/20"
                        : "border-transparent hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    {me?.profilePhoto ? (
                      <img
                        src={me.profilePhoto}
                        alt="Me"
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                        {me?.username?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                  </Link>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl py-2 border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right scale-95 group-hover:scale-100">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-800 truncate">{me?.name || me?.username || "User"}</p>
                      <p className="text-xs text-slate-400 truncate">@{me?.username}</p>
                    </div>
                    <Link
                      to="/profile"
                      className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors no-underline font-medium"
                    >
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
                      className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors font-medium flex items-center gap-2"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={label}
                to={to}
                title={label}
                className={`relative p-2.5 rounded-xl transition-all no-underline ${
                  isActive
                    ? "bg-blue-50 text-blue-600 shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                <Icon className="w-5 h-5" />
                {label === "Notifications" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-rose-500 to-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-pulse">
                    {unreadCount}
                  </span>
                )}
                {label === "Messages" && totalUnreadSenders > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-rose-500 to-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md animate-pulse">
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
