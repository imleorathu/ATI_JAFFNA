import { AnimatePresence, motion } from "framer-motion";
import {
  Facebook,
  Instagram,
  Linkedin,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Moon,
  Phone,
  Sun,
  X,
  Youtube
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import OrganizationBrand from "../components/OrganizationBrand.jsx";
import LanguageSelector from "../components/LanguageSelector.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";

const navItems = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Faculties", path: "/faculties" },
  { label: "Courses", path: "/courses" },
  { label: "News", path: "/news" },
  { label: "Donation", path: "/donation-wall" },
  { label: "Contact", path: "/contact" }
];

const footerQuickLinks = navItems;

const footerSocialLinks = [
  { label: "Facebook", href: "https://www.facebook.com/", icon: Facebook },
  { label: "Instagram", href: "https://www.instagram.com/", icon: Instagram },
  { label: "LinkedIn", href: "https://www.linkedin.com/", icon: Linkedin },
  { label: "YouTube", href: "https://www.youtube.com/", icon: Youtube }
];

const portalPathForRole = (role) => {
  const normalized = String(role || "student").toLowerCase();
  if (normalized === "admin") return "/admin";
  if (normalized === "faculty" || normalized === "lecturer" || normalized === "staff") return "/faculty";
  return "/student";
};

const portalLabelForRole = (role) => {
  const normalized = String(role || "student").toLowerCase();
  if (normalized === "admin") return "Admin Portal";
  if (normalized === "faculty" || normalized === "lecturer" || normalized === "staff") return "Staff Portal";
  return "Student Portal";
};

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothStep = (value) => value * value * (3 - 2 * value);
const mix = (from, to, progress) => Math.round(from + (to - from) * progress);
const mixAlpha = (from, to, progress) => Number((from + (to - from) * progress).toFixed(3));

const rgbaMix = (from, to, progress) => {
  const eased = smoothStep(progress);
  return `rgba(${mix(from[0], to[0], eased)}, ${mix(from[1], to[1], eased)}, ${mix(from[2], to[2], eased)}, ${mixAlpha(from[3], to[3], eased)})`;
};

const navItemVariants = {
  hidden: { opacity: 0, y: -8 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.35 + i * 0.04, duration: 0.35, ease: "easeOut" }
  })
};

