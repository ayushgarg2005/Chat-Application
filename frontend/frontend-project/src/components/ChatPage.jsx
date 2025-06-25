// import React, { useEffect, useState, useRef } from "react";
// import axios from "axios";
// import { useWebSocket } from "../contexts/WebSocketContext";
// import Navbar from "./Navbar";
// import { FaUserCircle, FaPaperPlane } from "react-icons/fa";
// import { useParams } from "react-router-dom";

// const ChatPage = () => {
//   const { id } = useParams(); // Get the user ID from URL
//   const selectedUserId = parseInt(id, 10);
//   console.log("Selected User ID:", selectedUserId);
//   const { userId, sendMessage, socket } = useWebSocket();
//   const [selectedUser, setSelectedUser] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [newMsg, setNewMsg] = useState("");
//   const [typingStatus, setTypingStatus] = useState("");
//   const messageEndRef = useRef();

//   // Fetch selected user info
//   useEffect(() => {
//     if (!selectedUserId) return;

//     axios
//       .get(`http://localhost:3000/user/${selectedUserId}`, {
//         withCredentials: true,
//       })
//       .then((res) => {
//         setSelectedUser(res.data);
//       })
//       .catch((err) => console.error("Failed to fetch user:", err));
//   }, [selectedUserId]);

//   // Fetch messages with selected user
//   useEffect(() => {
//     if (!selectedUser) return;

//     axios
//       .get(`http://localhost:3000/api/messages/${selectedUser.id}`, {
//         withCredentials: true,
//       })
//       .then((res) => {
//         setMessages(res.data);
//         sendMessage({ type: "markRead", withUserId: selectedUser.id });
//       })
//       .catch((err) => console.error("Failed to fetch messages:", err));
//   }, [selectedUser, sendMessage]);

//   // Handle incoming messages and typing
//   useEffect(() => {
//     if (!socket) return;

//     const handleMessage = (e) => {
//       const data = JSON.parse(e.data);

//       if (data.type === "message" && data.senderId === selectedUser?.id) {
//         setMessages((prev) => [...prev, data]);
//         sendMessage({ type: "markRead", withUserId: data.senderId });
//       }

//       if (data.type === "typing" && data.from === selectedUser?.id) {
//         setTypingStatus("Typing...");
//         setTimeout(() => setTypingStatus(""), 2000);
//       }
//     };

//     socket.addEventListener("message", handleMessage);
//     return () => socket.removeEventListener("message", handleMessage);
//   }, [socket, selectedUser, sendMessage]);

//   const handleSend = () => {
//     if (!newMsg.trim() || !selectedUser) return;

//     sendMessage({
//       type: "message",
//       content: newMsg,
//       receiverId: selectedUser.id,
//     });

//     setMessages((prev) => [
//       ...prev,
//       {
//         senderId: userId,
//         receiverId: selectedUser.id,
//         content: newMsg,
//         createdAt: new Date(),
//         sender: { username: "You" },
//       },
//     ]);

//     setNewMsg("");
//   };

//   const handleTyping = () => {
//     if (selectedUser) {
//       sendMessage({ type: "typing", to: selectedUser.id });
//     }
//   };

//   useEffect(() => {
//     messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   // Helper to format a date as "Today", "Yesterday", or "MMM dd, yyyy"
//   const formatDate = (date) => {
//     const today = new Date();
//     const msgDate = new Date(date);

//     // Reset times to midnight for accurate day comparison
//     const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
//     const msgMidnight = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());

//     const diffTime = todayMidnight - msgMidnight;
//     const diffDays = diffTime / (1000 * 60 * 60 * 24);

//     if (diffDays === 0) return "Today";
//     if (diffDays === 1) return "Yesterday";

//     return msgDate.toLocaleDateString(undefined, {
//       month: "short",
//       day: "numeric",
//       year: "numeric",
//     });
//   };

//   let lastDate = null;

//   return (
//     <>
//       <Navbar />
//       <div className="flex h-screen bg-gray-50">
//         <main className="w-full flex flex-col">
//           <header className="flex items-center border-b border-gray-200 p-6 bg-white shadow-sm">
//             {selectedUser ? (
//               <>
//                 <FaUserCircle size={40} className="text-gray-400 mr-4" />
//                 <div>
//                   <h2 className="text-xl font-semibold text-gray-900">{selectedUser.username}</h2>
//                   <p className="text-sm text-green-500 flex items-center gap-2">
//                     <span className="w-3 h-3 rounded-full bg-green-500 inline-block animate-pulse"></span>
//                     Online
//                   </p>
//                 </div>
//               </>
//             ) : (
//               <h2 className="text-xl text-gray-600">Loading user...</h2>
//             )}
//           </header>

