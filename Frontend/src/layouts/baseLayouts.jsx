import { useRoutes, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../context/authProvider.jsx";
import routes from "~react-pages";
import Sidebar from "./sidebar.jsx";
import TopNavBar from "./topNavBar.jsx";
import Login from "../pages/login.jsx";
import ForgotPassword from "../pages/forgotPassword.jsx";
import ResetPassword from "../pages/resetPassword.jsx";
import AcademyLayout from "../pages/academy/index.jsx"
import { useState, useEffect, useRef } from "react";
import ModernLoader from "../components/Common/ModernLoader.jsx";

const BaseLayout = () => {
  const location = useLocation();
  const element = useRoutes(routes);
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const prevPathname = useRef(location.pathname);


  // Trigger minimum 300ms loading overlay on page navigation
  useEffect(() => {
    if (location.pathname !== prevPathname.current) {
      prevPathname.current = location.pathname;
      setIsNavigating(true);
      const timer = setTimeout(() => {
        setIsNavigating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

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
  console.log(routes.map((r) => r.path));

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
      {isNavigating && <ModernLoader message="Loading page..." />}

      {sidebarOpen && (
        <div
          className="fixed inset-0 tracker-overlay z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpen={() => setSidebarOpen(true)}
      />

      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300"
        style={{ marginLeft: 0 }}
      >
        <TopNavBar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} sidebarOpen={sidebarOpen} />
        <main className="flex-1 overflow-y-auto bg-canvas relative">
          <div className="lmx-content">{element}</div>
        </main>
      </div>
    </div>
  );
};

export default BaseLayout;
