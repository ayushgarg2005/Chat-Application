import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("http://localhost:3000/api/me", { withCredentials: true })
      .then((res) => {
        setUser(res.data);
        setAuthenticated(true);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setAuthenticated(false);
        setLoading(false);
      });
  }, []);

  return (
    <UserContext.Provider value={{ user, authenticated, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
