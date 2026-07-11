/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { setAuthLogout, setMaintenanceHandler } from "../api/axiosInstance";
import axiosInstance, { getDeviceUUID } from "../api/axiosInstance";
import MaintenancePage from "../components/MaintenancePage";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // decoded user payload
  const [loading, setLoading] = useState(true);
  // Maintenance overlay state — set via axiosInstance 503 interceptor
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
      } catch (err) {
        Cookies.remove("auth_token");
        Cookies.remove("refresh_token");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("refresh_token");
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
      } catch (err) {
        // console.log("Logout API error:", err);
      }
    }

    Cookies.remove("auth_token");
    Cookies.remove("refresh_token");
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("device_uuid");
    setUser(null);
  };

  useEffect(() => {
    setAuthLogout(logout);
    // Wire maintenance handler — on 503, show MaintenancePage overlay
    setMaintenanceHandler((message, scheduledEnd) => {
      setMaintenance({ active: true, message, scheduledEnd });
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
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

// Hook for consuming auth context
export const useAuth = () => useContext(AuthContext);
