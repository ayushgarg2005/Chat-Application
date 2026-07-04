import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { useWebSocket } from "../contexts/WebSocketContext";
import UserCard from "./UserCard";
import { Sparkles, Users, Search } from "lucide-react";

const Homepage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [sentRequests, setSentRequests] = useState({});
  const [sentRequestsLoaded, setSentRequestsLoaded] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const { onlineUsers, connected, socket, sendMessage } = useWebSocket();

  useEffect(() => {
    axios.get("/api/me", { withCredentials: true })
      .then((res) => setMe(res.data))
      .catch(() => navigate("/signup"));
  }, [navigate]);

  useEffect(() => {
    axios.get("/api/users", { withCredentials: true })
      .then((res) => setUsers(res.data))
      .catch((err) => console.error("Failed to fetch users:", err));
  }, []);

  useEffect(() => {
    if (!me) return;
    const stored = localStorage.getItem(`sentRequests_user_${me.id}`);
    setSentRequests(stored ? JSON.parse(stored) : {});
    setSentRequestsLoaded(true);
  }, [me]);

  useEffect(() => {
    if (me && sentRequestsLoaded) {
      localStorage.setItem(
        `sentRequests_user_${me.id}`,
        JSON.stringify(sentRequests)
      );
    }
  }, [sentRequests, sentRequestsLoaded, me]);

  const sendFriendRequest = (targetUserId) => {
    if (connected && socket && !sentRequests[targetUserId]) {
      sendMessage({ type: "connection_request", targetUserId });
      setSentRequests((prev) => ({ ...prev, [targetUserId]: true }));
    }
  };

  const filteredUsers = users.filter((u) => 
    (u.name || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
    (u.username || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
    (u.location || "").toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white py-16 px-4 overflow-hidden shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)] pointer-events-none"></div>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="max-w-xl text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/20 mb-4 tracking-wide uppercase text-blue-100">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Discover & Connect
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4">
              Expand Your Social <span className="text-blue-200">Horizon</span>
            </h1>
            <p className="text-blue-100 text-sm md:text-base leading-relaxed mb-6">
              Connect with fascinating people, share ideas in real-time, and build lasting friendships across the globe.
            </p>
            <div className="relative max-w-md mx-auto md:mx-0">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, username, or location..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/95 text-slate-800 rounded-xl placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white shadow-lg transition-all"
              />
            </div>
          </div>
          <div className="hidden md:flex flex-col items-center justify-center p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl w-64 text-center">
            <Users className="w-12 h-12 text-blue-200 mb-3" />
            <div className="text-2xl font-bold">{users.length}</div>
            <div className="text-xs text-blue-200 font-medium uppercase tracking-wider">Active Community Members</div>
          </div>
        </div>
      </div>

      {/* Main Community Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">People You May Know</h2>
            <p className="text-sm text-slate-500">Send a connection request to start chatting</p>
          </div>
          <div className="text-sm font-semibold text-slate-500 bg-white px-4 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            Showing <span className="text-blue-600 font-bold">{filteredUsers.length}</span> people
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto my-8 shadow-sm">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No community members found</h3>
            <p className="text-sm text-slate-500">We couldn't find anyone matching "{searchFilter}". Try a different search term!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredUsers.map((user, index) => (
              <UserCard
                key={user.id}
                user={user}
                isOnline={!!onlineUsers[user.id]}
                sentRequest={!!sentRequests[user.id]}
                onSendRequest={sendFriendRequest}
                delay={index * 40}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Homepage;
