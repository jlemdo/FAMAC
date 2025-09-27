import React, { createContext, useContext, useState } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    // Add new notification with duplicate prevention
    const addNotification = (title, description) => {
        setNotifications((prev) => {
            // 🔧 FIX 1: Prevenir duplicados por título y descripción
            const isDuplicate = prev.some(notification => 
                notification.title === title && 
                notification.description === description &&
                !notification.read // Solo considerar duplicados si no están leídos
            );
            
            if (isDuplicate) {
                return prev; // No agregar
            }
            
            // 🔧 FIX 2: ID único mejorado con timestamp + random
            const uniqueId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const newNotification = {
                id: uniqueId,
                title,
                description,
                read: false,
                expanded: false,
            };
            
            return [...prev, newNotification];
        });
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
