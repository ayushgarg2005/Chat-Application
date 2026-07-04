import React from "react";

const bgColors = [
  "bg-red-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
];

const getInitials = (name) => {
  if (!name) return "NA";
  const parts = name.trim().split(" ");
  const initials = parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return initials || "NA";
};

const pickColor = (username) => {
  if (!username) return "bg-gray-400";
  const index = username.charCodeAt(0) % bgColors.length;
  return bgColors[index];
};

const Avatar = ({ user, isOnline }) => (
  <div className="relative w-24 h-24 mb-4">
    {user.imageUrl ? (
      <img
        src={user.imageUrl}
        alt="User Avatar"
        className="w-full h-full object-cover rounded-full border-4 border-white shadow-md"
      />
    ) : (
      <div
        className={`w-full h-full rounded-full flex items-center justify-center text-white font-bold text-xl border-4 border-white shadow-md ${pickColor(
          user.username
        )}`}
      >
        {getInitials(user.username)}
      </div>
    )}
    <span
      className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${
        isOnline ? "bg-green-500" : "bg-red-400"
      }`}
    ></span>
  </div>
);

export default Avatar;
