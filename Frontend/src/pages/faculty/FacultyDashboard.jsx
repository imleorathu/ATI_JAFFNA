import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, CheckCircle2, GraduationCap, Mail, MapPin, Phone, UserRound } from "lucide-react";
import GlassCard from "../../components/GlassCard";
import { apiFetch } from "../../lib/api";

const profileFieldClass = "rounded-xl border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-3";

export default function FacultyDashboard({ user }) {
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState(null);
  const [scope, setScope] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch("/api/students/my-department");
        setStudents(data.students || []);
        setFaculty(data.faculty || null);
        setScope(data.scope || "");
      } catch (err) {
        setError(err?.message || "Unable to load department students.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const stats = useMemo(
    () => ({
      total: students.length,
      fullTime: students.filter((student) => student.studyMode === "Full-time").length,
      partTime: students.filter((student) => student.studyMode === "Part-time").length
    }),
    [students]
  );

  const staffProfile = user?.staffProfile || {};
  const profile = {
    name: user?.name || faculty?.fullName || "Staff Member",
    email: user?.email || faculty?.email || "",
    department: staffProfile?.department || faculty?.department || "",
    staffType: staffProfile?.staffType || faculty?.staffType || "Staff",
    phone: staffProfile?.phone || faculty?.phone || "",
    office: staffProfile?.office || faculty?.office || ""
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between" style={{borderBottom:"1px solid var(--md-border)"}}>
        <div>
          <p className="portal-page-label">Faculty Portal</p>
          <h1 className="portal-page-title">Faculty Dashboard</h1>
          <p className="portal-page-subtitle">
            {faculty?.department ? `Showing students from ${faculty.department}.` : "Your student access is based on your assigned department."}
          </p>
        </div>
        <Link to="/faculty/students" className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-sm font-black text-slate-950 transition hover:bg-sky-400">
          <GraduationCap size={16} />
          Manage Students
        </Link>
      </div>

      {error && <div className="portal-alert-danger">{error}</div>}
      {scope === "none" && (
        <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-[color:var(--md-text-primary)]">
          This staff account is not assigned to a department with students.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Department Students", stats.total, UserRound, "text-[color:var(--md-text-primary)]"],
          ["Full-time", stats.fullTime, CheckCircle2, "text-emerald-300"],
          ["Part-time", stats.partTime, BookOpen, "text-sky-300"]
        ].map(([label, value, Icon, color]) => (
          <GlassCard key={label} dark className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="portal-stat-label">{label}</p>
                <p className={`mt-2 text-3xl font-black ${color}`}>{loading ? "--" : value}</p>
              </div>
              <Icon className={color} size={24} />
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="classroom-section-title">Staff Profile</h2>
            <p className="portal-page-subtitle">Role-specific staff details from your database profile.</p>
          </div>
          <UserRound className="text-[color:var(--md-primary)]" size={22} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [UserRound, "Name", profile.name],
            [Mail, "Email", profile.email],
            [BookOpen, "Department", profile.department],
            [GraduationCap, "Staff type", profile.staffType],
            [Phone, "Contact", profile.phone],
            [MapPin, "Office", profile.office]
          ].map(([Icon, label, value]) => (
            <div key={label} className={profileFieldClass}>
              <div className="mb-2 flex items-center gap-2 text-[color:var(--md-text-secondary)]">
                <Icon size={14} />
                <span className="text-[11px] font-medium uppercase tracking-[0.12em]">{label}</span>
              </div>
              <p className="break-words text-sm font-medium text-[color:var(--md-text-primary)]">{value || "Not added"}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="classroom-section-title">Recent Students</h2>
            <p className="portal-page-subtitle">Only students in your department are visible here.</p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="" style={{borderBottom:"1px solid var(--md-border)"}}>
                <th className="pb-3">Name</th>
                <th className="pb-3">Student ID</th>
                <th className="pb-3">Study Mode</th>
                <th className="pb-3">Email</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="py-8 text-center text-[color:var(--md-text-secondary)]">Loading students...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-[color:var(--md-text-secondary)]">No students found for your department.</td></tr>
              ) : (
                students.slice(0, 8).map((student) => (
                  <tr key={student._id} className="border-b border-[color:var(--md-border)] last:border-0">
                    <td className="py-3 pr-4 font-bold text-[color:var(--md-text-primary)]">{student.fullName}</td>
                    <td className="py-3 pr-4 text-[color:var(--md-text-secondary)]">{student.studentId || "Not added"}</td>
                    <td className="py-3 pr-4 text-[color:var(--md-text-secondary)]">{student.studyMode || "Not set"}</td>
                    <td className="py-3 pr-4 text-[color:var(--md-text-secondary)]">{student.email}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </section>
  );
}
