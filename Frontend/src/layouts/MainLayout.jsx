import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { Menu, X, LogIn, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import logoSrc from "../assets/ATI Jaffna Logo.png";

const navItems = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Faculties", path: "/faculties" },
  { label: "Courses", path: "/courses" },
  { label: "News", path: "/news" },
  { label: "Contact", path: "/contact" }
];

const accountItems = [
  { label: "Login", path: "/login", icon: LogIn, variant: "secondary" },
  { label: "Register", path: "/register", icon: UserPlus, variant: "primary" }
];

const containerVariants = {
  hidden: { opacity: 0, y: -24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  }
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
  const { scrollY } = useScroll();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const goTo = (path) => {
    navigate(path);
    setOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const isHome = location.pathname === "/";
  const isAuthPage = ["/login", "/register"].some((path) => location.pathname === path);

  return (
    <div className="app-shell min-h-screen text-clay-text">
      <motion.header
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="clay-navbar floating-navbar fixed inset-x-4 z-50 mx-auto max-w-7xl"
        style={{ top: useTransform(scrollY, [0, 60], [16, 12]) }}
      >
        <motion.nav
          className="flex items-center gap-3 px-5 sm:px-7 lg:px-8"
          style={{ paddingTop: useTransform(scrollY, [0, 60], [12, 8]), paddingBottom: useTransform(scrollY, [0, 60], [12, 8]) }}
        >
          <motion.button
            onClick={() => goTo("/")}
            className="group flex min-w-0 items-center gap-2.5 text-left"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <img src={logoSrc} alt="ATI Jaffna" className="h-8 w-auto" />
            <span className="nav-logo-text min-w-0">
              <span className="nav-logo-title">ATI Jaffna</span>
              <span className="nav-logo-sub hidden sm:block">Advanced Technological Institute</span>
            </span>
          </motion.button>

          <div className="clay-nav-pill mx-auto xl:flex">
            {navItems.map((item, i) => (
              <motion.button
                key={item.label}
                custom={i}
                variants={navItemVariants}
                initial="hidden"
                animate="visible"
                onClick={() => goTo(item.path)}
                className={`clay-nav-item ${isActive(item.path) ? "clay-nav-active" : ""}`}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                {item.label}
              </motion.button>
            ))}
          </div>

          <div className="hidden items-center gap-3 xl:flex">
            {accountItems.map((item) => {
              const ButtonIcon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => goTo(item.path)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    item.variant === "primary"
                      ? "border-transparent bg-blue-600 text-white hover:bg-blue-500"
                      : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  <ButtonIcon size={16} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <motion.button
            className="ml-auto grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white xl:hidden"
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
              className="clay-mobile-menu fixed inset-0 z-40 flex flex-col px-6 pb-8 pt-28 xl:hidden"
            >
              <div className="mx-auto flex w-full max-w-sm grow flex-col justify-center gap-3">
                <div className="grid gap-1">
                  {navItems.map((item, i) => (
                    <motion.button
                      key={item.label}
                      onClick={() => goTo(item.path)}
                      className={`rounded-xl border border-transparent px-5 py-3.5 text-left text-base font-bold transition ${
                        isActive(item.path)
                          ? "border-blue-500/20 bg-blue-500/15 text-white shadow-lg shadow-blue-500/10"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.04, duration: 0.3, ease: "easeOut" }}
                    >
                      {item.label}
                    </motion.button>
                  ))}
                </div>
                <div className="grid gap-2">
                  {accountItems.map((item) => {
                    const ButtonIcon = item.icon;
                    return (
                      <motion.button
                        key={item.label}
                        onClick={() => goTo(item.path)}
                        className={`rounded-xl px-5 py-3.5 text-left text-base font-bold transition ${
                          item.variant === "primary"
                            ? "border border-transparent bg-blue-600 text-white hover:bg-blue-500"
                            : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                        }`}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + navItems.length * 0.03, duration: 0.3, ease: "easeOut" }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <ButtonIcon size={16} />
                          {item.label}
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
      <main className={`${!isHome ? "pt-[84px]" : ""} ${isAuthPage ? "bg-slate-950" : ""}`}>
        <Outlet />
      </main>
      {!isAuthPage && (
        <footer className="mt-8 border-t border-white/5 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0d6efd]/30 px-4 py-10 text-white">
          <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <h3 className="text-xl font-black">ATI Jaffna</h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/70">Empowering students through quality education, practical skills, and community-minded learning.</p>
            </div>
            <div>
              <p className="font-bold">Contact</p>
              <p className="mt-3 text-sm text-white/70">info@atijaffna.edu.lk</p>
              <p className="text-sm text-white/70">+94 21 000 0000</p>
            </div>
            <div>
              <p className="font-bold">Campus</p>
              <p className="mt-3 text-sm text-white/70">Jaffna, Northern Province, Sri Lanka</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
