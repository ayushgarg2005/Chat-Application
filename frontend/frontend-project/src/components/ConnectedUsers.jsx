import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./Navbar";
import Avatar from "./Avatar";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../contexts/WebSocketContext";
import {
  Search,
  UserCheck,
  MessageCircle,
  ArrowUpDown,
  MapPin,
  Calendar,
} from "lucide-react";

const ConnectedUsers = () => {
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortOption, setSortOption] = useState("recent");
  const navigate = useNavigate();
  const { onlineUsers } = useWebSocket();

  useEffect(() => {
    const fetchConnectedUsers = async () => {
      try {
        const res = await axios.get("/api/connected", {
          withCredentials: true,
        });
        setConnectedUsers(res.data.connectedUsers || []);
      } catch (err) {
        setError("Failed to load connected friends.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchConnectedUsers();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredUsers = [...connectedUsers]
    .filter((user) =>
      (user.name || user.username || "").toLowerCase().includes(search.toLowerCase()) ||
      (user.location || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOption === "username") {
        return (a.name || a.username || "").localeCompare(b.name || b.username || "");
      } else {
        return new Date(b.connectedAt || 0) - new Date(a.connectedAt || 0);
      }
    });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="max-w-4xl w-full mx-auto px-4 py-10 flex-1">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-3xl p-8 text-white shadow-xl mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/20 mb-3 tracking-wide uppercase text-blue-100">
                <UserCheck className="w-3.5 h-3.5 text-emerald-300" /> My Network
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Connected Friends
              </h1>
              <p className="text-blue-100 text-sm mt-1">
                You have {connectedUsers.length} connection{connectedUsers.length !== 1 ? "s" : ""} in your network.
              </p>
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
            <input
              type="search"
              placeholder="Search friends by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="recent">Recently Connected</option>
              <option value="username">Name (A–Z)</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-medium text-slate-500">Loading your network...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-600 font-semibold shadow-sm">
            {error}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto my-6 shadow-sm">
            <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No friends found</h3>
            <p className="text-sm text-slate-500">
              {search ? `No one matches "${search}".` : "You haven't connected with anyone yet. Explore the Home page to meet people!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all duration-200 flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <Avatar user={user} isOnline={!!onlineUsers[user.id]} size="md" className="shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                      {user.name || user.username}
                    </h3>
                    <p className="text-xs font-medium text-slate-400 truncate mb-1">@{user.username}</p>
                    
                    {user.location && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 truncate mb-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{user.location}</span>
                      </p>
                    )}

                    {user.connectedAt && (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Friends since {formatDate(user.connectedAt)}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/chat/${user.id}`)}
                  className="shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md hover:shadow-blue-500/20 active:scale-95 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  Message
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ConnectedUsers;
