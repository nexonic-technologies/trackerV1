import { useRoutes, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../context/authProvider.jsx";
import routes from "~react-pages";
import Sidebar from "./sidebar.jsx";
import TopNavBar from "./topNavBar.jsx";
import Login from "../pages/login.jsx";
import ForgotPassword from "../pages/forgotPassword.jsx";
import ResetPassword from "../pages/resetPassword.jsx";
import AcademyLayout from "../pages/academy/index.jsx"
import { useState, useEffect, useCallback, memo, useRef } from "react";
import ModernLoader from "../components/Common/ModernLoader.jsx";
import { ErrorBoundary } from "../components/ErrorBoundary.jsx";

// Memoized static layout components — only re-render when their own props change,
// NOT when location changes in the parent BaseLayout.
const MemoSidebar = memo(Sidebar);
const MemoTopNavBar = memo(TopNavBar);

// Isolated navigation loader: subscribes to location itself so BaseLayout
// never re-renders just because the route changed.
const NavigationLoader = memo(() => {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const prevPathname = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPathname.current) {
      prevPathname.current = location.pathname;
      setIsNavigating(true);
      const timer = setTimeout(() => setIsNavigating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return isNavigating ? <ModernLoader message="Loading page..." /> : null;
});

const BaseLayout = () => {
  const location = useLocation();
  const element = useRoutes(routes);
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Stable callbacks — declared at the top before any early returns to respect the Rules of Hooks
  const handleCloseSidebar = useCallback(() => setSidebarOpen(false), []);
  const handleOpenSidebar = useCallback(() => setSidebarOpen(true), []);
  const handleToggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);

  // Auto-collapse on mobile
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const handler = (e) => setSidebarOpen(!e.matches);
    handler(mql);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Close mobile overlay on navigation
  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, [location.pathname]);

  const publicPaths = ["/login", "/forgot-password", "/reset-password", "/academy"];


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-canvas">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-ink-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && !publicPaths.includes(location.pathname)) {
    return <Navigate to="/login" replace />;
  }

  if (user && publicPaths.includes(location.pathname)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (location.pathname === "/login") return <Login />;
  if (location.pathname === "/forgot-password") return <ForgotPassword />;
  if (location.pathname === "/reset-password") return <ResetPassword />;
  if (location.pathname === "/academy") return <AcademyLayout />;

  return (
    <div className="lmx-app-shell">
      {/* NavigationLoader manages its own location subscription — BaseLayout stays stable */}
      <NavigationLoader />

      {sidebarOpen && (
        <div
          className="fixed inset-0 tracker-overlay z-30 lg:hidden"
          onClick={handleCloseSidebar}
          aria-hidden
        />
      )}

      <MemoSidebar
        isOpen={sidebarOpen}
        onClose={handleCloseSidebar}
        onOpen={handleOpenSidebar}
      />

      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300"
        style={{ marginLeft: 0 }}
      >
        <MemoTopNavBar onToggleSidebar={handleToggleSidebar} sidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-y-auto bg-canvas relative">
          <div className="lmx-content">
            <ErrorBoundary key={location.pathname}>
              {element}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
};

export default BaseLayout;
