import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  Download,
  FilePenLine,
  GraduationCap,
  ImagePlus,
  Mail,
  Send,
  RefreshCw,
  Settings,
  Trash2,
  Users
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import GlassCard from "../../components/GlassCard";
import { apiFetch, downloadCsv } from "../../lib/api";
import { useModal } from "../../contexts/ModalContext.jsx";

const resources = [
  { key: "users", path: "/api/users" },
  { key: "students", path: "/api/students" },
  { key: "departments", path: "/api/departments" },
  { key: "blogs", path: "/api/blogs" },
  { key: "notices", path: "/api/notices" },
  { key: "events", path: "/api/events" },
  { key: "contacts", path: "/api/contacts" }
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } }
};

const emptyData = resources.reduce((acc, resource) => ({ ...acc, [resource.key]: [] }), {});
const initialNoticeForm = {
  title: "",
  body: "",
  audience: "all"
};
const initialBlogForm = {
  title: "",
  excerpt: "",
  content: "",
  imageUrl: "",
  author: "ATI Jaffna Admin",
  published: true
};

function formatDate(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function dashboardCount(data, key) {
  return Array.isArray(data[key]) ? data[key].length : 0;
}

function formatUptime(seconds) {
  if (!Number.isFinite(seconds)) return "Unknown uptime";
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m ${totalSeconds % 60}s`;
}

function normalizeHealth(payload) {
  const apiState = payload?.api || payload?.services?.api || (payload?.status === "healthy" ? "ok" : "down");
  const databaseState = typeof payload?.database === "string"
    ? payload.database
    : payload?.services?.database || payload?.database?.state || "unknown";

  return {
    raw: payload,
    apiOk: payload?.checks?.api ?? apiState === "ok",
    databaseOk: payload?.checks?.database ?? databaseState === "connected",
    status: payload?.status || "unknown",
    databaseState,
    dbName: payload?.dbName || payload?.services?.dbName || payload?.database?.name || "Unknown",
    uptime: formatUptime(payload?.uptime),
    memoryMb: payload?.memory?.rss ?? payload?.memory?.rssMb ?? null,
    checkedAt: payload?.timestamp ? formatDate(payload.timestamp) : "Not checked"
  };
}

function MetricCard({ icon: Icon, label, value, detail, color }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--md-text-secondary)]">{label}</p>
          <p className="mt-3 text-3xl font-black text-[color:var(--md-text-primary)]">{value}</p>
          <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">{detail}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}24`, color }}>
          <Icon size={21} />
        </div>
      </div>
    </GlassCard>
  );
}

