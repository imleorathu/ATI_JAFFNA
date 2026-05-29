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

const drawerWidth = 268;

const roleNavLinks = {
  Student: [
    { to: "", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "timetable", label: "Class Timetable", icon: CalendarCheck },
    { to: "assignments", label: "Assignments", icon: FileText },
    { to: "courses", label: "Courses", icon: BookOpen },
    { to: "attendance", label: "Attendance", icon: FileText },
    { to: "grades", label: "Grades", icon: BarChart3 },
    { to: "ai-assistant", label: "AI Assistant", icon: Bot },
    { to: "messages", label: "Department Messages", icon: MessageSquare },
    { to: "settings", label: "Student Settings", icon: Settings },
    { to: "fees", label: "Fees", icon: Wallet, partTimeOnly: true }
  ],
  Faculty: [
    { to: "", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "students", label: "Students", icon: GraduationCap },
    { to: "my-classes", label: "My Classes", icon: BookOpen },
    { to: "timetable", label: "Timetable", icon: CalendarCheck },
    { to: "attendance", label: "Attendance", icon: FileText },
    { to: "grades", label: "Grades", icon: BarChart3 },
    { to: "assignments", label: "Assignments", icon: FileText },
    { to: "exams", label: "Exams", icon: FileText },
    { to: "ai-assistant", label: "AI Assistant", icon: Bot },
    { to: "messages", label: "Messages", icon: MessageSquare }
  ],
  Admin: [
    { to: "", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "courses", label: "Courses", icon: BookOpen },
    { to: "assignments", label: "Assignments", icon: FileText },
    { to: "ai-assistant", label: "AI Assistant", icon: Bot },
    { to: "grades", label: "Grades", icon: BarChart3 },
    { to: "messages", label: "Announcements", icon: Bell },
    { to: "settings", label: "Settings", icon: Settings },
    { to: "users", label: "User Approvals", icon: UserCog },
    { to: "students", label: "Students", icon: GraduationCap },
    { to: "faculty", label: "Faculty", icon: User },
    { to: "cms", label: "Website CMS", icon: FilePenLine },
    { to: "analytics", label: "Analytics", icon: BarChart3 }
  ],
  Parent: [
    { to: "", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "student-progress", label: "Student Progress", icon: BarChart3 },
    { to: "attendance", label: "Attendance", icon: FileText },
    { to: "fees", label: "Fees", icon: Wallet },
    { to: "messages", label: "Messages", icon: MessageSquare }
  ]
};

const roleLabels = {
  student: "Student",
  admin: "Admin",
  lecturer: "Faculty",
  faculty: "Faculty",
  parent: "Parent"
};

const roleBasePaths = {
  Student: "/student",
  Admin: "/admin",
  Faculty: "/faculty",
  Parent: "/parent"
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
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("atiPortalTheme") || "light");
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const role = roleLabels[String(user?.role || "student").toLowerCase()] || "Student";
  const isPartTimeStudent = role === "Student" && String(user?.studentProfile?.studyMode || "").toLowerCase().replace(/\s+/g, "-") === "part-time";
  const navLinks = (roleNavLinks[role] || roleNavLinks.Student).filter((item) => !item.partTimeOnly || isPartTimeStudent);
  const basePath = roleBasePaths[role] || "/student";
  const displayName = user?.name || user?.email || "User";
  const theme = useMemo(() => buildTheme(themeMode), [themeMode]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem("atiPortalTheme", themeMode);
    document.documentElement.dataset.portalTheme = themeMode;
  }, [themeMode]);

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
          <IconButton edge="start" onClick={() => setDrawerOpen(true)} sx={{ display: { md: "none" } }} aria-label="Open navigation">
            <Menu size={22} />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
              {role} Portal
            </Typography>
            <Typography variant="h2" noWrap>
              {displayName}
            </Typography>
          </Box>
          <Tooltip title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
              {themeMode === "dark" ? <Moon size={17} /> : <Sun size={17} />}
              <Switch checked={themeMode === "dark"} onChange={(event) => setThemeMode(event.target.checked ? "dark" : "light")} />
            </Box>
          </Tooltip>
          <Tooltip title="Notifications">
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
  const resolveLink = (to) => (to ? `${basePath}/${to}` : basePath);

  return (
    <Box sx={{ display: "flex", minHeight: "100%", flexDirection: "column" }}>
      <Toolbar sx={{ minHeight: 64, gap: 1.5, borderBottom: "1px solid", borderColor: "divider", px: 2 }}>
        <Avatar sx={{ bgcolor: "primary.main", width: 38, height: 38 }}>
          <GraduationCap size={20} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontWeight: 500, color: "text.primary" }}>
            ATI Jaffna
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: ".08em" }}>
            {role} Portal
          </Typography>
        </Box>
        {onClose && (
          <IconButton onClick={onClose} size="small" aria-label="Close navigation">
            <X size={18} />
          </IconButton>
        )}
      </Toolbar>

      <Box sx={{ flex: 1, overflowY: "auto", px: 1.5, py: 2 }}>
        {navLinks.map((link) => (
          <NavLink key={link.to || "/"} to={resolveLink(link.to)} end={link.end} className="material-nav-link">
            {({ isActive }) => (
              <Box className={isActive ? "material-nav-item active" : "material-nav-item"}>
                <link.icon size={19} />
                <span>{link.label}</span>
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
              Signed in
            </Typography>
          </Box>
        </Box>
        <button type="button" onClick={onLogout} className="material-logout-button">
          <LogOut size={18} />
          Logout
        </button>
      </Box>
    </Box>
  );
}
