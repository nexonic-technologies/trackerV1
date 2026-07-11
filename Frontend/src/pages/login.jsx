import axiosInstance, { getDeviceUUID } from "../api/axiosInstance";
import { useState } from "react";
import { useAuth } from "../context/authProvider.jsx";
import { useTheme } from "../context/themeProvider.jsx";
import { jwtDecode } from "jwt-decode";
import { useNavigate, Link } from "react-router-dom";
import {
  Lock, Mail, Eye, EyeOff, Shield, Users, ClipboardList, TicketCheck,
  Moon, Sun, Sparkles, ArrowRight
} from "lucide-react";
import toast from "react-hot-toast";
import { requestFirebaseToken } from "../utils/firebase";
import { MODULES } from "../constants/uiTokens";

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [workEmail, setWorkEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleLogin = async () => {
    if (!workEmail || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    setLoading(true);
    try {
      let deviceUuid = localStorage.getItem("device_uuid");
      if (!deviceUuid) {
        deviceUuid = "web_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
        localStorage.setItem("device_uuid", deviceUuid);
      }

      const response = await axiosInstance.post("/auth/login", {
        workEmail, password, platform: "web", deviceUUID: deviceUuid,
      });

      if (response.status === 200 && response.data.accessToken) {
        const decoded = jwtDecode(response.data.accessToken);
        localStorage.setItem("auth_token", response.data.accessToken);
        localStorage.setItem("refresh_token", response.data.refreshToken);
        setUser(decoded);

        try {
          const fcmToken = await requestFirebaseToken();
          if (fcmToken) {
            await axiosInstance.post("/auth/store-push-token", {
              sessionId: response.data.sessionId, fcmToken,
            });
          }
        } catch (fcmError) {
          console.error("FCM Token registration failed:", fcmError);
        }

        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        toast.error("Login failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Users, title: "HR Management", desc: "Employees, attendance & payroll", module: MODULES.hr },
    { icon: ClipboardList, title: "Project Tracker", desc: "Tasks, milestones & deadlines", module: MODULES.project },
    { icon: TicketCheck, title: "Ticket System", desc: "Support tickets & resolution", module: MODULES.ticket },
  ];

  return (
    <div className="lmx-login-shell min-h-screen flex flex-col lg:flex-row bg-canvas text-ink relative overflow-hidden">

      {/* Animated bg shapes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[var(--module-hr-light)] opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-[var(--module-project-light)] opacity-20 blur-3xl" />
      </div>

      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-4 right-4 z-10 tracker-btn-ghost p-2 transition-transform duration-300 hover:scale-105 active:scale-95"
        aria-label="Toggle theme"
      >
        <span key={theme} className="inline-flex animate-fade-in" aria-hidden>
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </span>
      </button>

      {/* Left — brand hero */}
      <div className="hidden lg:flex lg:w-1/2 lmx-gradient-hero text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,.15) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative flex flex-col justify-center px-10 xl:px-16 py-12 max-w-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-tracker-md bg-white/15 backdrop-blur flex items-center justify-center border border-white/25">
              <Shield className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">WorkHub</h1>
          </div>

          <div className="space-y-4 mb-10">
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
              Your workspace, <br />
              <span className="text-white/90">unified.</span>
            </h2>
            <p className="text-base xl:text-lg text-white/80 max-w-md leading-relaxed">
              HR operations, project tracking, and ticket management — one platform, one login.
            </p>
          </div>

          <div className="tracker-card-plain !border-white/20 !bg-white/10 backdrop-blur-sm !border-l-0 p-5 space-y-4">
            {features.map((feat) => (
              <div key={feat.title} className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-tracker-md flex items-center justify-center flex-shrink-0 ${feat.module.iconBg}`}>
                  <feat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{feat.title}</p>
                  <p className="text-white/70 text-xs mt-0.5">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — login form */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-8 py-10 lg:py-6">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="lmx-icon-tile">
              <Shield className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-semibold text-ink">WorkHub</h1>
          </div>

          <div className="tracker-card-plain !border-l-0 p-8 sm:p-10">
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-[var(--module-accent)]" />
                <p className="lmx-page-eyebrow mb-0">SIGN IN</p>
              </div>
              <h3 className="text-2xl sm:text-[28px] font-semibold text-ink tracking-tight mt-1">
                Welcome back
              </h3>
              <p className="text-sm text-ink-muted mt-1.5">
                Sign in to your account to continue
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-ink mb-2">
                  Work Email
                </label>
                <div
                  className={`flex items-center border rounded-tracker-md transition-all bg-surface ${
                    focusedField === "email"
                      ? "border-[var(--tracker-border-focus)] ring-[3px] ring-violet-500/15"
                      : "border-hairline hover:border-ink-subtle"
                  }`}
                >
                  <Mail className="h-5 w-5 text-ink-subtle ml-3.5 flex-shrink-0" />
                  <input
                    id="login-email"
                    type="email"
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    placeholder="name@company.com"
                    autoComplete="email"
                    className="lmx-input !border-0 !shadow-none !ring-0"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="login-password" className="block text-sm font-medium text-ink">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-[var(--module-accent)] hover:text-[var(--brand-from)] transition-colors"
                  >
                    Forgot?
                  </Link>
                </div>
                <div
                  className={`flex items-center border rounded-tracker-md transition-all bg-surface ${
                    focusedField === "password"
                      ? "border-[var(--tracker-border-focus)] ring-[3px] ring-violet-500/15"
                      : "border-hairline hover:border-ink-subtle"
                  }`}
                >
                  <Lock className="h-5 w-5 text-ink-subtle ml-3.5 flex-shrink-0" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="lmx-input !border-0 !shadow-none !ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="mr-3 p-1.5 text-ink-subtle hover:text-ink transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                type="button"
                onClick={handleLogin}
                disabled={loading}
                className="tracker-btn-brand w-full mt-2 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-ink-subtle mt-6">
            Authorized personnel only
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