//           <section className="flex-1 overflow-y-auto px-8 py-6 bg-gray-50">
//             {selectedUser && messages.length === 0 && (
//               <p className="text-center text-gray-400 italic mt-20">No messages yet. Say hi!</p>
//             )}
//             {messages.map((msg, idx) => {
//               const msgDateStr = formatDate(msg.createdAt);
//               const showDateHeader = msgDateStr !== lastDate;
//               lastDate = msgDateStr;

//               return (
//                 <React.Fragment key={idx}>
//                   {showDateHeader && (
//                     <div className="text-center my-4">
//                       <span className="inline-block px-4 py-1 bg-gray-300 text-gray-700 rounded-full text-sm">
//                         {msgDateStr}
//                       </span>
//                     </div>
//                   )}
//                   <div
//                     className={`mb-4 flex ${
//                       msg.senderId === userId ? "justify-end" : "justify-start"
//                     }`}
//                   >
//                     <div
//                       className={`px-5 py-3 rounded-2xl max-w-xs shadow-md whitespace-pre-wrap break-words ${
//                         msg.senderId === userId
//                           ? "bg-blue-600 text-white rounded-br-none"
//                           : "bg-white text-gray-900 rounded-bl-none"
//                       }`}
//                     >
//                       {msg.content}
//                       <div className="text-xs text-gray-300 mt-1 text-right">
//                         {new Date(msg.createdAt).toLocaleTimeString([], {
//                           hour: "2-digit",
//                           minute: "2-digit",
//                         })}
//                       </div>
//                     </div>
//                   </div>
//                 </React.Fragment>
//               );
//             })}
//             <div ref={messageEndRef} />
//             {typingStatus && <p className="text-sm text-gray-500 italic mt-1">{typingStatus}</p>}
//           </section>

//           {selectedUser && (
//             <footer className="p-6 bg-white border-t border-gray-200 flex items-center gap-4">
//               <input
//                 type="text"
//                 value={newMsg}
//                 onChange={(e) => setNewMsg(e.target.value)}
//                 onKeyDown={handleTyping}
//                 placeholder="Type a message..."
//                 className="flex-1 border border-gray-300 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
//                 onKeyPress={(e) => {
//                   if (e.key === "Enter") {
//                     e.preventDefault();
//                     handleSend();
//                   }
//                 }}
//               />
//               <button
//                 onClick={handleSend}
//                 className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 transition"
//                 aria-label="Send message"
//               >
//                 <FaPaperPlane size={20} />
//               </button>
//             </footer>
//           )}
//         </main>
//       </div>
//     </>
//   );
// };

// export default ChatPage;














import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useWebSocket } from "../contexts/WebSocketContext";  // <-- your context here
import Navbar from "./Navbar";
import { FaUserCircle, FaPaperPlane } from "react-icons/fa";
import { useParams } from "react-router-dom";
import { useUnreadMessages } from "../contexts/UnreadMessagesContext";

