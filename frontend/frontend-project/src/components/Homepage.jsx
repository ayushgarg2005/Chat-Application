import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { useWebSocket } from "../contexts/WebSocketContext";
import UserCard from "./UserCard";

const Homepage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [sentRequests, setSentRequests] = useState({});
  const [sentRequestsLoaded, setSentRequestsLoaded] = useState(false);
  const { onlineUsers, connected, socket, sendMessage } = useWebSocket();

  useEffect(() => {
    axios.get("http://localhost:3000/api/me", { withCredentials: true })
      .then((res) => setMe(res.data))
      .catch(() => navigate("/signup"));
  }, [navigate]);

  useEffect(() => {
    axios.get("http://localhost:3000/api/users", { withCredentials: true })
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-[#f3f4f6] via-[#e0f2fe] to-[#fdf2f8] py-12 px-4 flex flex-col items-center">
        <h2 className="text-4xl font-bold text-gray-800 mb-4 animate-fadeIn">People You May Know</h2>
        <p className="text-sm text-gray-600 mb-10 text-center max-w-2xl animate-fadeIn delay-150">
          Connect with new people and expand your network by sending them a friend request.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 max-w-6xl w-full">
          {users.map((user, index) => (
            <UserCard
              key={user.id}
              user={user}
              isOnline={!!onlineUsers[user.id]}
              sentRequest={!!sentRequests[user.id]}
              onSendRequest={sendFriendRequest}
              delay={index * 50}
            />
          ))}
        </div>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.5s ease-out forwards;
          }
          .animate-fadeInUp {
            animation: fadeIn 0.6s ease-out forwards;
          }
          .delay-150 {
            animation-delay: 0.15s;
          }
        `}
      </style>
    </>
  );
};

export default Homepage;
