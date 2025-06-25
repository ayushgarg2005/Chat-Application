import React, { createContext, useContext, useState } from 'react';

const UnreadMessagesContext = createContext({
  unreadCounts: {},
  setUnreadCounts: () => {}
});

export const useUnreadMessages = () => useContext(UnreadMessagesContext);

export const UnreadMessagesProvider = ({ children }) => {
  const [unreadCounts, setUnreadCounts] = useState({}); // { senderId: count }

  return (
    <UnreadMessagesContext.Provider value={{ unreadCounts, setUnreadCounts }}>
      {children}
    </UnreadMessagesContext.Provider>
  );
};
