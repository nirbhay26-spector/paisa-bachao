import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('pb_token'));
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('pb_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!user && !!token);

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data);
          localStorage.setItem('pb_user', JSON.stringify(res.data));
        })
        .catch(err => {
          if (err.response?.status === 401) {
            localStorage.removeItem('pb_token');
            localStorage.removeItem('pb_user');
            setToken(null);
            setUser(null);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('pb_token', res.data.token);
    localStorage.setItem('pb_user', JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const res = await api.post('/auth/register', { email, password, name });
    localStorage.setItem('pb_token', res.data.token);
    localStorage.setItem('pb_user', JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('pb_token');
    localStorage.removeItem('pb_user');
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data) => {
    const res = await api.put('/auth/me', data);
    setUser(res.data);
    localStorage.setItem('pb_user', JSON.stringify(res.data));
    return res.data;
  }, []);

  const loginDemo = useCallback(async () => {
    try {
      const res = await api.post('/auth/demo');
      localStorage.setItem('pb_token', res.data.token);
      localStorage.setItem('pb_user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    } catch {
      const fallbackUser = {
        id: 'student-demo-local',
        name: 'Student Explorer',
        email: 'student.demo@paisabachao.app',
        monthly_income: 3500,
        income_frequency: 'monthly',
        income_arrival_date: '1',
        savings_goal: 500,
        theme: 'mango_pop',
        onboarding_done: 1,
        avatar: 'fox'
      };
      const fallbackToken = 'pb_demo_session_token';
      localStorage.setItem('pb_token', fallbackToken);
      localStorage.setItem('pb_user', JSON.stringify(fallbackUser));
      setToken(fallbackToken);
      setUser(fallbackUser);
      return fallbackUser;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, loginDemo, logout, updateProfile, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
