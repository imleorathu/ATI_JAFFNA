import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Building2,
  Copy,
  Download,
  Edit3,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X
} from "lucide-react";
import GlassCard from "../../components/GlassCard";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch, downloadCsv } from "../../lib/api";

const emptyForm = {
  title: "",
  duration: "",
  entryRequirements: "",
  fee: "Contact office",
  department: "",
  description: "",
  instructor: "",
  progress: 0
};

const hndDepartments = [
  "Higher National Diploma in Accountancy - (HNDA)",
  "Higher National Diploma in English",
  "Higher National Diploma in Engineering - Civil",
  "Higher National Diploma in Engineering - Electrical",
  "Higher National Diploma in Management - (HNDM)",
  "Higher National Diploma in Information Technology - (HNDIT)",
  "Higher National Diploma in Quantity Surveying"
];

function departmentName(departments, id) {
  if (!id) return "Unassigned";
  if (typeof id === "object") return id.name || "Unassigned";
  return departments.find((department) => department._id === id || department.name === id)?.name || id;
}

export default function CourseManagement() {
  const { user } = useAuth();
  const isFaculty = String(user?.role || "").toLowerCase() === "lecturer";
  const [courses, setCourses] = useState([]);
  const [departments] = useState(hndDepartments.map((name) => ({ _id: name, name })));
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const courseData = await apiFetch("/api/courses");
      setCourses(courseData);
    } catch (err) {
      setError(err?.message || "Unable to load courses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesSearch =
        !query ||
        [course.title, course.duration, course.entryRequirements, course.fee, course.description]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const courseDepartmentId = typeof course.department === "object" ? course.department?._id : course.department;
      const matchesDepartment = departmentFilter === "all" || courseDepartmentId === departmentFilter;
      return matchesSearch && matchesDepartment;
    });
  }, [courses, departmentFilter, search]);

  const stats = useMemo(
    () => ({
      total: courses.length,
      departments: new Set(courses.map((course) => (typeof course.department === "object" ? course.department?._id : course.department)).filter(Boolean)).size,
      withFee: courses.filter((course) => course.fee && course.fee !== "Contact office").length,
      unassigned: courses.filter((course) => !course.department).length
    }),
    [courses]
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
    setShowForm(false);
  };

  const startCreate = () => {
    setForm(emptyForm);
    setEditingId("");
    setShowForm(true);
  };

  const startEdit = (course) => {
    setForm({
      title: course.title || "",
      duration: course.duration || "",
      entryRequirements: course.entryRequirements || "",
      fee: course.fee || "Contact office",
      department: typeof course.department === "object" ? course.department?._id || "" : course.department || "",
      description: course.description || "",
      instructor: course.instructor || "",
      progress: course.progress ?? 0
    });
    setEditingId(course._id);
    setShowForm(true);
  };

  const saveCourse = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...form,
      department: isFaculty ? undefined : form.department || undefined,
      progress: Number(form.progress || 0)
    };

    try {
      const saved = editingId
        ? await apiFetch(`/api/courses/${editingId}`, { method: "PUT", body: JSON.stringify(payload) })
        : await apiFetch("/api/courses", { method: "POST", body: JSON.stringify(payload) });

      setCourses((current) =>
        editingId ? current.map((course) => (course._id === saved._id ? saved : course)) : [saved, ...current]
      );
      resetForm();
    } catch (err) {
      setError(err?.message || "Unable to save course.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCourse = async (course) => {
    if (!window.confirm(`Delete ${course.title}?`)) return;
    setError("");
    try {
      await apiFetch(`/api/courses/${course._id}`, { method: "DELETE" });
      setCourses((current) => current.filter((item) => item._id !== course._id));
      setSelectedIds((current) => current.filter((id) => id !== course._id));
    } catch (err) {
      setError(err?.message || "Unable to delete course.");
    }
  };

  const duplicateCourse = async (course) => {
    setError("");
    try {
      const courseDepartmentId = typeof course.department === "object" ? course.department?._id : course.department;
      const copy = await apiFetch("/api/courses", {
        method: "POST",
        body: JSON.stringify({
          title: `${course.title} Copy`,
          duration: course.duration,
          entryRequirements: course.entryRequirements,
          fee: course.fee,
          department: isFaculty ? undefined : courseDepartmentId || undefined,
          description: course.description,
          instructor: course.instructor,
          progress: course.progress || 0
        })
      });
      setCourses((current) => [copy, ...current]);
    } catch (err) {
      setError(err?.message || "Unable to duplicate course.");
    }
  };

  const bulkDelete = async () => {
    if (!selectedIds.length || !window.confirm(`Delete ${selectedIds.length} selected courses?`)) return;
    setError("");
    try {
      await Promise.all(selectedIds.map((id) => apiFetch(`/api/courses/${id}`, { method: "DELETE" })));
      setCourses((current) => current.filter((course) => !selectedIds.includes(course._id)));
      setSelectedIds([]);
    } catch (err) {
      setError(err?.message || "Unable to delete selected courses.");
    }
  };

  const exportCourses = () => {
    downloadCsv(
      "ati-courses.csv",
      filteredCourses.map((course) => ({
        title: course.title,
        duration: course.duration,
        entryRequirements: course.entryRequirements,
        fee: course.fee,
        department: departmentName(departments, typeof course.department === "object" ? course.department?._id : course.department),
        description: course.description
      }))
    );
  };

  const toggleSelected = (id) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const toggleAllVisible = () => {
    const visibleIds = filteredCourses.map((course) => course._id);
    const allVisibleSelected = visibleIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) =>
      allVisibleSelected ? current.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...current, ...visibleIds]))
    );
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between" style={{borderBottom:"1px solid var(--md-border)"}}>
        <div>
          <p className="portal-page-label">Admin</p>
          <h1 className="portal-page-title">{isFaculty ? "My Courses" : "Course Management"}</h1>
          <p className="portal-page-subtitle">
            {isFaculty ? "Manage only the courses shown to students in your department." : "Manage programmes, department mapping, entry rules, fees, and exports."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadData} className="portal-btn">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button type="button" onClick={exportCourses} className="portal-btn">
            <Download size={16} />
            Export
          </button>
          <button type="button" onClick={startCreate} className="portal-btn-primary">
            <Plus size={16} />
            Add Course
          </button>
        </div>
      </div>

      {error && <div className="portal-alert-danger">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Courses", stats.total, BookOpen, "text-[color:var(--md-text-primary)]"],
          ["Departments Used", stats.departments, Building2, "text-[color:var(--md-primary)]"],
          ["Fee Configured", stats.withFee, FileText, "text-[color:var(--md-success)]"],
          [isFaculty ? "Your Scope" : "Unassigned", isFaculty ? "Dept" : stats.unassigned, X, "text-[color:var(--md-warning)]"]
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

      {showForm && (
        <GlassCard className="p-5">
          <form onSubmit={saveCourse} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="classroom-section-title">{editingId ? "Edit Course" : "Add Course"}</h2>
              <button type="button" onClick={resetForm} className="rounded-lg p-2 text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)] hover:text-[color:var(--md-text-primary)]">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Course title" className="portal-input" />
              <input required value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))} placeholder="Duration" className="portal-input" />
              <input required value={form.entryRequirements} onChange={(event) => setForm((current) => ({ ...current, entryRequirements: event.target.value }))} placeholder="Entry requirements" className="portal-input" />
              <input value={form.fee} onChange={(event) => setForm((current) => ({ ...current, fee: event.target.value }))} placeholder="Fee" className="portal-input" />
              <input value={form.instructor} onChange={(event) => setForm((current) => ({ ...current, instructor: event.target.value }))} placeholder="Instructor name" className="portal-input" />
              <input type="number" min="0" max="100" value={form.progress} onChange={(event) => setForm((current) => ({ ...current, progress: event.target.value }))} placeholder="Progress %" className="portal-input" />
              {!isFaculty && (
                <select value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} className="portal-input">
                  <option value="">No department</option>
                  {departments.map((department) => (
                    <option key={department._id} value={department._id}>{department.name}</option>
                  ))}
                </select>
              )}
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" rows={3} className="portal-input lg:col-span-2" />
            </div>

            <button type="submit" disabled={saving} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-sky-400 disabled:opacity-60">
              {saving ? "Saving..." : editingId ? "Update Course" : "Create Course"}
            </button>
          </form>
        </GlassCard>
      )}

      <GlassCard className="p-5">
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="classroom-section-title">Courses</h2>
            <p className="text-xs text-[color:var(--md-text-secondary)]">{filteredCourses.length} visible from {courses.length} total</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="portal-search">
              <Search size={16} className="text-[color:var(--md-text-secondary)]" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search courses" className="" style={{width:"100%"}} />
            </label>
            {!isFaculty && (
              <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-primary)] outline-none">
                <option value="all">All departments</option>
                {departments.map((department) => (
                  <option key={department._id} value={department._id}>{department.name}</option>
                ))}
              </select>
            )}
            <button type="button" onClick={() => { setSearch(""); setDepartmentFilter("all"); }} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
              Reset
            </button>
            <button type="button" onClick={bulkDelete} disabled={!selectedIds.length} className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-bold text-[color:var(--md-danger)] transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40">
              Delete selected
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="" style={{borderBottom:"1px solid var(--md-border)"}}>
                <th className="pb-3 pr-3"><input type="checkbox" checked={filteredCourses.length > 0 && filteredCourses.every((course) => selectedIds.includes(course._id))} onChange={toggleAllVisible} /></th>
                <th className="pb-3">Course</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Duration</th>
                <th className="pb-3">Fee</th>
                <th className="pb-3">Requirements</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-10 text-center text-[color:var(--md-text-secondary)]">Loading courses...</td></tr>
              ) : filteredCourses.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-[color:var(--md-text-secondary)]">No courses found. Add your first course.</td></tr>
              ) : (
                filteredCourses.map((course) => {
                  const courseDepartmentId = typeof course.department === "object" ? course.department?._id : course.department;
                  return (
                    <tr key={course._id} className="border-b border-[color:var(--md-border)] last:border-0">
                      <td className="py-3 pr-3">
                        <input type="checkbox" checked={selectedIds.includes(course._id)} onChange={() => toggleSelected(course._id)} />
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-semibold" style={{color:"var(--md-text-primary)"}}>{course.title}</p>
                        <p className="mt-1 max-w-xs truncate text-xs text-[color:var(--md-text-secondary)]">{course.description || "No description"}</p>
                      </td>
                      <td className="py-3 pr-4 text-[color:var(--md-text-secondary)]">{departmentName(departments, courseDepartmentId)}</td>
                      <td className="py-3 pr-4 text-[color:var(--md-text-secondary)]">{course.duration}</td>
                      <td className="py-3 pr-4 text-[color:var(--md-text-secondary)]">{course.fee || "Contact office"}</td>
                      <td className="py-3 pr-4">
                        <p className="max-w-xs truncate text-[color:var(--md-text-secondary)]">{course.entryRequirements}</p>
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button type="button" title="Duplicate" onClick={() => duplicateCourse(course)} className="portal-btn" style={{padding:"0.4rem"}}>
                            <Copy size={16} />
                          </button>
                          <button type="button" title="Edit" onClick={() => startEdit(course)} className="portal-btn" style={{padding:"0.4rem"}}>
                            <Edit3 size={16} />
                          </button>
                          <button type="button" title="Delete" onClick={() => deleteCourse(course)} className="portal-btn-danger" style={{padding:"0.4rem"}}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </section>
  );
}
