import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, Database, Download, GraduationCap, Mail, RefreshCw, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import GlassCard from "../../components/GlassCard";
import { apiFetch, downloadCsv } from "../../lib/api";

const resources = [
  { key: "users", path: "/api/users" },
  { key: "students", path: "/api/students" },
  { key: "faculty", path: "/api/faculty" },
  { key: "courses", path: "/api/courses" },
  { key: "departments", path: "/api/departments" },
  { key: "notices", path: "/api/notices" },
  { key: "events", path: "/api/events" },
  { key: "contacts", path: "/api/contacts" }
];

const emptyData = resources.reduce((acc, resource) => ({ ...acc, [resource.key]: [] }), {});

function count(data, key) {
  return Array.isArray(data[key]) ? data[key].length : 0;
}

function StatCard({ icon: Icon, label, value, detail, color }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[color:var(--md-text-secondary)]">{label}</p>
          <p className="mt-3 text-3xl font-black text-[color:var(--md-text-primary)]">{value}</p>
          <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">{detail}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}22`, color }}>
          <Icon size={21} />
        </span>
      </div>
    </GlassCard>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const loadAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.all(resources.map(async (resource) => [resource.key, await apiFetch(resource.path)]));
      setData(Object.fromEntries(results));
      setStatus("Analytics refreshed.");
    } catch (err) {
      setError(err?.message || "Unable to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const summary = useMemo(
    () => ({
      users: count(data, "users"),
      students: count(data, "students"),
      faculty: count(data, "faculty"),
      courses: count(data, "courses"),
      departments: count(data, "departments"),
      messages: count(data, "contacts"),
      notices: count(data, "notices"),
      events: count(data, "events")
    }),
    [data]
  );

  const resourceMix = [
    { name: "Students", count: summary.students },
    { name: "Faculty", count: summary.faculty },
    { name: "Courses", count: summary.courses },
    { name: "Departments", count: summary.departments },
    { name: "Messages", count: summary.messages },
    { name: "Notices", count: summary.notices },
    { name: "Events", count: summary.events }
  ];

  const statCards = [
    { icon: Users, label: "Portal Users", value: summary.users, detail: "registered accounts", color: "#38bdf8" },
    { icon: GraduationCap, label: "Students", value: summary.students, detail: "student records", color: "#22c55e" },
    { icon: Database, label: "Academic Records", value: summary.courses + summary.departments, detail: "courses and departments", color: "#f59e0b" },
    { icon: Mail, label: "Messages", value: summary.messages, detail: "contact requests", color: "#a78bfa" }
  ];

  const exportCsv = () => {
    downloadCsv("ati-analytics-summary.csv", Object.entries(summary).map(([metric, value]) => ({ metric, value })));
    setStatus("CSV report exported.");
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[color:var(--md-border)] pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="portal-page-label">Admin</p>
          <h1 className="portal-page-title">Analytics & Reports</h1>
          <p className="portal-page-subtitle">Live reports from users, students, courses, messages, notices, and events.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadAnalytics} className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-sky-400">
            <Download size={16} />
            CSV
          </button>
        </div>
      </div>

      {(error || status) && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${error ? "border-red-400/25 bg-red-500/10 text-[color:var(--md-text-primary)]" : "border-emerald-400/20 bg-emerald-500/10 text-[color:var(--md-text-primary)]"}`}>
          <div className="flex items-center gap-3">
            {error ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            {error || status}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} value={loading ? "..." : card.value} />
        ))}
      </div>

      <GlassCard className="p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="classroom-section-title">Resource Overview</h2>
            <p className="text-xs text-[color:var(--md-text-secondary)]">Institution records by module</p>
          </div>
          <BarChart3 className="text-[color:var(--md-primary)]" size={20} />
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={resourceMix} margin={{ left: -20, right: 8 }}>
              <CartesianGrid stroke="var(--md-border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--md-text-secondary)" tick={{ fontSize: 11, fill: "var(--md-text-secondary)" }} />
              <YAxis stroke="var(--md-text-secondary)" allowDecimals={false} tick={{ fill: "var(--md-text-secondary)" }} />
              <Tooltip cursor={{ fill: "var(--md-hover)" }} contentStyle={{ background: "var(--md-card)", border: "1px solid var(--md-border)", borderRadius: 8, color: "var(--md-text-primary)" }} />
              <Bar dataKey="count" name="Records" radius={[6, 6, 0, 0]} fill="var(--md-primary)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </section>
  );
}
