import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  Download,
  Edit3,
  FormInput,
  FileText,
  Link as LinkIcon,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
  Upload,
  X
} from "lucide-react";
import GlassCard from "../../components/GlassCard";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch, downloadCsv } from "../../lib/api";
import { useModal } from "../../contexts/ModalContext.jsx";
import FormsPage from "../faculty/FormsPage.jsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const hnditDepartment = "Higher National Diploma in Information Technology - (HNDIT)";
const hnditGroups = ["First year Full Time", "Second year Full Time", "First year Part Time", "Second year Part Time"];
const staffTabs = ["Assignments", "Materials", "Communication", "Submissions", "Responses", "Grading"];
const departmentStaffTabs = ["Assignments", "Materials", "Communication", "Submissions", "Responses", "Grading"];
const studentTabs = ["Assignments", "Submit", "Communication", "Grades"];
const assignmentBuilderTab = "Create Assignment";
const assignmentCategories = ["Quiz", "Homework", "Research", "Lab Report", "Presentation", "Project"];
const difficultyLevels = ["Beginner", "Intermediate", "Advanced", "Expert"];
const gradingTypes = [
  { value: "manual", label: "Manual Grading" },
  { value: "auto", label: "Automatic Grading" },
  { value: "hybrid", label: "Hybrid Grading" }
];
const gradeScales = ["Percentage Based", "Letter Grade", "GPA Based", "Pass/Fail"];

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
  const canManage = ["lecturer", "department_staff", "admin"].includes(role);
  const isFaculty = ["lecturer", "department_staff"].includes(role);

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
  const [assignmentForm, setAssignmentForm] = useState(null);
  const [assignmentFormAnswers, setAssignmentFormAnswers] = useState({});
  const [assignmentFormLoading, setAssignmentFormLoading] = useState(false);
  const [responseForm, setResponseForm] = useState(null);
  const [responseRows, setResponseRows] = useState([]);
  const [responsesLoading, setResponsesLoading] = useState(false);
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
  const attachedFormAssignments = useMemo(() => assignments.filter((assignment) => assignment.details?.formId), [assignments]);
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

  useEffect(() => {
    if (canManage || activeTab !== "Submit" || !selectedAssignment?.details?.formId) {
      setAssignmentForm(null);
      setAssignmentFormAnswers({});
      return undefined;
    }

    let active = true;
    setAssignmentFormLoading(true);
    setError("");
    apiFetch(`/api/forms/assignment/${selectedAssignment._id}`)
      .then((data) => {
        if (!active) return;
        setAssignmentForm(data);
        setAssignmentFormAnswers({});
      })
      .catch((err) => {
        if (!active) return;
        setAssignmentForm(null);
        setError(err?.message || "Unable to load assignment form.");
      })
      .finally(() => {
        if (active) setAssignmentFormLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeTab, canManage, selectedAssignment?._id, selectedAssignment?.details?.formId]);

  useEffect(() => {
    if (!canManage || activeTab !== "Responses") return;
    if (!selectedAssignment?.details?.formId && attachedFormAssignments[0]?._id) {
      setSelectedId(attachedFormAssignments[0]._id);
    }
  }, [activeTab, attachedFormAssignments, canManage, selectedAssignment?.details?.formId]);

  useEffect(() => {
    if (!canManage || activeTab !== "Responses" || !selectedAssignment?.details?.formId) {
      setResponseForm(null);
      setResponseRows([]);
      return undefined;
    }

    let active = true;
    setResponsesLoading(true);
    setError("");
    Promise.all([
      apiFetch(`/api/forms/${selectedAssignment.details.formId}`),
      apiFetch(`/api/forms/${selectedAssignment.details.formId}/responses`)
    ])
      .then(([formData, responseData]) => {
        if (!active) return;
        setResponseForm(formData);
        setResponseRows(Array.isArray(responseData?.responses) ? responseData.responses : []);
      })
      .catch((err) => {
        if (!active) return;
        setResponseForm(null);
        setResponseRows([]);
        setError(err?.message || "Unable to load form responses.");
      })
      .finally(() => {
        if (active) setResponsesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activeTab, canManage, selectedAssignment?._id, selectedAssignment?.details?.formId]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
    setShowForm(false);
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
    if (!editingId) {
      setError("Assignment creation has been removed from this portal.");
      return;
    }
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
      const saved = await apiFetch(`/api/assignments/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      setAssignments((current) => current.map((item) => (item._id === saved._id ? saved : item)));
      setSelectedId(saved._id);
      setStatus("Assignment updated successfully.");
      resetForm();
      await loadData();
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

  const submitAssignmentForm = async () => {
    if (!assignmentForm) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const answers = (assignmentForm.sections || []).flatMap((section) => (
        (section.questions || [])
          .filter((question) => !["section-break", "page-break", "rich-text-block", "image-question", "video-question"].includes(question.type))
          .map((question) => ({ questionId: question.id, value: assignmentFormAnswers[question.id] ?? (question.type === "checkboxes" || question.type === "checkbox-grid" ? [] : "") }))
      ));
      await apiFetch(`/api/forms/${assignmentForm._id}/responses`, {
        method: "POST",
        body: JSON.stringify({
          respondent: user?.name || user?.email || "Student",
          respondentEmail: user?.email || "",
          answers
        })
      });
      setAssignmentFormAnswers({});
      setAssignmentForm((current) => current ? { ...current, studentSubmission: { submitted: true, submittedAt: new Date().toISOString() } } : current);
      setStatus("Assignment form submitted successfully.");
      await loadData();
    } catch (err) {
      setError(err?.message || "Unable to submit assignment form.");
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

  const exportFormResponses = () => {
    if (!responseForm || !responseRows.length) return;
    downloadCsv(
      `${responseForm.title || "assignment-form"}-responses.csv`,
      responseRows.map((response, index) => ({
        index: index + 1,
        respondent: response.respondent,
        email: response.respondentEmail,
        studentId: response.studentId,
        marks: response.marks,
        submittedAt: formatDate(response.submittedAt, true),
        answers: (response.answers || []).map((answer) => `${answer.questionId}: ${Array.isArray(answer.value) ? answer.value.join("; ") : typeof answer.value === "object" ? JSON.stringify(answer.value) : answer.value}`).join(" | ")
      }))
    );
  };

  const tabs = canManage ? staffTabs : studentTabs;
  const notices = assignments.flatMap((assignment) => (assignment.announcements || []).map((notice) => ({ ...notice, assignmentTitle: assignment.title })));

  useEffect(() => {
    if (canManage && activeTab === assignmentBuilderTab) return;
    if (!tabs.includes(activeTab)) setActiveTab("Assignments");
  }, [activeTab, canManage, tabs]);

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
            <button type="button" onClick={() => setActiveTab(assignmentBuilderTab)} className="portal-btn-primary">
              <FormInput size={16} />
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

      {showForm && canManage && editingId && (
        <GlassCard className="p-5">
          <form onSubmit={saveAssignment} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="classroom-section-title">Edit Assignment</h2>
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
              {saving ? "Saving..." : "Update Assignment"}
            </button>
          </form>
        </GlassCard>
      )}

      {activeTab === "Assignments" && (
        <GlassCard className="p-5">
          <ListToolbar search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} modules={modules} />
          <AssignmentGrid
            assignments={filteredAssignments}
            selectedId={selectedAssignment?._id}
            canManage={canManage}
            setSelectedId={setSelectedId}
            onStudentOpen={(assignment) => {
              setSelectedId(assignment._id);
              if (assignment.details?.formId) setActiveTab("Submit");
            }}
            startEdit={startEdit}
            deleteAssignment={deleteAssignment}
          />
        </GlassCard>
      )}

      {activeTab === assignmentBuilderTab && canManage && (
        <AssignmentBuilderShell
          facultyDepartment={facultyDepartment}
          students={students}
          onClose={() => setActiveTab("Assignments")}
          onSaved={(saved) => {
            setAssignments((current) => current.some((item) => item._id === saved._id) ? current.map((item) => (item._id === saved._id ? saved : item)) : [saved, ...current]);
            setSelectedId(saved._id);
            setStatus("Assignment details saved.");
          }}
        />
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
            {selectedAssignment?.dueDate && <p className="portal-page-subtitle">Due {formatDate(selectedAssignment.dueDate)}. You can edit your submission before the deadline.</p>}
            {selectedAssignment?.details?.formId ? (
              assignmentFormLoading ? (
                <p className="mt-4 rounded-lg bg-[color:var(--md-card)] p-6 text-center text-sm text-[color:var(--md-text-secondary)]">Loading assignment form...</p>
              ) : assignmentForm?.studentSubmission?.submitted ? (
                <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-[color:var(--md-success)]">
                  <p className="font-black">Already submitted</p>
                  <p className="mt-1">You have already submitted answers for this assignment form{assignmentForm.studentSubmission.submittedAt ? ` on ${formatDate(assignmentForm.studentSubmission.submittedAt, true)}` : ""}.</p>
                </div>
              ) : assignmentForm ? (
                <StudentAssignmentForm form={assignmentForm} answers={assignmentFormAnswers} setAnswers={setAssignmentFormAnswers} onSubmit={submitAssignmentForm} saving={saving} />
              ) : (
                <p className="mt-4 rounded-lg bg-red-500/10 p-4 text-sm font-semibold text-[color:var(--md-danger)]">Unable to open this assignment form.</p>
              )
            ) : (
              <>
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
              </>
            )}
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

      {activeTab === "Responses" && canManage && (
        <GlassCard className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="classroom-section-title">Form Responses</h2>
              <p className="portal-page-subtitle">Select an assignment with an attached form to view response statistics, answers, scores, and exports.</p>
            </div>
            <button type="button" onClick={exportFormResponses} disabled={!responseRows.length} className="portal-btn">
              <Download size={16} />
              Export Responses
            </button>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[320px_1fr]">
            <div className="space-y-2">
              <h3 className="text-sm font-black uppercase tracking-[0.14em] text-[color:var(--md-primary)]">Attached Assignments</h3>
              {attachedFormAssignments.length === 0 ? (
                <p className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-4 text-sm text-[color:var(--md-text-secondary)]">No assignments have attached forms yet.</p>
              ) : attachedFormAssignments.map((assignment) => (
                <button key={assignment._id} type="button" onClick={() => setSelectedId(assignment._id)} className={`w-full rounded-lg border p-3 text-left transition ${selectedAssignment?._id === assignment._id ? "border-sky-400 bg-sky-500/10" : "border-[color:var(--md-border)] bg-[color:var(--md-hover)] hover:border-sky-400"}`}>
                  <p className="font-black text-[color:var(--md-text-primary)]">{assignment.title}</p>
                  <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">{assignment.subject} | {assignment.totalMarks || 0} marks</p>
                  <p className="mt-1 text-xs font-bold text-[color:var(--md-primary)]">{assignment.submissions?.length || 0} assignment submission{assignment.submissions?.length === 1 ? "" : "s"}</p>
                </button>
              ))}
            </div>

            <div>
              {responsesLoading ? (
                <p className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-8 text-center text-sm text-[color:var(--md-text-secondary)]">Loading form responses...</p>
              ) : responseForm ? (
                <AssignmentFormResponsesDashboard form={responseForm} responses={responseRows} />
              ) : (
                <p className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-8 text-center text-sm text-[color:var(--md-text-secondary)]">Select an assignment with an attached form.</p>
              )}
            </div>
          </div>
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
                  {submission?.gradedAt && <p className="mt-2 text-xs text-[color:var(--md-text-secondary)]">Updated {formatDate(submission.gradedAt, true)}</p>}
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

function formResponseAnalytics(responses = [], totalMarks = 0) {
  const scored = responses.filter((response) => response.marks !== null && response.marks !== undefined);
  const totalResponses = responses.length;
  const averageScore = scored.length ? Math.round(scored.reduce((sum, response) => sum + Number(response.marks || 0), 0) / scored.length) : 0;
  const completionRate = totalResponses ? Math.round((responses.filter((response) => (response.answers || []).length > 0).length / totalResponses) * 100) : 0;
  const passCount = scored.filter((response) => Number(response.marks || 0) >= Number(totalMarks || 0) * 0.5).length;
  const failCount = Math.max(0, scored.length - passCount);
  const scoreBuckets = [
    { name: "0-39", value: scored.filter((response) => Number(response.marks || 0) < 40).length },
    { name: "40-59", value: scored.filter((response) => Number(response.marks || 0) >= 40 && Number(response.marks || 0) < 60).length },
    { name: "60-79", value: scored.filter((response) => Number(response.marks || 0) >= 60 && Number(response.marks || 0) < 80).length },
    { name: "80+", value: scored.filter((response) => Number(response.marks || 0) >= 80).length }
  ];
  const timeline = responses.slice(-8).map((response, index) => ({ name: `R${index + 1}`, responses: index + 1, score: Number(response.marks || 0) }));
  return {
    totalResponses,
    scoredCount: scored.length,
    averageScore,
    completionRate,
    passCount,
    failCount,
    needsReview: Math.max(0, totalResponses - passCount),
    highestScore: scored.length ? Math.max(...scored.map((response) => Number(response.marks || 0))) : 0,
    scoreBuckets,
    timeline
  };
}

function AssignmentFormResponsesDashboard({ form, responses }) {
  const analytics = formResponseAnalytics(responses, form.totalMarks);
  const passSplit = [
    { name: "Passed", value: analytics.passCount, color: "#22c55e" },
    { name: "Needs review", value: analytics.failCount || analytics.needsReview, color: "#ef4444" }
  ].filter((item) => item.value > 0);
  const passSplitData = passSplit.length ? passSplit : [{ name: "No scores", value: 1, color: "#94a3b8" }];
  const questionMap = useMemo(() => {
    const map = new Map();
    (form.sections || []).forEach((section) => {
      (section.questions || []).forEach((question) => map.set(question.id, question.title));
    });
    return map;
  }, [form.sections]);

  const formatAnswerValue = (value) => {
    if (Array.isArray(value)) return value.join(", ");
    if (value && typeof value === "object") return Object.entries(value).map(([key, item]) => `${key}: ${Array.isArray(item) ? item.join(", ") : item}`).join("; ");
    return value || "-";
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--md-primary)]">Attached Form</p>
        <h3 className="mt-2 text-2xl font-black text-[color:var(--md-text-primary)]">{form.title}</h3>
        <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">{form.description || "No form description."}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <ResponseMetric label="Total Responses" value={analytics.totalResponses} />
          <ResponseMetric label="Average Score" value={`${analytics.averageScore}${form.totalMarks ? ` / ${form.totalMarks}` : ""}`} />
          <ResponseMetric label="Completion" value={`${analytics.completionRate}%`} />
          <ResponseMetric label="Passed" value={analytics.passCount} />
          <ResponseMetric label="Highest Score" value={analytics.highestScore} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--md-success)]">Scored</p>
          <p className="mt-2 text-3xl font-black text-[color:var(--md-text-primary)]">{analytics.scoredCount}</p>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--md-warning)]">Needs Review</p>
          <p className="mt-2 text-3xl font-black text-[color:var(--md-text-primary)]">{analytics.needsReview}</p>
        </div>
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--md-primary)]">Total Marks</p>
          <p className="mt-2 text-3xl font-black text-[color:var(--md-text-primary)]">{form.totalMarks || 0}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ResponseChartPanel title="Pass Split">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={passSplitData}
                dataKey="value"
                nameKey="name"
                innerRadius={48}
                outerRadius={82}
                isAnimationActive
                animationDuration={900}
                animationBegin={80}
              >
                {passSplitData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ResponseChartPanel>

        <ResponseChartPanel title="Score Buckets">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={analytics.scoreBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.35)" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={900} animationBegin={160} />
            </BarChart>
          </ResponsiveContainer>
        </ResponseChartPanel>

        <ResponseChartPanel title="Submission Trend">
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={analytics.timeline.length ? analytics.timeline : [{ name: "No data", responses: 0, score: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.35)" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="responses" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} isAnimationActive animationDuration={900} animationBegin={220} />
              <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} isAnimationActive animationDuration={900} animationBegin={320} />
            </LineChart>
          </ResponsiveContainer>
        </ResponseChartPanel>
      </div>

      <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-5">
        <h3 className="text-lg font-black text-[color:var(--md-text-primary)]">Individual Responses</h3>
        <div className="mt-4 space-y-3">
          {responses.length === 0 ? (
            <p className="rounded-lg bg-[color:var(--md-card)] p-4 text-center text-sm text-[color:var(--md-text-secondary)]">No responses yet.</p>
          ) : responses.map((response, index) => (
            <details key={response._id || index} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-[color:var(--md-text-primary)]">{response.respondent || `Student response ${index + 1}`}</p>
                    <p className="text-xs text-[color:var(--md-text-secondary)]">{response.respondentEmail || response.studentId || "No student identifier"} | {formatDate(response.submittedAt, true)}</p>
                  </div>
                  <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-black text-[color:var(--md-primary)]">{response.marks ?? "-"} marks</span>
                </div>
              </summary>
              <div className="mt-4 space-y-2">
                {(response.answers || []).length === 0 ? (
                  <p className="text-sm text-[color:var(--md-text-secondary)]">No answers captured.</p>
                ) : (response.answers || []).map((answer) => (
                  <div key={answer.questionId} className="rounded-lg bg-[color:var(--md-hover)] p-3 text-sm">
                    <p className="font-bold text-[color:var(--md-text-primary)]">{questionMap.get(answer.questionId) || answer.questionId}</p>
                    <p className="mt-1 text-[color:var(--md-text-secondary)]">{formatAnswerValue(answer.value)}</p>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResponseMetric({ label, value }) {
  return (
    <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--md-text-secondary)]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[color:var(--md-text-primary)]">{value}</p>
    </div>
  );
}

function ResponseChartPanel({ title, children }) {
  return (
    <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-5">
      <h3 className="text-base font-black text-[color:var(--md-text-primary)]">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function AssignmentBuilderShell({ facultyDepartment, students = [], onClose, onSaved }) {
  const [step, setStep] = useState("Assignment Details");
  const [savedAssignmentId, setSavedAssignmentId] = useState("");
  const [assignmentFormId, setAssignmentFormId] = useState("");
  const [builderSaving, setBuilderSaving] = useState(false);
  const [builderError, setBuilderError] = useState("");
  const [builderStatus, setBuilderStatus] = useState("");
  const [details, setDetails] = useState({
    title: "",
    description: "",
    instructions: "",
    subject: "",
    lecturerDepartment: facultyDepartment || "",
    academicYearSemester: "",
    totalMarks: "",
    category: "Quiz",
    publishAt: "",
    status: "draft",
    publishMode: "draft",
    audienceSelection: "course",
    selectedAudienceGroup: "",
    selectedStudentIds: [],
    notifyByEmail: false,
    inAppNotification: true,
    smsNotification: false,
    confirmationFields: {
      assignmentName: true,
      totalMarks: true,
      studentCount: true,
      estimatedCompletionTime: true
    },
    gradingType: "hybrid",
    passMark: "",
    gradeScale: "Percentage Based",
    lateSubmissionPenalty: "",
    missingFilePenalty: "",
    plagiarismPenalty: "",
    autoGrading: true,
    manualGrading: true,
    attachments: [],
    coverImage: null,
    estimatedCompletionTime: "",
    difficultyLevel: "Beginner",
    plagiarismSettings: "Standard plagiarism check",
    autoSaveDraft: true
  });
  const [previewDevice, setPreviewDevice] = useState("Desktop");
  const steps = ["Assignment Details", "Form Builder", "Grading Settings", "Preview", "Publish"];

  const updateDetails = (patch) => setDetails((current) => ({ ...current, ...patch }));
  const updateConfirmationField = (field, checked) => updateDetails({ confirmationFields: { ...details.confirmationFields, [field]: checked } });
  const updateGradingType = (gradingType) => updateDetails({
    gradingType,
    autoGrading: gradingType !== "manual",
    manualGrading: gradingType !== "auto"
  });
  const embeddedGradingSettings = useMemo(() => ({
    configuredTotalMarks: Number(details.totalMarks || 0),
    passingMarks: Number(details.passMark || 0),
    gradeScale: details.gradeScale,
    gradingMode: details.gradingType,
    lateSubmissionPenalty: Number(details.lateSubmissionPenalty || 0),
    missingFilePenalty: Number(details.missingFilePenalty || 0),
    plagiarismPenalty: Number(details.plagiarismPenalty || 0)
  }), [details.gradeScale, details.gradingType, details.lateSubmissionPenalty, details.missingFilePenalty, details.passMark, details.plagiarismPenalty, details.totalMarks]);
  const previewWidth = previewDevice === "Mobile" ? "max-w-sm" : previewDevice === "Tablet" ? "max-w-2xl" : "max-w-5xl";
  const eligibleStudents = useMemo(() => students.filter((student) => !facultyDepartment || student.department === facultyDepartment), [facultyDepartment, students]);
  const audienceStudentCount = useMemo(() => {
    if (details.audienceSelection === "students") return details.selectedStudentIds.length;
    if (["batch", "group"].includes(details.audienceSelection) && details.selectedAudienceGroup) {
      return eligibleStudents.filter((student) => student.academicStage === details.selectedAudienceGroup).length;
    }
    return eligibleStudents.length;
  }, [details.audienceSelection, details.selectedAudienceGroup, details.selectedStudentIds.length, eligibleStudents]);

  const uploadBuilderFiles = async (files) => {
    const items = Array.from(files || []).filter(Boolean);
    if (!items.length) return [];
    const formData = new FormData();
    items.forEach((file) => formData.append("files", file));
    const result = await apiFetch("/api/assignments/uploads", { method: "POST", body: formData });
    return result?.files || [];
  };

  const saveAssignmentDetails = async (publishPatch = {}) => {
    setBuilderSaving(true);
    setBuilderError("");
    setBuilderStatus("");
    try {
      const nextDetails = { ...details, ...publishPatch };
      const [coverFiles, attachmentFiles] = await Promise.all([
        nextDetails.coverImage ? uploadBuilderFiles([nextDetails.coverImage]) : Promise.resolve([]),
        uploadBuilderFiles(nextDetails.attachments)
      ]);
      const status = nextDetails.publishMode === "now" || nextDetails.publishMode === "schedule" ? "published" : "draft";
      const publishAt = nextDetails.publishMode === "schedule" ? nextDetails.publishAt || null : null;
      const academicStage = ["batch", "group"].includes(nextDetails.audienceSelection) ? nextDetails.selectedAudienceGroup : "";
      if (status === "published" && !assignmentFormId) {
        setBuilderError("Create and save the assignment form before publishing.");
        return;
      }
      if (assignmentFormId) {
        await apiFetch(`/api/forms/${assignmentFormId}/status`, { method: "PATCH", body: JSON.stringify({ status: status === "published" ? "published" : "draft" }) });
      }
      const payload = {
        title: nextDetails.title,
        subject: nextDetails.subject,
        topicModule: nextDetails.academicYearSemester,
        description: nextDetails.description,
        instructions: nextDetails.instructions,
        department: facultyDepartment,
        academicStage,
        publishAt,
        totalMarks: Number(nextDetails.totalMarks || 0),
        status,
        notifyByEmail: Boolean(nextDetails.notifyByEmail),
        attachments: attachmentFiles,
        materials: [],
        details: {
          lecturerDepartment: nextDetails.lecturerDepartment || facultyDepartment,
          academicYearSemester: nextDetails.academicYearSemester,
          category: nextDetails.category,
          coverImage: coverFiles[0] || null,
          estimatedCompletionTime: nextDetails.estimatedCompletionTime,
          difficultyLevel: nextDetails.difficultyLevel,
          plagiarismSettings: nextDetails.plagiarismSettings,
          autoSaveDraft: nextDetails.autoSaveDraft,
          gradingType: nextDetails.gradingType,
          passMark: Number(nextDetails.passMark || 0),
          gradeScale: nextDetails.gradeScale,
          lateSubmissionPenalty: Number(nextDetails.lateSubmissionPenalty || 0),
          missingFilePenalty: Number(nextDetails.missingFilePenalty || 0),
          plagiarismPenalty: Number(nextDetails.plagiarismPenalty || 0),
          formId: assignmentFormId,
          audienceSelection: nextDetails.audienceSelection,
          selectedAudienceGroup: nextDetails.selectedAudienceGroup,
          selectedStudentIds: nextDetails.audienceSelection === "students" ? nextDetails.selectedStudentIds : [],
          inAppNotification: nextDetails.inAppNotification,
          smsNotification: nextDetails.smsNotification,
          confirmationFields: nextDetails.confirmationFields
        }
      };
      const saved = savedAssignmentId
        ? await apiFetch(`/api/assignments/${savedAssignmentId}`, { method: "PUT", body: JSON.stringify(payload) })
        : await apiFetch("/api/assignments", { method: "POST", body: JSON.stringify(payload) });
      setSavedAssignmentId(saved._id);
      onSaved?.(saved);
      setDetails(nextDetails);
      setBuilderStatus(status === "published" ? "Assignment publish settings saved." : "Assignment draft saved.");
    } catch (err) {
      setBuilderError(err?.message || "Unable to save assignment details.");
    } finally {
      setBuilderSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <GlassCard className="overflow-hidden p-0">
        <div className="h-2 bg-[color:var(--md-primary)]" />
        <div className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="portal-page-label">Department Staff Assignment Builder</p>
              <h2 className="classroom-section-title">Create Assignment</h2>
              <p className="portal-page-subtitle">Build assignment details, form questions, grading, preview, and publishing from one workflow.</p>
            </div>
            <button type="button" onClick={onClose} className="portal-btn">
              <X size={16} />
              Close Builder
            </button>
          </div>
          <div className="mt-5 flex gap-2 overflow-x-auto">
            {steps.map((item) => (
              <button key={item} type="button" onClick={() => setStep(item)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold transition ${step === item ? "bg-sky-500 text-slate-950" : "bg-[color:var(--md-hover)] text-[color:var(--md-text-secondary)] hover:text-[color:var(--md-text-primary)]"}`}>
                {item}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {step === "Assignment Details" && (
        <GlassCard className="p-5">
          <h3 className="classroom-section-title">Assignment Details</h3>
          <div className="mt-5 space-y-6">
            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.14em] text-[color:var(--md-primary)]">Basic Information</h4>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)]">
                  Assignment Title
                  <input required value={details.title} onChange={(event) => updateDetails({ title: event.target.value })} className="portal-input" placeholder="Assignment title" />
                </label>
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)]">
                  Course / Module
                  <input required value={details.subject} onChange={(event) => updateDetails({ subject: event.target.value })} className="portal-input" placeholder="Course or module" />
                </label>
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)]">
                  Lecturer / Department
                  <input value={details.lecturerDepartment || facultyDepartment || ""} onChange={(event) => updateDetails({ lecturerDepartment: event.target.value })} className="portal-input" placeholder={facultyDepartment || "Lecturer or department"} />
                </label>
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)]">
                  Academic Year & Semester
                  <input value={details.academicYearSemester} onChange={(event) => updateDetails({ academicYearSemester: event.target.value })} className="portal-input" placeholder="2026 - Semester 1" />
                </label>
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)] md:col-span-2">
                  Assignment Description
                  <textarea value={details.description} onChange={(event) => updateDetails({ description: event.target.value })} rows={3} className="portal-input" placeholder="Describe what students need to complete" />
                </label>
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)] md:col-span-2">
                  Assignment Instructions
                  <textarea value={details.instructions} onChange={(event) => updateDetails({ instructions: event.target.value })} rows={3} className="portal-input" placeholder="Add submission rules, formatting, and required materials" />
                </label>
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)]">
                  Maximum Marks
                  <input type="number" min="0" value={details.totalMarks} onChange={(event) => updateDetails({ totalMarks: event.target.value })} className="portal-input" placeholder="100" />
                </label>
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)] md:col-span-2">
                  Assignment Category
                  <select value={details.category} onChange={(event) => updateDetails({ category: event.target.value })} className="portal-input">
                    {assignmentCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.14em] text-[color:var(--md-primary)]">Advanced Features</h4>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2.5 text-sm font-bold text-[color:var(--md-text-secondary)] hover:border-sky-400">
                  <Upload size={16} />
                  Assignment Cover Image/Banner
                  <input type="file" accept="image/*" onChange={(event) => updateDetails({ coverImage: event.target.files?.[0] || null })} className="hidden" />
                </label>
                <span className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2.5 text-sm text-[color:var(--md-text-secondary)]">{details.coverImage?.name || "No cover image selected"}</span>
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)]">
                  Estimated Completion Time
                  <input value={details.estimatedCompletionTime} onChange={(event) => updateDetails({ estimatedCompletionTime: event.target.value })} className="portal-input" placeholder="2 hours" />
                </label>
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)]">
                  Difficulty Level
                  <select value={details.difficultyLevel} onChange={(event) => updateDetails({ difficultyLevel: event.target.value })} className="portal-input">
                    {difficultyLevels.map((level) => <option key={level} value={level}>{level}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)]">
                  Plagiarism Settings
                  <select value={details.plagiarismSettings} onChange={(event) => updateDetails({ plagiarismSettings: event.target.value })} className="portal-input">
                    <option value="Standard plagiarism check">Standard plagiarism check</option>
                    <option value="Strict plagiarism check">Strict plagiarism check</option>
                    <option value="Reference-only check">Reference-only check</option>
                    <option value="Disable plagiarism check">Disable plagiarism check</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2.5 text-sm font-bold text-[color:var(--md-text-secondary)]">
                  <input type="checkbox" checked={details.autoSaveDraft} onChange={(event) => updateDetails({ autoSaveDraft: event.target.checked })} />
                  Auto Save Draft
                </label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2.5 text-sm font-bold text-[color:var(--md-text-secondary)] hover:border-sky-400">
                  <Upload size={16} />
                  Attachment upload
                  <input type="file" multiple onChange={(event) => updateDetails({ attachments: Array.from(event.target.files || []) })} className="hidden" />
                </label>
                <span className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2.5 text-sm text-[color:var(--md-text-secondary)]">{details.attachments.length} file{details.attachments.length === 1 ? "" : "s"} selected</span>
              </div>
            </div>
            {builderError && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-[color:var(--md-danger)]">{builderError}</p>}
            {builderStatus && <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-[color:var(--md-success)]">{builderStatus}</p>}
            <button type="button" onClick={saveAssignmentDetails} disabled={builderSaving || !details.title || !details.subject} className="portal-btn-primary">
              <Save size={16} />
              {builderSaving ? "Saving..." : savedAssignmentId ? "Save Assignment Details" : "Create Assignment Draft"}
            </button>
          </div>
        </GlassCard>
      )}

      {step === "Form Builder" && <FormsPage embedded embeddedFormId={assignmentFormId} embeddedGradingSettings={embeddedGradingSettings} onEmbeddedFormSaved={(form) => setAssignmentFormId(form?._id || "")} />}

      {step === "Grading Settings" && (
        <GlassCard className="p-5">
          <h3 className="classroom-section-title">Grading Settings</h3>
          <div className="mt-5 space-y-6">
            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.14em] text-[color:var(--md-primary)]">Grading Type</h4>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {gradingTypes.map((type) => (
                  <button key={type.value} type="button" onClick={() => updateGradingType(type.value)} className={`rounded-lg border px-4 py-3 text-left text-sm font-black transition ${details.gradingType === type.value ? "border-sky-400 bg-sky-500 text-slate-950" : "border-[color:var(--md-border)] bg-[color:var(--md-hover)] text-[color:var(--md-text-secondary)] hover:border-sky-400"}`}>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.14em] text-[color:var(--md-primary)]">Marks Configuration</h4>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)]">
                  Total Marks
                  <input type="number" min="0" value={details.totalMarks} onChange={(event) => updateDetails({ totalMarks: event.target.value })} className="portal-input" placeholder="100" />
                </label>
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)]">
                  Pass Mark
                  <input type="number" min="0" value={details.passMark} onChange={(event) => updateDetails({ passMark: event.target.value })} className="portal-input" placeholder="50" />
                </label>
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)]">
                  Grade Scale
                  <select value={details.gradeScale} onChange={(event) => updateDetails({ gradeScale: event.target.value })} className="portal-input">
                    {gradeScales.map((scale) => <option key={scale} value={scale}>{scale}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.14em] text-[color:var(--md-primary)]">Penalties</h4>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)]">
                  Late Submission Penalty
                  <input type="number" min="0" value={details.lateSubmissionPenalty} onChange={(event) => updateDetails({ lateSubmissionPenalty: event.target.value })} className="portal-input" placeholder="0" />
                </label>
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)]">
                  Missing File Penalty
                  <input type="number" min="0" value={details.missingFilePenalty} onChange={(event) => updateDetails({ missingFilePenalty: event.target.value })} className="portal-input" placeholder="0" />
                </label>
                <label className="space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)]">
                  Plagiarism Penalty
                  <input type="number" min="0" value={details.plagiarismPenalty} onChange={(event) => updateDetails({ plagiarismPenalty: event.target.value })} className="portal-input" placeholder="0" />
                </label>
              </div>
            </div>

            <p className="rounded-lg bg-sky-500/10 px-4 py-3 text-sm text-[color:var(--md-text-secondary)]">
              These grading settings sync to the embedded Form Builder settings. Question-level marks are still configured inside the Form Builder answer-key panel.
            </p>
          </div>
        </GlassCard>
      )}

      {step === "Preview" && (
        <GlassCard className="p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="classroom-section-title">Student View Preview</h3>
            <div className="flex gap-2">
              {["Desktop", "Tablet", "Mobile"].map((device) => (
                <button key={device} type="button" onClick={() => setPreviewDevice(device)} className={`rounded-lg px-3 py-2 text-sm font-bold ${previewDevice === device ? "bg-sky-500 text-slate-950" : "bg-[color:var(--md-hover)] text-[color:var(--md-text-secondary)]"}`}>{device}</button>
              ))}
            </div>
          </div>
          <div className={`mx-auto mt-5 ${previewWidth}`}>
            <div className="rounded-xl border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--md-primary)]">{details.subject || "Subject / Course"}</p>
              <h4 className="mt-2 text-2xl font-black text-[color:var(--md-text-primary)]">{details.title || "Untitled assignment"}</h4>
              <p className="mt-2 text-sm text-[color:var(--md-text-secondary)]">{details.description || "Assignment description will appear here."}</p>
              <p className="mt-4 rounded-lg bg-[color:var(--md-hover)] px-4 py-3 text-sm text-[color:var(--md-text-secondary)]">{details.instructions || "Student instructions will appear here."}</p>
              <button type="button" className="mt-4 portal-btn-primary">Open assignment form</button>
            </div>
          </div>
        </GlassCard>
      )}

      {step === "Publish" && (
        <GlassCard className="p-5">
          <h3 className="classroom-section-title">Publish Settings</h3>
          <div className="mt-5 space-y-6">
            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.14em] text-[color:var(--md-primary)]">Publishing Options</h4>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {[
                  { value: "now", label: "Publish Now", icon: Send },
                  { value: "schedule", label: "Schedule Publish", icon: Bell },
                  { value: "draft", label: "Save as Draft", icon: Save }
                ].map(({ value, label, icon: Icon }) => (
                  <button key={value} type="button" onClick={() => updateDetails({ publishMode: value })} className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-black transition ${details.publishMode === value ? "border-sky-400 bg-sky-500 text-slate-950" : "border-[color:var(--md-border)] bg-[color:var(--md-hover)] text-[color:var(--md-text-secondary)] hover:border-sky-400"}`}>
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>
              {details.publishMode === "schedule" && (
                <label className="mt-4 block space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)] md:max-w-sm">
                  Schedule Publish Date & Time
                  <input type="datetime-local" value={details.publishAt} onChange={(event) => updateDetails({ publishAt: event.target.value })} className="portal-input" />
                </label>
              )}
            </div>

            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.14em] text-[color:var(--md-primary)]">Audience Selection</h4>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                {[
                  ["course", "Entire Course"],
                  ["batch", "Specific Batch"],
                  ["group", "Specific Group"],
                  ["students", "Individual Students"]
                ].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => updateDetails({ audienceSelection: value, selectedAudienceGroup: "", selectedStudentIds: [] })} className={`rounded-lg border px-4 py-3 text-left text-sm font-black transition ${details.audienceSelection === value ? "border-sky-400 bg-sky-500 text-slate-950" : "border-[color:var(--md-border)] bg-[color:var(--md-hover)] text-[color:var(--md-text-secondary)] hover:border-sky-400"}`}>
                    {label}
                  </button>
                ))}
              </div>
              {["batch", "group"].includes(details.audienceSelection) && (
                <label className="mt-4 block space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)] md:max-w-sm">
                  {details.audienceSelection === "batch" ? "Select Batch" : "Select Group"}
                  <select value={details.selectedAudienceGroup} onChange={(event) => updateDetails({ selectedAudienceGroup: event.target.value })} className="portal-input">
                    <option value="">Select one</option>
                    {hnditGroups.map((group) => <option key={group} value={group}>{group}</option>)}
                  </select>
                </label>
              )}
              {details.audienceSelection === "students" && (
                <label className="mt-4 block space-y-1 text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--md-text-secondary)]">
                  Individual Students
                  <select multiple value={details.selectedStudentIds} onChange={(event) => updateDetails({ selectedStudentIds: Array.from(event.target.selectedOptions).map((option) => option.value) })} className="portal-input min-h-36">
                    {eligibleStudents.map((student) => (
                      <option key={student._id} value={student._id}>{student.fullName} {student.studentId ? `(${student.studentId})` : ""}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.14em] text-[color:var(--md-primary)]">Notifications</h4>
              <p className="mt-2 text-sm font-bold text-[color:var(--md-text-secondary)]">Send:</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2.5 text-sm font-bold text-[color:var(--md-text-secondary)]">
                  <input type="checkbox" checked={details.notifyByEmail} onChange={(event) => updateDetails({ notifyByEmail: event.target.checked })} />
                  Email Notification
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2.5 text-sm font-bold text-[color:var(--md-text-secondary)]">
                  <input type="checkbox" checked={details.inAppNotification} onChange={(event) => updateDetails({ inAppNotification: event.target.checked })} />
                  In-App Notification
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2.5 text-sm font-bold text-[color:var(--md-text-secondary)]">
                  <input type="checkbox" checked={details.smsNotification} onChange={(event) => updateDetails({ smsNotification: event.target.checked })} />
                  SMS Notification (optional)
                </label>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.14em] text-[color:var(--md-primary)]">Confirmation Screen</h4>
              <p className="mt-2 text-sm font-bold text-[color:var(--md-text-secondary)]">Display:</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {[
                  ["assignmentName", "Assignment Name"],
                  ["totalMarks", "Total Marks"],
                  ["studentCount", "Student Count"],
                  ["estimatedCompletionTime", "Estimated Completion Time"]
                ].map(([field, label]) => (
                  <label key={field} className="flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2.5 text-sm font-bold text-[color:var(--md-text-secondary)]">
                    <input type="checkbox" checked={details.confirmationFields[field]} onChange={(event) => updateConfirmationField(field, event.target.checked)} />
                    {label}
                  </label>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-4 text-sm text-[color:var(--md-text-secondary)]">
                <p className="font-black text-[color:var(--md-text-primary)]">Confirmation Preview</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {details.confirmationFields.assignmentName && <p><strong>Assignment:</strong> {details.title || "Untitled assignment"}</p>}
                  {details.confirmationFields.totalMarks && <p><strong>Total Marks:</strong> {details.totalMarks || 0}</p>}
                  {details.confirmationFields.studentCount && <p><strong>Student Count:</strong> {audienceStudentCount}</p>}
                  {details.confirmationFields.estimatedCompletionTime && <p><strong>Estimated Time:</strong> {details.estimatedCompletionTime || "Not set"}</p>}
                </div>
              </div>
            </div>

            {details.publishMode !== "draft" && !assignmentFormId && (
              <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-[color:var(--md-warning)]">
                Build and save the assignment form in the Form Builder tab before publishing.
              </p>
            )}
            {builderError && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-[color:var(--md-danger)]">{builderError}</p>}
            {builderStatus && <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-[color:var(--md-success)]">{builderStatus}</p>}
            <button type="button" onClick={() => saveAssignmentDetails()} disabled={builderSaving || !details.title || !details.subject || (details.publishMode !== "draft" && !assignmentFormId) || (details.publishMode === "schedule" && !details.publishAt)} className="portal-btn-primary">
              {details.publishMode === "draft" ? <Save size={16} /> : <Send size={16} />}
              {builderSaving ? "Saving..." : details.publishMode === "now" ? "Publish Assignment" : details.publishMode === "schedule" ? "Schedule Assignment" : "Save Assignment Draft"}
            </button>
          </div>
        </GlassCard>
      )}
    </section>
  );
}

const studentLayoutQuestionTypes = ["section-break", "page-break", "rich-text-block", "image-question", "video-question"];

function StudentAssignmentForm({ form, answers, setAnswers, onSubmit, saving }) {
  const updateAnswer = (questionId, value) => setAnswers((current) => ({ ...current, [questionId]: value }));
  const toggleArrayAnswer = (questionId, option) => {
    setAnswers((current) => {
      const values = Array.isArray(current[questionId]) ? current[questionId] : [];
      return { ...current, [questionId]: values.includes(option) ? values.filter((item) => item !== option) : [...values, option] };
    });
  };
  const updateGridAnswer = (questionId, row, value, multiple = false) => {
    setAnswers((current) => {
      const grid = { ...(current[questionId] || {}) };
      if (multiple) {
        const values = Array.isArray(grid[row]) ? grid[row] : [];
        grid[row] = values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
      } else {
        grid[row] = value;
      }
      return { ...current, [questionId]: grid };
    });
  };

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--md-primary)]">{form.formType || "Assignment form"}</p>
        <h3 className="mt-2 text-2xl font-black text-[color:var(--md-text-primary)]">{form.title}</h3>
        {form.description && <p className="mt-2 text-sm text-[color:var(--md-text-secondary)]">{form.description}</p>}
        <p className="mt-3 text-xs text-[color:var(--md-text-secondary)]">Total marks: {form.totalMarks || 0}</p>
      </div>

      {(form.sections || []).map((section) => (
        <div key={section.id} className="space-y-3">
          {(section.title || section.description) && (
            <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
              {section.title && <h4 className="font-black text-[color:var(--md-text-primary)]">{section.title}</h4>}
              {section.description && <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">{section.description}</p>}
            </div>
          )}
          {(section.questions || []).map((question) => (
            <StudentQuestion
              key={question.id}
              question={question}
              value={answers[question.id]}
              updateAnswer={updateAnswer}
              toggleArrayAnswer={toggleArrayAnswer}
              updateGridAnswer={updateGridAnswer}
            />
          ))}
        </div>
      ))}

      <button type="button" onClick={onSubmit} disabled={saving || form.status !== "published"} className="portal-btn-primary">
        <Send size={16} />
        {saving ? "Submitting..." : form.status === "published" ? "Submit Answers" : "This form is not accepting responses"}
      </button>
    </div>
  );
}

function StudentQuestion({ question, value, updateAnswer, toggleArrayAnswer, updateGridAnswer }) {
  if (studentLayoutQuestionTypes.includes(question.type)) {
    return (
      <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
        {question.title && <h4 className="font-black text-[color:var(--md-text-primary)]">{question.title}</h4>}
        {question.description && <p className="mt-2 text-sm text-[color:var(--md-text-secondary)]">{question.description}</p>}
        {question.imageUrl && <img src={question.imageUrl} alt={question.title || "Question image"} className="mt-3 max-h-64 rounded-lg object-contain" />}
        {question.videoUrl && <a href={question.videoUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-bold text-[color:var(--md-primary)]">Open video</a>}
      </div>
    );
  }

  const options = question.options?.length ? question.options : ["Option 1"];
  const rows = question.rows?.length ? question.rows : ["Row 1"];
  const columns = question.columns?.length ? question.columns : ["Column 1"];

  return (
    <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-black text-[color:var(--md-text-primary)]">{question.title}</h4>
        {question.required && <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs font-bold text-[color:var(--md-danger)]">Required</span>}
      </div>
      {question.description && <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">{question.description}</p>}

      {question.type === "paragraph" && <textarea value={value || ""} onChange={(event) => updateAnswer(question.id, event.target.value)} rows={4} className="portal-input mt-3" placeholder="Your answer" />}
      {["short-answer", "email", "phone", "url"].includes(question.type) && <input type={question.type === "email" ? "email" : question.type === "phone" ? "tel" : question.type === "url" ? "url" : "text"} value={value || ""} onChange={(event) => updateAnswer(question.id, event.target.value)} className="portal-input mt-3" placeholder="Your answer" />}
      {question.type === "number" && <input type="number" value={value || ""} onChange={(event) => updateAnswer(question.id, event.target.value)} className="portal-input mt-3" />}
      {question.type === "date-picker" && <input type="date" value={value || ""} onChange={(event) => updateAnswer(question.id, event.target.value)} className="portal-input mt-3" />}
      {question.type === "time-picker" && <input type="time" value={value || ""} onChange={(event) => updateAnswer(question.id, event.target.value)} className="portal-input mt-3" />}
      {question.type === "file-upload" && <input value={value || ""} onChange={(event) => updateAnswer(question.id, event.target.value)} className="portal-input mt-3" placeholder="Paste file link or note" />}

      {question.type === "multiple-choice" && (
        <div className="mt-3 space-y-2">
          {options.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-[color:var(--md-text-secondary)]">
              <input type="radio" name={question.id} checked={value === option} onChange={() => updateAnswer(question.id, option)} />
              {option}
            </label>
          ))}
        </div>
      )}

      {question.type === "checkboxes" && (
        <div className="mt-3 space-y-2">
          {options.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-[color:var(--md-text-secondary)]">
              <input type="checkbox" checked={Array.isArray(value) && value.includes(option)} onChange={() => toggleArrayAnswer(question.id, option)} />
              {option}
            </label>
          ))}
        </div>
      )}

      {question.type === "dropdown" && (
        <select value={value || ""} onChange={(event) => updateAnswer(question.id, event.target.value)} className="portal-input mt-3">
          <option value="">Select an option</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      )}

      {["linear-scale", "rating"].includes(question.type) && (
        <input type="range" min={question.min || 1} max={question.max || 5} step={question.step || 1} value={value || question.min || 1} onChange={(event) => updateAnswer(question.id, event.target.value)} className="mt-4 w-full" />
      )}

      {["multiple-choice-grid", "checkbox-grid"].includes(question.type) && (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm text-[color:var(--md-text-secondary)]">
            <thead>
              <tr>
                <th className="p-2 text-left">Question</th>
                {columns.map((column) => <th key={column} className="p-2 text-center">{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row} className="border-t border-[color:var(--md-border)]">
                  <td className="p-2 font-semibold">{row}</td>
                  {columns.map((column) => (
                    <td key={column} className="p-2 text-center">
                      <input
                        type={question.type === "checkbox-grid" ? "checkbox" : "radio"}
                        name={`${question.id}-${row}`}
                        checked={question.type === "checkbox-grid" ? Array.isArray(value?.[row]) && value[row].includes(column) : value?.[row] === column}
                        onChange={() => updateGridAnswer(question.id, row, column, question.type === "checkbox-grid")}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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

function AssignmentGrid({ assignments, selectedId, canManage, setSelectedId, onStudentOpen, startEdit, deleteAssignment }) {
  if (!assignments.length) return <p className="py-10 text-center text-[color:var(--md-text-secondary)]">No assignments found.</p>;
  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {assignments.map((item) => (
        <button key={item._id} type="button" onClick={() => (canManage ? setSelectedId(item._id) : onStudentOpen?.(item))} className={`rounded-lg border p-4 text-left transition ${selectedId === item._id ? "border-sky-400 bg-sky-500/10" : "border-[color:var(--md-border)] bg-[color:var(--md-hover)] hover:bg-[color:var(--md-hover)]"}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${statusClass(item.status)}`}>{item.status}</span>
                <span className="text-xs font-bold" style={{color:"var(--md-primary)"}}>{item.topicModule || item.subject}</span>
              </div>
              <h3 className="mt-2 text-base font-black text-[color:var(--md-text-primary)]">{item.title}</h3>
              <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">{item.dueDate ? `Due ${formatDate(item.dueDate)} | ` : ""}{item.totalMarks} marks</p>
              {!canManage && item.details?.formId && <p className="mt-2 text-xs font-bold text-[color:var(--md-primary)]">Click to open assignment form</p>}
              {item.publishAt && <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">Scheduled {formatDate(item.publishAt, true)}</p>}
              {(item.academicStage || item.studentName) && <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">Target: {item.studentName || item.academicStage}</p>}
            </div>
            {canManage && (
              <div className="flex gap-2">
                <IconButton onClick={(event) => { event.stopPropagation(); startEdit(item); }} icon={Edit3} />
                <IconButton danger onClick={(event) => { event.stopPropagation(); deleteAssignment(item); }} icon={Trash2} />
              </div>
            )}
          </div>
          {item.description && <p className="mt-3 text-sm leading-6 text-[color:var(--md-text-secondary)]">{item.description}</p>}
          <ResourceLinks items={item.attachments || []} />
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
