//  src/utils/cache.js

import AccessPolicies from "../models/AccessPolicies.js";
import Role from "../models/Role.js";
import mongoose from "mongoose";

const cache = new Map();
const roleCapabilityCache = new Map(); // roleId -> Set<capability>
const roleLevelCache = new Map(); // roleId -> level (1-10)
const roleMetaCache = new Map(); // roleId -> { name, isSuperAdmin, level }
const resourceKeyMap = new Map(); // businessKey -> modelName
let cacheInitialized = false;
let cacheVersion = 0;



export async function setCache() {
    try {
        // Wait for database connection
        if (mongoose.connection.readyState !== 1) {
            await new Promise((resolve) => {
                if (mongoose.connection.readyState === 1) {
                    resolve();
                } else {
                    mongoose.connection.once('connected', resolve);
                }
            });
        }

        const { default: Resource } = await import("../models/Resource.js");

        const [policies, roles, resources] = await Promise.all([
            AccessPolicies.find({}).lean(),
            Role.find({ isActive: true }).populate('capabilities').lean(),
            Resource.find({ isActive: true }).lean(),
        ]);

        cache.clear();
        policies.forEach((p) => {
            const role = p.role.toString();
            if (!cache.has(role)) cache.set(role, {});

            // Construct virtual permissions object from actions array to preserve backward compatibility
            const permissionsObj = {};
            if (Array.isArray(p.actions)) {
                p.actions.forEach((act) => {
                    permissionsObj[act] = true;
                });
            }

            // Default standard CRUD actions to false if not explicitly granted in the array
            ["read", "create", "update", "delete"].forEach((act) => {
                if (permissionsObj[act] === undefined) {
                    permissionsObj[act] = false;
                }
            });

            cache.get(role)[p.modelName] = {
                ...p,
                permissions: permissionsObj
            };
        });

        resourceKeyMap.clear();
        resources.forEach((r) => {
            if (r.key && r.modelName) {
                resourceKeyMap.set(r.key.toLowerCase(), r.modelName);
            }
        });

        roleCapabilityCache.clear();
        roleLevelCache.clear();
        roleMetaCache.clear();
        roles.forEach((r) => {
            const id = r._id.toString();
            const capKeys = (r.capabilities || [])
                .filter(cap => cap && cap.key && cap.status === 'active')
                .map(cap => cap.key);
            roleCapabilityCache.set(id, new Set(capKeys));
            roleLevelCache.set(id, r.level || 1);
            roleMetaCache.set(id, {
                name: r.name,
                isSuperAdmin: !!r.isSuperAdmin,
                level: r.level || 1,
                capabilities: capKeys,
                permissionVersion: r.permissionVersion || 1
            });
        });

        cacheVersion++;
        cacheInitialized = true;
    }
    catch (error) {
        console.error('Cache initialization error:', error.stack || error.message);
    }
}

export function getPolicy(role, modelName) {
    try {
        if (!cacheInitialized) return null;
        let roleStr = role.toString();
        if (roleStr === 'agent') {
            roleStr = '6a25cbc1cd36294f5e578696';
        }
        const roleCache = cache.get(roleStr);
        if (!roleCache) return null;
        if (!modelName) return roleCache;
        return roleCache[modelName] || null;
    } catch { return null; }
}

/**
 * Check if a role (by ObjectId string) has a given capability.
 * @param {string} roleId  - req.user.role (ObjectId as string)
 * @param {string} capability - e.g. 'manage:salarystructures'
 */
export function canDo(roleId, capability) {
    if (!cacheInitialized || !roleId) return false;
    let roleStr = roleId.toString();
    if (roleStr === 'agent') {
        roleStr = '6a25cbc1cd36294f5e578696';
    }
    return roleCapabilityCache.get(roleStr)?.has(capability) ?? false;
}

/**
 * Get the level (1-10) for a role.
 * Used by dashboard to determine layout variant without hardcoding role names.
 * @param {string} roleId - role ObjectId as string
 * @returns {number} level 1-10, defaults to 1
 */
export function getRoleLevel(roleId) {
    if (!cacheInitialized || !roleId) return 1;
    return roleLevelCache.get(roleId.toString()) || 1;
}

/**
 * Get cached role metadata (name, isSuperAdmin, level, capabilities).
 * Used by contextBuilder to avoid an extra DB query.
 * @param {string} roleId - role ObjectId as string
 * @returns {object|null} { name, isSuperAdmin, level, capabilities }
 */
export function getRoleMeta(roleId) {
    if (!cacheInitialized || !roleId) return null;
    return roleMetaCache.get(roleId.toString()) || null;
}

/**
 * Get current cache version counter.
 * Incremented on every setCache() call.
 * Used by contextBuilder for cache busting on the frontend.
 * @returns {number}
 */
export function getCacheVersion() {
    return cacheVersion;
}

/**
 * Check if cache is ready.
 * @returns {boolean}
 */
export function isCacheReady() {
    return cacheInitialized;
}

/**
 * Translate a business resource key (e.g. "leave") to its Mongoose modelName (e.g. "leaves").
 * If no mapping exists, returns the original key as a fallback.
 * @param {string} resourceKey
 * @returns {string} Mongoose modelName
 */
export function getModelName(resourceKey) {
    if (!cacheInitialized || !resourceKey) return resourceKey;
    return resourceKeyMap.get(resourceKey.toLowerCase()) || resourceKey;
}

export default cache;

