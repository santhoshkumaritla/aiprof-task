import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('ai_study_token');
      if (token) {
        try {
          const profile = await api.getMe();
          setUser(profile);
        } catch (err) {
          console.warn('Stored token invalid, clearing');
          localStorage.removeItem('ai_study_token');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password, expectedRole) => {
    const data = await api.login(email, password, expectedRole);
    localStorage.setItem('ai_study_token', data.token);
    setUser(data);
    return data;
  };

  const register = async (userData) => {
    const data = await api.register(userData);
    localStorage.setItem('ai_study_token', data.token);
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('ai_study_token');
    setUser(null);
  };

  const switchRole = async () => {
    if (!user) return;
    try {
      const updated = await api.switchRole();
      localStorage.setItem('ai_study_token', updated.token);
      setUser(updated);
    } catch (err) {
      console.error('Failed to switch role:', err);
    }
  };

  const quickDemoLogin = async (role = 'learner') => {
    try {
      const email = role === 'admin' ? 'admin@gmail.com' : 'bindu@gmail.com';
      const password = 'password123';
      const data = await api.login(email, password, role === 'admin' ? 'admin' : 'user');
      localStorage.setItem('ai_study_token', data.token);
      setUser(data);
      return data;
    } catch (err) {
      console.error('Demo login error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, switchRole, quickDemoLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
