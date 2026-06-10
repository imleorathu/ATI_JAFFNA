import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  Download,
  Edit3,
  FileText,
  Link as LinkIcon,
  MessageSquare,
  Plus,
  RefreshCw,
  Repeat2,
  Save,
  Search,
  Send,
  Trash2,
  Upload,
  Users,
  X
} from "lucide-react";
import GlassCard from "../../components/GlassCard";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch, downloadCsv } from "../../lib/api";
import { useModal } from "../../contexts/ModalContext.jsx";

const hnditDepartment = "Higher National Diploma in Information Technology - (HNDIT)";
const hnditGroups = ["First year Full Time", "Second year Full Time", "First year Part Time", "Second year Part Time"];
const staffTabs = ["Assignments", "Materials", "Communication", "Submissions", "Grading"];
const studentTabs = ["Assignments", "Submit", "Communication", "Grades"];

const emptyForm = {
  title: "",
  subject: "",
  topicModule: "",
  department: "",
  targetType: "department",
  academicStage: "",
  student: "",
  dueDate: "",
  publishAt: "",
  totalMarks: 100,
  status: "published",
  notifyByEmail: false,
  attachmentUrl: "",
  attachments: [],
  materials: [],
  description: ""
};

function formatDate(value, withTime = false) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-LK", withTime ? { dateStyle: "medium", timeStyle: "short" } : { year: "numeric", month: "short", day: "numeric" });
}

