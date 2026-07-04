import React from "react";

const bgColors = [
  "from-rose-500 to-red-600",
  "from-emerald-500 to-green-600",
  "from-amber-500 to-yellow-600",
  "from-violet-500 to-purple-600",
  "from-pink-500 to-rose-600",
  "from-blue-500 to-indigo-600",
  "from-teal-500 to-cyan-600",
  "from-orange-500 to-amber-600",
];

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  const initials = parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return initials || "?";
};

const pickGradient = (username = "") => {
  if (!username) return "from-slate-400 to-slate-500";
  const index = username.charCodeAt(0) % bgColors.length;
  return bgColors[index];
};

const Avatar = ({ user = {}, isOnline, size = "md", className = "" }) => {
  const photoUrl = user.profilePhoto || user.imageUrl || user.image;

  const sizeClasses = {
    sm: "w-10 h-10 text-sm",
    md: "w-14 h-14 text-lg",
    lg: "w-20 h-20 text-2xl",
    xl: "w-28 h-28 text-3xl",
  }[size] || "w-14 h-14 text-lg";

  return (
    <div className={`relative inline-block ${className}`}>
      {photoUrl && photoUrl.trim() !== "" ? (
        <img
          src={photoUrl}
          alt={user.username || "Avatar"}
          className={`${sizeClasses} object-cover rounded-full border-2 border-white shadow-md ring-2 ring-slate-100 transition-transform duration-300`}
          onError={(e) => {
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "flex";
          }}
        />
      ) : null}
      <div
        className={`${sizeClasses} ${photoUrl && photoUrl.trim() !== "" ? "hidden" : "flex"} rounded-full items-center justify-center text-white font-bold bg-gradient-to-br ${pickGradient(
          user.username
        )} border-2 border-white shadow-md ring-2 ring-slate-100`}
      >
        {getInitials(user.name || user.username)}
      </div>
      {isOnline !== undefined && (
        <span
          className={`absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${
            isOnline
              ? "bg-emerald-500 ring-2 ring-emerald-500/30 animate-pulse"
              : "bg-slate-400"
          }`}
          title={isOnline ? "Online" : "Offline"}
        ></span>
      )}
    </div>
  );
};

export default Avatar;