export default function AdminDashboard({ user }) {
  const { confirm } = useModal();
  const navigate = useNavigate();
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [noticeForm, setNoticeForm] = useState(initialNoticeForm);
  const [blogForm, setBlogForm] = useState(initialBlogForm);
  const [publishingNotice, setPublishingNotice] = useState(false);
  const [publishingBlog, setPublishingBlog] = useState(false);
  const [uploadingBlogImage, setUploadingBlogImage] = useState(false);
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const loadHealth = async () => {
    setHealthLoading(true);
    try {
      const result = await apiFetch("/api/health");
      setHealth(normalizeHealth(result));
    } catch (err) {
      setHealth({
        apiOk: false,
        databaseOk: false,
        status: "down",
        databaseState: "unknown",
        dbName: "Unknown",
        uptime: "Unknown uptime",
        memoryMb: null,
        checkedAt: "Failed",
        error: err?.message || "Unable to load system health."
      });
    } finally {
      setHealthLoading(false);
    }
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.all(
        resources.map(async (resource) => [resource.key, await apiFetch(resource.path)])
      );
      setData(Object.fromEntries(results));
    } catch (err) {
      setError(err?.message || "Unable to load admin dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    loadHealth();
  }, []);

  const metrics = useMemo(() => {
    return [
      { icon: Users, label: "Users", value: dashboardCount(data, "users"), detail: "registered portal accounts", color: "#38bdf8" },
      { icon: GraduationCap, label: "Students", value: dashboardCount(data, "students"), detail: "student records in database", color: "#22c55e" },
      { icon: Mail, label: "Messages", value: dashboardCount(data, "contacts"), detail: "contact requests", color: "#f59e0b" }
    ];
  }, [data]);

  const resourceChartData = useMemo(
    () => [
      { name: "Students", count: dashboardCount(data, "students") },
      { name: "Departments", count: dashboardCount(data, "departments") },
      { name: "Blogs", count: dashboardCount(data, "blogs") },
      { name: "Notices", count: dashboardCount(data, "notices") },
      { name: "Events", count: dashboardCount(data, "events") }
    ],
    [data]
  );

  const quickActions = [
    { title: "Students", detail: "Add and manage student records", icon: GraduationCap, route: "/admin/students", count: dashboardCount(data, "students") },
    { title: "Faculty", detail: "Review staff directory", icon: Users, route: "/admin/faculty", count: "Directory" },
    { title: "Website CMS", detail: "Customize public pages", icon: FilePenLine, route: "/admin/cms", count: dashboardCount(data, "blogs") },
    { title: "Analytics", detail: "Open reports and charts", icon: BarChart3, route: "/admin/analytics", count: "Reports" },
    { title: "Messages", detail: "Read contact requests", icon: Mail, route: "/admin/messages", count: dashboardCount(data, "contacts") },
    { title: "Settings", detail: "Portal configuration", icon: Settings, route: "/admin/settings", count: "Admin" }
  ];
  const adminProfile = user?.adminProfile || {};

  const recentMessages = [...data.contacts].slice(0, 4);
  const recentNotices = [...data.notices].slice(0, 5);
  const recentBlogs = [...data.blogs].slice(0, 4);

  const createNotice = async (event) => {
    event.preventDefault();
    setPublishingNotice(true);
    setError("");
    setStatus("");
    try {
      const created = await apiFetch("/api/notices", {
        method: "POST",
        body: JSON.stringify(noticeForm)
      });
      setData((current) => ({ ...current, notices: [created, ...current.notices] }));
      setNoticeForm(initialNoticeForm);
      setStatus("Notice published to the home page.");
    } catch (err) {
      setError(err?.message || "Unable to publish notice.");
    } finally {
      setPublishingNotice(false);
    }
  };

  const deleteNotice = async (notice) => {
    const confirmed = await confirm({ title: "Delete notice?", message: `Delete "${notice.title}" from the home page?`, confirmLabel: "Delete notice", tone: "danger" });
    if (!confirmed) return;

    setError("");
    setStatus("");
    try {
      await apiFetch(`/api/notices/${notice._id}`, { method: "DELETE" });
      setData((current) => ({
        ...current,
        notices: current.notices.filter((item) => item._id !== notice._id)
      }));
      setStatus("Notice removed.");
    } catch (err) {
      setError(err?.message || "Unable to delete notice.");
    }
  };

  const createBlog = async (event) => {
    event.preventDefault();
    setPublishingBlog(true);
    setError("");
    setStatus("");
    try {
      const created = await apiFetch("/api/blogs", {
        method: "POST",
        body: JSON.stringify(blogForm)
      });
      setData((current) => ({ ...current, blogs: [created, ...current.blogs] }));
      setBlogForm(initialBlogForm);
      setStatus("Blog published to the news page.");
    } catch (err) {
      setError(err?.message || "Unable to publish blog.");
    } finally {
      setPublishingBlog(false);
    }
  };

  const uploadBlogImage = async (file) => {
    if (!file) return;
    setUploadingBlogImage(true);
    setError("");
    setStatus("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const result = await apiFetch("/api/cms/uploads", { method: "POST", body: formData });
      setBlogForm((current) => ({ ...current, imageUrl: result.url }));
      setStatus("Blog cover image uploaded.");
    } catch (err) {
      setError(err?.message || "Unable to upload blog image.");
    } finally {
      setUploadingBlogImage(false);
    }
  };

  const deleteBlog = async (blog) => {
    const confirmed = await confirm({ title: "Delete blog?", message: `Delete "${blog.title}" from the news page?`, confirmLabel: "Delete blog", tone: "danger" });
    if (!confirmed) return;

    setError("");
    setStatus("");
    try {
      await apiFetch(`/api/blogs/${blog._id}`, { method: "DELETE" });
      setData((current) => ({
        ...current,
        blogs: current.blogs.filter((item) => item._id !== blog._id)
      }));
      setStatus("Blog removed.");
    } catch (err) {
      setError(err?.message || "Unable to delete blog.");
    }
  };

  const exportSummary = () => {
    downloadCsv("ati-admin-summary.csv", [
      {
        users: dashboardCount(data, "users"),
        students: dashboardCount(data, "students"),
        departments: dashboardCount(data, "departments"),
        blogs: dashboardCount(data, "blogs"),
        notices: dashboardCount(data, "notices"),
        events: dashboardCount(data, "events"),
        messages: dashboardCount(data, "contacts")
      }
    ]);
  };

  return (
    <section className="px-1 py-2 sm:px-2">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between" style={{borderBottom:"1px solid var(--md-border)"}}>
            <div>
              <p className="portal-page-label">ATI Jaffna</p>
              <h1 className="portal-page-title">Admin Dashboard</h1>
              <p className="portal-page-subtitle">Live overview of records, messages, website content, and admin workflows.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  loadDashboard();
                  loadHealth();
                }}
                className="portal-btn"
              >
                <RefreshCw size={16} className={loading || healthLoading ? "animate-spin" : ""} />
                Refresh
              </button>
              <button
                type="button"
                onClick={exportSummary}
                className="portal-btn-primary"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </motion.div>

        {error && (
          <div className="flex items-center gap-3 portal-alert-danger">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}
        {status && (
          <div className="flex items-center gap-3 portal-alert-success">
            <CheckCircle2 size={18} />
            {status}
          </div>
        )}

        <GlassCard className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="portal-page-label">Admin Profile</p>
              <h2 className="classroom-section-title">{user?.name || "Administrator"}</h2>
              <p className="portal-page-subtitle">{adminProfile?.designation || "Administrator"}{adminProfile?.department ? ` / ${adminProfile.department}` : ""}</p>
            </div>
            <div className="grid gap-2 text-sm text-[color:var(--md-text-secondary)] sm:text-right">
              <span>{user?.email || "Email not added"}</span>
              <span>{adminProfile?.phone || "Phone not added"}</span>
              <span>{adminProfile?.office || "Office not added"}</span>
            </div>
          </div>
        </GlassCard>

        <motion.div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }}>
          {metrics.map((metric) => (
            <motion.div key={metric.label} variants={fadeUp}>
              <MetricCard {...metric} value={loading ? "..." : metric.value} />
            </motion.div>
          ))}
        </motion.div>

        <div className="grid gap-6">
          <GlassCard className="p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="classroom-section-title">Records Overview</h2>
                <p className="text-xs text-[color:var(--md-text-secondary)]">Database resources currently available to admin</p>
              </div>
              <Activity className="text-[color:var(--md-primary)]" size={20} />
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={resourceChartData} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid stroke="var(--md-border)" strokeOpacity={1} vertical={false} />
                  <XAxis dataKey="name" stroke="var(--md-text-secondary)" tick={{ fontSize: 11, fill: "var(--md-text-secondary)" }} />
                  <YAxis stroke="var(--md-text-secondary)" allowDecimals={false} tick={{ fill: "var(--md-text-secondary)" }} />
                  <Tooltip cursor={{ fill: "var(--md-hover)" }} contentStyle={{ background: "var(--md-card)", border: "1px solid var(--md-border)", borderRadius: 8, color: "var(--md-text-primary)" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="var(--md-primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="classroom-section-title">Quick Management</h2>
              <Building2 size={20} className="text-[color:var(--md-text-secondary)]" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {quickActions.map((action) => (
                <button
                  type="button"
                  key={action.title}
                  onClick={() => navigate(action.route)}
                  className="group flex items-center gap-3 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-4 text-left transition hover:border-sky-400/40 hover:bg-sky-400/10"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 text-[color:var(--md-primary)]">
                    <action.icon size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-[color:var(--md-text-primary)]">{action.title}</span>
                    <span className="block truncate text-xs text-[color:var(--md-text-secondary)]">{action.detail}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-[color:var(--md-text-secondary)] group-hover:text-[color:var(--md-primary)]">
                    {action.count}
                    <ArrowUpRight size={14} />
                  </span>
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="classroom-section-title">Publish Notice</h2>
                <p className="text-xs text-[color:var(--md-text-secondary)]">New public notices appear on the home page.</p>
              </div>
              <Bell className="text-[color:var(--md-warning)]" size={20} />
            </div>
            <form onSubmit={createNotice} className="space-y-3">
              <input
                required
                value={noticeForm.title}
                onChange={(event) => setNoticeForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Notice title"
                className="w-full rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400"
              />
              <textarea
                required
                value={noticeForm.body}
                onChange={(event) => setNoticeForm((current) => ({ ...current, body: event.target.value }))}
                placeholder="Notice details"
                rows={4}
                className="w-full resize-none rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400"
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={noticeForm.audience}
                  onChange={(event) => setNoticeForm((current) => ({ ...current, audience: event.target.value }))}
                  className="portal-input sm:w-44"
                >
                  <option value="all">All visitors</option>
                  <option value="students">Students</option>
                  <option value="lecturers">Lecturers</option>
                  <option value="admins">Admins</option>
                </select>
                <button
                  type="submit"
                  disabled={publishingNotice}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:opacity-60"
                >
                  <Send size={16} />
                  {publishingNotice ? "Publishing..." : "Publish"}
                </button>
              </div>
            </form>
            <div className="mt-5 divide-y divide-[color:var(--md-border)]">
              {recentNotices.length === 0 ? (
                <p className="py-6 text-center text-sm text-[color:var(--md-text-secondary)]">No notices published yet.</p>
              ) : (
                recentNotices.map((notice) => (
                  <div key={notice._id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[color:var(--md-text-primary)]">{notice.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[color:var(--md-text-secondary)]">{notice.body}</p>
                      <p className="mt-1 text-xs capitalize text-[color:var(--md-text-secondary)]">{notice.audience || "all"} | {formatDate(notice.createdAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteNotice(notice)}
                      className="shrink-0 rounded-lg bg-red-500/10 p-2 text-[color:var(--md-danger)] transition hover:bg-red-500/20"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="classroom-section-title">Publish Blog</h2>
              <p className="text-xs text-[color:var(--md-text-secondary)]">Blog previews appear on the public news page and open as full articles.</p>
            </div>
            <FilePenLine className="text-[color:var(--md-primary)]" size={20} />
          </div>
          <form onSubmit={createBlog} className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-3">
              <input
                required
                value={blogForm.title}
                onChange={(event) => setBlogForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Blog title"
                className="w-full rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400"
              />
              <input
                value={blogForm.imageUrl}
                onChange={(event) => setBlogForm((current) => ({ ...current, imageUrl: event.target.value }))}
                placeholder="Cover image URL"
                className="w-full rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400"
              />
              <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-3">
                {blogForm.imageUrl ? (
                  <img src={blogForm.imageUrl} alt="" className="mb-3 h-36 w-full rounded-lg object-cover" />
                ) : (
                  <div className="mb-3 flex h-36 w-full items-center justify-center rounded-lg border border-dashed border-[color:var(--md-border)] bg-[color:var(--md-card)] text-[color:var(--md-text-secondary)]">
                    <ImagePlus size={28} />
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-[color:var(--md-text-secondary)]">Upload a JPG, PNG, WEBP, or GIF cover image.</p>
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[color:var(--md-hover)] px-3 py-2 text-xs font-black text-[color:var(--md-text-primary)] transition hover:bg-[color:var(--md-hover)]">
                    <ImagePlus size={15} />
                    {uploadingBlogImage ? "Uploading..." : "Upload Image"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      disabled={uploadingBlogImage}
                      onChange={(event) => {
                        uploadBlogImage(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              <input
                value={blogForm.author}
                onChange={(event) => setBlogForm((current) => ({ ...current, author: event.target.value }))}
                placeholder="Author"
                className="w-full rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400"
              />
              <textarea
                required
                value={blogForm.excerpt}
                onChange={(event) => setBlogForm((current) => ({ ...current, excerpt: event.target.value }))}
                placeholder="Short preview text"
                rows={3}
                className="w-full resize-none rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400"
              />
            </div>
            <div className="space-y-3">
              <textarea
                required
                value={blogForm.content}
                onChange={(event) => setBlogForm((current) => ({ ...current, content: event.target.value }))}
                placeholder="Full blog content"
                rows={8}
                className="w-full resize-none rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--md-text-secondary)]">
                  <input
                    type="checkbox"
                    checked={blogForm.published}
                    onChange={(event) => setBlogForm((current) => ({ ...current, published: event.target.checked }))}
                    className="h-4 w-4 rounded border-[color:var(--md-border)] bg-[color:var(--md-card)]"
                  />
                  Publish on news page
                </label>
                <button
                  type="submit"
                  disabled={publishingBlog}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-400 px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-sky-300 disabled:opacity-60"
                >
                  <Send size={16} />
                  {publishingBlog ? "Publishing..." : "Publish Blog"}
                </button>
              </div>
            </div>
          </form>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {recentBlogs.length === 0 ? (
              <p className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-4 text-center text-sm text-[color:var(--md-text-secondary)] md:col-span-2">No blogs published yet.</p>
            ) : (
              recentBlogs.map((blog) => (
                <div key={blog._id} className="flex items-start justify-between gap-3 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[color:var(--md-text-primary)]">{blog.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[color:var(--md-text-secondary)]">{blog.excerpt}</p>
                    <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">{formatDate(blog.createdAt)} | {blog.published ? "Published" : "Draft"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteBlog(blog)}
                    className="shrink-0 rounded-lg bg-red-500/10 p-2 text-[color:var(--md-danger)] transition hover:bg-red-500/20"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        <div className="grid gap-6 lg:grid-cols-3">
          <GlassCard className="p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="classroom-section-title">Latest Messages</h2>
              <Mail size={20} className="text-[color:var(--md-text-secondary)]" />
            </div>
            <div className="divide-y divide-[color:var(--md-border)]">
              {recentMessages.length === 0 ? (
                <p className="py-8 text-center text-sm text-[color:var(--md-text-secondary)]">No contact messages yet.</p>
              ) : (
                recentMessages.map((message) => (
                  <div key={message._id} className="py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[color:var(--md-text-primary)]">{message.name || message.email}</p>
                        <p className="truncate text-xs text-[color:var(--md-text-secondary)]">{message.subject || message.email}</p>
                      </div>
                      <span className="shrink-0 text-xs text-[color:var(--md-text-secondary)]">{formatDate(message.createdAt)}</span>
                    </div>
                    <p className="mt-2 max-h-10 overflow-hidden text-sm text-[color:var(--md-text-secondary)]">{message.message}</p>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="classroom-section-title">System Health</h2>
                <p className="text-xs text-[color:var(--md-text-secondary)]">
                  {health?.error || `Database: ${health?.dbName || "Checking..."} | Uptime: ${health?.uptime || "Checking..."}`}
                </p>
              </div>
              <button type="button" onClick={loadHealth} className="portal-icon-btn" aria-label="Refresh system health">
                <RefreshCw size={16} className={healthLoading ? "animate-spin" : ""} />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {[
                ["API connection", Boolean(health?.apiOk)],
                ["Database", Boolean(health?.databaseOk)],
                ["Admin token", Boolean(localStorage.getItem("atiToken"))],
                ["Dashboard data", !loading]
              ].map(([label, ok]) => (
                <div key={label} className="flex items-center justify-between rounded-lg bg-[color:var(--md-hover)] px-3 py-2">
                  <span className="text-sm text-[color:var(--md-text-secondary)]">{label}</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-bold ${ok ? "text-[color:var(--md-success)]" : "text-[color:var(--md-danger)]"}`}>
                    {ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    {ok ? "OK" : "Check"}
                  </span>
                </div>
              ))}
              <div className="grid gap-2 pt-2 text-xs text-[color:var(--md-text-secondary)] sm:grid-cols-2">
                <span>Status: <strong className="capitalize text-[color:var(--md-text-primary)]">{health?.status || "checking"}</strong></span>
                <span>DB state: <strong className="capitalize text-[color:var(--md-text-primary)]">{health?.databaseState || "checking"}</strong></span>
                <span>Memory: <strong className="text-[color:var(--md-text-primary)]">{health?.memoryMb != null ? `${health.memoryMb} MB` : "Unknown"}</strong></span>
                <span>Checked: <strong className="text-[color:var(--md-text-primary)]">{health?.checkedAt || "Checking..."}</strong></span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
