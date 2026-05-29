import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, CheckCircle, Clock, Download, LocateFixed,
  MapPin, RefreshCw, ShieldCheck, Smartphone, UserCheck, UserX, XCircle
} from "lucide-react";
import GlassCard from "../../components/GlassCard";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch, downloadCsv } from "../../lib/api";

function formatTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString([], { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function uniqueSubjects(records, timetable) {
  return Array.from(new Set([
    ...timetable.map((e) => e.subject).filter((s) => s && s !== "Lunch Break"),
    ...records.map((r) => r.subject).filter(Boolean)
  ])).sort();
}

export default function AttendancePage() {
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const isStudent = role === "student";
  const isFaculty = role === "lecturer";

  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const loadData = async () => {
    setLoading(true); setError(""); setStatus("");
    try {
      if (isStudent) {
        const [sessionData, recordData] = await Promise.all([apiFetch("/api/attendance/session"), apiFetch("/api/attendance")]);
        setSession(sessionData);
        setRecords(recordData || []);
      } else if (isFaculty) {
        const [recordData, studentData, timetableData] = await Promise.all([
          apiFetch(`/api/attendance?date=${encodeURIComponent(selectedDate)}${selectedSubject !== "all" ? `&subject=${encodeURIComponent(selectedSubject)}` : ""}`),
          apiFetch("/api/students/my-department"),
          apiFetch("/api/timetable")
        ]);
        setRecords(recordData || []);
        setStudents(studentData.students || []);
        setTimetable(timetableData || []);
      }
    } catch (err) {
      setError(err?.message || "Unable to load attendance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedDate, selectedSubject]);

  const subjects = useMemo(() => uniqueSubjects(records, timetable), [records, timetable]);

  const studentStats = useMemo(() => ({
    total: records.length,
    subjects: new Set(records.map((r) => r.subject)).size,
    gps: records.filter((r) => r.method === "GPS").length
  }), [records]);

  const reportRows = useMemo(() => {
    const presentIds = new Set(records.map((r) => String(r.studentId || "").trim()).filter(Boolean));
    return students.map((s) => {
      const record = records.find((r) => String(r.studentId || "").trim() === String(s.studentId || "").trim());
      return {
        studentName: s.fullName, studentId: s.studentId, department: s.department,
        status: presentIds.has(String(s.studentId || "").trim()) ? "Present" : "Absent",
        subject: record?.subject || (selectedSubject === "all" ? "-" : selectedSubject),
        markedAt: record?.markedAt, distanceMeters: record?.distanceMeters, accuracy: record?.accuracy
      };
    });
  }, [records, selectedSubject, students]);

  const presentCount = reportRows.filter((r) => r.status === "Present").length;
  const absentCount = Math.max(0, reportRows.length - presentCount);
  const percent = reportRows.length ? Math.round((presentCount / reportRows.length) * 100) : 0;

  const markGpsAttendance = async () => {
    if (!navigator.geolocation) { setError("GPS is not available in this browser."); return; }
    setMarking(true); setError(""); setStatus("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const data = await apiFetch("/api/attendance/mark", { method: "POST", body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }) });
          setStatus(data.message || "GPS attendance marked successfully.");
          await loadData();
        } catch (err) {
          setError(err?.message || "Unable to mark GPS attendance.");
        } finally {
          setMarking(false);
        }
      },
      (geoError) => { setError(geoError.message || "GPS permission is required."); setMarking(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const exportReport = () =>
    downloadCsv("ati-attendance-report.csv", reportRows.map((r) => ({
      date: selectedDate, subject: r.subject, studentName: r.studentName, studentId: r.studentId,
      department: r.department, status: r.status, markedAt: r.markedAt ? formatTime(r.markedAt) : "",
      distanceMeters: r.distanceMeters ?? "", accuracy: r.accuracy ?? ""
    })));

  if (!isStudent && !isFaculty && role !== "admin") {
    return (
      <GlassCard className="p-6">
        <h1 className="classroom-section-title">Smart Attendance</h1>
        <p className="mt-2 portal-page-subtitle">Attendance is available for students and department staff.</p>
      </GlassCard>
    );
  }

  /* ─── STUDENT VIEW ─── */
  if (isStudent) {
    const activeSession = session?.session;
    return (
      <section className="space-y-6">
        <div className="portal-page-header">
          <div>
            <p className="portal-page-label">Student</p>
            <h1 className="portal-page-title">Smart Attendance</h1>
            <p className="portal-page-subtitle">GPS-only attendance for your active timetable subject.</p>
          </div>
          <button type="button" onClick={loadData} className="portal-btn">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {error  && <div className="portal-alert-danger">{error}</div>}
        {status && <div className="portal-alert-success">{status}</div>}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "GPS Marks",        value: studentStats.gps,      Icon: LocateFixed, color: "var(--color-ocean)" },
            { label: "Subjects Attended", value: studentStats.subjects, Icon: BarChart3,   color: "var(--color-mint)" },
            { label: "Total Records",     value: studentStats.total,    Icon: CheckCircle, color: "var(--md-primary)" }
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="portal-stat-card">
              <div>
                <p className="portal-stat-label">{label}</p>
                <p className="portal-stat-value" style={{ color }}>{value}</p>
              </div>
              <div className="portal-stat-icon" style={{ background: `${color}18`, color }}><Icon size={22} /></div>
            </div>
          ))}
        </div>

        {/* GPS Mark Card */}
        <GlassCard className="p-5">
          <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <div className="portal-stat-icon" style={{ background: "rgba(26,115,232,.12)", color: "var(--md-primary)" }}>
                  <MapPin size={22} />
                </div>
                <div>
                  <h2 className="classroom-section-title">Current GPS Attendance</h2>
                  <p className="mt-0.5 portal-page-subtitle">
                    {activeSession ? "This session is open according to your department timetable." : session?.message || "Checking current class period…"}
                  </p>
                </div>
              </div>

              {activeSession && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Subject", activeSession.subject], ["Time", activeSession.time],
                    ["Lecturer", activeSession.lecturer || "Department staff"], ["Room", activeSession.room || "Not assigned"],
                    ["Department", activeSession.department], ["GPS Radius", `${session.radiusMeters}m`]
                  ].map(([label, value]) => (
                    <div key={label} className="portal-row-item">
                      <p className="portal-card-label">{label}</p>
                      <p className="mt-1 text-sm font-medium" style={{ color: "var(--md-text-primary)" }}>{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border p-5 text-center" style={{ border: "1px solid var(--md-border)", background: "var(--md-card)" }}>
              <ShieldCheck size={42} className="mx-auto" style={{ color: "var(--md-success)" }} />
              <p className="mt-3 font-semibold text-sm" style={{ color: "var(--md-text-primary)" }}>GPS and timetable verified</p>
              <p className="mt-1 text-xs leading-5" style={{ color: "var(--md-text-secondary)" }}>
                You can mark attendance only during this subject period and inside the allowed campus radius.
              </p>
              <button
                type="button"
                onClick={markGpsAttendance}
                disabled={!activeSession || session?.alreadyMarked || marking}
                className="portal-btn-primary mt-4 w-full justify-center"
              >
                <LocateFixed size={16} />
                {marking ? "Checking GPS…" : session?.alreadyMarked ? "Already Marked" : "Mark with GPS"}
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Attendance History */}
        <GlassCard className="p-0 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--md-border)" }}>
            <Smartphone size={18} style={{ color: "var(--md-primary)" }} />
            <h2 className="classroom-section-title">Attendance History</h2>
          </div>
          <div className="portal-table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table className="portal-table" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  {["Date", "Subject", "Time", "Lecturer", "Distance", "Marked"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center" style={{ color: "var(--md-text-secondary)" }}>No GPS attendance records yet.</td></tr>
                ) : records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td className="font-medium">{r.subject}</td>
                    <td>{r.time}</td>
                    <td>{r.lecturer || "Department staff"}</td>
                    <td>{r.distanceMeters ?? "-"}m</td>
                    <td>{formatTime(r.markedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </section>
    );
  }

  /* ─── FACULTY / ADMIN VIEW ─── */
  return (
    <section className="space-y-6">
      <div className="portal-page-header">
        <div>
          <p className="portal-page-label">Department Staff</p>
          <h1 className="portal-page-title">Smart Attendance Reports</h1>
          <p className="portal-page-subtitle">GPS attendance from students in your department and subject sessions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadData} className="portal-btn">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button type="button" onClick={exportReport} disabled={!reportRows.length} className="portal-btn">
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {error && <div className="portal-alert-danger">{error}</div>}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Present",    value: presentCount,  Icon: UserCheck, color: "var(--md-success)" },
          { label: "Absent",     value: absentCount,   Icon: UserX,     color: "var(--md-danger)"  },
          { label: "Attendance", value: `${percent}%`, Icon: BarChart3, color: "var(--md-primary)" }
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="portal-stat-card">
            <div>
              <p className="portal-stat-label">{label}</p>
              <p className="portal-stat-value" style={{ color }}>{value}</p>
            </div>
            <div className="portal-stat-icon" style={{ background: `${color}18`, color }}><Icon size={22} /></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="grid gap-3 lg:grid-cols-[200px_1fr]">
          <label className="space-y-1">
            <span className="portal-card-label">Date</span>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="portal-input" />
          </label>
          <label className="space-y-1">
            <span className="portal-card-label">Subject</span>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="portal-input">
              <option value="all">All subjects</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
      </GlassCard>

      {/* Report Table */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <div className="portal-table-wrap">
          <table className="portal-table" style={{ minWidth: 860 }}>
            <thead>
              <tr>
                {["Student", "Student ID", "Subject", "Status", "GPS Distance", "Accuracy", "Marked At"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center" style={{ color: "var(--md-text-secondary)" }}>Loading attendance report…</td></tr>
              ) : reportRows.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center" style={{ color: "var(--md-text-secondary)" }}>No students found for your department.</td></tr>
              ) : reportRows.map((row) => (
                <tr key={`${row.studentId}-${row.subject}`}>
                  <td className="font-medium">{row.studentName}</td>
                  <td>{row.studentId || "-"}</td>
                  <td>{row.subject}</td>
                  <td>
                    <span className={`portal-badge ${row.status === "Present" ? "portal-badge-success" : "portal-badge-danger"}`}>
                      {row.status === "Present" ? <CheckCircle size={11} /> : <XCircle size={11} />}
                      {row.status}
                    </span>
                  </td>
                  <td>{row.distanceMeters != null ? `${row.distanceMeters}m` : "-"}</td>
                  <td>{row.accuracy ? `${Math.round(row.accuracy)}m` : "-"}</td>
                  <td>{row.markedAt ? formatTime(row.markedAt) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </section>
  );
}
