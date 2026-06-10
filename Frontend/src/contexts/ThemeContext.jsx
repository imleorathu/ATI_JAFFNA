import { createContext, useContext, useLayoutEffect, useState } from "react";

const THEME_KEY = "atiSiteTheme";
const ThemeContext = createContext(null);

function readStoredTheme() {
  const storedTheme = localStorage.getItem(THEME_KEY) || localStorage.getItem("atiPortalTheme");
  if (storedTheme === "dark" || storedTheme === "light") return storedTheme;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(readStoredTheme);

  useLayoutEffect(() => {
    localStorage.setItem(THEME_KEY, themeMode);
    localStorage.setItem("atiPortalTheme", themeMode);
    document.documentElement.dataset.siteTheme = themeMode;
    document.documentElement.dataset.portalTheme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
  }, [themeMode]);

  const toggleTheme = () => setThemeMode((current) => (current === "dark" ? "light" : "dark"));

  return <ThemeContext.Provider value={{ themeMode, setThemeMode, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider.");
  return context;
}
