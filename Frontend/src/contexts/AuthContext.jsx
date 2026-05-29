import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const readResponse = async (response, fallbackMessage) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || fallbackMessage);
  }

  return data;
};

const readStoredUser = () => {
  const token = localStorage.getItem("atiToken");
  const stored = localStorage.getItem("atiUser");

  if (!token || !stored) {
    localStorage.removeItem("atiUser");
    if (!token) localStorage.removeItem("atiToken");
    return null;
  }

  try {
    return JSON.parse(stored);
  } catch {
    localStorage.removeItem("atiUser");
    localStorage.removeItem("atiToken");
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(false);

  const persistSession = (userData, token) => {
    setUser(userData);
    localStorage.setItem("atiUser", JSON.stringify(userData));
    localStorage.setItem("atiToken", token);
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await readResponse(response, "Login failed");

      persistSession(data.user, data.token);
      return data;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Cannot reach the API. Make sure the backend is running on ${API_BASE}.`);
      }

      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await readResponse(response, "Registration failed");

      if (data.token) {
        persistSession(data.user, data.token);
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error("Cannot reach the API. Make sure the backend is running on http://localhost:5000.");
      }

      throw error;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("atiToken");
      const response = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });

      const data = await readResponse(response, "Password change failed");
      if (data.user) {
        setUser(data.user);
        localStorage.setItem("atiUser", JSON.stringify(data.user));
      }
      return data;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem("atiUser", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("atiUser");
    localStorage.removeItem("atiToken");
  };

  useEffect(() => {
    const handleAuthCleared = () => setUser(null);
    window.addEventListener("ati-auth-cleared", handleAuthCleared);
    return () => window.removeEventListener("ati-auth-cleared", handleAuthCleared);
  }, []);

  const isAuthenticated = Boolean(user && localStorage.getItem("atiToken"));

  return (
    <AuthContext.Provider value={{ user, login, register, changePassword, updateUser, logout, loading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
