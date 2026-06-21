import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  Switch,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
  createTheme
} from "@mui/material";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  CalendarCheck,
  FileText,
  BarChart3,
  Wallet,
  MessageSquare,
  Bot,
  Bell,
  Home as HomeIcon,
  LogOut,
  Menu,
  X,
  User,
  UserCog,
  Settings,
  FilePenLine,
  Moon,
  Sun
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import OrganizationBrand from "../components/OrganizationBrand.jsx";
import LanguageSelector from "../components/LanguageSelector.jsx";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { useLanguage } from "../contexts/LanguageContext.jsx";

const drawerWidth = 268;

const roleNavLinks = {
  Student: [
    { to: "", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "timetable", label: "Class Timetable", icon: CalendarCheck },
    { to: "assignments", label: "Assignments", icon: FileText },
    { to: "courses", label: "Courses", icon: BookOpen },
    { to: "attendance", label: "Attendance", icon: FileText },
    { to: "grades", label: "Grades", icon: BarChart3 },
    { to: "fees", label: "Fees", icon: Wallet },
    { to: "ai-assistant", label: "AI Assistant", icon: Bot },
    { to: "messages", label: "Department Messages", icon: MessageSquare }
  ],
  Faculty: [
    { to: "", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "students", label: "Students", icon: GraduationCap },
    { to: "timetable", label: "Timetable", icon: CalendarCheck },
    { to: "attendance", label: "Attendance", icon: FileText },
    { to: "grades", label: "Grades", icon: BarChart3 },
    { to: "assignments", label: "Assignments", icon: FileText },
    { to: "ai-assistant", label: "AI Assistant", icon: Bot },
    { to: "messages", label: "Messages", icon: MessageSquare }
  ],
  Admin: [
    { to: "", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "users", label: "User Approvals", icon: UserCog },
    { to: "students", label: "Student Management", icon: GraduationCap },
    { to: "faculty", label: "Faculty Management", icon: User },
    { to: "courses", label: "Course Management", icon: BookOpen },
    { to: "grades", label: "Grade Management", icon: BarChart3 },
    { to: "fees", label: "Part-Time Fees", icon: Wallet },
    { to: "messages", label: "Admin Messages", icon: MessageSquare },
    { to: "ai-assistant", label: "AI Assistant", icon: Bot },
    { to: "cms", label: "Page Customization", icon: FilePenLine },
    { to: "settings", label: "System Settings", icon: Settings }
  ],
  Finance: [
    { to: "", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "fees", label: "Part-Time Fees", icon: Wallet },
    { to: "analytics", label: "Finance Analytics", icon: BarChart3 },
    { to: "messages", label: "Messages", icon: MessageSquare },
    { to: "settings", label: "Settings", icon: Settings }
  ],
};

const roleLabels = {
  student: "Student",
  admin: "Admin",
  lecturer: "Faculty",
  faculty: "Faculty",
  department_staff: "Faculty",
  finance_officer: "Finance",
};

const roleBasePaths = {
  Student: "/student",
  Admin: "/admin",
  Faculty: "/faculty",
  Finance: "/finance",
};

function buildTheme(mode) {
  const isDark = mode === "dark";
  return createTheme({
    palette: {
      mode,
      primary: { main: "#1a73e8" },
      success: { main: "#34a853" },
      warning: { main: "#fbbc05" },
      error: { main: "#ea4335" },
      background: {
        default: isDark ? "#111827" : "#f8f9fa",
        paper: isDark ? "#1f2937" : "#ffffff"
      },
      text: {
        primary: isDark ? "#f8f9fa" : "#202124",
        secondary: isDark ? "#cbd5e1" : "#5f6368"
      },
      divider: isDark ? "rgba(255,255,255,0.12)" : "#dadce0"
    },
    typography: {
      fontFamily: '"Google Sans", Roboto, Arial, sans-serif',
      h1: { fontSize: "2rem", fontWeight: 500 },
      h2: { fontSize: "1.25rem", fontWeight: 500 },
      body1: { fontSize: "0.95rem", lineHeight: 1.5 },
      caption: { fontSize: "0.8rem" }
    },
    shape: { borderRadius: 12 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            textTransform: "none",
            fontWeight: 500
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none"
          }
        }
      }
    }
  });
}

