// src/services/menuVisibilityService.js
// Menu visibility service based on CBAC capabilities
// Determines which menu items should be visible based on designation + role + capabilities

import { getUserCapabilities } from './cbacCacheService.js';

/**
 * Check if a menu item should be visible to a user
 *
 * Visibility Logic:
 * 1. Public items: Always visible
 * 2. Protected items: Require capability check
 * 3. Department/Designation filters: Applied regardless of capability
 * 4. Sidebar capabilities: Compare sidebar's required capabilities with user's role capabilities
 *
 * @param {Object} menuItem - Sidebar menu item with populated capabilities
 * @param {Object} user - User object with designation, role
 * @param {Set<string>} userCapabilities - User's CBAC capabilities
 * @param {Object} roleMeta - Role metadata with capabilities array
 * @returns {boolean} Whether the menu item should be visible
 */
export function isMenuItemVisible(menuItem, user, userCapabilities, roleMeta) {
  // 1. Check visibility type
  if (menuItem.visibility === 'public') {
    return true; // Public items always visible
  }

  // 2. Check department/designation filters
  const userDeptId = user.professionalInfo?.department?._id?.toString();
  const userDesigId = user.professionalInfo?.designation?._id?.toString();

  if (menuItem.allowedDepartments && menuItem.allowedDepartments.length > 0) {
    const allowedDeptIds = menuItem.allowedDepartments.map(d => d._id?.toString());
    if (!allowedDeptIds.includes(userDeptId)) {
      return false;
    }
  }

  if (menuItem.allowedDesignations && menuItem.allowedDesignations.length > 0) {
    const allowedDesigIds = menuItem.allowedDesignations.map(d => d._id?.toString());
    if (!allowedDesigIds.includes(userDesigId)) {
      return false;
    }
  }

  // 3. Check sidebar capabilities for protected items
  if (menuItem.visibility === 'protected') {
    // If sidebar has no capabilities defined, default to visible (backward compatibility)
    if (!menuItem.capabilities || menuItem.capabilities.length === 0) {
      return true;
    }

    // Get user's capabilities from role
    const userCaps = roleMeta?.capabilities || [];

    // Check if user has at least one of the required capabilities
    const requiredCaps = menuItem.capabilities.map(c => c.key);
    const hasCapability = requiredCaps.some(cap => userCaps.includes(cap));

    return hasCapability;
  }

  // Default: visible
  return true;
}

/**
 * Filter menu items based on user capabilities and designation/role
 *
 * @param {Array} menuItems - Array of sidebar menu items
 * @param {Object} user - User object
 * @param {Object} roleMeta - Role metadata with sidebarCapabilities
 * @returns {Promise<Array>} Filtered menu items
 */
export async function filterMenuItems(menuItems, user, roleMeta) {
  if (!user || !menuItems) {
    return [];
  }

  // Get user's CBAC capabilities
  const userCapabilities = await getUserCapabilities(user);

  // Filter menu items
  const visibleItems = menuItems.filter(item =>
    isMenuItemVisible(item, user, userCapabilities, roleMeta)
  );

  return visibleItems;
}

/**
 * Build menu tree with parent-child relationships
 *
 * @param {Array} menuItems - Flat array of menu items
 * @param {Object} user - User object
 * @param {Object} roleMeta - Role metadata with sidebarCapabilities
 * @returns {Promise<Array>} Hierarchical menu tree
 */
export async function buildMenuTree(menuItems, user, roleMeta) {
  const visibleItems = await filterMenuItems(menuItems, user, roleMeta);

  // Separate parents and children
  const parents = visibleItems
    .filter(item => item.isParent || !item.parentId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const children = visibleItems.filter(item => item.parentId);

  // Build tree
  const tree = parents.map(parent => ({
    ...parent,
    children: children
      .filter(child =>
        String(child.parentId) === String(parent._id) ||
        child.parentId === parent.mainRoute?.replace('/', '')
      )
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  }));

  // Remove empty parent containers
  return tree.filter(parent => {
    if (parent.hasChildren && (!parent.children || parent.children.length === 0)) {
      return false;
    }
    return true;
  });
}

/**
 * Get menu visibility summary stats for a user
 *
 * @param {Array} menuItems - All menu items
 * @param {Object} user - User object
 * @param {Object} roleMeta - Role metadata with sidebarCapabilities
 * @returns {Promise<Object>} Visibility stats
 */
export async function getMenuVisibilityStats(menuItems, user, roleMeta) {
  const visibleItems = await filterMenuItems(menuItems, user, roleMeta);

  return {
    total: menuItems.length,
    visible: visibleItems.length,
    hidden: menuItems.length - visibleItems.length,
    percentage: Math.round((visibleItems.length / menuItems.length) * 100)
  };
}

/**
 * Check if user can access a specific route
 *
 * @param {string} route - Route path
 * @param {Object} user - User object
 * @param {Object} roleMeta - Role metadata with capabilities array
 * @returns {Promise<boolean>} Whether user can access the route
 */
export async function canAccessRoute(route, user, roleMeta) {
  if (!user) return false;

  const userCapabilities = await getUserCapabilities(user);
  const userCaps = roleMeta?.capabilities || [];

  // For now, allow access if user has any capabilities
  // In the future, this can be enhanced with route-to-capability mapping
  if (userCaps.length > 0) {
    return true;
  }

  // Fallback: allow access (backward compatibility)
  return true;
}

export default {
  isMenuItemVisible,
  filterMenuItems,
  buildMenuTree,
  getMenuVisibilityStats,
  canAccessRoute
};
