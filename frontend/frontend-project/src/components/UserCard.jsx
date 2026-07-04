import React from "react";
import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import FriendRequestButton from "./FriendRequestButton";

const UserCard = ({ user, isOnline, sentRequest, onSendRequest, delay }) => {
  return (
    <Link
      to={`/profile/${user.id}`}
      className="no-underline"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`animate-fadeInUp 
          w-full max-w-[260px] h-[300px] bg-white/70 backdrop-blur-xl 
          border border-gray-200 rounded-xl shadow-md 
          hover:shadow-lg transition duration-300 p-4 
          flex flex-col justify-between items-center text-center 
          overflow-hidden`}
      >
        <div className="flex flex-col items-center space-y-1 flex-grow overflow-hidden">
          <Avatar user={user} isOnline={isOnline} size={48} />
          <h3 className="text-lg font-semibold text-gray-800 text-center leading-tight">
            {user.name || "Unnamed User"}
          </h3>
          <p className="text-xs text-gray-500">@{user.username}</p>

          {user.location && (
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mt-1">
              📍 {user.location}
            </span>
          )}

          <p className="text-xs text-gray-600 mt-1 px-2 line-clamp-2 max-h-[2.5rem] overflow-hidden">
            {user.description || "No description available."}
          </p>
        </div>

        <div
          className="w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <FriendRequestButton
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSendRequest(user.id);
            }}
            sent={sentRequest}
            small={true}
          />
        </div>
      </div>
    </Link>
  );
};

export default UserCard;
