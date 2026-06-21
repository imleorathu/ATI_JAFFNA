import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import Faculties from "./pages/Faculties.jsx";
import Courses from "./pages/Courses.jsx";
import News from "./pages/News.jsx";
import BlogDetail from "./pages/BlogDetail.jsx";
import Contact from "./pages/Contact.jsx";
import StudentDashboard from "./pages/dashboard/StudentDashboard.jsx";
import AdminDashboard from "./pages/dashboard/AdminDashboard.jsx";
import StudentManagement from "./pages/dashboard/StudentManagement.jsx";
import UserManagement from "./pages/dashboard/UserManagement.jsx";
import FacultyManagement from "./pages/dashboard/FacultyManagement.jsx";
import CourseManagement from "./pages/dashboard/CourseManagement.jsx";
import CmsManagement from "./pages/dashboard/CmsManagement.jsx";
import TimetablePage from "./pages/dashboard/TimetablePage.jsx";
import AttendancePage from "./pages/dashboard/AttendancePage.jsx";
import GradesPage from "./pages/dashboard/GradesPage.jsx";
import AssignmentsPage from "./pages/dashboard/AssignmentsPage.jsx";
import FeesPage from "./pages/dashboard/FeesPage.jsx";
import LMSDashboard from "./pages/lms/LMSDashboard.jsx";
import FacultyDashboard from "./pages/faculty/FacultyDashboard.jsx";
import MessagesPage from "./pages/communication/MessagesPage.jsx";
import AnalyticsPage from "./pages/dashboard/AnalyticsPage.jsx";
import SettingsPage from "./pages/dashboard/SettingsPage.jsx";
import AIAssistant from "./components/AIAssistant.jsx";
import { useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext.jsx";

function MainSite() {
  const location = useLocation();
  const hideAi = ["/login", "/register", "/change-password", "/faculty"].some((path) => location.pathname.startsWith(path));

  return (
    <>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/about" element={<About />} />
          <Route path="/faculties" element={<Faculties />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:slug" element={<BlogDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      {!hideAi && <AIAssistant />}
    </>
  );
}

function PortalPlaceholder({ title }) {
  return (
    <div className="classroom-card">
      <p className="text-sm font-medium uppercase tracking-[0.14em] text-[color:var(--md-primary)]">ATI Jaffna</p>
      <h1 className="mt-3">{title}</h1>
      <p className="mt-2 classroom-body text-[color:var(--md-text-secondary)]">This workspace is ready for content and workflow integration.</p>
    </div>
  );
}

function StudentRoutes() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout user={user}>
      <Routes>
        <Route path="" element={<StudentDashboard user={user} />} />
        <Route path="courses" element={<LMSDashboard />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="grades" element={<GradesPage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="announcements" element={<MessagesPage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="ai-assistant" element={<AIAssistant />} />
        <Route path="*" element={<Navigate to="/student" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

function AdminRoutes() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout user={user}>
      <Routes>
        <Route path="" element={<AdminDashboard user={user} />} />
        <Route path="grades" element={<GradesPage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="students" element={<StudentManagement />} />
        <Route path="faculty" element={<FacultyManagement />} />
        <Route path="courses" element={<CourseManagement />} />
        <Route path="cms" element={<CmsManagement />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="ai-assistant" element={<AIAssistant />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

function FacultyRoutes() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout user={user}>
      <Routes>
        <Route path="" element={<FacultyDashboard user={user} />} />
        <Route path="students" element={<StudentManagement />} />
        <Route path="timetable" element={<TimetablePage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="grades" element={<GradesPage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="ai-assistant" element={<AIAssistant />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="*" element={<Navigate to="/faculty" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

function FinanceRoutes() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout user={user}>
      <Routes>
        <Route path="" element={<FeesPage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/finance" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/student/*" element={<StudentRoutes />} />
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="/faculty/*" element={<FacultyRoutes />} />
      <Route path="/finance/*" element={<FinanceRoutes />} />
      <Route path="/*" element={<MainSite />} />
    </Routes>
  );
}
