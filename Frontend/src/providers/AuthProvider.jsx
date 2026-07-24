/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import axiosInstance, { getDeviceUUID, setAuthLogout, setMaintenanceHandler } from "@api/axiosInstance";
import MaintenancePage from "@components/MaintenancePage";

export const validateToken = async () => {
  const token = Cookies.get('auth_token') || localStorage.getItem('auth_token');
  if (!token) return { valid: false };

  try {
    const { exp } = jwtDecode(token);
    if (exp && Date.now() / 1000 > exp) {
      _clearTokens();
      return { valid: false };
    }
  } catch {
    _clearTokens();
    return { valid: false };
  }

  try {
    const res = await axiosInstance.get('/auth/me/context');
    return { valid: true, context: res.data?.data ?? null };
  } catch (err) {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      _clearTokens();
    }
    return { valid: false };
  }
};

const _clearTokens = () => {
  Cookies.remove('auth_token');
  Cookies.remove('refresh_token');
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('device_uuid');
};

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seededContext, setSeededContext] = useState(null);
  const [maintenance, setMaintenance] = useState({ active: false, message: null, scheduledEnd: null });

  useEffect(() => {
    let token = Cookies.get("auth_token");
    if (!token) {
      token = localStorage.getItem("auth_token");
    }

    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch {
        _clearTokens();
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const logout = async (skipApiCall = false) => {
    if (!skipApiCall) {
      try {
        await axiosInstance.post("/auth/logout", {}, {
          headers: {
            'x-device-uuid': getDeviceUUID()
          }
        });
      } catch {
        // Ignore API errors on logout
      }
    }

    _clearTokens();
    setSeededContext(null);
    setUser(null);
  };

  useEffect(() => {
    setAuthLogout(logout);
    setMaintenanceHandler((message, scheduledEnd) => {
      setMaintenance({ active: true, message, scheduledEnd });
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, seededContext, setSeededContext }}>
      {maintenance.active ? (
        <MaintenancePage
          message={maintenance.message}
          scheduledEnd={maintenance.scheduledEnd}
          onRetry={() => setMaintenance({ active: false, message: null, scheduledEnd: null })}
        />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
