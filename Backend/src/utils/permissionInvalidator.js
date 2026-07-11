// src/utils/permissionInvalidator.js
//
// Invalidates the in-memory permission cache and notifies connected clients
// via Socket.io when AccessPolicies or Roles change.
//
// Call invalidatePermissions() from service hooks (afterUpdate, afterCreate, afterDelete)
// on AccessPolicies and Roles.

import { setCache, getCacheVersion } from "./cache.js";

/**
 * Refresh the backend cache and broadcast invalidation to all connected frontend clients.
 *
 * @param {string|null} roleId - If provided, the role whose permissions changed.
 *                                If null, all roles are invalidated.
 */
export async function invalidatePermissions(roleId = null) {
  // 1. Refresh in-memory cache (re-reads AccessPolicies + Roles from DB)
  await setCache();

  const version = getCacheVersion();

  // 2. Broadcast to connected clients via Socket.io
  //    The io instance is imported dynamically to avoid circular dependencies
  //    (index.js imports cache.js, but permissionInvalidator needs io from index.js)
  try {
    const { io } = await import("../index.js");

    if (io) {
      const payload = {
        event: "permissions:invalidated",
        version,
        roleId: roleId || "all",
        timestamp: new Date().toISOString()
      };

      // Broadcast to all connected clients
      // In a targeted optimization, we could track role per socket and only
      // notify affected users — but broadcasting is simpler and the frontend
      // compares version numbers before re-fetching.
      io.emit("permissions:invalidated", payload);
    }
  } catch (err) {
    // Socket broadcast failure is non-fatal — clients will pick up changes
    // on their next /me/context fetch or page reload.
    console.warn("[PermissionInvalidator] Socket broadcast failed:", err.message);
  }

  console.log(
    `[PermissionInvalidator] Cache v${version} refreshed — role: ${roleId || "all"}`
  );
}
