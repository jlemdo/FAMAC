import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { useNavigation } from "@react-navigation/native";


export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);


    useEffect(() => {
        const checkLoginStatus = async () => {
            const storedUser = await AsyncStorage.getItem('userData');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
                setIsLoggedIn(true);
            }
        };
        checkLoginStatus();
    }, []);

    const login = async (userData) => {
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        setUser(userData);
        setIsLoggedIn(true);
    };

    const loginAsGuest = () => {
        setUser({ user: 'Guest', usertype: 'Guest' });
        setIsLoggedIn(true);
    };

    const logout = async () => {
        await AsyncStorage.removeItem('userData');
        setUser(null);
        setIsLoggedIn(false);
    };

    return (
        <AuthContext.Provider value={{ isLoggedIn, user, login, logout, loginAsGuest }}>
            {children}
        </AuthContext.Provider>
    );
};
