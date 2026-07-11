// src/services/grants.js
import { invalidateAllCache } from "./cbacCacheService.js";
import { invalidatePermissions } from "../utils/permissionInvalidator.js";
import mongoose from "mongoose";

export default function () {
  return {
    afterCreate: async async (ctx) => {
      const { docId } = ctx;
      try {
        await invalidateAllCache();
        const Grant = mongoose.model('Grant');
        const grant = await Grant.findById(docId).lean();
        const rId = grant?.roleId?.toString() || null;
        await invalidatePermissions(rId);
      } catch (err) {
        console.error("[GrantsHook] Failed to invalidate cache after create:", err.message);
      }
    },
    afterUpdate: async async (ctx) => {
      const { data } = ctx;
      try {
        await invalidateAllCache();
        const rId = data?.roleId?.toString() || null;
        await invalidatePermissions(rId);
      } catch (err) {
        console.error("[GrantsHook] Failed to invalidate cache after update:", err.message);
      }
    },
    afterDelete: async async (ctx) => {
      const { deletedDoc } = ctx;
      try {
        await invalidateAllCache();
        const rId = deletedDoc?.roleId?.toString() || null;
        await invalidatePermissions(rId);
      } catch (err) {
        console.error("[GrantsHook] Failed to invalidate cache after delete:", err.message);
      }
    }
  };
}
