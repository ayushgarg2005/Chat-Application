// npx tailwindcss -i ./src/components/input.css -o ./src/components/output.css --watch
import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Signup from "./components/Signup";
import Signin from "./components/Signin";
import Homepage from "./components/Homepage";
import Notifications from "./components/Notifications";
import ConnectedUsers from "./components/ConnectedUsers";
import ChatPage from "./components/ChatPage";
import axios from "axios";
import ChatUsers from "./components/ChatUsers";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { UnreadMessagesProvider } from "./contexts/UnreadMessagesContext";
import ProfilePage from "./components/ProfilePage";
import UserProfile from "./components/UserProfile";
import Chatbot from "./components/Chatbot";

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    axios
      .get("http://localhost:3000/api/me", { withCredentials: true })
      .then((res) => {
        setAuthenticated(true);
        setUserId(res.data.id);
        setLoading(false);
      })
      .catch(() => {
        setAuthenticated(false);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return authenticated ? (
    <WebSocketProvider userId={userId}>
      <NotificationProvider>
        <UnreadMessagesProvider>{children}</UnreadMessagesProvider>
      </NotificationProvider>
    </WebSocketProvider>
  ) : (
    <Navigate to="/signup" />
  );
}

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/signin" element={<Signin />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Homepage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/friends"
            element={
              <ProtectedRoute>
                <ConnectedUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:id"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <ChatUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:id"
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            }
          />
        </Routes>
        <ProtectedRoute>
          <Chatbot />
        </ProtectedRoute>
      </Router>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
    </>
  );
}

export default App;
