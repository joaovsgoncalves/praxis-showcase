import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { praxisApi } from '@/api/praxisClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [webAuthEnabled, setWebAuthEnabled] = useState(true);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const config = await praxisApi.auth.config();
      setWebAuthEnabled(Boolean(config.webAuthEnabled));
      if (!config.webAuthEnabled) {
        setUser({ username: 'local', display_name: 'Local dev' });
        setIsAuthenticated(true);
        setAuthChecked(true);
        return;
      }
      if (!config.loginAvailable) {
        setAuthError({ type: 'auth_required', message: 'login_not_configured' });
        setIsAuthenticated(false);
        setAuthChecked(true);
        return;
      }
      const me = await praxisApi.auth.me();
      setUser(me.user);
      setIsAuthenticated(true);
      setAuthChecked(true);
    } catch (err) {
      const status = err?.status || (err?.message?.includes('401') ? 401 : null);
      if (status === 401 || err?.message?.includes('401')) {
        setIsAuthenticated(false);
        setUser(null);
        setAuthError({ type: 'auth_required' });
      } else {
        setAuthError({ type: 'network', message: err?.message });
      }
      setAuthChecked(true);
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkUserAuth();
  }, [checkUserAuth]);

  const logout = async () => {
    try {
      await praxisApi.auth.logout();
    } catch {}
    setUser(null);
    setIsAuthenticated(false);
    setAuthError({ type: 'auth_required' });
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith('praxis:offline:') || k?.startsWith('forja:offline:')) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {}
  };

  const navigateToLogin = () => {
    setAuthError({ type: 'auth_required' });
    setIsAuthenticated(false);
  };

  const onLoginSuccess = (session) => {
    setAuthError(null);
    if (session?.user) {
      setUser(session.user);
      setIsAuthenticated(true);
      setAuthChecked(true);
      setIsLoadingAuth(false);
    } else {
      checkUserAuth();
    }
  };

  const checkAppState = () => {};

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      webAuthEnabled,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
      onLoginSuccess,
    }}>
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