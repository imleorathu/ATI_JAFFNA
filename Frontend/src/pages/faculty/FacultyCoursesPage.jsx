import { useEffect, useMemo, useState } from "react";
import { BookOpen, Download, Edit3, Link as LinkIcon, Plus, Search, Trash2, Upload, X } from "lucide-react";
import GlassCard from "../../components/GlassCard";
import { apiFetch, downloadAuthenticatedFile } from "../../lib/api";
import { useModal } from "../../contexts/ModalContext.jsx";
import { useAuth } from "../../contexts/AuthContext.jsx";

const types = ["lecture-note", "presentation", "assignment", "tutorial", "past-paper", "reference", "video-link", "other"];
const blank = { title: "", description: "", materialType: "lecture-note", subject: "", academicYears: [], semester: "", topic: "", weekNumber: "", externalUrl: "", isPublished: true };

export default function FacultyCoursesPage() {
  const { confirm } = useModal();
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [file, setFile] = useState(null);
  const [editing, setEditing] = useState(null);

  const loadCourses = async () => {
    setLoading(true);
    try { setCourses(await apiFetch("/api/study-materials/faculty/courses")); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const openCourse = async (course) => {
    setError("");
    setSelected(course);
    try {
      const data = await apiFetch(`/api/study-materials/faculty/courses/${course._id}/materials`);
      setMaterials(data.materials || []);
    } catch (err) { setError(err.message); }
  };

  useEffect(() => { loadCourses(); }, []);

  const shown = useMemo(
    () => courses.filter((course) => `${course.title} ${course.department} ${course.duration}`.toLowerCase().includes(search.toLowerCase())),
    [courses, search]
  );
  const groupedMaterials = useMemo(() => materials.reduce((groups, item) => {
    const subject = item.subject || "General";
    (groups[subject] ||= []).push(item);
    return groups;
  }, {}), [materials]);

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(blank); setFile(null); };
  const startUpload = () => { setEditing(null); setForm(blank); setFile(null); setShowForm(true); };
  const edit = (item) => {
    setEditing(item);
    setFile(null);
    setForm({
      title: item.title,
      description: item.description || "",
      materialType: item.materialType,
      subject: item.subject || "General",
      academicYears: item.academicYears?.length ? item.academicYears : item.academicYear ? [item.academicYear] : [],
      semester: item.semester || "",
      topic: item.topic || "",
      weekNumber: item.weekNumber || "",
      externalUrl: item.externalUrl || "",
      isPublished: item.isPublished
    });
    setShowForm(true);
  };
  const toggleStudyGroup = (year) => setForm((current) => ({
    ...current,
    academicYears: current.academicYears.includes(year)
      ? current.academicYears.filter((item) => item !== year)
      : [...current.academicYears, year]
  }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (!form.academicYears.length) throw new Error("Select at least one study group.");
      if (!editing && !file && !form.externalUrl.trim()) throw new Error("Choose a file or provide an external link.");
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === "academicYears") value.forEach((year) => body.append("academicYears", year));
        else body.append(key, String(value));
      });
      if (file) body.append("file", file);
      if (!editing) body.append("courseId", selected._id);
      const saved = await apiFetch(editing ? `/api/study-materials/${editing._id}` : "/api/study-materials", { method: editing ? "PUT" : "POST", body });
      setMaterials((current) => editing ? current.map((item) => item._id === saved._id ? saved : item) : [saved, ...current]);
      setCourses((current) => current.map((course) => course._id === selected._id ? { ...course, materialCount: Number(course.materialCount || 0) + (editing ? 0 : 1) } : course));
      closeForm();
    } catch (err) { setError(err.message || "Unable to save material."); }
    finally { setSaving(false); }
  };

  const remove = async (item) => {
    if (!await confirm({ title: "Delete material?", message: `Delete ${item.title}? This cannot be undone.`, confirmLabel: "Delete", tone: "danger" })) return;
    try {
      await apiFetch(`/api/study-materials/${item._id}`, { method: "DELETE" });
      setMaterials((current) => current.filter((entry) => entry._id !== item._id));
      setCourses((current) => current.map((course) => course._id === selected._id ? { ...course, materialCount: Math.max(0, Number(course.materialCount || 0) - 1) } : course));
    } catch (err) { setError(err.message); }
  };

  const canManage = (item) => String(user?.role).toLowerCase() === "admin" || String(item.uploadedBy || "") === String(user?._id || user?.id || "");

  if (!selected) return (
    <section className="space-y-6">
      <div className="portal-page-header"><div><p className="portal-page-label">Faculty Portal</p><h1 className="portal-page-title">Courses & Study Materials</h1><p className="portal-page-subtitle">Lecturers in the same department can upload their own resources, organized by subject.</p></div></div>
      {error && <div className="portal-alert-danger">{error}</div>}
      <label className="portal-search max-w-md"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search courses" /></label>
      {loading ? <p className="portal-page-subtitle">Loading faculty courses…</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{shown.map((course) => <button key={course._id} onClick={() => openCourse(course)} className="text-left"><GlassCard className="h-full p-5"><BookOpen size={23} style={{ color: "var(--md-primary)" }} /><h2 className="mt-3 classroom-section-title">{course.title}</h2><p className="mt-1 text-sm" style={{ color: "var(--md-text-secondary)" }}>{course.department || "Faculty course"}</p><p className="mt-4 text-sm font-semibold" style={{ color: "var(--md-primary)" }}>{course.materialCount || 0} materials</p></GlassCard></button>)}{shown.length === 0 && <p className="portal-page-subtitle">No courses are assigned to your faculty.</p>}</div>}
    </section>
  );

  return (
    <section className="space-y-6">
      <div className="portal-page-header"><div><button className="portal-btn mb-3" onClick={() => { setSelected(null); setMaterials([]); }}>← All courses</button><p className="portal-page-label">Faculty Courses</p><h1 className="portal-page-title">{selected.title}</h1><p className="portal-page-subtitle">{selected.department} · Materials are divided subject-wise</p></div><button className="portal-btn-primary" onClick={startUpload}><Plus size={16} /> Upload Material</button></div>
      {error && <div className="portal-alert-danger">{error}</div>}
      {showForm && <GlassCard className="p-5"><form onSubmit={save} className="space-y-4">
        <div className="flex justify-between"><h2 className="classroom-section-title">{editing ? "Edit" : "Upload"} Study Material</h2><button type="button" className="portal-btn" onClick={closeForm}><X size={16} /></button></div>
        <div className="grid gap-3 md:grid-cols-2">
          <input required className="portal-input" placeholder="Material title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <input required className="portal-input" placeholder="Subject name" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
          <select className="portal-input" value={form.materialType} onChange={(event) => setForm({ ...form, materialType: event.target.value })}>{types.map((type) => <option key={type}>{type}</option>)}</select>
          <input className="portal-input" placeholder="Semester (optional)" value={form.semester} onChange={(event) => setForm({ ...form, semester: event.target.value })} />
          <input className="portal-input" placeholder="Topic or week" value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} />
          <input type="number" min="1" max="52" className="portal-input" placeholder="Week number" value={form.weekNumber} onChange={(event) => setForm({ ...form, weekNumber: event.target.value })} />
          <input type="url" className="portal-input md:col-span-2" placeholder="External https:// link (optional)" value={form.externalUrl} onChange={(event) => setForm({ ...form, externalUrl: event.target.value })} />
          <textarea className="portal-input md:col-span-2" placeholder="Description (optional)" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </div>
        <fieldset><legend className="mb-2 text-sm font-semibold">Select one or more study groups</legend><div className="grid gap-2 sm:grid-cols-2">{(selected.studyYears || []).map((year) => <label key={year} className="portal-row-item flex items-center gap-2"><input type="checkbox" checked={form.academicYears.includes(year)} onChange={() => toggleStudyGroup(year)} /><span>{year}</span></label>)}</div></fieldset>
        <div className="flex flex-wrap items-center gap-3"><input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.zip" onChange={(event) => setFile(event.target.files?.[0] || null)} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublished} onChange={(event) => setForm({ ...form, isPublished: event.target.checked })} /> Publish for students</label></div>
        <button disabled={saving || !(selected.studyYears || []).length} className="portal-btn-primary"><Upload size={16} /> {saving ? "Saving…" : "Save Material"}</button>
        {editing && <p className="text-sm" style={{ color: "var(--md-text-secondary)" }}>Leave the file empty to keep the existing uploaded file.</p>}
        {!(selected.studyYears || []).length && <p className="text-sm text-red-500">No current study groups are configured for students in this department.</p>}
      </form></GlassCard>}
      {Object.keys(groupedMaterials).length === 0 ? <GlassCard className="p-5"><p className="portal-page-subtitle">No study materials have been uploaded yet.</p></GlassCard> : Object.entries(groupedMaterials).sort(([a], [b]) => a.localeCompare(b)).map(([subject, items]) => <GlassCard key={subject} className="p-5"><h2 className="classroom-section-title">{subject}</h2><p className="portal-page-subtitle">{items.length} material{items.length === 1 ? "" : "s"}</p><div className="mt-4 space-y-3">{items.map((item) => <div key={item._id} className="portal-row-item"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{item.title}</h3><p className="text-sm" style={{ color: "var(--md-text-secondary)" }}>{item.materialType} · {(item.academicYears?.length ? item.academicYears : [item.academicYear]).filter(Boolean).join(", ")} · {item.isPublished ? "Published" : "Draft"}{item.topic ? ` · ${item.topic}` : ""}</p>{item.description && <p className="mt-1 text-sm">{item.description}</p>}<p className="mt-1 text-xs" style={{ color: "var(--md-text-secondary)" }}>Uploaded by {item.uploaderName || "Faculty staff"} · {new Date(item.createdAt).toLocaleDateString()}</p></div><div className="flex gap-2">{item.downloadUrl && <button className="portal-btn" onClick={() => downloadAuthenticatedFile(item.downloadUrl, item.fileName).catch((err) => setError(err.message))}><Download size={15} /></button>}{item.externalUrl && <a href={item.externalUrl} target="_blank" rel="noreferrer" className="portal-btn"><LinkIcon size={15} /></a>}{canManage(item) && <button className="portal-btn" onClick={() => edit(item)}><Edit3 size={15} /></button>}{canManage(item) && <button className="portal-btn-danger" onClick={() => remove(item)}><Trash2 size={15} /></button>}</div></div></div>)}</div></GlassCard>)}
    </section>
  );
}
