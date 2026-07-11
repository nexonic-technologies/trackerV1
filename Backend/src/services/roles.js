import { invalidatePermissions } from "../utils/permissionInvalidator.js";
import Role from "../models/Role.js";

export default function () {
  return {
    beforeCreate: async (ctx) => {
      const { body, user } = ctx;
      if (body && body.isSuperAdmin === true) {
        const isSuperAdmin = user?.role === 'Super Admin' || user?.role === 'superadmin' || user?.isSuperAdmin === true;
        if (!isSuperAdmin) {
          throw new Error("Privilege escalation protection: Only Super Admins can create a role with isSuperAdmin=true");
        }
      }
    },
    beforeUpdate: async (ctx) => {
      const { body, user } = ctx;
      if (body && body.isSuperAdmin === true) {
        const isSuperAdmin = user?.role === 'Super Admin' || user?.role === 'superadmin' || user?.isSuperAdmin === true;
        if (!isSuperAdmin) {
          throw new Error("Privilege escalation protection: Only Super Admins can update a role with isSuperAdmin=true");
        }
      }
    },
    afterUpdate: async (ctx) => {
      const { docId } = ctx;
      try {
        // Increment permissionVersion so clients know to refetch context
        await Role.findByIdAndUpdate(docId, { $inc: { permissionVersion: 1 } });

        // Refresh policy + roleMeta caches, broadcast via socket
        await invalidatePermissions(docId.toString());
      } catch (err) {
        console.error("[RolesHook] afterUpdate failed:", err.message);
      }
    }
  };
}
