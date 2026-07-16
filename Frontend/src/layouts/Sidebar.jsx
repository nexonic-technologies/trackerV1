import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Icon } from "@iconify/react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { usePermission } from "../context/permissionProvider";

const getIconifyName = (iconName) => {
  if (!iconName) return "ic:baseline-help-outline";
  if (iconName.includes(":")) return iconName;
  
  if (iconName.startsWith("Md")) {
    const kebabCase = iconName.substring(2)
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .replace(/^-/, "");
    return `ic:baseline-${kebabCase}`;
  }
  return "ic:baseline-help-outline";
};

const Sidebar = ({ isOpen, onClose, onOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { navigation, loading: permLoading } = usePermission();
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [isHovered, setIsHovered] = useState(false);

  // On desktop, the sidebar is expanded if it is pinned open OR hovered
  // On mobile, it's expanded only when isOpen is true (and it slides in)
  const isExpandedView = isOpen || isHovered;

  // Navigation comes pre-filtered from the backend context builder.
  // No separate API call needed — permissions are already applied.
  const navItems = navigation;

  const toggleExpanded = (itemId) => {
    // Only allow toggling if sidebar is expanded
    if (!isExpandedView) return;
    
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.clear();
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleNavigation = (item) => {
    if (item.hasChildren || (item.children && item.children.length > 0)) {
      if (isExpandedView) {
        toggleExpanded(item._id);
      } else {
        // If collapsed and has children, maybe open the sidebar automatically
        if (onOpen) onOpen();
      }
    } else {
      navigate(item.mainRoute);
    }
  };

  const renderNavItem = (item, isChild = false) => {
    const iconName = getIconifyName(item.icon?.iconName);
    const isActive = location.pathname === item.mainRoute;
    const isExpanded = expandedItems.has(item._id);
    const hasChildren = item.children && item.children.length > 0;

    const contentClass = `
      flex items-center gap-2.5 px-2.5 py-2 rounded-tracker-md cursor-pointer
      transition-colors duration-150 mx-2
      ${isChild ? "ml-7 text-xs" : "text-sm"}
      ${isActive ? "font-semibold text-[var(--module-accent)]" : "text-ink-muted hover:text-ink"}
    `;

    const contentStyle = isActive ? { backgroundColor: "var(--module-accent-light)" } : undefined;

    const InnerContent = (
      <>
        <Icon
          icon={iconName}
          className={`flex-shrink-0 ${isChild ? "text-sm" : "text-lg"}`}
          style={{ color: isActive ? "var(--module-accent)" : "var(--tracker-ink-subtle)" }}
        />
        
        {/* Text and chevron only visible when expanded */}
        <div className={`flex items-center flex-1 overflow-hidden transition-all duration-300 ${isExpandedView ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
          <span className="flex-1 truncate whitespace-nowrap">{item.title}</span>
          {hasChildren && (
            <Icon
              icon="ic:baseline-expand-more"
              className={`text-base flex-shrink-0 transition-transform duration-200 text-ink-subtle ${isExpanded ? "rotate-180" : ""}`}
            />
          )}
        </div>
      </>
    );

    return (
      <div key={item._id} className="w-full">
        {hasChildren ? (
          <div
            onClick={() => handleNavigation(item)}
            title={!isExpandedView ? item.title : undefined}
            className={contentClass}
            style={contentStyle}
          >
            {InnerContent}
          </div>
        ) : (
          <Link
            to={item.mainRoute || '#'}
            title={!isExpandedView ? item.title : undefined}
            className={contentClass}
            style={contentStyle}
          >
            {InnerContent}
          </Link>
        )}

        {/* Submenu */}
        <div
          className={`
            overflow-hidden transition-all duration-300 ease-in-out
            ${hasChildren && isExpanded && isExpandedView ? 'max-h-96 mt-0.5 opacity-100' : 'max-h-0 opacity-0'}
          `}
        >
          <div className="space-y-0.5 pb-1">
            {item.children?.map(child => renderNavItem(child, true))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        fixed lg:relative inset-y-0 left-0 z-40
        h-screen flex flex-col flex-shrink-0
        bg-surface border-r border-hairline-soft
        transition-all duration-300 ease-in-out overflow-hidden
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        ${isExpandedView ? "w-[240px]" : "w-[64px]"}
      `}
    >
      {/* Brand */}
      <div
        className={`flex items-center px-4 h-[60px] border-b border-hairline-soft flex-shrink-0 ${
          isExpandedView ? "justify-between" : "justify-center"
        }`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="h-8 w-8 rounded-tracker-md lmx-gradient-hero flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">W</span>
          </div>
          <span
            className={`font-semibold text-sm text-ink tracking-tight whitespace-nowrap transition-opacity duration-300 ${
              isExpandedView ? "opacity-100" : "opacity-0 hidden"
            }`}
          >
            WorkHub
          </span>
        </div>
        
        {isExpandedView && (
          <button
            onClick={onClose}
            className="tracker-btn-ghost p-1 lg:hidden flex-shrink-0"
            aria-label="Close sidebar"
          >
            <Icon icon="ic:baseline-close" className="text-lg" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {permLoading || navItems.length === 0 ? (
          <div className="px-3 py-6 flex flex-col items-center gap-2">
            <div className="h-5 w-5 border-2 border-hairline border-t-accent rounded-full animate-spin flex-shrink-0" />
            <p className={`text-xs text-ink-subtle whitespace-nowrap transition-opacity duration-300 ${isExpandedView ? "opacity-100" : "opacity-0 hidden"}`}>Loading menu…</p>
          </div>
        ) : (
          <>
            {navItems.map(item => renderNavItem(item))}
            <div className="my-2 border-t border-hairline-soft mx-2 opacity-50" />
            {renderNavItem({
              _id: "api-docs-static",
              title: "API Docs",
              mainRoute: "/documentations",
              icon: { iconName: "MdCode" }
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div
        className={`h-12 flex items-center border-t border-hairline-soft flex-shrink-0 ${
          isExpandedView ? "px-4 justify-between" : "justify-center"
        }`}
      >
        <span
          className={`text-[11px] text-ink-subtle whitespace-nowrap transition-opacity duration-300 ${
            isExpandedView ? "opacity-100" : "opacity-0 hidden"
          }`}
        >
          © {new Date().getFullYear()} Portal
        </span>

      </div>
    </aside>  );
};

export default Sidebar;