export default function DashboardLayout({ user, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { themeMode, setThemeMode } = useTheme();
  const { t, translate } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const normalizedRole = String(user?.role || "student").toLowerCase();
  const role = roleLabels[normalizedRole] || "Student";
  const navLinks = roleNavLinks[role] || roleNavLinks.Student;
  const basePath = roleBasePaths[role] || "/student";
  const displayName = user?.name || user?.email || "User";
  const theme = useMemo(() => buildTheme(themeMode), [themeMode]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const shell = (
    <Box className={`material-portal material-portal-${themeMode}`} sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (muiTheme) => muiTheme.zIndex.drawer + 1,
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: "1px solid",
          borderColor: "divider"
        }}
      >
        <Toolbar sx={{ minHeight: 64, px: { xs: 2, md: 3 }, gap: 2 }}>
          <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ display: { md: "none" } }} aria-label={t("portal.openNav")}>
            <Menu size={22} />
          </IconButton>
          <Box sx={{ display: { xs: "none", lg: "block" } }}>
            <OrganizationBrand variant="topbar" showText={false} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
              {translate(role)} {t("portal.portal")}
            </Typography>
            <Typography variant="h2" noWrap>
              {displayName}
            </Typography>
          </Box>
          <LanguageSelector compact />
          <Tooltip title={themeMode === "dark" ? t("theme.switchLight") : t("theme.switchDark")}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
              {themeMode === "dark" ? <Moon size={17} /> : <Sun size={17} />}
              <Switch checked={themeMode === "dark"} onChange={(event) => setThemeMode(event.target.checked ? "dark" : "light")} />
            </Box>
          </Tooltip>
          <Tooltip title={t("portal.notifications")}>
            <IconButton>
              <Badge badgeContent={0} color="primary">
                <Bell size={20} />
              </Badge>
            </IconButton>
          </Tooltip>
          <Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main", fontSize: 14 }}>
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
        </Toolbar>
      </AppBar>

      <Box component="nav" aria-label="Portal navigation">
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" }
          }}
        >
          <SidebarContent navLinks={navLinks} basePath={basePath} displayName={displayName} role={role} onLogout={handleLogout} onClose={() => setDrawerOpen(false)} />
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              borderRight: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper"
            }
          }}
          open
        >
          <SidebarContent navLinks={navLinks} basePath={basePath} displayName={displayName} role={role} onLogout={handleLogout} />
        </Drawer>
      </Box>

      <Box component="main" sx={{ ml: { md: `${drawerWidth}px` }, pt: "64px", minHeight: "100vh" }}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="material-main-content"
        >
          {children}
        </motion.div>
      </Box>
    </Box>
  );

  return <ThemeProvider theme={theme}>{shell}</ThemeProvider>;
}

function SidebarContent({ navLinks, basePath, displayName, role, onLogout, onClose }) {
  const { t, translate } = useLanguage();
  const resolveLink = (to) => (to ? `${basePath}/${to}` : basePath);

  return (
    <Box sx={{ display: "flex", minHeight: "100%", flexDirection: "column" }}>
      <Toolbar sx={{ minHeight: 64, gap: 1.5, borderBottom: "1px solid", borderColor: "divider", px: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <OrganizationBrand variant="portal" />
          <Typography variant="caption" noWrap sx={{ display: "block", mt: 0.5, color: "text.secondary", textTransform: "uppercase", letterSpacing: ".08em" }}>
            {translate(role)} {t("portal.portal")}
          </Typography>
        </Box>
        {onClose && (
          <IconButton onClick={onClose} size="small" aria-label={t("portal.closeNav")}>
            <X size={18} />
          </IconButton>
        )}
      </Toolbar>

      <Box sx={{ flex: 1, overflowY: "auto", px: 1.5, py: 2 }}>
        <NavLink to="/" className="material-nav-link">
          {({ isActive }) => (
            <Box className={isActive ? "material-nav-item active" : "material-nav-item"}>
              <HomeIcon size={19} />
              <span>University Website</span>
            </Box>
          )}
        </NavLink>
        <Box sx={{ my: 1.5, borderTop: "1px solid", borderColor: "divider" }} />
        {navLinks.map((link) => (
          <NavLink key={link.to || "/"} to={resolveLink(link.to)} end={link.end} className="material-nav-link">
            {({ isActive }) => (
              <Box className={isActive ? "material-nav-item active" : "material-nav-item"}>
                <link.icon size={19} />
                <span>{translate(link.label)}</span>
              </Box>
            )}
          </NavLink>
        ))}
      </Box>

      <Box sx={{ borderTop: "1px solid", borderColor: "divider", p: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, px: 1 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 13 }}>
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: ".9rem", fontWeight: 500 }}>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("portal.signedIn")}
            </Typography>
          </Box>
        </Box>
        <button type="button" onClick={onLogout} className="material-logout-button">
          <LogOut size={18} />
          {t("portal.logout")}
        </button>
      </Box>
    </Box>
  );
}
