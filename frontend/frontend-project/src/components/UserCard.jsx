import React from "react";
import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import FriendRequestButton from "./FriendRequestButton";
import { MapPin } from "lucide-react";

const UserCard = ({ user, isOnline, sentRequest, onSendRequest, delay = 0 }) => {
  return (
    <Link
      to={`/profile/${user.id}`}
      className="block group no-underline"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="h-[280px] bg-white/80 backdrop-blur-lg border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between items-center text-center relative overflow-hidden group-hover:border-blue-500/30">
        <div className="flex flex-col items-center w-full overflow-hidden">
          <Avatar user={user} isOnline={isOnline} size="md" className="mb-3 group-hover:scale-105 transition-transform duration-300" />
          <h3 className="text-base font-bold text-slate-800 truncate w-full group-hover:text-blue-600 transition-colors">
            {user.name || user.username}
          </h3>
          <p className="text-xs font-medium text-slate-400 mb-2 truncate w-full">@{user.username}</p>

          {user.location && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full mb-2 max-w-full truncate">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{user.location}</span>
            </span>
          )}

          <p className="text-xs text-slate-500 line-clamp-2 px-1 leading-relaxed">
            {user.description || <span className="italic text-slate-400">No bio available</span>}
          </p>
        </div>

        <div className="w-full mt-3 pt-3 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
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
