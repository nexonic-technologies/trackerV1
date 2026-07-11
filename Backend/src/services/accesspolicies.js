// src/services/accesspolicies.js
//
// Service hook for the AccessPolicies model.
// When policies are created, updated, or deleted, the in-memory cache is
// invalidated and all connected frontend clients are notified via Socket.io.

import { invalidatePermissions } from "../utils/permissionInvalidator.js";

export default function () {
  return {
    /**
     * After a new policy is created, invalidate cache for the affected role.
     */
    afterCreate: async (ctx) => {
      const { data } = ctx;
      const roleId = data?.role?.toString?.() || null;
      if (roleId) {
        try {
          const { default: Role } = await import("../models/Role.js");
          await Role.findByIdAndUpdate(roleId, { $inc: { permissionVersion: 1 } });
        } catch (err) {
          console.warn("[AccessPoliciesHook] Failed to increment role permissionVersion:", err.message);
        }
      }
      await invalidatePermissions(roleId);
    },

    /**
     * After a policy is updated, invalidate cache for the affected role.
     */
    afterUpdate: async (ctx) => {
      const { data, beforeDoc } = ctx;
      const roleId = data?.role?.toString?.() || beforeDoc?.role?.toString?.() || null;
      if (roleId) {
        try {
          const { default: Role } = await import("../models/Role.js");
          await Role.findByIdAndUpdate(roleId, { $inc: { permissionVersion: 1 } });
        } catch (err) {
          console.warn("[AccessPoliciesHook] Failed to increment role permissionVersion:", err.message);
        }
      }
      await invalidatePermissions(roleId);
    },

    /**
     * After a policy is deleted, invalidate all caches (can't reliably extract role
     * from the soft-deleted doc).
     */
    afterDelete: async (ctx) => {
      const { deletedDoc } = ctx;
      const roleId = deletedDoc?.role?.toString?.() || null;
      if (roleId) {
        try {
          const { default: Role } = await import("../models/Role.js");
          await Role.findByIdAndUpdate(roleId, { $inc: { permissionVersion: 1 } });
        } catch (err) {
          console.warn("[AccessPoliciesHook] Failed to increment role permissionVersion:", err.message);
        }
      }
      await invalidatePermissions(roleId);
    }
  };
}
