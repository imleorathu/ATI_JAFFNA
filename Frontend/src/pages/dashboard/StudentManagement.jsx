import { useEffect, useMemo, useState } from "react";
import { Award, CheckCircle2, Download, Edit3, Mail, Phone, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import GlassCard from "../../components/GlassCard";
import AppModal from "../../components/AppModal.jsx";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch, downloadCsv } from "../../lib/api";
import { useModal } from "../../contexts/ModalContext.jsx";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  nic: "",
  studentId: "",
  department: "",
  program: "",
  intake: "",
  academicYear: "",
  academicStage: "",
  studyMode: "Full-time",
  guardianName: "",
  guardianPhone: "",
  paymentStatus: "not_required",
  password: "",
  confirmPassword: ""
};

const fallbackDepartments = [
  "Higher National Diploma in Accountancy - (HNDA)",
  "Higher National Diploma in English",
  "Higher National Diploma in Engineering - Civil",
  "Higher National Diploma in Engineering - Electrical",
  "Higher National Diploma in Management - (HNDM)",
  "Higher National Diploma in Information Technology - (HNDIT)",
  "Higher National Diploma in Quantity Surveying"
];
const studyModes = ["Full-time", "Part-time"];
const academicStages = [
  "First year Full Time",
  "Second year Full Time",
  "First year Part Time",
  "Second year Part Time"
];
const paymentStyles = {
  not_required: "bg-[color:var(--md-hover)] text-[color:var(--md-text-secondary)]",
  paid: "bg-emerald-500/15 text-[color:var(--md-success)]",
  partial: "bg-sky-500/15 text-[color:var(--md-primary)]",
  pending: "bg-amber-500/15 text-[color:var(--md-warning)]"
};

const paymentLabels = {
  not_required: "No payment",
  paid: "Paid",
  partial: "Partial",
  pending: "Pending"
};

