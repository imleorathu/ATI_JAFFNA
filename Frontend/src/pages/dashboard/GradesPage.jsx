import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Award, BarChart3, Download, Edit3, Plus, RefreshCw, Save, Search, Trash2, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import GlassCard from "../../components/GlassCard";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch, downloadCsv } from "../../lib/api";

const gradePoints = { "A+": 4.0, A: 4.0, "A-": 3.7, "B+": 3.3, B: 3.0, "B-": 2.7, "C+": 2.3, C: 2.0, "C-": 1.7, "D+": 1.3, D: 1.0, F: 0 };
const gradeOptions = Object.keys(gradePoints);

const emptyForm = { student: "", subject: "", semester: 1, credits: 3, score: 0, grade: "F", remarks: "" };

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

export default function GradesPage() {
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const canManage = ["lecturer", "admin"].includes(role);
  const isFaculty = role === "lecturer";

  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const filteredGrades = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return grades;
    return grades.filter((item) =>
      [item.studentName, item.studentId, item.department, item.academicStage, item.subject, item.grade, item.remarks]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query))
    );
  }, [grades, search]);

  const gpa = useMemo(() => computeGpa(filteredGrades), [filteredGrades]);
  const totalCredits = useMemo(() => filteredGrades.reduce((s, i) => s + Number(i.credits || 0), 0), [filteredGrades]);
  const topGrade = useMemo(() => filteredGrades.reduce((best, item) => (!best || Number(item.score) > Number(best.score) ? item : best), null), [filteredGrades]);
  const chartData = useMemo(() => filteredGrades.map((item) => ({ subject: item.subject.length > 14 ? `${item.subject.slice(0, 12)}…` : item.subject, score: item.score, fullName: item.subject })), [filteredGrades]);

  const resetForm = () => { setForm(emptyForm); setEditingId(""); setShowForm(false); };

  const startCreate = () => { setError(""); setStatus(""); setForm(emptyForm); setEditingId(""); setShowForm(true); };

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
    if (!window.confirm(`Delete ${grade.subject} grade for ${grade.studentName}?`)) return;
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
          <p className="portal-page-label">{canManage ? "Department Staff" : "Student"}</p>
          <h1 className="portal-page-title">{canManage ? "Grade Management" : "Academic Performance"}</h1>
          <p className="portal-page-subtitle">
            {canManage ? "Manage grades only for students in your department." : "View your official grades and GPA breakdown."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadData} className="portal-btn">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button type="button" onClick={exportGrades} disabled={!filteredGrades.length} className="portal-btn">
            <Download size={15} /> Export
          </button>
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
          <h2 className="classroom-section-title">Subject Performance</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--md-text-secondary)" }}>Scores by subject.</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis dataKey="subject" tick={{ fill: chartTextColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: chartTextColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry) => <Cell key={entry.fullName} fill={gradeColor(entry.score)} />)}
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
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search grades" style={{ width: "14rem" }} />
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