const ChatPage = () => {
  const { id } = useParams();
  const selectedUserId = parseInt(id, 10);
  const { userId, sendMessage, socket, onlineUsers } = useWebSocket();
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [typingStatus, setTypingStatus] = useState("");
  const { unreadCounts, setUnreadCounts } = useUnreadMessages();
  const messageEndRef = useRef();
  // Fetch selected user info
  useEffect(() => {
    if (!selectedUserId) return;
    axios.get(`http://localhost:3000/user/${selectedUserId}`, { withCredentials: true })
      .then(res => setSelectedUser(res.data))
      .catch(err => console.error("Failed to fetch user:", err));
  }, [selectedUserId]);

  // Fetch messages and mark read
  useEffect(() => {
    if (!selectedUser) return;

    axios.get(`http://localhost:3000/api/messages/${selectedUser.id}`, { withCredentials: true })
      .then(res => {
        setMessages(res.data);

        // Mark messages as read in DB
        axios.post(`http://localhost:3000/messages/mark-read/${selectedUser.id}`, {}, { withCredentials: true })
          .then(() => {
            sendMessage({ type: "markRead", withUserId: selectedUser.id });

            // Clear unread counts for this user
            setUnreadCounts(prev => {
              const newCounts = { ...prev };
              if (newCounts[selectedUser.id]) {
                delete newCounts[selectedUser.id];
              }
              return newCounts;
            });
          });
      })
      .catch(err => console.error("Failed to fetch messages:", err));
  }, [selectedUser, sendMessage, setUnreadCounts]);

  // WebSocket message & typing handler with live unread counts update
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === "message") {
        if (data.senderId === selectedUser?.id) {
          // Message from currently open chat user
          setMessages(prev => [...prev, data]);
          sendMessage({ type: "markRead", withUserId: data.senderId });

          // Clear unread count for this user
          setUnreadCounts(prev => {
            const newCounts = { ...prev };
            delete newCounts[data.senderId];
            return newCounts;
          });
        } else {
          // Message from other users - increment unread count
          setUnreadCounts(prev => ({
            ...prev,
            [data.senderId]: (prev[data.senderId] || 0) + 1,
          }));
        }
      }

      if (data.type === "typing" && data.from === selectedUser?.id) {
        setTypingStatus("Typing...");
        setTimeout(() => setTypingStatus(""), 2000);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, selectedUser, sendMessage, setUnreadCounts]);

  // Scroll messages to bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle send message
  const handleSend = () => {
    if (!newMsg.trim() || !selectedUser) return;

    sendMessage({
      type: "message",
      content: newMsg,
      receiverId: selectedUser.id,
    });

    setMessages(prev => [
      ...prev,
      {
        senderId: userId,
        receiverId: selectedUser.id,
        content: newMsg,
        createdAt: new Date(),
        sender: { username: "You" },
      },
    ]);

    setNewMsg("");
  };

  // Handle typing event
  const handleTyping = () => {
    if (selectedUser) {
      sendMessage({ type: "typing", to: selectedUser.id });
    }
  };

  // Format date helper
  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();

    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";

    return d.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  let lastDate = null;

  // Check if selectedUser is online
  const isUserOnline = selectedUserId && onlineUsers[selectedUserId];

  return (
    <>
      <Navbar />
      <div className="flex h-screen bg-gray-50">
        <main className="w-full flex flex-col">
          <header className="flex items-center border-b border-gray-200 p-6 bg-white shadow-sm">
            {selectedUser ? (
              <>
                <FaUserCircle size={40} className="text-gray-400 mr-4" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedUser.username}</h2>
                  <p
                    className={`text-sm flex items-center gap-2 ${
                      isUserOnline ? "text-green-500" : "text-gray-400"
                    }`}
                  >
                    <span
                      className={`w-3 h-3 rounded-full inline-block animate-pulse ${
                        isUserOnline ? "bg-green-500" : "bg-gray-400"
                      }`}
                    ></span>
                    {isUserOnline ? "Online" : "Offline"}
                  </p>
                </div>
              </>
            ) : (
              <h2 className="text-xl text-gray-600">Loading user...</h2>
            )}
          </header>

          <section className="flex-1 overflow-y-auto px-8 py-6 bg-gray-50">
            {selectedUser && messages.length === 0 && (
              <p className="text-center text-gray-400 italic mt-20">No messages yet. Say hi!</p>
            )}
            {messages.map((msg, idx) => {
              const msgDateStr = formatDate(msg.createdAt);
              const showDateHeader = msgDateStr !== lastDate;
              lastDate = msgDateStr;

              return (
                <React.Fragment key={idx}>
                  {showDateHeader && (
                    <div className="text-center my-4">
                      <span className="inline-block px-4 py-1 bg-gray-300 text-gray-700 rounded-full text-sm">
                        {msgDateStr}
                      </span>
                    </div>
                  )}
                  <div
                    className={`mb-4 flex ${
                      msg.senderId === userId ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`px-5 py-3 rounded-2xl max-w-xs shadow-md whitespace-pre-wrap break-words ${
                        msg.senderId === userId
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-white text-gray-900 rounded-bl-none"
                      }`}
                    >
                      {msg.content}
                      <div className="text-xs text-gray-300 mt-1 text-right">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messageEndRef} />
          {typingStatus && <p className="text-sm text-gray-500 italic mt-1">{typingStatus}</p>}
          </section>

          {selectedUser && (
            <footer className="p-6 bg-white border-t border-gray-200 flex items-center gap-4">
              <input
                type="text"
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={handleTyping}
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                onClick={handleSend}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 transition"
                aria-label="Send message"
              >
                <FaPaperPlane size={20} />
              </button>
            </footer>
          )}
        </main>
      </div>
    </>
  );
};

export default ChatPage;
