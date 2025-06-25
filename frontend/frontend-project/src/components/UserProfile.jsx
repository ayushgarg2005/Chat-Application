import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import FriendRequestButton from "./FriendRequestButton";
import { MapPinIcon, EnvelopeIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import Navbar from "./Navbar"; 
const UserProfile = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [requestSent, setRequestSent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`http://localhost:3000/user/${id}`);
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
    window.location.href = `http://localhost:3000/chat/${id}`;
  };

  if (loading) {
    return (
      <div className="h-screen flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <div className="text-center mt-10 text-red-500">User not found.</div>;
  }

  return (
    <>
    <Navbar/>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <img
            src={
              user.profilePhoto?.trim()
                ? user.profilePhoto
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`
            }
            alt="Profile"
            className="w-32 h-32 rounded-full object-cover shadow-md border-2 border-blue-200"
          />
          <div className="text-center sm:text-left w-full">
            <h1 className="text-3xl font-bold text-gray-800">{user.name || "Unnamed User"}</h1>
            <p className="text-sm text-gray-500 mt-1">@{user.username}</p>
            {user.location && (
              <p className="text-sm text-gray-600 mt-2 flex items-center justify-center sm:justify-start">
                <MapPinIcon className="h-4 w-4 mr-1 text-gray-400" />
                {user.location}
              </p>
            )}
            {user.email && (
              <p className="text-sm text-gray-600 mt-1 flex items-center justify-center sm:justify-start">
                <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-400" />
                {user.email}
              </p>
            )}
            <p className="text-sm text-gray-400 mt-1 flex items-center justify-center sm:justify-start">
              <CalendarDaysIcon className="h-4 w-4 mr-1 text-gray-400" />
              Joined on {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-gray-700 text-base text-center sm:text-left leading-relaxed">
            {user.description || <span className="italic text-gray-400">No description provided.</span>}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <FriendRequestButton onClick={handleSendRequest} sent={requestSent} />
          <button
            onClick={handleSendMessage}
            className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg w-full font-semibold transition duration-200"
          >
            Send Message
          </button>
        </div>
      </div>
    </div>
  </>
  );
};

export default UserProfile;
