import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowRight, CircleArrowUp, CircleSlash, LockKeyhole, Mail, Wrench } from "lucide-react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import { useAuth } from "./contexts/AuthContext.jsx";

const Home = lazy(() => import("./pages/Home.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const AlumniRegister = lazy(() => import("./pages/AlumniRegister.jsx"));
const AlumniDashboard = lazy(() => import("./pages/alumni/AlumniDashboard.jsx"));
const AlumniProfilePage = lazy(() => import("./pages/alumni/AlumniProfilePage.jsx"));
const AlumniFeedPage = lazy(() => import("./pages/alumni/AlumniFeedPage.jsx"));
const AlumniDirectoryPage = lazy(() => import("./pages/alumni/AlumniDirectoryPage.jsx"));
const AlumniPublicProfilePage = lazy(() => import("./pages/alumni/AlumniPublicProfilePage.jsx"));
const AlumniConnectionsPage = lazy(() => import("./pages/alumni/AlumniConnectionsPage.jsx"));
const AlumniNotificationsPage = lazy(() => import("./pages/alumni/AlumniNotificationsPage.jsx"));
const AlumniSavedPage = lazy(() => import("./pages/alumni/AlumniSavedPage.jsx"));
const AlumniVerificationPage = lazy(() => import("./pages/alumni/AlumniVerificationPage.jsx"));
const AlumniPrivacyPage = lazy(() => import("./pages/alumni/AlumniPrivacyPage.jsx"));
const AlumniChatPage = lazy(() => import("./pages/alumni/AlumniChatPage.jsx"));
const AlumniManagement = lazy(() => import("./pages/dashboard/AlumniManagement.jsx"));
const AlumniVerificationManagement = lazy(() => import("./pages/dashboard/AlumniVerificationManagement.jsx"));
const AlumniModerationPage = lazy(() => import("./pages/dashboard/AlumniModerationPage.jsx"));
const ChangePassword = lazy(() => import("./pages/ChangePassword.jsx"));
const Faculties = lazy(() => import("./pages/Faculties.jsx"));
const Courses = lazy(() => import("./pages/Courses.jsx"));
const News = lazy(() => import("./pages/News.jsx"));
const BlogDetail = lazy(() => import("./pages/BlogDetail.jsx"));
const Contact = lazy(() => import("./pages/Contact.jsx"));
const DonationPage = lazy(() => import("./pages/DonationPage.jsx"));
const DonationWall = lazy(() => import("./pages/DonationWall.tsx"));
const StudentDashboard = lazy(() => import("./pages/dashboard/StudentDashboard.jsx"));
const AdminDashboard = lazy(() => import("./pages/dashboard/AdminDashboard.jsx"));
const StudentManagement = lazy(() => import("./pages/dashboard/StudentManagement.jsx"));
const UserManagement = lazy(() => import("./pages/dashboard/UserManagement.jsx"));
const FacultyManagement = lazy(() => import("./pages/dashboard/FacultyManagement.jsx"));
const CourseManagement = lazy(() => import("./pages/dashboard/CourseManagement.jsx"));
const CmsManagement = lazy(() => import("./pages/dashboard/CmsManagement.jsx"));
const TimetablePage = lazy(() => import("./pages/dashboard/TimetablePage.jsx"));
const AttendancePage = lazy(() => import("./pages/dashboard/AttendancePage.jsx"));
const GradesPage = lazy(() => import("./pages/dashboard/GradesPage.jsx"));
const AssignmentsPage = lazy(() => import("./pages/dashboard/AssignmentsPage.jsx"));
const FeesPage = lazy(() => import("./pages/dashboard/FeesPage.jsx"));
const LMSDashboard = lazy(() => import("./pages/lms/StudentCoursesPage.jsx"));
const FacultyCoursesPage = lazy(() => import("./pages/faculty/FacultyCoursesPage.jsx"));
const FacultyDashboard = lazy(() => import("./pages/faculty/FacultyDashboard.jsx"));
const MessagesPage = lazy(() => import("./pages/communication/MessagesPage.jsx"));
const AnalyticsPage = lazy(() => import("./pages/dashboard/AnalyticsPage.jsx"));
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage.jsx"));
const DonationsPage = lazy(() => import("./pages/dashboard/DonationsPage.jsx"));
const AIAssistant = lazy(() => import("./components/AIAssistant.jsx"));
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function RouteFallback() {
  return (
    <div className="website-loader-screen" role="status" aria-live="polite">
      <div className="website-loader-brand">ATI Jaffna</div>
      <div className="loader" aria-label="Loading website"></div>
      <p className="website-loader-copy">Preparing your workspace</p>
    </div>
  );
}

const portalHomeByRole = {
  admin: "/admin",
  finance_officer: "/finance",
  lecturer: "/faculty",
  faculty: "/faculty",
  department_staff: "/faculty",
  student: "/student",
  alumni: "/alumni"
};

function hasRole(user, allowedRoles) {
  return allowedRoles.includes(String(user?.role || "").toLowerCase());
}

function fallbackPortal(user) {
  return portalHomeByRole[String(user?.role || "").toLowerCase()] || "/login";
}

function PartTimeStudentFeesRoute({ user }) {
  return user?.studentProfile?.studyMode === "Part-time"
    ? <FeesPage />
    : <Navigate to="/student" replace />;
}

function MaintenanceScreen({ status }) {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [developerOpen, setDeveloperOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [developerError, setDeveloperError] = useState("");
  const [developerLoading, setDeveloperLoading] = useState(false);
  const institutionName = status?.institutionName || "ATI Jaffna";
  const message = status?.message || "We are working on a better experience and will be back online shortly.";

  const handleDeveloperLogin = async (event) => {
    event.preventDefault();
    setDeveloperError("");
    setDeveloperLoading(true);

    try {
      const data = await login(identifier, password);
      const role = String(data?.user?.role || "").toLowerCase();
      if (role !== "admin") {
        logout();
        setDeveloperError("Developer access is only available for admin accounts.");
        return;
      }

      if (data?.user?.mustChangePassword) {
        navigate("/change-password", { replace: true });
        return;
      }

      navigate("/admin", { replace: true });
    } catch (err) {
      setDeveloperError(err?.message || "Unable to verify developer access.");
    } finally {
      setDeveloperLoading(false);
    }
  };

  return (
    <main className="maintenance-screen">
      <section className="maintenance-hero" role="status" aria-live="polite">
        <div className="maintenance-logo" aria-hidden="true">
          <Wrench size={54} strokeWidth={2.7} />
        </div>
        <p className="maintenance-brand">{institutionName}</p>
        <p className="maintenance-label">Undergoing Maintenance</p>
      </section>

      <section className="maintenance-panel">
        <div className="maintenance-content">
          <h1>We will be back soon</h1>
          <p className="maintenance-copy">{message}</p>

          <div className="maintenance-reasons" aria-label="Maintenance work in progress">
            <article>
              <span className="maintenance-reason-icon">
                <Wrench size={24} />
              </span>
              <h2>Standard Maintenance</h2>
              <p>Just a small tune up to keep the portal reliable, secure, and running smoothly.</p>
            </article>
            <article>
              <span className="maintenance-reason-icon">
                <CircleArrowUp size={24} />
              </span>
              <h2>Feature Updates</h2>
              <p>We are improving core tools so students and staff get a better workspace.</p>
            </article>
            <article>
              <span className="maintenance-reason-icon">
                <CircleSlash size={24} />
              </span>
              <h2>Bug Fixes</h2>
              <p>Known issues are being cleaned up while the site is temporarily unavailable.</p>
            </article>
          </div>

          <a className="maintenance-contact" href="mailto:info@atijaffna.edu.lk">
            Contact Us
          </a>

          <div className="maintenance-developer">
            {!developerOpen ? (
              <button type="button" className="maintenance-developer-button" onClick={() => setDeveloperOpen(true)}>
                Developer
              </button>
            ) : (
              <form className="maintenance-developer-form" onSubmit={handleDeveloperLogin}>
                <p className="maintenance-developer-title">Developer Login</p>
                <label>
                  <span>Email</span>
                  <div className="maintenance-developer-input">
                    <Mail size={16} />
                    <input
                      type="email"
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      required
                      autoComplete="username"
                      placeholder="developer@atijaffna.edu.lk"
                    />
                  </div>
                </label>
                <label>
                  <span>Password</span>
                  <div className="maintenance-developer-input">
                    <LockKeyhole size={16} />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="Developer password"
                    />
                  </div>
                </label>
                {developerError && <p className="maintenance-developer-error">{developerError}</p>}
                <div className="maintenance-developer-actions">
                  <button type="button" onClick={() => setDeveloperOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={developerLoading}>
                    {developerLoading ? "Checking..." : "Login"}
                    {!developerLoading && <ArrowRight size={15} />}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function useMaintenanceStatus() {
  const [status, setStatus] = useState({ loading: true, maintenanceMode: false });

  useEffect(() => {
    let cancelled = false;
    const loadStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/settings/public`);
        const data = await response.json().catch(() => ({}));
        if (!cancelled) {
          setStatus({
            loading: false,
            maintenanceMode: Boolean(data.maintenanceMode),
            institutionName: data.institutionName,
            message: data.message
          });
        }
      } catch {
        if (!cancelled) setStatus({ loading: false, maintenanceMode: false });
      }
    };

    loadStatus();
    const interval = window.setInterval(loadStatus, 60000);
    const handleRefresh = () => loadStatus();
    window.addEventListener("ati-settings-updated", handleRefresh);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("ati-settings-updated", handleRefresh);
    };
  }, []);

  return status;
}

function MaintenanceGate({ children, allowDuringMaintenance = false }) {
  const { user } = useAuth();
  const location = useLocation();
  const status = useMaintenanceStatus();
  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const isAuthPath = ["/login", "/change-password"].some((path) => location.pathname.startsWith(path));

  if (status.loading) {
    return <RouteFallback />;
  }

  if (!allowDuringMaintenance && status.maintenanceMode && !isAdmin && !isAuthPath) {
    return <MaintenanceScreen status={status} />;
  }

  return children;
}

function MainSite() {
  const location = useLocation();
  const hideAi = ["/login", "/register", "/alumni/register", "/change-password", "/faculty"].some((path) => location.pathname.startsWith(path));

  return (
    <MaintenanceGate>
      <Suspense fallback={<RouteFallback />}>
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
            <Route path="/donation-wall" element={<DonationWall />} />
            <Route path="/donate" element={<DonationPage />} />
            <Route path="/donate/payment/:donationId" element={<DonationPage mode="payment" />} />
            <Route path="/donate/thank-you/:donationId" element={<DonationPage mode="thank-you" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        {!hideAi && <AIAssistant />}
      </Suspense>
    </MaintenanceGate>
  );
}

function PublicAlumniRegistration() {
  return (
    <MaintenanceGate>
      <Suspense fallback={<RouteFallback />}>
        <AlumniRegister />
      </Suspense>
    </MaintenanceGate>
  );
}

function StudentRoutes() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!hasRole(user, ["student"])) return <Navigate to={fallbackPortal(user)} replace />;

  return (
    <MaintenanceGate>
      <DashboardLayout user={user}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="" element={<StudentDashboard user={user} />} />
            <Route path="courses" element={<LMSDashboard />} />
            <Route path="timetable" element={<TimetablePage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="grades" element={<GradesPage />} />
            <Route path="assignments" element={<AssignmentsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="announcements" element={<MessagesPage />} />
            <Route path="fees" element={<PartTimeStudentFeesRoute user={user} />} />
            <Route path="ai-assistant" element={<AIAssistant />} />
            <Route path="*" element={<Navigate to="/student" replace />} />
          </Routes>
        </Suspense>
      </DashboardLayout>
    </MaintenanceGate>
  );
}

function AdminRoutes() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!hasRole(user, ["admin"])) return <Navigate to={fallbackPortal(user)} replace />;

  return (
    <MaintenanceGate allowDuringMaintenance>
      <DashboardLayout user={user}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="" element={<AdminDashboard user={user} />} />
          <Route path="grades" element={<GradesPage />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="students" element={<StudentManagement />} />
          <Route path="alumni" element={<AlumniManagement />} />
          <Route path="alumni-verification" element={<AlumniVerificationManagement />} />
          <Route path="alumni-moderation" element={<AlumniModerationPage />} />
          <Route path="faculty" element={<FacultyManagement />} />
          <Route path="courses" element={<CourseManagement />} />
          <Route path="cms" element={<CmsManagement />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="ai-assistant" element={<AIAssistant />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="donations" element={<DonationsPage mode="dashboard" />} />
          <Route path="donations/list" element={<Navigate to="/admin/donations" replace />} />
          <Route path="donations/reports" element={<Navigate to="/admin/donations" replace />} />
          <Route path="donations/campaigns" element={<Navigate to="/admin/donations" replace />} />
          <Route path="donations/settings" element={<Navigate to="/admin/donations" replace />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
      </DashboardLayout>
    </MaintenanceGate>
  );
}

function FacultyRoutes() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!hasRole(user, ["lecturer", "faculty", "department_staff"])) return <Navigate to={fallbackPortal(user)} replace />;

  return (
    <MaintenanceGate>
      <DashboardLayout user={user}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="" element={<FacultyDashboard user={user} />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="timetable" element={<TimetablePage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="grades" element={<GradesPage />} />
            <Route path="fees" element={<FeesPage />} />
            <Route path="assignments" element={<AssignmentsPage />} />
            <Route path="courses" element={<FacultyCoursesPage />} />
            <Route path="ai-assistant" element={<AIAssistant />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="*" element={<Navigate to="/faculty" replace />} />
          </Routes>
        </Suspense>
      </DashboardLayout>
    </MaintenanceGate>
  );
}

function FinanceRoutes() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!hasRole(user, ["finance_officer", "admin"])) return <Navigate to={fallbackPortal(user)} replace />;

  return (
    <MaintenanceGate>
      <DashboardLayout user={user}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="" element={<FeesPage />} />
            <Route path="fees" element={<FeesPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/finance" replace />} />
          </Routes>
        </Suspense>
      </DashboardLayout>
    </MaintenanceGate>
  );
}

function AlumniRoutes() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasRole(user, ["alumni"])) return <Navigate to={fallbackPortal(user)} replace />;
  return <MaintenanceGate><DashboardLayout user={user}><Suspense fallback={<RouteFallback />}><Routes>
    <Route path="" element={<AlumniDashboard user={user} />} />
    <Route path="feed" element={<AlumniFeedPage />} />
    <Route path="directory" element={<AlumniDirectoryPage />} />
    <Route path="directory/:id" element={<AlumniPublicProfilePage />} />
    <Route path="connections" element={<AlumniConnectionsPage />} />
    <Route path="notifications" element={<AlumniNotificationsPage />} />
    <Route path="saved" element={<AlumniSavedPage />} />
    <Route path="verification" element={<AlumniVerificationPage />} />
    <Route path="profile" element={<AlumniProfilePage />} />
    <Route path="privacy" element={<AlumniPrivacyPage />} />
    <Route path="chat" element={<AlumniChatPage />} />
    <Route path="*" element={<Navigate to="/alumni" replace />} />
  </Routes></Suspense></DashboardLayout></MaintenanceGate>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/student/*" element={<StudentRoutes />} />
      <Route path="/admin/*" element={<AdminRoutes />} />
      <Route path="/faculty/*" element={<FacultyRoutes />} />
      <Route path="/finance/*" element={<FinanceRoutes />} />
      <Route element={<MainLayout />}>
        <Route path="/alumni/register" element={<PublicAlumniRegistration />} />
      </Route>
      <Route path="/alumni/*" element={<AlumniRoutes />} />
      <Route path="/*" element={<MainSite />} />
    </Routes>
  );
}
