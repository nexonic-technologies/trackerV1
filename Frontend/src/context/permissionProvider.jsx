// src/context/permissionProvider.jsx
//
// Central permission context for the entire application.
// Fetches the unified permission context from GET /api/auth/me/context
// and provides:
//   - permissions: { modelName: { action: boolean } }
//   - navigation: pre-filtered sidebar tree
//   - capabilities: role capabilities array
//   - can(action, resource): boolean check helper
//   - canAny(actions, resource): boolean check helper
//   - refresh(): manually re-fetch context
//
// Also listens for Socket.io "permissions:invalidated" events to
// automatically re-fetch when permissions change on the backend.

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./authProvider";
import axiosInstance from "../api/axiosInstance";

const PermissionContext = createContext({
  permissions: {},
  navigation: [],
  capabilities: [],
  role: null,
  isSuperAdmin: false,
  loading: true,
  error: null,
  can: () => false,
  canAny: () => false,
  refresh: () => {}
});

export const PermissionProvider = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState({
    permissions: {},
    navigation: [],
    capabilities: [],
    uiCapabilities: [],
    role: null,
    userProfile: null,
    isSuperAdmin: false,
    loading: true,
    error: null
  });
  const versionRef = useRef(0);
  const fetchingRef = useRef(false);

  const fetchContext = useCallback(async (isRefresh = false) => {
    if (!user) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    // Prevent concurrent fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    // Show loading state during refresh so sidebar renders a transition
    if (isRefresh) {
      setState((s) => ({ ...s, loading: true }));
    }

    try {
      const res = await axiosInstance.get("/auth/me/context");
      const ctx = res.data?.data;

      if (ctx) {
        versionRef.current = ctx._v || 0;
        setState({
          permissions: ctx.permissions || {},
          navigation: ctx.navigation || [],
          capabilities: ctx.capabilities || [],
          uiCapabilities: ctx.uiCapabilities || [],
          role: ctx.user?.role || null,
          userProfile: ctx.user || null,
          isSuperAdmin: ctx.user?.role?.isSuperAdmin || false,
          loading: false,
          error: null
        });
      }
    } catch (err) {
      console.error("[PermissionProvider] Failed to fetch context:", err?.message);
      setState((s) => ({
        ...s,
        loading: false,
        error: err?.response?.data?.message || err?.message || "Failed to load permissions"
      }));
    } finally {
      fetchingRef.current = false;
    }
  }, [user]);

  // Expose a refresh function that triggers loading state
  const refreshPermissions = useCallback(() => fetchContext(true), [fetchContext]);

  // Initial fetch when user changes (login/logout)
  useEffect(() => {
    if (user) {
      fetchContext();
    } else {
      // User logged out — clear everything
      setState({
        permissions: {},
        navigation: [],
        capabilities: [],
        uiCapabilities: [],
        role: null,
        userProfile: null,
        isSuperAdmin: false,
        loading: false,
        error: null
      });
      versionRef.current = 0;
    }
  }, [user, fetchContext]);

  // Listen for real-time permission invalidation via Socket.io
  useEffect(() => {
    if (!user) return;

    const handleInvalidation = (payload) => {
      // Only re-fetch if the server's version is newer than ours
      if (payload?.version > versionRef.current) {
        console.log(
          `[PermissionProvider] Permissions invalidated (v${payload.version}), re-fetching...`
        );
        fetchContext();
      }
    };

    // Listen on the global socket instance (if available)
    // The socket is typically set up in useSocket.js or a similar module
    const socket = window.__trackerSocket || window.__socket;
    if (socket) {
      socket.on("permissions:invalidated", handleInvalidation);
      return () => {
        socket.off("permissions:invalidated", handleInvalidation);
      };
    }
  }, [user, fetchContext]);

  // Periodic version poll: every 30s check if backend version bumped.
  // This catches sidebar changes, permission updates, and cache resets
  // without requiring a logout/login or socket event.
  useEffect(() => {
    if (!user) return;

    const poll = setInterval(async () => {
      try {
        const res = await axiosInstance.get("/auth/me/context");
        const ctx = res.data?.data;
        if (ctx && (ctx._v || 0) > versionRef.current) {
          console.log(`[PermissionProvider] Version bumped to v${ctx._v}, refreshing context...`);
          versionRef.current = ctx._v || 0;
          setState({
            permissions: ctx.permissions || {},
            navigation: ctx.navigation || [],
            capabilities: ctx.capabilities || [],
            uiCapabilities: ctx.uiCapabilities || [],
            role: ctx.user?.role || null,
            userProfile: ctx.user || null,
            isSuperAdmin: ctx.user?.role?.isSuperAdmin || false,
            loading: false,
            error: null
          });
        }
      } catch {
        // Silently ignore poll errors to avoid spamming the console
      }
    }, 30000); // 30 second interval

    return () => clearInterval(poll);
  }, [user]);

  // ── Permission check helpers ──

  /**
   * Check if the current user can perform an action on a resource.
   * @param {string} action   - e.g. "read", "create", "update", "delete", "approve", "export"
   * @param {string} resource - e.g. "tickets", "employees", "leaves"
   * @returns {boolean}
   */
  const can = useCallback(
    (action, resource) => {
      if (state.isSuperAdmin) return true;
      return !!state.permissions[resource]?.[action];
    },
    [state.permissions, state.isSuperAdmin]
  );

  /**
   * Check if the current user can perform ANY of the given actions on a resource.
   * @param {string[]} actions - e.g. ["update", "delete"]
   * @param {string} resource  - e.g. "tickets"
   * @returns {boolean}
   */
  const canAny = useCallback(
    (actions, resource) => {
      if (state.isSuperAdmin) return true;
      return actions.some((action) => !!state.permissions[resource]?.[action]);
    },
    [state.permissions, state.isSuperAdmin]
  );

  /**
   * Check if the current user can perform ALL of the given actions on a resource.
   * @param {string[]} actions - e.g. ["read", "update"]
   * @param {string} resource  - e.g. "employees"
   * @returns {boolean}
   */
  const canAll = useCallback(
    (actions, resource) => {
      if (state.isSuperAdmin) return true;
      return actions.every((action) => !!state.permissions[resource]?.[action]);
    },
    [state.permissions, state.isSuperAdmin]
  );

  /**
   * Check if the current user has a specific UI capability (CBAC).
   * Use this for in-page button/feature visibility controlled by the
   * Designation Permissions page (not AccessPolicies).
   *
   * @param {string} capabilityKey - e.g. "Sidebar:create", "Feed:view"
   * @returns {boolean}
   */
  const hasCapability = useCallback(
    (capabilityKey) => {
      if (state.isSuperAdmin) return true;
      return state.uiCapabilities?.includes(capabilityKey) || false;
    },
    [state.uiCapabilities, state.isSuperAdmin]
  );

  return (
    <PermissionContext.Provider
      value={{
        ...state,
        can,
        canAny,
        canAll,
        hasCapability,
        refresh: refreshPermissions
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

/**
 * Hook to access the permission context.
 *
 * Usage:
 *   const { can, permissions, navigation } = usePermission();
 *   if (can("approve", "leaves")) { ... }
 */
export const usePermission = () => useContext(PermissionContext);
