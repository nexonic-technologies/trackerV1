// src/services/menuVisibilityService.js
// Menu visibility service based on CBAC capabilities
// Determines which menu items should be visible based on designation + role + capabilities

import { getUserCapabilities } from './cbacCacheService.js';
import { getCapabilityForRoute } from '../Config/pageCapabilityMapping.js';

/**
 * Check if a menu item should be visible to a user
 * 
 * Visibility Logic:
 * 1. Public items: Always visible
 * 2. Protected items: Require capability check
 * 3. Department/Designation filters: Applied regardless of capability
 * 
 * @param {Object} menuItem - Sidebar menu item
 * @param {Object} user - User object with designation, role
 * @param {Set<string>} userCapabilities - User's CBAC capabilities
 * @returns {boolean} Whether the menu item should be visible
 */
export function isMenuItemVisible(menuItem, user, userCapabilities) {
  // 1. Check visibility type
  if (menuItem.visibility === 'public') {
    return true; // Public items always visible
  }



  // 4. Check capability for protected items
  if (menuItem.visibility === 'protected') {
    // Get capability required for this route
    const requiredCapability = getCapabilityForRoute(menuItem.mainRoute);

    if (!requiredCapability) {
      // No capability mapping found - default to visible for backward compatibility
      return true;
    }

    // Check if user has the required capability
    return userCapabilities.has(requiredCapability);
  }

  // Default: visible
  return true;
}

/**
 * Filter menu items based on user capabilities and designation/role
 * 
 * @param {Array} menuItems - Array of sidebar menu items
 * @param {Object} user - User object
 * @returns {Promise<Array>} Filtered menu items
 */
export async function filterMenuItems(menuItems, user) {
  if (!user || !menuItems) {
    return [];
  }

  // Get user's CBAC capabilities
  const userCapabilities = await getUserCapabilities(user);

  // Filter menu items
  const visibleItems = menuItems.filter(item =>
    isMenuItemVisible(item, user, userCapabilities)
  );

  return visibleItems;
}

/**
 * Build menu tree with parent-child relationships
 * 
 * @param {Array} menuItems - Flat array of menu items
 * @param {Object} user - User object
 * @returns {Promise<Array>} Hierarchical menu tree
 */
export async function buildMenuTree(menuItems, user) {
  const visibleItems = await filterMenuItems(menuItems, user);

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
 * @returns {Promise<Object>} Visibility stats
 */
export async function getMenuVisibilityStats(menuItems, user) {
  const visibleItems = await filterMenuItems(menuItems, user);

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
 * @returns {Promise<boolean>} Whether user can access the route
 */
export async function canAccessRoute(route, user) {
  if (!user) return false;

  const userCapabilities = await getUserCapabilities(user);
  const requiredCapability = getCapabilityForRoute(route);

  if (!requiredCapability) {
    // No capability mapping - allow access (backward compatibility)
    return true;
  }

  return userCapabilities.has(requiredCapability);
}

export default {
  isMenuItemVisible,
  filterMenuItems,
  buildMenuTree,
  getMenuVisibilityStats,
  canAccessRoute
};
