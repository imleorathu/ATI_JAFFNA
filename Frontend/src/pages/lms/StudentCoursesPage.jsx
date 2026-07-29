import { useEffect, useMemo, useState } from "react";
import { BookOpen, Download, ExternalLink, FileText, Search } from "lucide-react";
import GlassCard from "../../components/GlassCard";
import { apiFetch, downloadAuthenticatedFile } from "../../lib/api";

const prettyType = (value) => String(value || "other").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function StudentCoursesPage() {
  const [materials, setMaterials] = useState([]);
  const [department, setDepartment] = useState("");
  const [studyGroup, setStudyGroup] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");

  useEffect(() => {
    apiFetch("/api/study-materials/student/materials")
      .then((data) => {
        setMaterials(data.materials || []);
        setDepartment(data.department || "");
        setStudyGroup(data.studyGroup || "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const types = useMemo(() => [...new Set(materials.map((item) => item.materialType).filter(Boolean))], [materials]);
  const filtered = useMemo(() => materials.filter((item) => {
    const text = `${item.title} ${item.subject} ${item.topic} ${item.description} ${item.course?.title} ${item.uploaderName}`.toLowerCase();
    return (type === "all" || item.materialType === type) && text.includes(search.toLowerCase());
  }), [materials, search, type]);
  const subjects = useMemo(() => filtered.reduce((groups, item) => {
    const subject = item.subject || "General";
    (groups[subject] ||= []).push(item);
    return groups;
  }, {}), [filtered]);

  return (
    <section className="space-y-6">
      <div className="portal-page-header">
        <div>
          <p className="portal-page-label">Student Portal</p>
          <h1 className="portal-page-title">My Courses</h1>
          <p className="portal-page-subtitle">All published study materials from {department || "your department"}, organized subject-wise{studyGroup ? ` for ${studyGroup}` : ""}.</p>
        </div>
      </div>

      {error && <div className="portal-alert-danger">{error}</div>}
      <div className="flex flex-wrap items-center gap-3">
        <label className="portal-search min-w-64 flex-1"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search subject, course, topic, or lecturer" /></label>
        <div className="flex flex-wrap gap-2">{["all", ...types].map((value) => <button key={value} className={type === value ? "portal-btn-primary" : "portal-btn"} onClick={() => setType(value)}>{value === "all" ? "All types" : prettyType(value)}</button>)}</div>
      </div>

      {loading ? <p className="portal-page-subtitle">Loading your study materials…</p> : Object.keys(subjects).length === 0 ? (
        <GlassCard className="p-6"><div className="flex items-center gap-3"><BookOpen size={22} style={{ color: "var(--md-primary)" }} /><p className="portal-page-subtitle">No published study materials are available for your study group yet.</p></div></GlassCard>
      ) : Object.entries(subjects).sort(([a], [b]) => a.localeCompare(b)).map(([subject, items]) => (
        <GlassCard key={subject} className="p-5">
          <div className="flex items-center gap-2"><BookOpen size={21} style={{ color: "var(--md-primary)" }} /><h2 className="classroom-section-title">{subject}</h2></div>
          <p className="portal-page-subtitle">{items.length} available material{items.length === 1 ? "" : "s"}</p>
          <div className="mt-4 space-y-3">{items.map((item) => (
            <div key={item._id} className="portal-row-item">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <div>
                  <div className="flex items-center gap-2"><FileText size={18} style={{ color: "var(--md-primary)" }} /><h3 className="font-semibold">{item.title}</h3></div>
                  <p className="mt-1 text-sm" style={{ color: "var(--md-text-secondary)" }}>{prettyType(item.materialType)}{item.course?.title ? ` · ${item.course.title}` : ""}{item.topic ? ` · ${item.topic}` : ""}{item.weekNumber ? ` · Week ${item.weekNumber}` : ""}</p>
                  {item.description && <p className="mt-2 text-sm">{item.description}</p>}
                  <p className="mt-2 text-xs" style={{ color: "var(--md-text-secondary)" }}>Uploaded by {item.uploaderName || "Department staff"} · {new Date(item.createdAt).toLocaleDateString()}{item.fileSize ? ` · ${(item.fileSize / 1024 / 1024).toFixed(1)} MB` : ""}</p>
                </div>
                <div className="flex h-fit gap-2">{item.downloadUrl && <button className="portal-btn-primary" onClick={() => downloadAuthenticatedFile(item.downloadUrl, item.fileName).catch((err) => setError(err.message))}><Download size={15} /> Download</button>}{item.externalUrl && <a className="portal-btn" href={item.externalUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open</a>}</div>
              </div>
            </div>
          ))}</div>
        </GlassCard>
      ))}
    </section>
  );
}
