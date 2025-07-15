import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useWebSocket } from '../contexts/WebSocketContext';
import { MessageSquareText, Clock,Search } from 'lucide-react';
import Navbar from './Navbar';

const getInitials = (name = '') =>
  name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase();

const ChatUsers = () => {
  const [chatUsers, setChatUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const { socket } = useWebSocket();

  useEffect(() => {
    const fetchChatUsers = async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/chat-users', {
          withCredentials: true,
        });
        setChatUsers(res.data);
      } catch (err) {
        console.error('Failed to fetch chat users:', err);
        setError('Failed to load messages.');
      }
    };
    fetchChatUsers();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "newMessage") {
        setChatUsers(prev => {
          const updated = [...prev];
          const index = updated.findIndex(item => item.user.id === data.from);

          if (index !== -1) {
            updated[index] = {
              ...updated[index],
              lastMessage: data.content,
              lastMessageAt: data.timestamp,
              unreadCount: data.hasOwnProperty("unreadCount")
                ? data.unreadCount
                : (updated[index].unreadCount || 0) + 1,
            };
          } else {
            updated.unshift({
              user: { id: data.from, username: "New User" },
              lastMessage: data.content,
              lastMessageAt: data.timestamp,
              unreadCount: data.hasOwnProperty("unreadCount") ? data.unreadCount : 1,
            });
          }

          return [...updated];
        });
      }
    };

    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket]);

  const filteredUsers = chatUsers.filter(({ user }) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <div className="p-6 bg-white rounded-xl shadow-lg max-w-2xl mx-auto mt-6">
        <div className="mb-4">
          <h2 className="text-3xl font-bold flex items-center gap-2 text-gray-800">
            <MessageSquareText className="w-7 h-7 text-indigo-600" />
            Chats
          </h2>
        </div>

        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-150"
          />
        </div>

        {error && <div className="text-red-500 text-center">{error}</div>}

        {filteredUsers.length === 0 && !error ? (
          <div className="text-gray-500 text-center py-8 text-sm">No chats found.</div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map(({ user, lastMessage, lastMessageAt, unreadCount }) => (
              <div
                key={user.id}
                className="flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition shadow-sm group cursor-pointer"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center font-semibold text-indigo-600 text-lg mr-4">
                  {getInitials(user.username)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h3 className="font-semibold text-gray-900 truncate">{user.username}</h3>
                    {lastMessageAt && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(lastMessageAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {lastMessage || <span className="italic text-gray-400">No message yet</span>}
                  </p>
                </div>

                {/* Unread Badge */}
                {unreadCount > 0 && (
                  <div
                    className="ml-4 bg-indigo-600 text-white text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center shadow-lg"
                    title={`${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`}
                  >
                    {unreadCount}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default ChatUsers;
