import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getAccessToken, setTokens, clearTokens, getRefreshToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      if (!getAccessToken()) return;
      const data = await api('/api/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchMe().finally(() => setLoading(false));
  }, [fetchMe]);

  const login = useCallback(async (email, password) => {
    const data = await api('/api/auth/login', { method: 'POST', body: { email, password }, auth: false });
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (email, password, displayName) => {
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: { email, password, displayName },
      auth: false,
    });
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const requestAccess = useCallback(
    async ({ email, displayName, message }) => {
      const data = await api('/api/access-requests', {
        method: 'POST',
        body: { email, displayName, message },
        auth: Boolean(getAccessToken()),
      });
      if (data.accessToken) setTokens(data.accessToken, data.refreshToken);
      if (data.user && !user) setUser(data.user);
      return data;
    },
    [user],
  );

  const logout = useCallback(async () => {
    const token = getRefreshToken();
    if (token) {
      try {
        await api('/api/auth/logout', { method: 'POST', body: { refreshToken: token }, auth: false });
      } catch {
        // ignore — tokens are cleared locally regardless
      }
    }
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      requestAccess,
      refreshUser: fetchMe,
      isOwner: user?.role === 'owner',
      isAdmin: user?.role === 'owner' || user?.role === 'admin',
      accessLevel: user?.accessLevel ?? 3,
    }),
    [user, loading, login, register, logout, requestAccess, fetchMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
