import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  token: 'token',
  authHeader: 'authHeader',
  userRole: 'userRole',
  userProfile: 'userProfile',
};

const normalizeRoleValue = (role) => {
  if (!role) {
    return '';
  }

  const normalizedRole = String(role).trim().toUpperCase();

  return normalizedRole.startsWith('ROLE_') ? normalizedRole : `ROLE_${normalizedRole}`;
};

const getStoredProfile = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEYS.userProfile);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    return null;
  }
};

const getRoleList = (profile = {}) => {
  const roles = [];

  if (Array.isArray(profile.roles)) {
    roles.push(...profile.roles);
  }

  if (Array.isArray(profile.authorities)) {
    roles.push(...profile.authorities);
  }

  if (profile.role) {
    roles.push(profile.role);
  }

  if (profile.userRole) {
    roles.push(profile.userRole);
  }

  if (profile?.user?.role) {
    roles.push(profile.user.role);
  }

  if (Array.isArray(profile?.user?.roles)) {
    roles.push(...profile.user.roles);
  }

  return roles.map(normalizeRoleValue).filter(Boolean);
};

const resolveUserRole = (profile = {}) => {
  const roles = getRoleList(profile);

  if (roles.length > 0) {
    return roles[0];
  }

  return '';
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.token) || '');
  const [authHeader, setAuthHeader] = useState(() => localStorage.getItem(STORAGE_KEYS.authHeader) || '');
  const [userRole, setUserRole] = useState(() => localStorage.getItem(STORAGE_KEYS.userRole) || '');
  const [userProfile, setUserProfile] = useState(() => getStoredProfile());
  const [loading, setLoading] = useState(false);

  const clearAuthState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.authHeader);
    localStorage.removeItem(STORAGE_KEYS.userRole);
    localStorage.removeItem(STORAGE_KEYS.userProfile);
    setToken('');
    setAuthHeader('');
    setUserRole('');
    setUserProfile(null);
  }, []);

  const persistAuthState = useCallback((nextProfile = null, nextAuthHeader = '', nextToken = '') => {
    const profile = nextProfile || userProfile || {};
    const nextRole = resolveUserRole(profile) || userRole || '';

    if (nextToken) {
      localStorage.setItem(STORAGE_KEYS.token, nextToken);
      setToken(nextToken);
    } else {
      localStorage.removeItem(STORAGE_KEYS.token);
      setToken('');
    }

    if (nextAuthHeader) {
      localStorage.setItem(STORAGE_KEYS.authHeader, nextAuthHeader);
      setAuthHeader(nextAuthHeader);
    } else {
      localStorage.removeItem(STORAGE_KEYS.authHeader);
      setAuthHeader('');
    }

    localStorage.setItem(STORAGE_KEYS.userRole, nextRole);
    localStorage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(profile));

    setUserRole(nextRole);
    setUserProfile(profile);
  }, [userProfile, userRole]);

  const loadProfile = useCallback(async () => {
    if (!(token || authHeader)) {
      clearAuthState();
      return null;
    }

    setLoading(true);

    try {
      const { data } = await axiosClient.get('/api-profile/me');
      const nextProfile = data || {};
      const nextRole = resolveUserRole(nextProfile);

      localStorage.setItem(STORAGE_KEYS.userRole, nextRole);
      localStorage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(nextProfile));

      setUserRole(nextRole);
      setUserProfile(nextProfile);

      return nextProfile;
    } catch (error) {
      if (error.response?.status === 401) {
        clearAuthState();
      }

      throw error;
    } finally {
      setLoading(false);
    }
  }, [authHeader, clearAuthState, token]);

  useEffect(() => {
    if (!(token || authHeader)) {
      clearAuthState();
      return;
    }

    const refreshProfile = async () => {
      try {
        await loadProfile();
      } catch (error) {
        // The response interceptor already handles 401 by clearing auth storage.
      }
    };

    refreshProfile();
  }, [authHeader, clearAuthState, loadProfile, token]);

  const login = useCallback(async (email, password) => {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    try {
      const basicAuthHeader = `Basic ${window.btoa(`${email}:${password}`)}`;
      const { data } = await axiosClient.get('/api-profile/me', {
        headers: {
          Authorization: basicAuthHeader,
        },
      });

      const nextProfile = data || {};
      const nextRole = resolveUserRole(nextProfile);

      persistAuthState(nextProfile, basicAuthHeader);

      localStorage.setItem(STORAGE_KEYS.userRole, nextRole);
      localStorage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(nextProfile));

      return {
        profile: nextProfile,
        role: nextRole,
      };
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Unable to sign in.';
      throw new Error(message);
    }
  }, [persistAuthState]);

  const logout = useCallback(() => {
    clearAuthState();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }, [clearAuthState]);

  const hasRole = useCallback((allowedRoles = []) => {
    if (!allowedRoles.length) {
      return true;
    }

    const normalizedAllowedRoles = allowedRoles.map(normalizeRoleValue);

    const currentRoles = [
      ...(userProfile?.roles || []),
      ...(userProfile?.authorities || []),
      userProfile?.role,
      userProfile?.userRole,
      userRole,
    ]
      .map(normalizeRoleValue)
      .filter(Boolean);

    return normalizedAllowedRoles.some((role) => currentRoles.includes(role));
  }, [userProfile, userRole]);

  const value = useMemo(() => ({
    token,
    userRole,
    userProfile,
    loading,
    isAuthenticated: Boolean(token || authHeader || userProfile),
    login,
    logout,
    loadProfile,
    hasRole,
  }), [authHeader, hasRole, loadProfile, loading, login, logout, token, userProfile, userRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
};
