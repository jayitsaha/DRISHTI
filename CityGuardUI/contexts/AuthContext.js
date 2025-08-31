// contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { subscribeToAuthChanges } from '../firebase/authConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Subscribe to auth changes
    const unsubscribe = subscribeToAuthChanges(async ({ user, userProfile }) => {
      setUser(user);
      setUserProfile(userProfile);
      
      if (user && userProfile) {
        // Store user data locally
        await AsyncStorage.setItem("userId", user.uid);
        await AsyncStorage.setItem("userType", userProfile.userType);
        await AsyncStorage.setItem("username", userProfile.username);
      } else {
        // Clear local storage
        await AsyncStorage.multiRemove(["userId", "userType", "username"]);
      }
      
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    userProfile,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};