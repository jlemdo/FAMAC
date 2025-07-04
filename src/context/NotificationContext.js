import React, { createContext, useContext, useState } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    // Add new notification
    const addNotification = (title, description) => {
        const newNotification = {
            id: Date.now().toString(),
            title,
            description,
            read: false,
            expanded: false,
        };
        setNotifications((prev) => [...prev, newNotification]);
    };

    // Mark notification as read
    const markAsRead = (id) => {
        setNotifications((prev) =>
            prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
        );
    };

    return (
        <NotificationContext.Provider value={{ notifications, addNotification, markAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
};

// Hook to use notification functions
export const useNotification = () => {
    return useContext(NotificationContext);
};
