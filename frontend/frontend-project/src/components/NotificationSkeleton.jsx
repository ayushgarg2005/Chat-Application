import React from "react";

const NotificationSkeleton = ({ count = 4 }) => {
  return (
    <ul className="space-y-3.5">
      {[...Array(count)].map((_, i) => (
        <li
          key={i}
          className="p-4 rounded-2xl border bg-slate-50/80 border-slate-200/80 overflow-hidden relative shadow-sm"
        >
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-slate-200/60 to-transparent animate-shimmer" />
          <div className="flex items-start gap-3 relative z-10">
            <div className="pt-0.5">
              <div className="w-9 h-9 bg-slate-200 rounded-full" />
            </div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3.5 bg-slate-200 rounded-md w-3/4" />
              <div className="h-3 bg-slate-200/80 rounded-md w-1/2" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default NotificationSkeleton;
