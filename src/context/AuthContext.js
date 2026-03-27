import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, loginUser, logoutUser, saveUser } from '../utils/storage';
import { generateId } from '../utils/helpers';
import { useSettings } from './SettingsContext';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { loadSettingsForUser } = useSettings();

  useEffect(() => {
    (async () => {
      const current = await getCurrentUser();
      if (current) {
        setUser(current);
        await loadSettingsForUser(current.id);
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    const loggedIn = await loginUser(email.trim().toLowerCase(), password);
    setUser(loggedIn);
    await loadSettingsForUser(loggedIn.id);
    return loggedIn;
  };

  const register = async (name, email, password) => {
    const newUser = {
      id: generateId(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      createdAt: new Date().toISOString(),
    };
    await saveUser(newUser);
    await loginUser(newUser.email, newUser.password);
    setUser(newUser);
    await loadSettingsForUser(newUser.id);
    return newUser;
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
