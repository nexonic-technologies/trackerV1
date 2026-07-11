// src/context/themeProvider.js
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();
const THEME_TRANSITION_MS = 450;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const runThemeTransition = (applyThemeChange) => {
  if (prefersReducedMotion()) {
    applyThemeChange();
    return;
  }

  const root = document.documentElement;
  root.classList.add("theme-transition");
  void root.offsetHeight;
  applyThemeChange();

  window.setTimeout(() => {
    root.classList.remove("theme-transition");
  }, THEME_TRANSITION_MS);
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  useEffect(() => {
    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    runThemeTransition(() => {
      setTheme((prev) => (prev === "light" ? "dark" : "light"));
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