const mobileMenuVariants = {
  hidden: { opacity: 0, scale: 0.96, y: -12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -12,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

export default function MainLayout() {
  const [open, setOpen] = useState(false);
  const [homeNavProgress, setHomeNavProgress] = useState(1);
  const [hasScrolledHome, setHasScrolledHome] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { themeMode, toggleTheme } = useTheme();
  const { t, translate } = useLanguage();
  const currentYear = new Date().getFullYear();

  const accountItems = useMemo(() => {
    if (isAuthenticated) {
      return [
        { label: "Logout", path: null, icon: LogOut, variant: "secondary", action: logout }
      ];
    }
    return [
      { label: "Login", path: "/login", icon: LogIn, variant: "primary" }
    ];
  }, [isAuthenticated, user, logout]);

  const dashboardItem = useMemo(() => {
    if (!isAuthenticated) return null;
    return { label: portalLabelForRole(user?.role), path: portalPathForRole(user?.role) };
  }, [isAuthenticated, user]);

  const isHomePage = location.pathname === "/";
  const isHeroNavPage = isHomePage || location.pathname === "/donation-wall";
  const isAuthPage = ["/login", "/register"].some((path) => location.pathname === path);
  const isNavbarVisible = !isHeroNavPage || hasScrolledHome;

  const navbarStyle = useMemo(() => {
    if (!isHeroNavPage) return undefined;

    const progress = clamp(homeNavProgress);
    const isDarkTheme = themeMode === "dark";
    const heroPalette = isDarkTheme
      ? {
          bg: [2, 6, 23, 0.78],
          border: [125, 211, 252, 0.18],
          text: [248, 250, 252, 1],
          muted: [226, 232, 240, 0.88],
          hover: [255, 255, 255, 0.1],
          controlBg: [255, 255, 255, 0.06],
          logoBorder: [125, 211, 252, 0.24],
          shadowAlpha: 0.28,
          active: [125, 211, 252, 1]
        }
      : {
          bg: [2, 6, 23, 0.72],
          border: [255, 255, 255, 0.12],
          text: [255, 255, 255, 1],
          muted: [255, 255, 255, 0.86],
          hover: [255, 255, 255, 0.14],
          controlBg: [255, 255, 255, 0.08],
          logoBorder: [255, 255, 255, 0.26],
          shadowAlpha: 0.22,
          active: [147, 197, 253, 1]
        };
    const settledPalette = isDarkTheme
      ? {
          bg: [2, 6, 23, 0.9],
          border: [125, 211, 252, 0.16],
          text: [248, 250, 252, 1],
          muted: [226, 232, 240, 0.82],
          hover: [255, 255, 255, 0.08],
          controlBg: [255, 255, 255, 0.05],
          logoBorder: [125, 211, 252, 0.24],
          shadowAlpha: 0.32,
          active: [125, 211, 252, 1]
        }
      : {
          bg: [255, 255, 255, 0.96],
          border: [15, 23, 42, 0.1],
          text: [2, 6, 23, 1],
          muted: [2, 6, 23, 1],
          hover: [15, 23, 42, 0.06],
          controlBg: [255, 255, 255, 0],
          logoBorder: [15, 23, 42, 0.12],
          shadowAlpha: 0,
          active: [26, 115, 232, 1]
        };

    return {
      "--site-nav-bg": rgbaMix(heroPalette.bg, settledPalette.bg, progress),
      "--site-nav-border-color": rgbaMix(heroPalette.border, settledPalette.border, progress),
      "--site-nav-text": rgbaMix(heroPalette.text, settledPalette.text, progress),
      "--site-nav-muted-text": rgbaMix(heroPalette.muted, settledPalette.muted, progress),
      "--site-nav-control-hover": rgbaMix(heroPalette.hover, settledPalette.hover, progress),
      "--site-nav-control-bg": rgbaMix(heroPalette.controlBg, settledPalette.controlBg, progress),
      "--site-nav-logo-border": rgbaMix(heroPalette.logoBorder, settledPalette.logoBorder, progress),
      "--site-nav-logo-shadow": `0 ${mix(8, 4, progress)}px ${mix(18, 12, progress)}px rgba(2, 6, 23, ${mixAlpha(heroPalette.shadowAlpha, isDarkTheme ? 0.32 : 0.1, progress)})`,
      "--site-nav-shadow": `0 ${mix(16, isDarkTheme ? 12 : 1, progress)}px ${mix(38, isDarkTheme ? 34 : 0, progress)}px rgba(2, 6, 23, ${mixAlpha(heroPalette.shadowAlpha, settledPalette.shadowAlpha, progress)})`,
      "--site-nav-active": rgbaMix(heroPalette.active, settledPalette.active, progress)
    };
  }, [homeNavProgress, isHeroNavPage, themeMode]);

  const headerStyle = useMemo(() => ({
    ...(navbarStyle || {}),
    pointerEvents: isNavbarVisible ? "auto" : "none"
  }), [isNavbarVisible, navbarStyle]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    const isHeroNavPage = location.pathname === "/" || location.pathname === "/donation-wall";
    let frameId = 0;

    const calculateProgress = () => {
      if (!isHeroNavPage) return 1;

      const transitionLength = Math.min(340, window.innerHeight * 0.32);
      const transitionStart = window.innerHeight - transitionLength;
      return clamp((window.scrollY - transitionStart) / transitionLength);
    };

    const updateNavbarMode = () => {
      frameId = 0;
      const nextProgress = calculateProgress();
      setHasScrolledHome(!isHeroNavPage || window.scrollY > 12);
      setHomeNavProgress((current) => (Math.abs(current - nextProgress) < 0.005 ? current : nextProgress));
    };

    const scheduleUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(updateNavbarMode);
    };

    updateNavbarMode();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [location.pathname]);

  const goTo = (path) => {
    navigate(path);
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app-shell min-h-screen text-clay-text">
      <motion.header
        initial={{ opacity: 0, y: -24, scale: 0.96 }}
        animate={{
          opacity: isNavbarVisible ? 1 : 0,
          y: isNavbarVisible ? 0 : -28,
          scale: isNavbarVisible ? 1 : 0.96
        }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={`site-clean-navbar fixed inset-x-0 top-0 z-50 ${isHeroNavPage ? "home-hero-navbar" : ""}`}
        style={headerStyle}
      >
        <motion.nav
          className="site-clean-nav mx-auto flex max-w-7xl items-center gap-5 px-5 sm:px-7 lg:px-8"
        >
          <motion.button
            onClick={() => goTo("/")}
            className="site-clean-brand group flex min-w-0 items-center gap-2.5 text-left"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <OrganizationBrand variant="nav" showText={false} />
          </motion.button>

          <div className="site-clean-nav-links mx-auto hidden xl:flex">
            {navItems.map((item, i) => (
              <motion.button
                key={item.label}
                custom={i}
                variants={navItemVariants}
                initial="hidden"
                animate="visible"
                onClick={() => goTo(item.path)}
                className={`site-clean-nav-item ${isActive(item.path) ? "active" : ""}`}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                {translate(item.label)}
              </motion.button>
            ))}
            {dashboardItem && (
              <motion.button
                key={dashboardItem.label}
                custom={navItems.length}
                variants={navItemVariants}
                initial="hidden"
                animate="visible"
                onClick={() => goTo(dashboardItem.path)}
                className={`site-clean-nav-item ${isActive(dashboardItem.path) ? "active" : ""}`}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                {translate(dashboardItem.label)}
              </motion.button>
            )}
          </div>

          <div className="site-clean-actions hidden xl:flex">
            <LanguageSelector compact />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={themeMode === "dark" ? t("theme.switchLight") : t("theme.switchDark")}
              aria-pressed={themeMode === "dark"}
              className="site-clean-icon-button site-theme-toggle-glass"
            >
              <span className="site-theme-toggle-glass-icon">
                {themeMode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </span>
            </button>
            {accountItems.map((item) => {
              const ButtonIcon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => item.action ? item.action() : goTo(item.path)}
                  className={`site-clean-cta site-clean-cta-${item.variant}`}
                >
                  <ButtonIcon size={16} />
                  {translate(item.label)}
                </button>
              );
            })}
          </div>

          <motion.button
            className="site-clean-menu-button ml-auto xl:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
            whileTap={{ scale: 0.9 }}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </motion.button>
        </motion.nav>

        <AnimatePresence>
          {open && (
            <motion.div
              variants={mobileMenuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="site-clean-mobile-menu fixed inset-0 z-40 flex flex-col px-6 pb-8 pt-28 xl:hidden"
            >
              <div className="mx-auto flex w-full max-w-sm grow flex-col justify-center gap-3">
                <div className="grid gap-1">
                  {navItems.map((item, i) => (
                    <motion.button
                      key={item.label}
                      onClick={() => goTo(item.path)}
                      className={`site-mobile-nav-item ${isActive(item.path) ? "active" : ""}`}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.04, duration: 0.3, ease: "easeOut" }}
                    >
                      {translate(item.label)}
                    </motion.button>
                  ))}
                  {dashboardItem && (
                    <motion.button
                      key={dashboardItem.label}
                      onClick={() => goTo(dashboardItem.path)}
                      className={`site-mobile-nav-item ${isActive(dashboardItem.path) ? "active" : ""}`}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + navItems.length * 0.04, duration: 0.3, ease: "easeOut" }}
                    >
                      {translate(dashboardItem.label)}
                    </motion.button>
                  )}
                </div>
                <LanguageSelector />
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={themeMode === "dark" ? t("theme.switchLight") : t("theme.switchDark")}
                  aria-pressed={themeMode === "dark"}
                  className="site-theme-toggle site-theme-toggle-mobile site-theme-toggle-glass-mobile"
                >
                  <span className="site-theme-toggle-glass-icon">
                    {themeMode === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                  </span>
                  <span>{themeMode === "dark" ? t("theme.switchLight") : t("theme.switchDark")}</span>
                </button>
                <div className="grid gap-2">
                  {accountItems.map((item) => {
                    const ButtonIcon = item.icon;
                    return (
                      <motion.button
                        key={item.label}
                        onClick={() => { item.action ? item.action() : goTo(item.path); }}
                        className={`site-nav-account-button site-nav-account-${item.variant} site-nav-account-mobile`}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + navItems.length * 0.03, duration: 0.3, ease: "easeOut" }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <ButtonIcon size={16} />
                          {translate(item.label)}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
      <main className={`${isHeroNavPage ? "" : "pt-[90px]"} ${isAuthPage ? "auth-page-main" : ""}`}>
        <Outlet />
      </main>
      <footer className="mt-8 border-t border-white/10 bg-slate-950 px-4 py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1fr_0.8fr]">
          <div>
            <OrganizationBrand variant="footer" />
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">{t("footer.description")}</p>
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-white">Quick Links</p>
            <div className="mt-4 grid gap-2">
              {footerQuickLinks.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => goTo(item.path)}
                  className="w-fit text-sm font-semibold text-white/70 transition hover:text-white"
                >
                  {translate(item.label)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-white">Contact Information</p>
            <div className="mt-4 grid gap-3 text-sm text-white/70">
              <a className="inline-flex items-start gap-2 transition hover:text-white" href="mailto:info@atijaffna.edu.lk">
                <Mail className="mt-0.5 shrink-0" size={16} />
                info@atijaffna.edu.lk
              </a>
              <a className="inline-flex items-start gap-2 transition hover:text-white" href="tel:+94210000000">
                <Phone className="mt-0.5 shrink-0" size={16} />
                +94 21 000 0000
              </a>
              <p className="inline-flex items-start gap-2">
                <MapPin className="mt-0.5 shrink-0" size={16} />
                <span>{t("footer.location")}</span>
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-white">Social Media Links</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {footerSocialLinks.map((item) => {
                const SocialIcon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    title={item.label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                  >
                    <SocialIcon size={18} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-2 border-t border-white/10 pt-5 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright &copy; {currentYear} ATI Jaffna. All rights reserved.</p>
          <p>Sri Lanka Institute of Advanced Technological Education</p>
        </div>
      </footer>
    </div>
  );
}
