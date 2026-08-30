import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/index.js';
import { ApiClient } from '../lib/api.js';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  token: string | null;
  isLoading: boolean;
  login: (emailOrPhone: string, pass: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  demoLogin: (role: UserRole) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('wassalni_token'));
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const storedToken = localStorage.getItem('wassalni_token');
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }
      const res = await ApiClient.getMe();
      if (res.success && res.user) {
        setUser(res.user);
        setToken(storedToken);
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = async (emailOrPhone: string, pass: string) => {
    setIsLoading(true);
    try {
      const res = await ApiClient.login(emailOrPhone, pass);
      if (res.success && res.token) {
        localStorage.setItem('wassalni_token', res.token);
        setToken(res.token);
        setUser(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await ApiClient.register(data);
      if (res.success && res.token) {
        localStorage.setItem('wassalni_token', res.token);
        setToken(res.token);
        setUser(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async (targetRole: UserRole) => {
    setIsLoading(true);
    try {
      const res = await ApiClient.demoLogin(targetRole);
      if (res.success && res.token) {
        localStorage.setItem('wassalni_token', res.token);
        setToken(res.token);
        setUser(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('wassalni_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchProfile();
  };

  const role: UserRole = user ? user.role : 'customer';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        isLoading,
        login,
        register,
        demoLogin,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
