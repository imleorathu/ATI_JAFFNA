import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
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

function safeFilenamePart(value) {
  return String(value || "all").trim().replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "all";
}

export default function AttendancePage() {
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const isStudent = role === "student";
  const isFaculty = ["lecturer", "department_staff"].includes(role);

  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedAcademicStage, setSelectedAcademicStage] = useState("all");
  const [studentSearch, setStudentSearch] = useState("");
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
  const academicStages = useMemo(() => Array.from(new Set(students.map((student) => student.academicStage).filter(Boolean))).sort(), [students]);

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
        studentName: s.fullName, studentId: s.studentId, department: s.department, academicStage: s.academicStage || "-",
        status: presentIds.has(String(s.studentId || "").trim()) ? "Present" : "Absent",
        subject: record?.subject || (selectedSubject === "all" ? "-" : selectedSubject),
        markedAt: record?.markedAt, distanceMeters: record?.distanceMeters, accuracy: record?.accuracy
      };
    });
  }, [records, selectedSubject, students]);

  const filteredReportRows = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    return reportRows.filter((row) => {
      const matchesStage = selectedAcademicStage === "all" || row.academicStage === selectedAcademicStage;
      const matchesStudent = !query
        || String(row.studentName || "").toLowerCase().includes(query)
        || String(row.studentId || "").toLowerCase().includes(query);
      return matchesStage && matchesStudent;
    });
  }, [reportRows, selectedAcademicStage, studentSearch]);

  const presentCount = filteredReportRows.filter((r) => r.status === "Present").length;
  const absentCount = Math.max(0, filteredReportRows.length - presentCount);
  const percent = filteredReportRows.length ? Math.round((presentCount / filteredReportRows.length) * 100) : 0;

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
    downloadCsv("ati-attendance-report.csv", filteredReportRows.map((r) => ({
      date: selectedDate, subject: r.subject, studentName: r.studentName, studentId: r.studentId,
      department: r.department, currentStudyYear: r.academicStage, status: r.status, markedAt: r.markedAt ? formatTime(r.markedAt) : "",
      distanceMeters: r.distanceMeters ?? "", accuracy: r.accuracy ?? ""
    })));

  const downloadReportPdf = () => {
    if (!filteredReportRows.length) return;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    const tableWidth = pageWidth - margin * 2;
    const generatedAt = new Date().toLocaleString();
    const subjectLabel = selectedSubject === "all" ? "All subjects" : selectedSubject;
    const studyYearLabel = selectedAcademicStage === "all" ? "All study years" : selectedAcademicStage;
    const studentLabel = studentSearch.trim() ? ` | Student search: ${studentSearch.trim()}` : "";
    const departmentLabel = filteredReportRows.find((row) => row.department)?.department || "Department";
    const columns = [
      { label: "Student", key: "studentName", width: 95 },
      { label: "ID", key: "studentId", width: 55 },
      { label: "Study Year", key: "academicStage", width: 78 },
      { label: "Subject", key: "subject", width: 88 },
      { label: "Status", key: "status", width: 50 },
      { label: "Distance", key: "distanceMeters", width: 52 },
      { label: "Accuracy", key: "accuracy", width: 45 },
      { label: "Marked At", key: "markedAt", width: 52 }
    ];

    const addHeader = () => {
      doc.setFillColor(26, 115, 232);
      doc.rect(0, 0, pageWidth, 78, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("ATI Jaffna - Smart Attendance Report", margin, 34);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Generated: ${generatedAt}`, margin, 54);
      doc.text(`Date: ${selectedDate}  |  Subject: ${subjectLabel}  |  Study year: ${studyYearLabel}  |  Department: ${departmentLabel}${studentLabel}`, margin, 67);
    };

    const addFooter = () => {
      const pageNumber = doc.internal.getNumberOfPages();
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 20, { align: "right" });
    };

    const addTableHeader = (y) => {
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.rect(margin, y, tableWidth, 24, "FD");
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      let x = margin;
      columns.forEach((column) => {
        doc.text(column.label, x + 5, y + 15);
        x += column.width;
      });
      return y + 24;
    };

    const getCellText = (row, key) => {
      if (key === "distanceMeters") return row.distanceMeters != null ? `${row.distanceMeters}m` : "-";
      if (key === "accuracy") return row.accuracy ? `${Math.round(row.accuracy)}m` : "-";
      if (key === "markedAt") return row.markedAt ? formatTime(row.markedAt) : "-";
      return row[key] || "-";
    };

    addHeader();
    addFooter();

    let y = 102;
    const metricWidth = (tableWidth - 20) / 3;
    [
      ["Present", presentCount, [22, 163, 74]],
      ["Absent", absentCount, [220, 38, 38]],
      ["Attendance", `${percent}%`, [26, 115, 232]]
    ].forEach(([label, value, color], index) => {
      const x = margin + index * (metricWidth + 10);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, metricWidth, 48, 8, 8, "FD");
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(label, x + 12, y + 17);
      doc.setTextColor(...color);
      doc.setFontSize(18);
      doc.text(String(value), x + 12, y + 38);
    });

    y += 72;
    y = addTableHeader(y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);

    filteredReportRows.forEach((row, index) => {
      const wrapped = columns.map((column) => doc.splitTextToSize(String(getCellText(row, column.key)), column.width - 10));
      const rowHeight = Math.max(24, ...wrapped.map((lines) => lines.length * 9 + 12));

      if (y + rowHeight > pageHeight - 38) {
        doc.addPage();
        addHeader();
        addFooter();
        y = addTableHeader(96);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
      }

      const shade = index % 2 === 0 ? 255 : 248;
      doc.setFillColor(shade, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, tableWidth, rowHeight, "FD");

      let x = margin;
      wrapped.forEach((lines, columnIndex) => {
        const column = columns[columnIndex];
        if (column.key === "status") {
          const isPresent = row.status === "Present";
          doc.setTextColor(isPresent ? 22 : 220, isPresent ? 163 : 38, isPresent ? 74 : 38);
          doc.setFont("helvetica", "bold");
        } else {
          doc.setTextColor(30, 41, 59);
          doc.setFont("helvetica", "normal");
        }
        doc.text(lines, x + 5, y + 14);
        x += column.width;
      });

      y += rowHeight;
    });

    doc.save(`ati-attendance-${selectedDate}-${safeFilenamePart(subjectLabel)}.pdf`);
    setStatus("Attendance PDF downloaded.");
  };

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
          <button type="button" onClick={exportReport} disabled={!filteredReportRows.length} className="portal-btn">
            <Download size={15} /> Export CSV
          </button>
          <button type="button" onClick={downloadReportPdf} disabled={!filteredReportRows.length} className="portal-btn-primary">
            <Download size={15} /> Download PDF
          </button>
        </div>
      </div>

      {error && <div className="portal-alert-danger">{error}</div>}
      {status && <div className="portal-alert-success">{status}</div>}

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
        <div className="grid gap-3 lg:grid-cols-[180px_1fr_1fr_1.2fr]">
          <label className="space-y-1">
            <span className="portal-card-label">Date</span>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="portal-input" />
          </label>
          <label className="space-y-1">
            <span className="portal-card-label">Subjects</span>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="portal-input">
              <option value="all">All subjects</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="portal-card-label">Current Study Year</span>
            <select value={selectedAcademicStage} onChange={(e) => setSelectedAcademicStage(e.target.value)} className="portal-input">
              <option value="all">All study years</option>
              {academicStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="portal-card-label">Search Student</span>
            <input
              type="search"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="portal-input"
              placeholder="Name or Student ID"
            />
          </label>
        </div>
        <p className="mt-3 text-xs font-semibold" style={{ color: "var(--md-text-secondary)" }}>
          Showing {filteredReportRows.length} of {reportRows.length} department students for the selected subject, current study year, and student search.
        </p>
      </GlassCard>

      {/* Report Table */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <div className="portal-table-wrap">
          <table className="portal-table" style={{ minWidth: 980 }}>
            <thead>
              <tr>
                {["Student", "Student ID", "Current Study Year", "Subject", "Status", "GPS Distance", "Accuracy", "Marked At"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center" style={{ color: "var(--md-text-secondary)" }}>Loading attendance report…</td></tr>
              ) : filteredReportRows.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center" style={{ color: "var(--md-text-secondary)" }}>No students match the selected filters.</td></tr>
              ) : filteredReportRows.map((row) => (
                <tr key={`${row.studentId}-${row.academicStage}-${row.subject}`}>
                  <td className="font-medium">{row.studentName}</td>
                  <td>{row.studentId || "-"}</td>
                  <td>{row.academicStage || "-"}</td>
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
