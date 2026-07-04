import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import FriendRequestButton from "./FriendRequestButton";
import Avatar from "./Avatar";
import Navbar from "./Navbar";
import { MapPin, Mail, Calendar, ArrowLeft, MessageCircle, Sparkles } from "lucide-react";

const UserProfile = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [requestSent, setRequestSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`/user/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch user");
        setUser(data);
      } catch (error) {
        console.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  const handleSendRequest = async () => {
    try {
      await fetch(`/friend-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: parseInt(id, 10) }),
      });
      setRequestSent(true);
    } catch (error) {
      console.error("Failed to send friend request", error);
    }
  };

  const handleSendMessage = () => {
    navigate(`/chat/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col justify-center items-center p-6 text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-2">User Not Found</h2>
          <p className="text-sm text-slate-500 mb-6">The profile you are looking for does not exist or has been removed.</p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-md hover:bg-blue-700 transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="max-w-3xl w-full mx-auto px-4 py-12 flex-1">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 h-40 w-full relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)] pointer-events-none"></div>
          </div>

          <div className="p-8 pt-0 relative">
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6 -mt-16 mb-8">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
                <Avatar
                  user={user}
                  size="xl"
                  className="ring-4 ring-white shadow-xl bg-white shrink-0"
                />
                <div className="mb-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 mb-1 uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" /> Community Member
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 leading-tight">
                    {user.name || user.username}
                  </h1>
                  <p className="text-sm font-medium text-slate-400">@{user.username}</p>
                </div>
              </div>
            </div>

            {/* Metadata Badges */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 py-4 border-y border-slate-100 text-xs font-medium text-slate-600 mb-6">
              {user.location && (
                <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
                  <MapPin className="w-4 h-4 text-slate-400" /> {user.location}
                </span>
              )}
              {user.email && (
                <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
                  <Mail className="w-4 h-4 text-slate-400" /> {user.email}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60">
                <Calendar className="w-4 h-4 text-slate-400" /> Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </span>
            </div>

            {/* Bio Section */}
            <div className="mb-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">About</h3>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60">
                {user.description || <span className="italic text-slate-400 font-normal">This user hasn't written a bio yet.</span>}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <div className="flex-1">
                <FriendRequestButton onClick={handleSendRequest} sent={requestSent} />
              </div>
              <button
                onClick={handleSendMessage}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white py-2.5 px-6 rounded-xl font-bold text-sm shadow-md shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all duration-200"
              >
                <MessageCircle className="w-4 h-4" /> Send Message
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserProfile;
