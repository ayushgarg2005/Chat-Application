import React, { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./Navbar";
import { useNavigate } from "react-router-dom";
import {
  Search,
  User,
  MessageCircleMore,
  SortAsc,
  SortDesc,
} from "lucide-react";
const ConnectedUsers = () => {
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortOption, setSortOption] = useState("recent");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConnectedUsers = async () => {
      try {
        const res = await axios.get("http://localhost:3000/connected", {
          withCredentials: true,
        });
        setConnectedUsers(res.data.connectedUsers || []);
      } catch (err) {
        setError("Failed to fetch connected users");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchConnectedUsers();
  }, []);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return (
      date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }) +
      " • " +
      date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    );
  };

  const filteredUsers = [...connectedUsers]
    .filter((user) =>
      (user.username || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOption === "username") {
        return (a.username || "").localeCompare(b.username || "");
      } else {
        return new Date(b.connectedAt) - new Date(a.connectedAt);
      }
    });

  if (loading)
    return (
      <div className="flex justify-center items-center h-32">
        <svg
          className="animate-spin h-8 w-8 text-blue-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          ></path>
        </svg>
      </div>
    );

  if (error)
    return (
      <div className="p-4 text-center text-red-600 font-semibold">{error}</div>
    );

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg">
        <h1 className="text-3xl font-extrabold mb-6 text-gray-900 flex items-center gap-2">
          <User className="w-7 h-7 text-blue-600" />
          Connected Users
        </h1>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
          <input
            type="search"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="sort"
            className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
          >
            {sortOption === "recent" ? (
              <SortDesc className="w-4 h-4 text-gray-500" />
            ) : (
              <SortAsc className="w-4 h-4 text-gray-500" />
            )}
            Sort by:
          </label>
          <select
            id="sort"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            
            <option value="recent">Recently Connected</option>
            <option value="username">Username (A–Z)</option>
          </select>
        </div>

        {filteredUsers.length === 0 ? (
          <p className="text-center text-gray-500 italic">
            No connected users found.
          </p>
        ) : (
          <ul className="space-y-5">
            {filteredUsers.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:shadow-md transition"
              >
                <div className="flex items-center space-x-4">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.username}
                      className="w-14 h-14 rounded-full object-cover shadow-sm"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl shadow-sm">
                      {user.username?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}

                  <div>
                    <p className="font-semibold text-lg text-gray-900">
                      {user.username}
                    </p>
                    <p className="text-sm text-gray-600">
                      {user.description || "No description available"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Connected on {formatDate(user.connectedAt)}
                    </p>
                  </div>
                </div>

                {/* <button
                  onClick={() => alert(`Start chatting with ${user.username}`)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg shadow-md transition"
                  aria-label={`Start chat with ${user.username}`}
                >
                  <MessageCircleMore className="w-4 h-4" />
                  Message
                </button> */}
                <button
                  onClick={() => navigate(`/chat/${user.id}`)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg shadow-md transition"
                  aria-label={`Start chat with ${user.username}`}
                >
                  <MessageCircleMore className="w-4 h-4" />
                  Message
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
};

export default ConnectedUsers;
