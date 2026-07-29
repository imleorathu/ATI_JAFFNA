import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Award, BarChart3, Download, Edit3, FileUp, Plus, RefreshCw, Save, Search, Trash2, Upload, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import GlassCard from "../../components/GlassCard";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch, downloadCsv } from "../../lib/api";
import { useModal } from "../../contexts/ModalContext.jsx";

const gradePoints = { "A+": 4.0, A: 4.0, "A-": 3.7, "B+": 3.3, B: 3.0, "B-": 2.7, "C+": 2.3, C: 2.0, "C-": 1.7, "D+": 1.3, D: 1.0, F: 0 };
const gradeOptions = Object.keys(gradePoints);

const emptyForm = { student: "", subject: "", semester: 1, credits: 3, score: 0, grade: "F", remarks: "" };

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"' && quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map((value) => value.replace(/^\uFEFF/, "").replace(/[\s_-]/g, "").toLowerCase());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function gradeFromScore(score) {
  const v = Number(score);
  if (v >= 90) return "A+";
  if (v >= 80) return "A";
  if (v >= 75) return "A-";
  if (v >= 70) return "B+";
  if (v >= 65) return "B";
  if (v >= 60) return "B-";
  if (v >= 55) return "C+";
  if (v >= 50) return "C";
  if (v >= 45) return "C-";
  if (v >= 40) return "D";
  return "F";
}

