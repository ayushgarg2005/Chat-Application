// components/NotificationSkeleton.jsx

import React from "react";
import "./input.css"; // We'll define keyframes here

const NotificationSkeleton = ({ count = 5 }) => {
  return (
    <ul className="space-y-4">
      {[...Array(count)].map((_, i) => (
        <li
          key={i}
          className="p-4 rounded-xl border bg-gray-100 border-gray-200 overflow-hidden relative"
        >
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gray-200 to-transparent animate-shimmer" />
          <div className="flex items-start gap-3 relative z-10">
            <div className="pt-1">
              <div className="w-5 h-5 bg-gray-300 rounded-full" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default NotificationSkeleton;
