import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, AuthResponse } from '../api/auth.api';
import { usersApi } from '../api/users.api';
import { api } from '../api/client';
import { UserDto, ArtistProfileDto } from '@fairtune/shared';
import { LoginInput, RegisterInput } from '@fairtune/validation';

export type AuthUser = UserDto & { artistProfile?: ArtistProfileDto | null };

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginInput) => Promise<void>;
  register: (credentials: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const currentUser = await usersApi.getProfile();
      setUser(currentUser);
    } catch {
      setUser(null);
      api.clearTokens();
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = api.getAccessToken();
      if (token) {
        await refreshProfile();
      }
      setIsLoading(false);
    };

    initAuth();

    const handleExpired = () => {
      setUser(null);
    };

    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, [refreshProfile]);

  const login = async (credentials: LoginInput) => {
    setIsLoading(true);
    try {
      const res: AuthResponse = await authApi.login(credentials);
      api.setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: RegisterInput) => {
    setIsLoading(true);
    try {
      const res: AuthResponse = await authApi.register(credentials);
      api.setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      api.clearTokens();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshProfile,
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