function gradeColor(score) {
  if (score >= 75) return "var(--color-mint)";
  if (score >= 60) return "var(--color-ocean)";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function computeGpa(grades) {
  const totals = grades.reduce(
    (acc, item) => {
      const credits = Number(item.credits || 0);
      acc.credits += credits;
      acc.points += (gradePoints[item.grade] || 0) * credits;
      return acc;
    },
    { points: 0, credits: 0 }
  );
  return totals.credits ? totals.points / totals.credits : 0;
}

function ReportTable({ title, rows }) {
  return (
    <GlassCard className="p-5">
      <div className="mb-4">
        <h2 className="classroom-section-title">{title}</h2>
        <p className="text-sm" style={{ color: "var(--md-text-secondary)" }}>{rows.length} report rows</p>
      </div>
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-[color:var(--md-card)] text-xs uppercase tracking-[0.12em] text-[color:var(--md-text-secondary)]">
            <tr>
              <th className="pb-3 pr-3">Name</th>
              <th className="pb-3 pr-3">Records</th>
              <th className="pb-3 pr-3">Students</th>
              <th className="pb-3 pr-3">Avg</th>
              <th className="pb-3 pr-3">Pass</th>
              <th className="pb-3">GPA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--md-border)]">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-[color:var(--md-text-secondary)]">No report data.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.label}>
                <td className="py-3 pr-3 font-semibold text-[color:var(--md-text-primary)]">{row.label}</td>
                <td className="py-3 pr-3 text-[color:var(--md-text-secondary)]">{row.records}</td>
                <td className="py-3 pr-3 text-[color:var(--md-text-secondary)]">{row.students}</td>
                <td className="py-3 pr-3 font-bold" style={{ color: gradeColor(row.averageScore) }}>{row.averageScore.toFixed(1)}%</td>
                <td className="py-3 pr-3 text-[color:var(--md-text-secondary)]">{row.passRate.toFixed(1)}%</td>
                <td className="py-3 font-bold text-[color:var(--md-primary)]">{row.gpa.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

export default function GradesPage() {
  const { confirm } = useModal();
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const canManage = ["lecturer", "department_staff", "admin"].includes(role);
  const isAdmin = role === "admin";
  const isFaculty = ["lecturer", "department_staff"].includes(role);

  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [academicStageFilter, setAcademicStageFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [gradeData, studentData] = await Promise.all([
        apiFetch("/api/grades"),
        canManage ? apiFetch(isFaculty ? "/api/students/my-department" : "/api/students") : Promise.resolve(null)
      ]);
      setGrades(Array.isArray(gradeData) ? gradeData : []);
      setStudents(isFaculty ? studentData?.students || [] : Array.isArray(studentData) ? studentData : []);
    } catch (err) {
      setError(err?.message || "Unable to load grades.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const departments = useMemo(() => [...new Set(grades.map((item) => item.department).filter(Boolean))].sort(), [grades]);
  const subjects = useMemo(() => [...new Set(grades.map((item) => item.subject).filter(Boolean))].sort(), [grades]);
  const semesters = useMemo(
    () => [...new Set(grades.map((item) => item.semester).filter((value) => value !== undefined && value !== null))].sort((a, b) => Number(a) - Number(b)),
    [grades]
  );
  const academicStages = useMemo(() => [...new Set(grades.map((item) => item.academicStage).filter(Boolean))].sort(), [grades]);
  const studentOptions = useMemo(() => {
    const byKey = new Map();
    const addStudent = ({ key, name, studentId, academicStage }) => {
      if (!key || byKey.has(String(key))) return;
      byKey.set(String(key), {
        key: String(key),
        name: name || studentId || "Unnamed student",
        studentId: studentId || "",
        academicStage: academicStage || ""
      });
    };

    students.forEach((student) => addStudent({
      key: student._id || student.studentId || student.fullName,
      name: student.fullName,
      studentId: student.studentId,
      academicStage: student.academicStage
    }));

    grades.forEach((grade) => addStudent({
      key: grade.student || grade.studentId || grade.studentName,
      name: grade.studentName,
      studentId: grade.studentId,
      academicStage: grade.academicStage
    }));

    return [...byKey.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [grades, students]);

  const filteredGrades = useMemo(() => {
    const query = search.trim().toLowerCase();
    return grades.filter((item) => {
      const matchesStudent =
        studentFilter === "all" ||
        [item.student, item.studentId, item.studentName].filter(Boolean).some((value) => String(value) === String(studentFilter));

      return (
        (departmentFilter === "all" || item.department === departmentFilter) &&
        (subjectFilter === "all" || item.subject === subjectFilter) &&
        (semesterFilter === "all" || String(item.semester) === String(semesterFilter)) &&
        (academicStageFilter === "all" || item.academicStage === academicStageFilter) &&
        matchesStudent &&
        (!query ||
          [item.studentName, item.studentId, item.department, item.academicStage, item.subject, item.grade, item.remarks]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(query)))
      );
    });
  }, [academicStageFilter, departmentFilter, grades, search, semesterFilter, subjectFilter, studentFilter]);

  const gpa = useMemo(() => computeGpa(filteredGrades), [filteredGrades]);
  const totalCredits = useMemo(() => filteredGrades.reduce((s, i) => s + Number(i.credits || 0), 0), [filteredGrades]);
  const topGrade = useMemo(() => filteredGrades.reduce((best, item) => (!best || Number(item.score) > Number(best.score) ? item : best), null), [filteredGrades]);
  const summarizeBy = (items, keyFn, labelFallback = "Not assigned") =>
    Object.values(items.reduce((acc, item) => {
      const label = keyFn(item) || labelFallback;
      if (!acc[label]) acc[label] = { label, records: 0, students: new Set(), credits: 0, scoreTotal: 0, passes: 0, fails: 0, gpaItems: [] };
      acc[label].records += 1;
      acc[label].students.add(item.studentId || item.studentName || item.student);
      acc[label].credits += Number(item.credits || 0);
      acc[label].scoreTotal += Number(item.score || 0);
      acc[label].passes += Number(item.score || 0) >= 40 ? 1 : 0;
      acc[label].fails += Number(item.score || 0) < 40 ? 1 : 0;
      acc[label].gpaItems.push(item);
      return acc;
    }, {})).map((item) => ({
      ...item,
      students: item.students.size,
      averageScore: item.records ? item.scoreTotal / item.records : 0,
      passRate: item.records ? (item.passes / item.records) * 100 : 0,
      gpa: computeGpa(item.gpaItems)
    })).sort((a, b) => String(a.label).localeCompare(String(b.label)));

  const subjectReports = useMemo(() => summarizeBy(filteredGrades, (item) => item.subject), [filteredGrades]);
  const semesterReports = useMemo(() => summarizeBy(filteredGrades, (item) => `Semester ${item.semester}`), [filteredGrades]);
  const departmentReports = useMemo(() => summarizeBy(filteredGrades, (item) => item.department), [filteredGrades]);
  const currentStudyYearReports = useMemo(() => summarizeBy(filteredGrades, (item) => item.academicStage, "No study year"), [filteredGrades]);
  const adminStats = useMemo(() => ({
    records: filteredGrades.length,
    departments: new Set(filteredGrades.map((item) => item.department).filter(Boolean)).size,
    subjects: new Set(filteredGrades.map((item) => item.subject).filter(Boolean)).size,
    averageScore: filteredGrades.length ? filteredGrades.reduce((sum, item) => sum + Number(item.score || 0), 0) / filteredGrades.length : 0
  }), [filteredGrades]);
  const facultyStats = useMemo(() => ({
    records: filteredGrades.length,
    students: new Set(filteredGrades.map((item) => item.studentId || item.studentName || item.student).filter(Boolean)).size,
    subjects: new Set(filteredGrades.map((item) => item.subject).filter(Boolean)).size,
    studyYears: new Set(filteredGrades.map((item) => item.academicStage).filter(Boolean)).size
  }), [filteredGrades]);
  const chartData = useMemo(() => filteredGrades.map((item) => ({ subject: item.subject.length > 14 ? `${item.subject.slice(0, 12)}…` : item.subject, score: item.score, fullName: item.subject })), [filteredGrades]);

  const chartRows = useMemo(() => {
    const source = (isAdmin || isFaculty) ? subjectReports : chartData.map((item) => ({ label: item.fullName, averageScore: item.score }));
    return source.map((item) => {
      const label = item.label || "Subject";
      return {
        subject: label.length > 14 ? `${label.slice(0, 12)}...` : label,
        score: Number(Number(item.averageScore || 0).toFixed(1)),
        fullName: label
      };
    });
  }, [chartData, isAdmin, isFaculty, subjectReports]);

  const resetForm = () => { setForm(emptyForm); setEditingId(""); setShowForm(false); };
  const clearGradeFilters = () => {
    setDepartmentFilter("all");
    setSubjectFilter("all");
    setSemesterFilter("all");
    setAcademicStageFilter("all");
    setStudentFilter("all");
    setSearch("");
  };

  const startCreate = () => { setError(""); setStatus(""); setForm(emptyForm); setEditingId(""); setShowForm(true); };

  const downloadImportTemplate = () => downloadCsv("ati-grade-import-template.csv", [
    { studentId: "ATI/2024/001", email: "student@example.com", subject: "Database Systems", semester: 1, credits: 3, score: 78, grade: "", remarks: "" }
  ]);

  const importGrades = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(""); setStatus("");
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Choose a CSV file exported from the grade import template.");
      return;
    }
    try {
      const rows = parseCsv(await file.text()).map((row) => ({
        studentId: row.studentid || row.student || "",
        email: row.email || "",
        subject: row.subject || "",
        semester: row.semester || "",
        credits: row.credits || "",
        score: row.score || "",
        grade: row.grade || "",
        remarks: row.remarks || ""
      }));
      if (!rows.length) throw new Error("The CSV has no grade rows.");
      setImporting(true);
      const result = await apiFetch("/api/grades/bulk-import", { method: "POST", body: JSON.stringify({ grades: rows }) });
      await loadData();
      const failed = result.errors?.length || 0;
      setStatus(`${result.created} created, ${result.updated} updated${failed ? `; ${failed} row(s) need attention.` : "."}`);
      setShowImport(false);
      if (failed) setError(result.errors.slice(0, 5).map((item) => `Row ${item.row}: ${item.message}`).join(" "));
    } catch (err) {
      setError(err?.message || "Unable to import grades.");
    } finally {
      setImporting(false);
    }
  };

  const startEdit = (grade) => {
    setError(""); setStatus("");
    setForm({ student: grade.student || "", subject: grade.subject || "", semester: grade.semester || 1, credits: grade.credits || 3, score: grade.score || 0, grade: grade.grade || gradeFromScore(grade.score), remarks: grade.remarks || "" });
    setEditingId(grade._id);
    setShowForm(true);
  };

  const saveGrade = async (event) => {
    event.preventDefault();
    setSaving(true); setError(""); setStatus("");
    try {
      const payload = { ...form, semester: Number(form.semester), credits: Number(form.credits), score: Number(form.score) };
      const saved = editingId
        ? await apiFetch(`/api/grades/${editingId}`, { method: "PUT", body: JSON.stringify(payload) })
        : await apiFetch("/api/grades", { method: "POST", body: JSON.stringify(payload) });
      setGrades((cur) => (editingId ? cur.map((i) => (i._id === saved._id ? saved : i)) : [...cur, saved]));
      setStatus(editingId ? "Grade updated successfully." : "Grade added successfully.");
      resetForm();
    } catch (err) {
      setError(err?.message || "Unable to save grade.");
    } finally {
      setSaving(false);
    }
  };

  const deleteGrade = async (grade) => {
    if (!await confirm({ title: "Delete grade?", message: `Delete the ${grade.subject} grade for ${grade.studentName}?`, confirmLabel: "Delete grade", tone: "danger" })) return;
    setError(""); setStatus("");
    try {
      await apiFetch(`/api/grades/${grade._id}`, { method: "DELETE" });
      setGrades((cur) => cur.filter((i) => i._id !== grade._id));
      setStatus("Grade deleted successfully.");
    } catch (err) {
      setError(err?.message || "Unable to delete grade.");
    }
  };

  const exportGrades = () =>
    downloadCsv("ati-grades.csv", filteredGrades.map((item) => ({ studentName: item.studentName, studentId: item.studentId, department: item.department, group: item.academicStage, subject: item.subject, semester: item.semester, credits: item.credits, score: item.score, grade: item.grade, remarks: item.remarks })));

  const exportReport = () =>
    downloadCsv("ati-grade-full-report.csv", [
      ...departmentReports.map((item) => ({ reportType: "Department", name: item.label, records: item.records, students: item.students, credits: item.credits, averageScore: item.averageScore.toFixed(2), passRate: item.passRate.toFixed(2), gpa: item.gpa.toFixed(2) })),
      ...subjectReports.map((item) => ({ reportType: "Subject", name: item.label, records: item.records, students: item.students, credits: item.credits, averageScore: item.averageScore.toFixed(2), passRate: item.passRate.toFixed(2), gpa: item.gpa.toFixed(2) })),
      ...semesterReports.map((item) => ({ reportType: "Semester", name: item.label, records: item.records, students: item.students, credits: item.credits, averageScore: item.averageScore.toFixed(2), passRate: item.passRate.toFixed(2), gpa: item.gpa.toFixed(2) }))
    ]);

  /* ---- chart theme ---- */
  const isDark = document.documentElement.dataset.portalTheme === "dark";
  const chartTextColor = isDark ? "rgba(255,255,255,0.5)" : "var(--md-text-secondary)";
  const chartGridColor = isDark ? "rgba(255,255,255,0.06)" : "var(--md-border)";
  const tooltipStyle = isDark
    ? { background: "#1f2937", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f8f9fa" }
    : { background: "#fff", border: "1px solid var(--md-border)", borderRadius: 8, color: "#202124" };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="portal-page-header">
        <div>
          <p className="portal-page-label">{isAdmin ? "Admin" : canManage ? "Department Staff" : "Student"}</p>
          <h1 className="portal-page-title">{canManage ? "Grade Management" : "Academic Performance"}</h1>
          <p className="portal-page-subtitle">
            {isAdmin ? "Review all department grades with subject-wise, semester, and academic-stage reports." : canManage ? "Manage department grades by subject, current study year, or a particular student." : "View your official grades and GPA breakdown."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadData} className="portal-btn">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button type="button" onClick={exportGrades} disabled={!filteredGrades.length} className="portal-btn">
            <Download size={15} /> Export
          </button>
          {isAdmin && (
            <button type="button" onClick={exportReport} disabled={!filteredGrades.length} className="portal-btn">
              <Download size={15} /> Full Report
            </button>
          )}
          {canManage && (
            <button type="button" onClick={() => { setError(""); setStatus(""); setShowImport((value) => !value); }} className="portal-btn">
              <FileUp size={15} /> Bulk Import
            </button>
          )}
          {canManage && (
            <button type="button" onClick={startCreate} className="portal-btn-primary">
              <Plus size={15} /> Add Grade
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error  && <div className="portal-alert-danger">{error}</div>}
      {status && <div className="portal-alert-success">{status}</div>}

      {showImport && canManage && (
        <GlassCard className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="classroom-section-title">Bulk Import Grades</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--md-text-secondary)" }}>Upload a CSV with studentId or email, subject, semester, credits, score, grade (optional), and remarks (optional). Existing student-subject-semester rows are updated.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={downloadImportTemplate} className="portal-btn"><Download size={15} /> Template</button>
              <label className="portal-btn-primary cursor-pointer">
                <Upload size={15} /> {importing ? "Importing…" : "Choose CSV"}
                <input type="file" accept=".csv,text/csv" onChange={importGrades} disabled={importing} className="hidden" />
              </label>
            </div>
          </div>
        </GlassCard>
      )}

      {isAdmin && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Grade Records", value: adminStats.records, Icon: Award, color: "var(--md-primary)" },
              { label: "Departments", value: adminStats.departments, Icon: BarChart3, color: "var(--color-ocean)" },
              { label: "Subjects", value: adminStats.subjects, Icon: Award, color: "var(--color-mint)" },
              { label: "Average Score", value: `${adminStats.averageScore.toFixed(1)}%`, Icon: BarChart3, color: "#f59e0b" }
            ].map(({ label, value, Icon, color }) => (
              <div key={label} className="portal-stat-card">
                <div>
                  <p className="portal-stat-label">{label}</p>
                  <p className="portal-stat-value" style={{ color }}>{value}</p>
                </div>
                <div className="portal-stat-icon" style={{ background: `${color}18`, color }}>
                  <Icon size={22} />
                </div>
              </div>
            ))}
          </div>

          <GlassCard className="p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="classroom-section-title">Admin Grade Filters</h2>
                <p className="text-sm" style={{ color: "var(--md-text-secondary)" }}>Filter by department, subject, semester, and academic stage.</p>
              </div>
              <button
                type="button"
                onClick={clearGradeFilters}
                className="portal-btn"
              >
                Clear Filters
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="portal-input">
                <option value="all">All departments</option>
                {departments.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
              <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="portal-input">
                <option value="all">All subjects</option>
                {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
              <select value={semesterFilter} onChange={(event) => setSemesterFilter(event.target.value)} className="portal-input">
                <option value="all">All semesters</option>
                {semesters.map((semester) => <option key={semester} value={semester}>Semester {semester}</option>)}
              </select>
              <select value={academicStageFilter} onChange={(event) => setAcademicStageFilter(event.target.value)} className="portal-input">
                <option value="all">All academic stages</option>
                {academicStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
              </select>
            </div>
          </GlassCard>
        </>
      )}

      {isFaculty && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Visible Records", value: facultyStats.records, Icon: Award, color: "var(--md-primary)" },
              { label: "Students", value: facultyStats.students, Icon: Search, color: "var(--color-ocean)" },
              { label: "Subjects", value: facultyStats.subjects, Icon: BarChart3, color: "var(--color-mint)" },
              { label: "Current Study Years", value: facultyStats.studyYears, Icon: Award, color: "#f59e0b" }
            ].map(({ label, value, Icon, color }) => (
              <div key={label} className="portal-stat-card">
                <div>
                  <p className="portal-stat-label">{label}</p>
                  <p className="portal-stat-value" style={{ color }}>{value}</p>
                </div>
                <div className="portal-stat-icon" style={{ background: `${color}18`, color }}>
                  <Icon size={22} />
                </div>
              </div>
            ))}
          </div>

          <GlassCard className="p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="classroom-section-title">Department Staff Grade Categories</h2>
                <p className="text-sm" style={{ color: "var(--md-text-secondary)" }}>Filter by subject, current study year, and a particular student in your department.</p>
              </div>
              <button type="button" onClick={clearGradeFilters} className="portal-btn">
                Clear Filters
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--md-text-secondary)]">Subject</span>
                <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="portal-input">
                  <option value="all">All subjects</option>
                  {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--md-text-secondary)]">Current study year</span>
                <select value={academicStageFilter} onChange={(event) => setAcademicStageFilter(event.target.value)} className="portal-input">
                  <option value="all">All study years</option>
                  {academicStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--md-text-secondary)]">Student</span>
                <select value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)} className="portal-input">
                  <option value="all">All students</option>
                  {studentOptions.map((student) => (
                    <option key={student.key} value={student.key}>
                      {student.name}{student.studentId ? ` (${student.studentId})` : ""}{student.academicStage ? ` - ${student.academicStage}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--md-text-secondary)]">Search particular student</span>
                <div className="portal-search w-full">
                  <Search size={15} />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, ID, subject..." className="w-full" />
                </div>
              </label>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--md-text-secondary)]">Subjects</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSubjectFilter("all")} className={subjectFilter === "all" ? "portal-btn-primary" : "portal-btn"}>All</button>
                  {subjects.map((subject) => (
                    <button key={subject} type="button" onClick={() => setSubjectFilter(subject)} className={subjectFilter === subject ? "portal-btn-primary" : "portal-btn"}>
                      {subject}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--md-text-secondary)]">Current study year</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setAcademicStageFilter("all")} className={academicStageFilter === "all" ? "portal-btn-primary" : "portal-btn"}>All</button>
                  {academicStages.map((stage) => (
                    <button key={stage} type="button" onClick={() => setAcademicStageFilter(stage)} className={academicStageFilter === stage ? "portal-btn-primary" : "portal-btn"}>
                      {stage}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </>
      )}

      {/* Student stat cards */}
      {!canManage && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Current GPA",   value: gpa.toFixed(2),                                      Icon: Award,    color: "var(--color-mint)"  },
            { label: "Total Credits", value: totalCredits,                                          Icon: Award,    color: "var(--color-ocean)" },
            { label: "Subjects",      value: filteredGrades.length,                                 Icon: BarChart3, color: "var(--md-primary)" },
            { label: "Top Subject",   value: topGrade ? `${topGrade.subject} (${topGrade.score}%)` : "—", Icon: Award, color: "#f59e0b" }
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="portal-stat-card">
              <div>
                <p className="portal-stat-label">{label}</p>
                <p className="portal-stat-value" style={{ color }}>{value}</p>
              </div>
              <div className="portal-stat-icon" style={{ background: `${color}18`, color }}>
                <Icon size={22} />
              </div>
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="grid gap-6 xl:grid-cols-3">
          <ReportTable title="Department Reports" rows={departmentReports} />
          <ReportTable title="Subject-Wise Reports" rows={subjectReports} />
          <ReportTable title="Semester Reports" rows={semesterReports} />
        </div>
      )}

      {isFaculty && (
        <div className="grid gap-6 xl:grid-cols-2">
          <ReportTable title="Subject Categories" rows={subjectReports} />
          <ReportTable title="Current Study Year Categories" rows={currentStudyYearReports} />
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && canManage && (
        <GlassCard className="p-5">
          <form onSubmit={saveGrade} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="classroom-section-title">{editingId ? "Edit Grade" : "Add Grade"}</h2>
              <button type="button" onClick={resetForm} className="portal-btn" style={{ padding: "0.35rem" }}>
                <X size={17} />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select required value={form.student} onChange={(e) => setForm((c) => ({ ...c, student: e.target.value }))} className="portal-input">
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s._id} value={s._id}>{s.fullName}{s.studentId ? ` (${s.studentId})` : ""}</option>
                ))}
              </select>
              <input required value={form.subject} onChange={(e) => setForm((c) => ({ ...c, subject: e.target.value }))} placeholder="Subject" className="portal-input" />
              <input type="number" min="1" value={form.semester} onChange={(e) => setForm((c) => ({ ...c, semester: e.target.value }))} placeholder="Semester" className="portal-input" />
              <input type="number" min="0" value={form.credits} onChange={(e) => setForm((c) => ({ ...c, credits: e.target.value }))} placeholder="Credits" className="portal-input" />
              <input type="number" min="0" max="100" value={form.score} onChange={(e) => setForm((c) => ({ ...c, score: e.target.value, grade: gradeFromScore(e.target.value) }))} placeholder="Score" className="portal-input" />
              <select value={form.grade} onChange={(e) => setForm((c) => ({ ...c, grade: e.target.value }))} className="portal-input">
                {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <input value={form.remarks} onChange={(e) => setForm((c) => ({ ...c, remarks: e.target.value }))} placeholder="Remarks" className="portal-input md:col-span-2" />
            </div>
            <button type="submit" disabled={saving} className="portal-btn-primary">
              <Save size={15} /> {saving ? "Saving…" : editingId ? "Update Grade" : "Create Grade"}
            </button>
          </form>
        </GlassCard>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart */}
        <GlassCard className="p-5">
          <h2 className="classroom-section-title">{(isAdmin || isFaculty) ? "Subject Average Performance" : "Subject Performance"}</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--md-text-secondary)" }}>{(isAdmin || isFaculty) ? "Average scores by subject across the selected report scope." : "Scores by subject."}</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="subject" tick={{ fill: chartTextColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: chartTextColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {chartRows.map((entry) => <Cell key={entry.fullName} fill={gradeColor(entry.score)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Grade Records */}
        <GlassCard className="p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="classroom-section-title">Grade Records</h2>
              <p className="text-sm" style={{ color: "var(--md-text-secondary)" }}>{filteredGrades.length} visible records</p>
            </div>
            <label className="portal-search">
              <Search size={15} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={canManage ? "Search particular student" : "Search grades"} style={{ width: "14rem" }} />
            </label>
          </div>

          <div className="max-h-[420px] overflow-auto space-y-3">
            {loading ? (
              <p className="py-10 text-center text-sm" style={{ color: "var(--md-text-secondary)" }}>Loading grades…</p>
            ) : filteredGrades.length === 0 ? (
              <p className="py-10 text-center text-sm" style={{ color: "var(--md-text-secondary)" }}>No grades found.</p>
            ) : (
              filteredGrades.map((item) => (
                <motion.div key={item._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="portal-row-item">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {canManage && <p className="text-xs font-semibold" style={{ color: "var(--md-primary)" }}>{item.studentName}{item.studentId ? ` (${item.studentId})` : ""}</p>}
                      <h3 className="mt-0.5 font-semibold" style={{ color: "var(--md-text-primary)" }}>{item.subject}</h3>
                      <p className="mt-0.5 text-xs" style={{ color: "var(--md-text-secondary)" }}>
                        Sem {item.semester} · {item.credits} credits · {item.department}{item.academicStage ? ` · ${item.academicStage}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black" style={{ color: gradeColor(item.score) }}>{item.grade}</p>
                      <p className="text-xs" style={{ color: "var(--md-text-secondary)" }}>{item.score}%</p>
                    </div>
                  </div>
                  {item.remarks && <p className="mt-1 text-sm" style={{ color: "var(--md-text-secondary)" }}>{item.remarks}</p>}
                  {canManage && (
                    <div className="mt-2 flex justify-end gap-2">
                      <button type="button" onClick={() => startEdit(item)} className="portal-btn" style={{ padding: "0.3rem 0.5rem" }}><Edit3 size={14} /></button>
                      <button type="button" onClick={() => deleteGrade(item)} className="portal-btn-danger" style={{ padding: "0.3rem 0.5rem" }}><Trash2 size={14} /></button>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
