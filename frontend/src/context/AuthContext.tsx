import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Company, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const u = await api.getMe();
      setUser(u);
      const c = await api.getCompanySettings();
      setCompany(c);
    } catch (err) {
      api.clearToken();
      setUser(null);
      setCompany(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('solar_token');
    if (token) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }

    const handleUnauthorized = () => {
      setUser(null);
      setCompany(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const form = new FormData();
      form.append('username', email.trim().toLowerCase());
      form.append('password', password);
      const res = await api.login(form);
      api.setToken(res.access_token);
      setUser(res.user);
      const c = await api.getCompanySettings();
      setCompany(c);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
    setCompany(null);
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return roles.includes(user.role);
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.role === 'company_admin') return true;
    const perms = user.permissions || user.effective_permissions || [];
    return perms.includes(permission);
  };

  const refreshUserData = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider value={{ user, company, isLoading, login, logout, hasRole, hasPermission, refreshUserData }}>
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
