import { useState } from "react";
import { Search, Bell, Menu, Moon, Sun } from "lucide-react";
import { useAuth } from "../context/authProvider";
import { useTheme } from "../context/themeProvider";
import NotificationDrawer from "../components/Static/NotificationDrawer.jsx";
import ProfileImage from "../components/Common/ProfileImage.jsx";
import { useUserProfile } from "../hooks/useUserProfile.js";
import { useNotification } from "../context/notificationProvider.jsx";
import { useNavigate } from "react-router-dom";

const TopNavBar = ({ onToggleSidebar, sidebarOpen }) => {
  const { user } = useAuth();
  const { profileImage, roleName } = useUserProfile();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const { unReadCount } = useNotification();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/Search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="lmx-topbar">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="tracker-btn-ghost p-2 flex-shrink-0"
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <Menu className="h-5 w-5" />
        </button>

        <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center gap-2 border border-hairline rounded-tracker-md px-3 bg-surface-1 flex-1 max-w-md lg:max-w-lg">
          <Search className="h-4 w-4 text-ink-subtle flex-shrink-0" />
          <input
            type="search"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-ink-subtle h-9 w-full text-sm text-ink"
          />
        </form>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <div className="hidden lg:flex flex-col text-right mr-1">
          <span className="text-xs font-medium text-ink">
            {new Date().toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="text-[11px] text-ink-subtle">
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        <button type="button" className="sm:hidden tracker-btn-ghost p-2" aria-label="Search">
          <Search className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="tracker-btn-ghost p-2"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative tracker-btn-ghost p-2"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unReadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-tracker-danger rounded-full ring-2 ring-surface animate-pulse" />
          )}
        </button>

        <div className="h-6 w-px bg-hairline-soft hidden sm:block" />

        <div className="flex items-center gap-2 pl-1">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium leading-none text-ink">{user?.name || "Guest"}</p>
            <p className="text-[11px] text-ink-subtle mt-0.5 capitalize">{roleName || "Employee"}</p>
          </div>
          <div className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-hairline hover:ring-accent transition-all cursor-pointer">
            <ProfileImage
              profileImage={profileImage}
              firstName={user?.name?.split(" ")[0]}
              lastName={user?.name?.split(" ")[1]}
              size="sm"
              className="w-full h-full"
            />
          </div>
        </div>
      </div>

      {isOpen && <NotificationDrawer isOpen={isOpen} setIsOpen={setIsOpen} />}
    </header>
  );
};

export default TopNavBar;
