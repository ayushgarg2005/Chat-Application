import React from "react";
import { UserPlus, Check } from "lucide-react";

const FriendRequestButton = ({ onClick, sent, small = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={sent}
      className={`w-full rounded-xl font-semibold flex items-center justify-center transition-all duration-200 shadow-sm ${
        small ? "py-2 px-3 text-xs" : "py-2.5 px-4 text-sm"
      } ${
        sent
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed shadow-none"
          : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:shadow-md hover:shadow-blue-500/20 active:scale-95"
      }`}
    >
      {sent ? (
        <>
          <Check className={`${small ? "w-3.5 h-3.5 mr-1" : "w-4 h-4 mr-1.5"} text-emerald-600`} />
          Request Sent
        </>
      ) : (
        <>
          <UserPlus className={`${small ? "w-3.5 h-3.5 mr-1" : "w-4 h-4 mr-1.5"}`} />
          Connect
        </>
      )}
    </button>
  );
};

export default FriendRequestButton;
