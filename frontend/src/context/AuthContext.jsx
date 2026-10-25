import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api.js';

// AuthContext keeps "who is logged in" for the whole app.
// The real login lives in the PHP session cookie; we only keep the
// name/role here to decide what to show. PHP re-checks everything.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  // When the page loads, ask PHP "am I still logged in?"
  useEffect(() => {
    api
      .me()
      .then((res) => {
        setUser(res.data.user);
        setRole(res.data.role);
      })
      .catch(() => {
        setUser(null);
        setRole(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // api.js fires this event when any page gets a 401 (session ended).
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setRole(null);
      setNotice('Your session has expired. Please log in again.');
    };
    window.addEventListener('session-expired', onExpired);
    return () => window.removeEventListener('session-expired', onExpired);
  }, []);

  async function login(loginRole, email, password) {
    const call = loginRole === 'manager' ? api.managerLogin : api.login;
    const res = await call(email, password);
    setUser(res.data.user);
    setRole(res.data.role);
    setNotice('');
    return res.data.role;
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      /* even if the server is unreachable, clear the screen */
    }
    setUser(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, notice, setNotice, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