export default function StudentManagement() {
  const { confirm } = useModal();
  const { user } = useAuth();
  const isFaculty = ["lecturer", "department_staff"].includes(String(user?.role || "").toLowerCase());
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState(fallbackDepartments);
  const [facultyScope, setFacultyScope] = useState(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [studyModeFilter, setStudyModeFilter] = useState("all");
  const [academicStageFilter, setAcademicStageFilter] = useState("all");
  const [academicYearFilter, setAcademicYearFilter] = useState("all");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [graduationTarget, setGraduationTarget] = useState(null);
  const [graduationBatch, setGraduationBatch] = useState("");
  const [graduationYear, setGraduationYear] = useState(String(new Date().getFullYear()));
  const [graduating, setGraduating] = useState(false);

  const batchOptions = useMemo(() => Array.from(new Set(students.map((student) => student.intake).filter(Boolean))).sort(), [students]);
  const academicYearOptions = useMemo(() => Array.from(new Set(students.map((student) => student.academicYear).filter(Boolean))).sort(), [students]);

  const loadDepartments = async () => {
    try {
      const data = await apiFetch("/api/departments");
      const names = Array.isArray(data) ? data.map((department) => department.name).filter(Boolean) : [];
      if (names.length) setDepartments(names);
    } catch {
      setDepartments(fallbackDepartments);
    }
  };

  const loadStudents = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      if (isFaculty) {
        const data = await apiFetch("/api/students/my-department");
        setStudents(data.students || []);
        setFacultyScope(data);
      } else {
        setStudents(await apiFetch("/api/students"));
      }
    } catch (err) {
      setError(err?.message || "Unable to load students.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
    loadStudents();
    const refreshStudents = () => loadStudents(true);
    const refreshAfterPayment = (event) => {
      const studentId = event.detail?.studentId;
      const paymentStatus = event.detail?.paymentStatus;
      if (studentId && paymentStatus) {
        setStudents((current) =>
          current.map((student) => (String(student._id) === String(studentId) ? { ...student, paymentStatus } : student))
        );
      }
      loadStudents(true);
    };
    const intervalId = window.setInterval(refreshStudents, 15000);
    window.addEventListener("focus", refreshStudents);
    window.addEventListener("ati-student-payment-updated", refreshAfterPayment);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshStudents);
      window.removeEventListener("ati-student-payment-updated", refreshAfterPayment);
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return students.filter((student) => {
      const matchesDepartment = isFaculty || departmentFilter === "all" || student.department === departmentFilter;
      const matchesStudyMode = studyModeFilter === "all" || student.studyMode === studyModeFilter;
      const matchesAcademicStage = academicStageFilter === "all" || student.academicStage === academicStageFilter;
      const matchesAcademicYear = academicYearFilter === "all" || student.academicYear === academicYearFilter;
      const matchesSearch =
        !query ||
        [
          student.fullName,
          student.email,
          student.phone,
          student.nic,
          student.studentId,
          student.department,
          student.program,
          student.intake,
          student.academicYear,
          student.academicStage,
          student.studyMode,
          student.guardianName,
          student.guardianPhone,
          student.paymentStatus
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return matchesDepartment && matchesStudyMode && matchesAcademicStage && matchesAcademicYear && matchesSearch;
    });
  }, [academicStageFilter, academicYearFilter, departmentFilter, isFaculty, search, students, studyModeFilter]);

  const stats = useMemo(
    () => ({
      total: students.length,
      fullTime: students.filter((student) => student.studyMode === "Full-time").length,
      partTime: students.filter((student) => student.studyMode === "Part-time").length,
      academicStageGroups: academicStages.reduce((acc, stage) => {
        acc[stage] = students.filter((student) => student.academicStage === stage).length;
        return acc;
      }, {}),
      noPayment: students.filter((student) => student.paymentStatus === "not_required" || student.studyMode === "Full-time").length,
      paid: students.filter((student) => student.paymentStatus === "paid").length,
      partial: students.filter((student) => student.paymentStatus === "partial").length,
      pending: students.filter((student) => student.paymentStatus === "pending").length
    }),
    [students]
  );

  const resetForm = () => {
    setForm({ ...initialForm, department: isFaculty ? facultyScope?.faculty?.department || "" : initialForm.department });
    setEditingId("");
    setShowForm(false);
  };

  const setFormDepartment = (department) => {
    setForm((current) => ({
      ...current,
      department,
      program: department
    }));
  };

  const setFormStudyMode = (studyMode) => {
    setForm((current) => {
      const incompatibleStage = studyMode === "Full-time" ? "Part Time" : "Full Time";
      const academicStage = current.academicStage.includes(incompatibleStage)
        ? academicStages.find((stage) => stage.includes(studyMode === "Full-time" ? "Full Time" : "Part Time")) || ""
        : current.academicStage;
      return {
        ...current,
        studyMode,
        academicStage,
        paymentStatus: studyMode === "Full-time" ? "not_required" : current.paymentStatus === "not_required" ? "pending" : current.paymentStatus
      };
    });
  };

  const setFormAcademicStage = (academicStage) => {
    setForm((current) => ({
      ...current,
      academicStage,
      studyMode: academicStage.includes("Part Time") ? "Part-time" : "Full-time",
      paymentStatus: academicStage.includes("Part Time") ? (current.paymentStatus === "not_required" ? "pending" : current.paymentStatus) : "not_required"
    }));
  };

  const setFormPaymentStatus = (paymentStatus) => {
    setForm((current) => ({
      ...current,
      paymentStatus: current.studyMode === "Full-time" || paymentStatus === "not_required" ? "not_required" : paymentStatus
    }));
  };

  const startEdit = (student) => {
    setError("");
    setStatus("");
    setForm({
      fullName: student.fullName || "",
      email: student.email || "",
      phone: student.phone || "",
      nic: student.nic || "",
      studentId: student.studentId || "",
      department: isFaculty ? facultyScope?.faculty?.department || student.department || "" : student.department || "",
      program: student.program || "",
      intake: student.intake || "",
      academicYear: student.academicYear || "",
      academicStage: student.academicStage || "",
      studyMode: student.studyMode || "Full-time",
      guardianName: student.guardianName || "",
      guardianPhone: student.guardianPhone || "",
      paymentStatus: student.studyMode === "Full-time" ? "not_required" : student.paymentStatus === "not_required" ? "pending" : student.paymentStatus || "pending",
      password: "",
      confirmPassword: ""
    });
    setEditingId(student._id);
    setShowForm(true);
  };

  const saveStudent = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const normalizedPaymentStatus =
        form.studyMode === "Full-time" ? "not_required" : form.paymentStatus === "not_required" ? "pending" : form.paymentStatus;
      if ((!editingId || form.password || form.confirmPassword) && form.password !== form.confirmPassword) {
        throw new Error("Password and confirm password do not match.");
      }
      const { password, confirmPassword, ...studentFields } = form;
      const payload = JSON.stringify({
        ...studentFields,
        ...(isFaculty ? { department: facultyScope?.faculty?.department || form.department } : {}),
        paymentStatus: normalizedPaymentStatus,
        ...(!editingId || password ? { password, confirmPassword } : {})
      });
      const saved = editingId
        ? await apiFetch(`/api/students/${editingId}`, { method: "PUT", body: payload })
        : await apiFetch("/api/students", { method: "POST", body: payload });

      setStudents((current) =>
        editingId ? current.map((student) => (student._id === saved._id ? saved : student)) : [saved, ...current]
      );
      await loadStudents();
      setStatus(editingId ? "Student updated successfully." : "Student created successfully.");
      resetForm();
    } catch (err) {
      setError(err?.message || "Unable to save student.");
    } finally {
      setSaving(false);
    }
  };

  const deleteStudent = async (student) => {
    const confirmed = await confirm({ title: "Delete student?", message: `Delete ${student.fullName} and the linked login account?`, confirmLabel: "Delete student", tone: "danger" });
    if (!confirmed) return;

    setError("");
    try {
      await apiFetch(`/api/students/${student._id}`, { method: "DELETE" });
      setStudents((current) => current.filter((item) => item._id !== student._id));
    } catch (err) {
      setError(err?.message || "Unable to delete student.");
    }
  };

  const graduate = async (event) => {
    event.preventDefault();
    if (!graduationTarget) return;
    setGraduating(true); setError(""); setStatus("");
    try {
      const data = graduationTarget.type === "student"
        ? await apiFetch(`/api/alumni/graduate/student/${graduationTarget.student._id}`, { method: "POST", body: JSON.stringify({ graduationYear }) })
        : await apiFetch("/api/alumni/graduate/batch", { method: "POST", body: JSON.stringify({ batch: graduationBatch, graduationYear }) });
      setStatus(data.message || "Graduation status updated successfully.");
      setGraduationTarget(null); setGraduationBatch("");
      await loadStudents();
    } catch (err) { setError(err?.message || "Unable to graduate the selected student record(s)."); }
    finally { setGraduating(false); }
  };

  const exportStudents = () => {
    downloadCsv(
      "ati-students.csv",
      filteredStudents.map((student) => ({
        name: student.fullName,
        email: student.email,
        phone: student.phone,
        nic: student.nic,
        studentId: student.studentId,
        department: student.department,
        program: student.program,
        intake: student.intake,
        academicYear: student.academicYear,
        academicStage: student.academicStage,
        studyMode: student.studyMode,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        paymentStatus: paymentLabels[student.paymentStatus] || student.paymentStatus
      }))
    );
  };

  const departmentBreakdown = useMemo(
    () =>
      departments
        .map((department) => ({
          department,
          fullTime: students.filter((student) => student.department === department && student.studyMode === "Full-time").length,
          partTime: students.filter((student) => student.department === department && student.studyMode === "Part-time").length
        }))
        .filter((item) => item.fullTime + item.partTime > 0),
    [departments, students]
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between" style={{borderBottom:"1px solid var(--md-border)"}}>
        <div>
          <p className="portal-page-label">{isFaculty ? "Faculty" : "Admin"}</p>
          <h1 className="portal-page-title">{isFaculty ? "Department Students" : "Student Management"}</h1>
          <p className="portal-page-subtitle">
            {isFaculty
              ? `Manage students assigned to ${facultyScope?.faculty?.department || "your department"}.`
              : "Create, update, export, and remove student records."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportStudents}
            className="portal-btn"
          >
            <Download size={16} />
            Export
          </button>
          {!isFaculty && (
            <button type="button" onClick={() => setGraduationTarget({ type: "batch" })} className="portal-btn" disabled={!batchOptions.length}>
              <Award size={16} /> Graduate Batch
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setEditingId("");
              setForm({ ...initialForm, department: isFaculty ? facultyScope?.faculty?.department || "" : initialForm.department });
            }}
            className="portal-btn-primary"
          >
            <Plus size={16} />
            Add Student
          </button>
        </div>
      </div>

      {error && <div className="portal-alert-danger">{error}</div>}
      {status && <div className="portal-alert-success">{status}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Students", stats.total, UserRound, "text-[color:var(--md-text-primary)]"],
          ["Full-time", stats.fullTime, CheckCircle2, "text-[color:var(--md-success)]"],
          ["Part-time", stats.partTime, CheckCircle2, "text-[color:var(--md-primary)]"],
          ["No Payment", stats.noPayment, CheckCircle2, "text-[color:var(--md-text-secondary)]"],
          ["Paid", stats.paid, CheckCircle2, "text-[color:var(--md-success)]"],
          ["Partial", stats.partial, CheckCircle2, "text-[color:var(--md-primary)]"],
          ["Pending", stats.pending, CheckCircle2, "text-[color:var(--md-warning)]"]
        ].map(([label, value, Icon, color]) => (
          <GlassCard key={label} dark className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="portal-stat-label">{label}</p>
                <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
              </div>
              <Icon className={color} size={24} />
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {academicStages.map((stage) => (
          <GlassCard key={stage} dark className="p-5">
            <p className="portal-stat-label">{stage}</p>
            <p className="portal-stat-value" style={{color:"var(--color-ocean)"}}>{stats.academicStageGroups[stage] || 0}</p>
            <p className="mt-1 text-xs font-semibold text-[color:var(--md-text-secondary)]">Students</p>
          </GlassCard>
        ))}
      </div>

      {showForm && (
        <AppModal open={showForm} onClose={resetForm} size="lg" hideClose>
        <GlassCard className="m-0 p-5">
          <form onSubmit={saveStudent} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="classroom-section-title">{editingId ? "Edit Student" : "Add Student"}</h2>
              <button type="button" onClick={resetForm} className="rounded-lg p-2 text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)] hover:text-[color:var(--md-text-primary)]">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <input
                required
                value={form.fullName}
                onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                placeholder="Full name"
                className="portal-input"
              />
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="Email"
                className="portal-input"
              />
              <input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Phone"
                className="portal-input"
              />
              <input
                value={form.nic}
                onChange={(event) => setForm((current) => ({ ...current, nic: event.target.value }))}
                placeholder="NIC"
                className="portal-input"
              />
              <input
                value={form.studentId}
                onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))}
                placeholder="Student ID"
                className="portal-input"
              />
              {isFaculty ? (
                <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2.5 text-sm text-[color:var(--md-text-secondary)]">
                  {facultyScope?.faculty?.department || form.department || "Your department"}
                </div>
              ) : (
                <select
                  value={form.department}
                  onChange={(event) => setFormDepartment(event.target.value)}
                  className="portal-input"
                >
                  <option value="">Department</option>
                  {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
              )}
              <input
                value={form.program}
                onChange={(event) => setForm((current) => ({ ...current, program: event.target.value }))}
                placeholder="Programme"
                className="portal-input"
              />
              <input
                value={form.intake}
                onChange={(event) => setForm((current) => ({ ...current, intake: event.target.value }))}
                placeholder="Intake"
                className="portal-input"
              />
              <input
                required
                value={form.academicYear}
                onChange={(event) => setForm((current) => ({ ...current, academicYear: event.target.value }))}
                placeholder="Academic year (e.g. 2025/2026)"
                className="portal-input"
              />
              <select
                value={form.studyMode}
                onChange={(event) => setFormStudyMode(event.target.value)}
                className="portal-input"
              >
                {studyModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode === "Full-time" ? "Full Time" : "Part Time"}
                  </option>
                ))}
              </select>
              <select
                required
                value={form.academicStage}
                onChange={(event) => setFormAcademicStage(event.target.value)}
                className="portal-input"
              >
                <option value="">Current Study year</option>
                {academicStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
              </select>
              <input
                value={form.guardianName}
                onChange={(event) => setForm((current) => ({ ...current, guardianName: event.target.value }))}
                placeholder="Guardian name"
                className="portal-input"
              />
              <input
                value={form.guardianPhone}
                onChange={(event) => setForm((current) => ({ ...current, guardianPhone: event.target.value }))}
                placeholder="Guardian phone"
                className="portal-input"
              />
              <select
                value={form.paymentStatus}
                onChange={(event) => setFormPaymentStatus(event.target.value)}
                disabled={form.studyMode === "Full-time"}
                className="portal-input disabled:cursor-not-allowed disabled:opacity-60"
              >
                {form.studyMode === "Full-time" && <option value="not_required">No payment required</option>}
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
              <input
                required={!editingId}
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                placeholder={editingId ? "New login password (optional)" : "Login password"}
                autoComplete="new-password"
                className="portal-input"
              />
              <input
                required={!editingId || Boolean(form.password)}
                type="password"
                value={form.confirmPassword}
                onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                placeholder={editingId ? "Confirm new password" : "Confirm password"}
                autoComplete="new-password"
                className="portal-input"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
            >
              {saving ? "Saving..." : editingId ? "Update Student" : "Create Student"}
            </button>
          </form>
        </GlassCard>
        </AppModal>
      )}

      <AppModal open={!!graduationTarget} onClose={() => !graduating && setGraduationTarget(null)} size="sm">
        <form onSubmit={graduate} className="space-y-4 p-6">
          <div className="flex items-center gap-3"><Award className="text-[color:var(--md-primary)]"/><div><h2 className="classroom-section-title">{graduationTarget?.type === "batch" ? "Graduate a Batch" : "Graduate Student"}</h2><p className="portal-page-subtitle">This permanently moves the active student record and existing login to the Alumni portal.</p></div></div>
          {graduationTarget?.type === "student" ? (
            <div className="rounded-lg bg-[color:var(--md-hover)] p-4"><p className="font-bold">{graduationTarget.student.fullName}</p><p className="text-sm text-[color:var(--md-text-secondary)]">{graduationTarget.student.studentId} · {graduationTarget.student.intake || "No batch recorded"}</p></div>
          ) : (
            <label className="block text-sm font-bold">Batch<select required value={graduationBatch} onChange={(event) => setGraduationBatch(event.target.value)} className="portal-input mt-2 w-full"><option value="">Select batch</option>{batchOptions.map((batch) => <option key={batch} value={batch}>{batch}</option>)}</select></label>
          )}
          <label className="block text-sm font-bold">Graduation Year<input required value={graduationYear} onChange={(event) => setGraduationYear(event.target.value)} placeholder="2026" className="portal-input mt-2 w-full"/></label>
          <div className="portal-alert-danger">After graduation, the selected student account(s) cannot access the Student portal. Their current email/registration number and password will open the Alumni portal instead.</div>
          <div className="flex gap-3"><button type="button" onClick={() => setGraduationTarget(null)} className="portal-btn" disabled={graduating}>Cancel</button><button type="submit" className="portal-btn-primary" disabled={graduating}>{graduating ? "Moving to Alumni..." : "Confirm Graduation"}</button></div>
        </form>
      </AppModal>

      <GlassCard className="p-5">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="classroom-section-title">Students</h2>
            <label className="portal-search">
              <Search size={16} className="text-[color:var(--md-text-secondary)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search students"
                className="w-full bg-transparent text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] sm:w-72"
              />
            </label>
          </div>
          <div className={`grid gap-3 ${isFaculty ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4"}`}>
            {!isFaculty && (
              <select
                value={departmentFilter}
                onChange={(event) => {
                  setDepartmentFilter(event.target.value);
                }}
                className="portal-input"
              >
                <option value="all">All departments</option>
                {departments.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
            )}
            {!isFaculty && (
              <select value={academicYearFilter} onChange={(event) => setAcademicYearFilter(event.target.value)} className="portal-input">
                <option value="all">All academic years</option>
                {academicYearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            )}
            <select value={studyModeFilter} onChange={(event) => setStudyModeFilter(event.target.value)} className="portal-input">
              <option value="all">All study modes</option>
              {studyModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
            </select>
            <select value={academicStageFilter} onChange={(event) => setAcademicStageFilter(event.target.value)} className="portal-input">
              <option value="all">All current study years</option>
              {academicStages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
            </select>
          </div>
        </div>

        {departmentBreakdown.length > 0 && (
          <div className="mb-5 grid gap-3 lg:grid-cols-2">
            {departmentBreakdown.map((item) => (
              <div key={item.department} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-4 py-3">
                <p className="text-sm font-bold text-[color:var(--md-text-primary)]">{item.department}</p>
                <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">
                  Full-time: <span className="font-bold text-[color:var(--md-success)]">{item.fullTime}</span>
                  <span className="px-2 text-[color:var(--md-text-secondary)]">|</span>
                  Part-time: <span className="font-bold text-[color:var(--md-primary)]">{item.partTime}</span>
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="" style={{borderBottom:"1px solid var(--md-border)"}}>
                <th className="pb-3">Name</th>
                <th className="pb-3">Academic</th>
                <th className="pb-3">Contact</th>
                <th className="pb-3">NIC</th>
                <th className="pb-3">Payment</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[color:var(--md-text-secondary)]">Loading students...</td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[color:var(--md-text-secondary)]">No students found.</td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student._id} className="border-b border-[color:var(--md-border)] last:border-0">
                    <td className="py-3 pr-4">
                      <p className="font-semibold" style={{color:"var(--md-text-primary)"}}>{student.fullName}</p>
                      <p className="text-xs text-[color:var(--md-text-secondary)]">{student.studentId || student._id}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-[color:var(--md-text-secondary)]">{student.program || "No programme"}</p>
                      <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">
                        {[student.department, student.academicYear && `Academic year: ${student.academicYear}`, student.academicStage, student.studyMode].filter(Boolean).join(" | ") || "No academic details"}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="flex items-center gap-2 text-[color:var(--md-text-secondary)]"><Mail size={14} />{student.email}</p>
                      <p className="mt-1 flex items-center gap-2 text-[color:var(--md-text-secondary)]"><Phone size={14} />{student.phone || "No phone"}</p>
                    </td>
                    <td className="py-3 pr-4 text-[color:var(--md-text-secondary)]">{student.nic || "Not added"}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${paymentStyles[student.paymentStatus] || paymentStyles.pending}`}>
                        {paymentLabels[student.paymentStatus] || student.paymentStatus || "Pending"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button type="button" onClick={() => startEdit(student)} className="portal-btn" style={{padding:"0.4rem"}}>
                          <Edit3 size={16} />
                        </button>
                        {!isFaculty && <button type="button" title="Mark as graduated" onClick={() => setGraduationTarget({ type: "student", student })} className="portal-btn" style={{padding:"0.4rem"}}><Award size={16}/></button>}
                        <button type="button" onClick={() => deleteStudent(student)} className="portal-btn-danger" style={{padding:"0.4rem"}}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
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
