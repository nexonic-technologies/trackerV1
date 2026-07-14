// src/utils/contextBuilder.js
//
// Builds the unified permission context for GET /api/auth/me/context.
// This is the ONLY place where sidebar + permissions are joined.
// Frontend receives a single response containing:
//   - user profile
//   - flat permission map (derived from AccessPolicies cache, keyed by Resource.key)
//   - pre-filtered navigation tree (sidebar filtered by permissions + dept/desig)
//   - role capabilities
//   - cache version for invalidation detection

import { getPolicy, getRoleMeta, getCacheVersion } from "./cache.js";
import Employee from "../models/Employee.js";
import SideBar from "../models/SideBar.js";
import Resource from "../models/Resource.js";
import Capability from "../models/Capability.js";
import { buildMenuTree } from "../services/menuVisibilityService.js";

// Navigation cache: maps key "roleId:deptId:desigId" -> filtered navigation tree
const navigationCache = new Map();
let cachedVersion = 0;

/**
 * Immediately clear the in-memory navigation tree cache.
 * Call this whenever sidebar documents are created, updated, or deleted.
 */
export function clearNavigationCache() {
  navigationCache.clear();
}

/**
 * Build the complete user context for the frontend.
 *
 * @param {string} userId   - Employee._id
 * @param {string} roleId   - Role._id (from JWT or Employee.professionalInfo.role)
 * @returns {object} Context payload
 */
export async function buildUserContext(userId, roleId) {
  const roleStr = roleId?.toString();

  // 1. Fetch role metadata from cache (no DB query needed)
  const roleMeta = getRoleMeta(roleStr);
  if (!roleMeta) {
    throw new Error(`Role "${roleStr}" not found in cache`);
  }

  // 2. Fetch user profile
  const user = await Employee.findById(userId)
    .select(
      "basicInfo.firstName basicInfo.lastName basicInfo.email basicInfo.profileImage " +
      "professionalInfo.department professionalInfo.designation professionalInfo.role professionalInfo.empId"
    )
    .populate("professionalInfo.department", "name")
    .populate("professionalInfo.designation", "name")
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  // 3. Fetch all active Resource definitions to map keys
  const allResources = await Resource.find({ isActive: true }).lean();
  const resourceById = {};
  const resourceByModel = {};
  
  allResources.forEach((res) => {
    resourceById[res._id.toString()] = res;
    if (res.modelName) {
      resourceByModel[res.modelName] = res;
    }
  });

  // 4. Build permission map from cached AccessPolicies
  const allPolicies = getPolicy(roleStr); // entire role's policy map { modelName: policyDoc }
  const permissions = {};
  const isSuperAdmin = !!roleMeta?.isSuperAdmin || roleStr === 'agent' || roleStr === '6a25cbc1cd36294f5e578696';

  if (allPolicies && typeof allPolicies === "object") {
    for (const [modelName, policy] of Object.entries(allPolicies)) {
      const permMap = {};

      if (policy.permissions && typeof policy.permissions === "object") {
        // .lean() converts Mongoose Map → plain object, so Object.entries works
        for (const [action, allowed] of Object.entries(policy.permissions)) {
          // Super admin: override all to true
          permMap[action] = isSuperAdmin ? true : !!allowed;
        }
      }

      // For super admin, ensure standard CRUD is always present
      if (isSuperAdmin) {
        permMap.read = true;
        permMap.create = true;
        permMap.update = true;
        permMap.delete = true;
      }

      // Decouple Mongoose modelName from frontend: map to Resource.key if registered
      const permissionKey = resourceByModel[modelName]?.key || modelName;
      permissions[permissionKey] = permMap;
    }
  }

  // 5. Build or retrieve cached navigation tree
  const userDept = user.professionalInfo?.department?._id;
  const userDesig = user.professionalInfo?.designation?._id;
  
  const userDeptStr = userDept ? userDept.toString() : "all";
  const userDesigStr = userDesig ? userDesig.toString() : "all";
  const navCacheKey = `${roleStr}:${userDeptStr}:${userDesigStr}`;

  // Invalidate local navigation tree cache if global permission cache version has bumped
  const currentVersion = getCacheVersion();
  if (currentVersion !== cachedVersion) {
    navigationCache.clear();
    cachedVersion = currentVersion;
  }

  let navigation = navigationCache.get(navCacheKey);

  if (!navigation) {
    const allSidebarItems = await SideBar.find({
      isActive: true,
      isDeleted: { $ne: true }
    })
      .populate('capabilities')
      .sort({ order: 1 })
      .lean();

    // Build menu tree using sidebar capabilities comparison
    navigation = await buildMenuTree(allSidebarItems, user, roleMeta);

    // Cache the constructed tree
    navigationCache.set(navCacheKey, navigation);
  }

  // 6. Get UI capabilities from Role.capabilities
  let uiCapabilities = [];
  try {
    // Fetch role with capabilities populated
    const Role = (await import('../models/role.js')).default;
    const role = await Role.findById(roleId)
      .populate('capabilities')
      .lean();

    if (role && role.capabilities && role.capabilities.length > 0) {
      // Get capability keys
      uiCapabilities = role.capabilities
        .filter(cap => cap.status === 'active')
        .map(cap => cap.key);
    }
  } catch (error) {
    console.error('Failed to resolve UI capabilities:', error.message);
    // Fallback to empty array - UI will show all elements, backend still protected
  }

  // 7. Assemble response
  return {
    user: {
      id: userId,
      name: `${user.basicInfo?.firstName || ""} ${user.basicInfo?.lastName || ""}`.trim(),
      email: user.basicInfo?.email,
      profileImage: user.basicInfo?.profileImage,
      empId: user.professionalInfo?.empId,
      department: user.professionalInfo?.department?.name || null,
      designation: user.professionalInfo?.designation?.name || null,
      role: {
        id: roleStr,
        name: roleMeta.name,
        level: roleMeta.level,
        isSuperAdmin
      }
    },
    permissions, // Backend permissions from AccessPolicies (single source of truth)
    capabilities: uiCapabilities, // User capabilities for sidebar visibility and actions
    navigation,
    _v: currentVersion,
    _cachedAt: new Date().toISOString()
  };
}