function dateInputValue(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function dateTimeInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function statusClass(status) {
  if (["closed", "missing"].includes(status)) return "border-red-400/20 bg-red-500/10 text-[color:var(--md-danger)]";
  if (["draft", "late", "resubmission_requested"].includes(status)) return "border-amber-400/20 bg-amber-500/10 text-[color:var(--md-warning)]";
  return "border-emerald-400/20 bg-emerald-500/10 text-[color:var(--md-success)]";
}

function submissionStatus(assignment, submission) {
  if (submission?.status) return submission.status;
  return new Date() > new Date(assignment.dueDate) ? "missing" : "pending";
}

export default function AssignmentsPage() {
  const { confirm, requestText } = useModal();
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const canManage = ["lecturer", "admin"].includes(role);
  const isFaculty = role === "lecturer";

  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [facultyDepartment, setFacultyDepartment] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("Assignments");
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [commentText, setCommentText] = useState("");
  const [privateCommentStudent, setPrivateCommentStudent] = useState("");
  const [submissionForm, setSubmissionForm] = useState({ files: [], googleDocLinks: "", note: "" });
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [assignmentData, studentData] = await Promise.all([
        apiFetch("/api/assignments"),
        canManage ? apiFetch(isFaculty ? "/api/students/my-department" : "/api/students") : Promise.resolve(null)
      ]);
      const nextAssignments = Array.isArray(assignmentData) ? assignmentData : [];
      setAssignments(nextAssignments);
      setSelectedId((current) => current || nextAssignments[0]?._id || "");
      if (canManage) {
        setStudents(isFaculty ? studentData?.students || [] : Array.isArray(studentData) ? studentData : []);
        setFacultyDepartment(studentData?.faculty?.department || "");
      }
    } catch (err) {
      setError(err?.message || "Unable to load assignments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const departments = useMemo(() => {
    const values = students.map((student) => student.department).filter(Boolean);
    if (facultyDepartment) values.push(facultyDepartment);
    return [...new Set(values)].sort();
  }, [students, facultyDepartment]);

  const selectedAssignment = useMemo(() => assignments.find((item) => item._id === selectedId) || assignments[0], [assignments, selectedId]);
  const selectedDepartment = isFaculty ? facultyDepartment : form.department;
  const selectedStudent = useMemo(() => students.find((student) => student._id === form.student), [students, form.student]);

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assignments.filter((item) => {
      const mySubmission = item.submissions?.[0];
      const itemStatus = submissionStatus(item, mySubmission);
      const matchesSearch =
        !query ||
        [item.title, item.subject, item.topicModule, item.description, item.department, item.academicStage, item.studentName, item.studentId, item.status]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesFilter = !filter || item.academicStage === filter || itemStatus === filter || item.status === filter || item.topicModule === filter;
      return matchesSearch && matchesFilter;
    });
  }, [assignments, search, filter]);

  const modules = useMemo(() => [...new Set(assignments.map((item) => item.topicModule).filter(Boolean))], [assignments]);
  const submissions = useMemo(() => assignments.flatMap((assignment) => (assignment.submissions || []).map((submission) => ({ assignment, submission }))), [assignments]);
  const missingRows = useMemo(() => {
    if (!canManage) return [];
    return assignments.flatMap((assignment) => {
      if (assignment.student) return [];
      const eligibleStudents = students.filter((student) => student.department === assignment.department && (!assignment.academicStage || student.academicStage === assignment.academicStage));
      return eligibleStudents
        .filter((student) => !(assignment.submissions || []).some((submission) => String(submission.student) === String(student._id)))
        .map((student) => ({ assignment, student, status: new Date() > new Date(assignment.dueDate) ? "missing" : "pending" }));
    });
  }, [assignments, students, canManage]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
    setShowForm(false);
  };

  const startCreate = (source = null) => {
    setError("");
    setStatus("");
    setEditingId("");
    setForm({
      ...emptyForm,
      ...(source
        ? {
            title: `${source.title} (Copy)`,
            subject: source.subject || "",
            topicModule: source.topicModule || "",
            description: source.description || "",
            attachments: source.attachments || [],
            materials: source.materials || [],
            totalMarks: source.totalMarks || 100
          }
        : {}),
      department: facultyDepartment || source?.department || departments[0] || "",
      dueDate: source ? dateInputValue(source.dueDate) : "",
      status: source ? "draft" : "published"
    });
    setShowForm(true);
  };

  const startEdit = (assignment) => {
    setError("");
    setStatus("");
    setEditingId(assignment._id);
    setForm({
      title: assignment.title || "",
      subject: assignment.subject || "",
      topicModule: assignment.topicModule || "",
      department: assignment.department || "",
      targetType: assignment.student ? "student" : assignment.academicStage ? "group" : "department",
      academicStage: assignment.academicStage || "",
      student: assignment.student || "",
      dueDate: dateInputValue(assignment.dueDate),
      publishAt: dateTimeInputValue(assignment.publishAt),
      totalMarks: assignment.totalMarks ?? 100,
      status: assignment.status || "published",
      notifyByEmail: Boolean(assignment.notifyByEmail),
      attachmentUrl: assignment.attachmentUrl || "",
      attachments: assignment.attachments || [],
      materials: assignment.materials || [],
      description: assignment.description || ""
    });
    setShowForm(true);
  };

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return [];
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const result = await apiFetch("/api/assignments/uploads", { method: "POST", body: formData });
    return result?.files || [];
  };

  const addUploadedFiles = async (fileList, key) => {
    setSaving(true);
    setError("");
    try {
      const files = await uploadFiles(fileList);
      setForm((current) => ({ ...current, [key]: [...current[key], ...files] }));
    } catch (err) {
      setError(err?.message || "Unable to upload files.");
    } finally {
      setSaving(false);
    }
  };

  const addLink = async (key, type = "link") => {
    const url = await requestText({
      title: type === "youtube" ? "Add video link" : "Add external link",
      message: "Paste the complete URL below.",
      placeholder: "https://example.com/resource",
      confirmLabel: "Add link"
    });
    if (!url) return;
    setForm((current) => ({ ...current, [key]: [...current[key], { name: url, url, type }] }));
  };

  const saveAssignment = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const department = isFaculty ? facultyDepartment : selectedStudent?.department || form.department;
      const attachments = [...form.attachments, ...(form.attachmentUrl ? [{ name: form.attachmentUrl, url: form.attachmentUrl, type: "link" }] : [])];
      const payload = {
        title: form.title,
        subject: form.subject,
        topicModule: form.topicModule,
        description: form.description,
        department,
        academicStage: form.targetType === "group" ? form.academicStage : "",
        student: form.targetType === "student" ? form.student : "",
        dueDate: form.dueDate,
        publishAt: form.publishAt || null,
        totalMarks: Number(form.totalMarks),
        status: form.status,
        notifyByEmail: form.notifyByEmail,
        attachments,
        materials: form.materials
      };
      const saved = editingId
        ? await apiFetch(`/api/assignments/${editingId}`, { method: "PUT", body: JSON.stringify(payload) })
        : await apiFetch("/api/assignments", { method: "POST", body: JSON.stringify(payload) });
      setAssignments((current) => (editingId ? current.map((item) => (item._id === saved._id ? saved : item)) : [...current, saved]));
      setSelectedId(saved._id);
      setStatus(editingId ? "Assignment updated successfully." : "Assignment added successfully.");
      resetForm();
    } catch (err) {
      setError(err?.message || "Unable to save assignment.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignment = async (assignment) => {
    if (!await confirm({ title: "Delete assignment?", message: `Delete "${assignment.title}" permanently?`, confirmLabel: "Delete assignment", tone: "danger" })) return;
    setError("");
    setStatus("");
    try {
      await apiFetch(`/api/assignments/${assignment._id}`, { method: "DELETE" });
      setAssignments((current) => current.filter((item) => item._id !== assignment._id));
      setStatus("Assignment deleted successfully.");
    } catch (err) {
      setError(err?.message || "Unable to delete assignment.");
    }
  };

  const duplicateAssignment = async (assignment) => {
    setError("");
    try {
      const copy = await apiFetch(`/api/assignments/${assignment._id}/duplicate`, { method: "POST" });
      setAssignments((current) => [...current, copy]);
      setSelectedId(copy._id);
      setStatus("Assignment reused as a draft copy.");
    } catch (err) {
      setError(err?.message || "Unable to reuse assignment.");
    }
  };

  const addComment = async (kind = "comment", visibility = "public") => {
    if (!selectedAssignment || !commentText.trim()) return;
    setError("");
    try {
      const saved = await apiFetch(`/api/assignments/${selectedAssignment._id}/comments`, {
        method: "POST",
        body: JSON.stringify({ kind, visibility, message: commentText, student: visibility === "private" ? privateCommentStudent : "" })
      });
      setAssignments((current) => current.map((item) => (item._id === saved._id ? saved : item)));
      setCommentText("");
      setStatus(kind === "announcement" ? "Announcement posted." : "Comment posted.");
    } catch (err) {
      setError(err?.message || "Unable to post message.");
    }
  };

  const submitWork = async () => {
    if (!selectedAssignment) return;
    setSaving(true);
    setError("");
    try {
      const uploaded = await uploadFiles(submissionForm.files);
      const links = submissionForm.googleDocLinks
        .split("\n")
        .map((url) => url.trim())
        .filter(Boolean)
        .map((url) => ({ name: url, url, type: "google-doc" }));
      const saved = await apiFetch(`/api/assignments/${selectedAssignment._id}/submissions`, {
        method: "POST",
        body: JSON.stringify({ files: uploaded, googleDocLinks: links, note: submissionForm.note })
      });
      setAssignments((current) => current.map((item) => (item._id === saved._id ? saved : item)));
      setSubmissionForm({ files: [], googleDocLinks: "", note: "" });
      setStatus("Assignment submitted successfully.");
    } catch (err) {
      setError(err?.message || "Unable to submit assignment.");
    } finally {
      setSaving(false);
    }
  };

  const saveReview = async (assignment, submission) => {
    const draft = reviewDrafts[submission._id] || {};
    setError("");
    try {
      const saved = await apiFetch(`/api/assignments/${assignment._id}/submissions/${submission._id}`, {
        method: "PUT",
        body: JSON.stringify(draft)
      });
      setAssignments((current) => current.map((item) => (item._id === saved._id ? saved : item)));
      setStatus("Submission review saved.");
    } catch (err) {
      setError(err?.message || "Unable to save review.");
    }
  };

  const exportAssignments = () => {
    downloadCsv(
      "ati-assignments.csv",
      filteredAssignments.map((item) => ({
        title: item.title,
        subject: item.subject,
        module: item.topicModule,
        department: item.department,
        group: item.academicStage,
        studentName: item.studentName,
        dueDate: formatDate(item.dueDate),
        publishAt: formatDate(item.publishAt, true),
        totalMarks: item.totalMarks,
        status: item.status
      }))
    );
  };

  const exportGrades = () => {
    downloadCsv(
      "ati-assignment-grades.csv",
      submissions.map(({ assignment, submission }) => ({
        assignment: assignment.title,
        subject: assignment.subject,
        student: submission.studentName,
        studentId: submission.studentId,
        status: submission.status,
        marks: submission.marks,
        totalMarks: assignment.totalMarks,
        rubric: submission.rubric,
        feedback: submission.feedback
      }))
    );
  };

  const tabs = canManage ? staffTabs : studentTabs;
  const notices = assignments.flatMap((assignment) => (assignment.announcements || []).map((notice) => ({ ...notice, assignmentTitle: assignment.title })));

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between" style={{borderBottom:"1px solid var(--md-border)"}}>
        <div>
          <p className="portal-page-label">{canManage ? "Department Staff" : "Student"}</p>
          <h1 className="portal-page-title">{canManage ? "Assignment Portal" : "My Assignments"}</h1>
          <p className="portal-page-subtitle">
            {canManage ? "Manage assignments, materials, communication, submissions, and grades for your department." : "View, submit, discuss, and review feedback for your assignments."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadData} className="portal-btn">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button type="button" onClick={activeTab === "Grading" ? exportGrades : exportAssignments} disabled={!filteredAssignments.length} className="portal-btn">
            <Download size={16} />
            Export CSV
          </button>
          {activeTab === "Grading" && canManage && (
            <button type="button" onClick={() => window.print()} className="portal-btn">
              <FileText size={16} />
              PDF
            </button>
          )}
          {canManage && (
            <button type="button" onClick={() => startCreate()} className="portal-btn-primary">
              <Plus size={16} />
              Create Assignment
            </button>
          )}
        </div>
      </div>

      {error && <div className="portal-alert-danger">{error}</div>}
      {status && <div className="portal-alert-success">{status}</div>}

      <div className="flex gap-2 overflow-x-auto border-b border-[color:var(--md-border)] pb-2">
        {tabs.map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold transition ${activeTab === tab ? "bg-sky-500 text-slate-950" : "bg-[color:var(--md-hover)] text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)] hover:text-[color:var(--md-text-primary)]"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Assignments", assignments.length, FileText],
          ["Submissions", submissions.length, Upload],
          ["Announcements", notices.length, Bell]
        ].map(([label, value, Icon]) => (
          <GlassCard key={label} dark className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="portal-stat-label">{label}</p>
                <p className="portal-page-title">{value}</p>
              </div>
              <Icon className="text-[color:var(--md-primary)]" size={24} />
            </div>
          </GlassCard>
        ))}
      </div>

      {showForm && canManage && (
        <GlassCard className="p-5">
          <form onSubmit={saveAssignment} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="classroom-section-title">{editingId ? "Edit Assignment" : "Create Assignment"}</h2>
              <button type="button" onClick={resetForm} className="rounded-lg p-2 text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)] hover:text-[color:var(--md-text-primary)]">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Title" className="portal-input" />
              <input required value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Topic / Module subject" className="portal-input" />
              <input value={form.topicModule} onChange={(event) => setForm((current) => ({ ...current, topicModule: event.target.value }))} placeholder="Week / Chapter / Module" className="portal-input" />
              {!isFaculty ? (
                <select required value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value, academicStage: "", student: "" }))} className="portal-input">
                  <option value="">Select department</option>
                  {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
              ) : (
                <input disabled value={facultyDepartment || "Department not assigned"} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2.5 text-sm text-[color:var(--md-text-secondary)] outline-none" />
              )}
              <select value={form.targetType} onChange={(event) => setForm((current) => ({ ...current, targetType: event.target.value, academicStage: "", student: "" }))} className="portal-input">
                <option value="department">Visible to department</option>
                {selectedDepartment === hnditDepartment && <option value="group">Visible to HNDIT group</option>}
                <option value="student">Visible to selected student</option>
              </select>
              {form.targetType === "group" && (
                <select required value={form.academicStage} onChange={(event) => setForm((current) => ({ ...current, academicStage: event.target.value }))} className="portal-input">
                  <option value="">Select HNDIT group</option>
                  {hnditGroups.map((group) => <option key={group} value={group}>{group}</option>)}
                </select>
              )}
              {form.targetType === "student" && (
                <select required value={form.student} onChange={(event) => setForm((current) => ({ ...current, student: event.target.value }))} className="portal-input">
                  <option value="">Select student</option>
                  {students.filter((student) => !selectedDepartment || student.department === selectedDepartment).map((student) => (
                    <option key={student._id} value={student._id}>{student.fullName} {student.studentId ? `(${student.studentId})` : ""}</option>
                  ))}
                </select>
              )}
              <input required type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} className="portal-input" />
              <input type="datetime-local" value={form.publishAt} onChange={(event) => setForm((current) => ({ ...current, publishAt: event.target.value }))} className="portal-input" />
              <input type="number" min="0" value={form.totalMarks} onChange={(event) => setForm((current) => ({ ...current, totalMarks: event.target.value }))} placeholder="Marks / Points" className="portal-input" />
              <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="portal-input">
                <option value="published">Publish now</option>
                <option value="draft">Save as draft</option>
                <option value="closed">Closed</option>
              </select>
              <label className="flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2.5 text-sm font-bold text-[color:var(--md-text-secondary)]">
                <input type="checkbox" checked={form.notifyByEmail} onChange={(event) => setForm((current) => ({ ...current, notifyByEmail: event.target.checked }))} />
                Email notification
              </label>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Instructions" rows={3} className="portal-input md:col-span-2 xl:col-span-4" />
            </div>

            <UploadPanel title="Assignment attachments" files={form.attachments} onUpload={(files) => addUploadedFiles(files, "attachments")} onAddLink={() => addLink("attachments")} onAddVideo={() => addLink("attachments", "youtube")} />
            <UploadPanel title="Learning materials" files={form.materials} onUpload={(files) => addUploadedFiles(files, "materials")} onAddLink={() => addLink("materials")} onAddVideo={() => addLink("materials", "youtube")} />

            <button type="submit" disabled={saving} className="portal-btn-primary">
              <Save size={16} />
              {saving ? "Saving..." : editingId ? "Update Assignment" : "Create Assignment"}
            </button>
          </form>
        </GlassCard>
      )}

      {activeTab === "Assignments" && (
        <GlassCard className="p-5">
          <ListToolbar search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} modules={modules} />
          <AssignmentGrid assignments={filteredAssignments} selectedId={selectedAssignment?._id} canManage={canManage} setSelectedId={setSelectedId} startEdit={startEdit} startCreate={startCreate} duplicateAssignment={duplicateAssignment} deleteAssignment={deleteAssignment} />
        </GlassCard>
      )}

      {activeTab === "Materials" && (
        <GlassCard className="p-5">
          <ListToolbar search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} modules={modules} />
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredAssignments.map((assignment) => (
              <div key={assignment._id} className="portal-row-item">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--md-primary)]">{assignment.topicModule || "General"}</p>
                <h3 className="mt-1 font-semibold" style={{color:"var(--md-text-primary)"}}>{assignment.title}</h3>
                <ResourceLinks items={[...(assignment.materials || []), ...(assignment.attachments || [])]} />
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {activeTab === "Communication" && (
        <GlassCard className="p-5">
          <AssignmentPicker assignments={assignments} selectedId={selectedAssignment?._id} setSelectedId={setSelectedId} />
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <div className="portal-row-item">
              <h2 className="font-semibold" style={{color:"var(--md-text-primary)"}}>{canManage ? "Post Announcement or Comment" : "Comment on Assignment"}</h2>
              {canManage && (
                <select value={privateCommentStudent} onChange={(event) => setPrivateCommentStudent(event.target.value)} className="mt-3 w-full portal-input">
                  <option value="">Public message</option>
                  {students.map((student) => <option key={student._id} value={student._id}>Private: {student.fullName}</option>)}
                </select>
              )}
              <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} rows={5} placeholder="Write message" className="mt-3 w-full portal-input" />
              <div className="mt-3 flex flex-wrap gap-2">
                {canManage && (
                  <button type="button" onClick={() => addComment("announcement", "public")} className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-sm font-bold text-slate-950">
                    <Bell size={16} />
                    Announcement
                  </button>
                )}
                <button type="button" onClick={() => addComment("comment", privateCommentStudent ? "private" : "public")} className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)]">
                  <Send size={16} />
                  Comment
                </button>
              </div>
            </div>
            <MessageStream assignment={selectedAssignment} />
          </div>
        </GlassCard>
      )}

      {activeTab === "Submit" && !canManage && (
        <GlassCard className="p-5">
          <AssignmentPicker assignments={assignments} selectedId={selectedAssignment?._id} setSelectedId={setSelectedId} />
          <div className="mt-4 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-4">
            <h2 className="font-semibold" style={{color:"var(--md-text-primary)"}}>{selectedAssignment?.title || "Select assignment"}</h2>
            <p className="portal-page-subtitle">Due {formatDate(selectedAssignment?.dueDate)}. You can edit your submission before the deadline.</p>
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[color:var(--md-border)] bg-[color:var(--md-card)] px-4 py-8 text-sm font-bold text-[color:var(--md-text-secondary)] hover:border-sky-400 hover:text-[color:var(--md-text-primary)]">
              <Upload size={18} />
              Upload PDFs, docs, slides, videos
              <input type="file" multiple onChange={(event) => setSubmissionForm((current) => ({ ...current, files: event.target.files }))} className="hidden" />
            </label>
            <textarea value={submissionForm.googleDocLinks} onChange={(event) => setSubmissionForm((current) => ({ ...current, googleDocLinks: event.target.value }))} placeholder="Google Docs or external links, one per line" rows={3} className="mt-3 w-full portal-input" />
            <textarea value={submissionForm.note} onChange={(event) => setSubmissionForm((current) => ({ ...current, note: event.target.value }))} placeholder="Submission note" rows={3} className="mt-3 w-full portal-input" />
            <button type="button" onClick={submitWork} disabled={!selectedAssignment || saving} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-60">
              <Upload size={16} />
              {saving ? "Submitting..." : "Submit Assignment"}
            </button>
          </div>
        </GlassCard>
      )}

      {activeTab === "Submissions" && canManage && (
        <GlassCard className="p-5">
          <h2 className="classroom-section-title">Submission Review</h2>
          <SubmissionRows rows={submissions} reviewDrafts={reviewDrafts} setReviewDrafts={setReviewDrafts} saveReview={saveReview} />
          {missingRows.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold" style={{color:"var(--md-text-primary)"}}>Missing / Pending</h3>
              <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {missingRows.map(({ assignment, student, status: rowStatus }) => (
                  <div key={`${assignment._id}-${student._id}`} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-3 text-sm text-[color:var(--md-text-secondary)]">
                    <span className={`mr-2 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${statusClass(rowStatus)}`}>{rowStatus}</span>
                    {student.fullName} - {assignment.title}
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {activeTab === "Grading" && canManage && (
        <GlassCard className="p-5">
          <h2 className="classroom-section-title">Grading System</h2>
          <p className="portal-page-subtitle">Add marks, rubric feedback, private comments, and export grades.</p>
          <SubmissionRows rows={submissions} reviewDrafts={reviewDrafts} setReviewDrafts={setReviewDrafts} saveReview={saveReview} compact />
        </GlassCard>
      )}

      {activeTab === "Grades" && !canManage && (
        <GlassCard className="p-5">
          <h2 className="classroom-section-title">Grades and Feedback</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {assignments.map((assignment) => {
              const submission = assignment.submissions?.[0];
              return (
                <div key={assignment._id} className="portal-row-item">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold" style={{color:"var(--md-text-primary)"}}>{assignment.title}</h3>
                      <p className="text-sm text-[color:var(--md-text-secondary)]">{assignment.subject}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${statusClass(submissionStatus(assignment, submission))}`}>{submissionStatus(assignment, submission)}</span>
                  </div>
                  <p className="mt-3 text-2xl font-black text-[color:var(--md-primary)]">{submission?.marks ?? "-"} / {assignment.totalMarks}</p>
                  {submission?.rubric && <p className="mt-2 text-sm text-[color:var(--md-text-secondary)]">Rubric: {submission.rubric}</p>}
                  {submission?.feedback && <p className="mt-2 text-sm text-[color:var(--md-text-secondary)]">Feedback: {submission.feedback}</p>}
                  <ResourceLinks items={[...(submission?.files || []), ...(submission?.googleDocLinks || [])]} />
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </section>
  );
}

function ListToolbar({ search, setSearch, filter, setFilter, modules }) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <label className="portal-search">
        <Search size={16} className="text-[color:var(--md-text-secondary)]" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assignments" className="w-full bg-transparent text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] sm:w-72" />
      </label>
      <select value={filter} onChange={(event) => setFilter(event.target.value)} className="portal-input">
        <option value="">All statuses, groups, modules</option>
        <option value="pending">Pending</option>
        <option value="submitted">Submitted</option>
        <option value="missing">Missing</option>
        <option value="late">Late</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        {hnditGroups.map((group) => <option key={group} value={group}>{group}</option>)}
        {modules.map((module) => <option key={module} value={module}>{module}</option>)}
      </select>
    </div>
  );
}

function AssignmentGrid({ assignments, selectedId, canManage, setSelectedId, startEdit, startCreate, duplicateAssignment, deleteAssignment }) {
  if (!assignments.length) return <p className="py-10 text-center text-[color:var(--md-text-secondary)]">No assignments found.</p>;
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {assignments.map((item) => (
        <button key={item._id} type="button" onClick={() => setSelectedId(item._id)} className={`rounded-lg border p-4 text-left transition ${selectedId === item._id ? "border-sky-400 bg-sky-500/10" : "border-[color:var(--md-border)] bg-[color:var(--md-hover)] hover:bg-[color:var(--md-hover)]"}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${statusClass(item.status)}`}>{item.status}</span>
                <span className="text-xs font-bold" style={{color:"var(--md-primary)"}}>{item.topicModule || item.subject}</span>
              </div>
              <h3 className="mt-2 text-base font-black text-[color:var(--md-text-primary)]">{item.title}</h3>
              <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">Due {formatDate(item.dueDate)} | {item.totalMarks} marks | {item.visibility}</p>
              {item.publishAt && <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">Scheduled {formatDate(item.publishAt, true)}</p>}
              {(item.academicStage || item.studentName) && <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">Target: {item.studentName || item.academicStage}</p>}
            </div>
            {canManage && (
              <div className="flex gap-2">
                <IconButton onClick={(event) => { event.stopPropagation(); startEdit(item); }} icon={Edit3} />
                <IconButton onClick={(event) => { event.stopPropagation(); duplicateAssignment(item); }} icon={Repeat2} />
                <IconButton danger onClick={(event) => { event.stopPropagation(); deleteAssignment(item); }} icon={Trash2} />
              </div>
            )}
          </div>
          {item.description && <p className="mt-3 text-sm leading-6 text-[color:var(--md-text-secondary)]">{item.description}</p>}
          <ResourceLinks items={item.attachments || []} />
          {canManage && <button type="button" onClick={(event) => { event.stopPropagation(); startCreate(item); }} className="mt-3 text-sm font-bold text-[color:var(--md-primary)] hover:text-[color:var(--md-primary)]">Reuse in form</button>}
        </button>
      ))}
    </div>
  );
}

function IconButton({ icon: Icon, onClick, danger = false }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-lg p-2 transition ${danger ? "bg-red-500/10 text-[color:var(--md-danger)] hover:bg-red-500/20" : "bg-[color:var(--md-hover)] text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)] hover:text-[color:var(--md-text-primary)]"}`}>
      <Icon size={16} />
    </button>
  );
}

function UploadPanel({ title, files, onUpload, onAddLink, onAddVideo }) {
  return (
    <div className="portal-row-item">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold" style={{color:"var(--md-text-primary)"}}>{title}</h3>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
            <Upload size={16} />
            Upload files
            <input type="file" multiple onChange={(event) => onUpload(event.target.files)} className="hidden" />
          </label>
          <button type="button" onClick={onAddLink} className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
            <LinkIcon size={16} />
            Link
          </button>
          <button type="button" onClick={onAddVideo} className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
            <BookOpen size={16} />
            Video
          </button>
        </div>
      </div>
      <ResourceLinks items={files} />
    </div>
  );
}

function ResourceLinks({ items }) {
  const list = (items || []).filter((item) => item?.url);
  if (!list.length) return <p className="mt-3 text-sm text-[color:var(--md-text-secondary)]">No files or links.</p>;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {list.map((item, index) => (
        <a key={`${item.url}-${index}`} href={item.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-2 truncate rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-primary)] hover:bg-[color:var(--md-hover)]">
          <FileText size={16} />
          <span className="truncate">{item.name || item.url}</span>
        </a>
      ))}
    </div>
  );
}

function AssignmentPicker({ assignments, selectedId, setSelectedId }) {
  return (
    <select value={selectedId || ""} onChange={(event) => setSelectedId(event.target.value)} className="w-full portal-input">
      {assignments.map((assignment) => <option key={assignment._id} value={assignment._id}>{assignment.title}</option>)}
    </select>
  );
}

function MessageStream({ assignment }) {
  const messages = [...(assignment?.announcements || []), ...(assignment?.comments || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return (
    <div className="portal-row-item">
      <h2 className="font-semibold" style={{color:"var(--md-text-primary)"}}>Discussion Stream</h2>
      <div className="mt-3 space-y-3">
        {!messages.length && <p className="py-8 text-center text-[color:var(--md-text-secondary)]">No messages yet.</p>}
        {messages.map((message) => (
          <div key={message._id} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-[color:var(--md-text-primary)]">{message.authorName || "User"}</p>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${message.visibility === "private" ? "border-amber-400/20 bg-amber-500/10 text-[color:var(--md-warning)]" : "border-sky-400/20 bg-sky-500/10 text-[color:var(--md-primary)]"}`}>{message.visibility}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[color:var(--md-text-secondary)]">{message.message}</p>
            <p className="mt-2 text-xs text-[color:var(--md-text-secondary)]">{formatDate(message.createdAt, true)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubmissionRows({ rows, reviewDrafts, setReviewDrafts, saveReview, compact = false }) {
  if (!rows.length) return <p className="py-10 text-center text-[color:var(--md-text-secondary)]">No submissions found.</p>;
  return (
    <div className="mt-4 space-y-3">
      {rows.map(({ assignment, submission }) => {
        const draft = reviewDrafts[submission._id] || submission;
        return (
          <div key={submission._id} className="portal-row-item">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="font-semibold" style={{color:"var(--md-text-primary)"}}>{submission.studentName}</h3>
                <p className="text-sm text-[color:var(--md-text-secondary)]">{assignment.title} | {assignment.subject} | {formatDate(submission.submittedAt, true)}</p>
                <ResourceLinks items={[...(submission.files || []), ...(submission.googleDocLinks || [])]} />
              </div>
              <span className={`w-fit rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${statusClass(submission.status)}`}>{submission.status}</span>
            </div>
            {!compact && submission.note && <p className="mt-3 text-sm text-[color:var(--md-text-secondary)]">{submission.note}</p>}
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <input type="number" min="0" max={assignment.totalMarks} value={draft.marks ?? ""} onChange={(event) => setReviewDrafts((current) => ({ ...current, [submission._id]: { ...draft, marks: event.target.value } }))} placeholder="Marks" className="portal-input" />
              <select value={draft.status || "submitted"} onChange={(event) => setReviewDrafts((current) => ({ ...current, [submission._id]: { ...draft, status: event.target.value } }))} className="portal-input">
                <option value="submitted">Submitted</option>
                <option value="late">Late</option>
                <option value="missing">Missing</option>
                <option value="returned">Returned</option>
                <option value="resubmission_requested">Request resubmission</option>
              </select>
              <input value={draft.rubric || ""} onChange={(event) => setReviewDrafts((current) => ({ ...current, [submission._id]: { ...draft, rubric: event.target.value } }))} placeholder="Rubric feedback" className="portal-input xl:col-span-1" />
              <input value={draft.feedback || ""} onChange={(event) => setReviewDrafts((current) => ({ ...current, [submission._id]: { ...draft, feedback: event.target.value } }))} placeholder="Student feedback" className="portal-input xl:col-span-1" />
              <button type="button" onClick={() => saveReview(assignment, submission)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-sm font-black text-slate-950">
                <CheckCircle2 size={16} />
                Save
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
