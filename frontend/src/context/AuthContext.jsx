import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, getAccessToken, setTokens, clearTokens, getRefreshToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef(0);

  const fetchMe = useCallback(async () => {
    try {
      if (!getAccessToken()) return null;
      lastFetchRef.current = Date.now();
      const data = await api('/api/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchMe().finally(() => setLoading(false));
  }, [fetchMe]);

  // Auto-refresh the profile silently when the tab regains focus — throttled
  // to once a minute. The backend loads the user row fresh on every request,
  // so once the owner approves an access request, this picks up the new
  // access level (premium unlock) without the user having to log in again.
  useEffect(() => {
    if (!getAccessToken()) return undefined;
    const onFocus = () => {
      if (Date.now() - lastFetchRef.current > 60_000) fetchMe();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
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
      // Always re-fetch the profile after submitting: if this user was just
      // approved their access level refreshes right away (no re-login).
      if (data.user && !user) setUser(data.user);
      else await fetchMe();
      return data;
    },
    [user, fetchMe],
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
