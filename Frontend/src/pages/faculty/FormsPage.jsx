import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  ArrowDownAZ,
  BarChart3,
  Bold,
  CalendarCheck,
  CheckCircle2,
  ChevronsUpDown,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Filter,
  Folder,
  GripVertical,
  HelpCircle,
  Image as ImageIcon,
  LayoutGrid,
  Link,
  List,
  ListOrdered,
  Menu,
  MessageSquare,
  MoreHorizontal,
  MoreVertical,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  Star,
  Palette,
  Trash2,
  Type,
  Italic,
  Undo2,
  Redo2,
  Underline,
  Upload,
  UserPlus,
  Users,
  Video,
  X
} from "lucide-react";
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
import AppModal from "../../components/AppModal.jsx";
import GlassCard from "../../components/GlassCard";
import OrganizationBrand from "../../components/OrganizationBrand.jsx";
import { apiFetch, downloadCsv } from "../../lib/api";
import { useModal } from "../../contexts/ModalContext.jsx";

const academicStages = ["", "First year Full Time", "Second year Full Time", "First year Part Time", "Second year Part Time"];

const questionTypes = [
  { value: "short-answer", label: "Short answer" },
  { value: "paragraph", label: "Paragraph" },
  { value: "multiple-choice", label: "Multiple choice" },
  { value: "checkboxes", label: "Checkboxes" },
  { value: "dropdown", label: "Dropdown" },
  { value: "linear-scale", label: "Linear scale" },
  { value: "rating", label: "Rating" },
  { value: "date-picker", label: "Date" },
  { value: "time-picker", label: "Time" },
  { value: "file-upload", label: "File upload" },
  { value: "multiple-choice-grid", label: "Multiple choice grid" },
  { value: "checkbox-grid", label: "Checkbox grid" },
  { value: "section-break", label: "Section break" },
  { value: "page-break", label: "Page break" },
  { value: "rich-text-block", label: "Rich text block" },
  { value: "image-question", label: "Image question" },
  { value: "video-question", label: "Video question" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "number", label: "Number" }
];

const optionQuestionTypes = ["multiple-choice", "checkboxes", "dropdown", "multiple-choice-grid", "checkbox-grid"];
const layoutQuestionTypes = ["section-break", "page-break", "rich-text-block", "image-question", "video-question"];

const formTypes = [
  { type: "blank", label: "Blank Form", icon: FileText, color: "#64748b", description: "Build a custom form from a clean canvas." },
  { type: "assignment", label: "Assignment Form", icon: ClipboardList, color: "#1a73e8", description: "Collect structured assignment submissions." },
  { type: "quiz", label: "Quiz Form", icon: HelpCircle, color: "#7c3aed", description: "Create quick checks with graded questions." },
  { type: "survey", label: "Survey Form", icon: ClipboardCheck, color: "#059669", description: "Gather student and class insights." },
  { type: "feedback", label: "Feedback Form", icon: MessageSquare, color: "#d97706", description: "Capture reflective course feedback." },
  { type: "attendance", label: "Attendance Form", icon: CalendarCheck, color: "#e11d48", description: "Record attendance and session notes." }
];

const defaultSettings = {
  acceptResponses: true,
  responseLimit: 0,
  startDate: "",
  endDate: "",
  password: "",
  notifyByEmail: false,
  oneResponsePerUser: false,
  emailVerification: false,
  progressBar: true,
  passingMarks: 0,
  configuredTotalMarks: 0,
  gradeScale: "Percentage Based",
  dueDate: "",
  submissionDeadline: "",
  gradingMode: "auto",
  negativeMarking: 0,
  lateSubmissionPenalty: 0,
  missingFilePenalty: 0,
  plagiarismPenalty: 0,
  shuffleQuestions: false,
  shuffleAnswers: false,
  timerMinutes: 0,
  autoSubmit: false,
  syncGrades: true,
  gradeSubject: "Form Assessment",
  gradeSemester: 1,
  gradeCredits: 0,
  theme: "default",
  customColors: "",
  customFonts: ""
};

function uid(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function createQuestion(seed = {}) {
  return {
    id: seed.id || uid("question"),
    type: seed.type || "short-answer",
    title: seed.title || "Untitled question",
    description: seed.description || "",
    required: Boolean(seed.required),
    options: seed.options || (optionQuestionTypes.includes(seed.type) ? ["Option 1", "Option 2"] : []),
    rows: seed.rows || [],
    columns: seed.columns || [],
    min: seed.min ?? undefined,
    max: seed.max ?? undefined,
    step: seed.step ?? undefined,
    accept: seed.accept || "",
    validation: seed.validation || {},
    conditionalLogic: seed.conditionalLogic || "",
    answerKey: seed.answerKey || "",
    answerDescription: seed.answerDescription || "",
    marks: Number(seed.marks || 0),
    negativeMarks: Number(seed.negativeMarks || 0),
    imageUrl: seed.imageUrl || "",
    videoUrl: seed.videoUrl || ""
  };
}

function createSection(seed = {}) {
  return {
    id: seed.id || uid("section"),
    title: seed.title || "Main section",
    description: seed.description || "",
    questions: Array.isArray(seed.questions) ? seed.questions.map((question) => createQuestion(question)) : []
  };
}

function createDraft(seed = {}) {
  const sections = Array.isArray(seed.sections) && seed.sections.length ? seed.sections.map((section) => createSection(section)) : [createSection()];
  const computedTotalMarks = calculateTotalQuestionPoints(sections);
  const formType = formTypes.some((item) => item.type === seed.formType) ? seed.formType : "blank";
  return {
    _id: seed._id || "",
    title: seed.title || "Untitled Form",
    description: seed.description || "",
    formType,
    department: seed.department || "",
    academicStage: seed.academicStage || "",
    sections,
    settings: { ...defaultSettings, ...(seed.settings || {}) },
    status: seed.status || "draft",
    totalMarks: computedTotalMarks || Number(seed.totalMarks || 0),
    passingMarks: Number(seed.passingMarks || seed.settings?.passingMarks || 0),
    autoGrading: Boolean(seed.autoGrading),
    responses: Array.isArray(seed.responses) ? seed.responses : []
  };
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-LK", { dateStyle: "medium", timeStyle: "short" });
}

function formTypeMeta(type) {
  return formTypes.find((item) => item.type === type) || formTypes[0];
}

function statusMeta(status) {
  if (status === "published") return { label: "Published", badge: "portal-badge-success", icon: Send };
  if (status === "closed") return { label: "Closed", badge: "portal-badge-danger", icon: Archive };
  if (status === "archived") return { label: "Archived", badge: "portal-badge-neutral", icon: Archive };
  return { label: "Draft", badge: "portal-badge-warning", icon: Edit3 };
}

function countQuestions(form) {
  return (form.sections || []).reduce((total, section) => total + (section.questions?.length || 0), 0);
}

function questionTypeLabel(type) {
  return questionTypes.find((item) => item.value === type)?.label || "Question";
}

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function normalizeDateSettings(settings = {}) {
  return {
    ...settings,
    startDate: toDateInput(settings.startDate),
    endDate: toDateInput(settings.endDate),
    dueDate: toDateInput(settings.dueDate),
    submissionDeadline: toDateInput(settings.submissionDeadline)
  };
}

function normalizeEmbeddedGradingSettings(settings = {}) {
  return {
    configuredTotalMarks: Number(settings.configuredTotalMarks || 0),
    passingMarks: Number(settings.passingMarks || 0),
    gradeScale: settings.gradeScale || "Percentage Based",
    gradingMode: settings.gradingMode || "hybrid",
    lateSubmissionPenalty: Number(settings.lateSubmissionPenalty || 0),
    missingFilePenalty: Number(settings.missingFilePenalty || 0),
    plagiarismPenalty: Number(settings.plagiarismPenalty || 0)
  };
}

function responseAnalytics(responses = [], totalMarks = 0) {
  const scored = responses.filter((response) => response.marks !== null && response.marks !== undefined);
  const totalResponses = responses.length;
  const averageScore = scored.length ? Math.round(scored.reduce((sum, response) => sum + Number(response.marks || 0), 0) / scored.length) : 0;
  const submissionRate = totalResponses ? Math.min(100, Math.round((totalResponses / Math.max(totalResponses, 30)) * 100)) : 0;
  const completionRate = totalResponses ? Math.round((responses.filter((response) => (response.answers || []).length > 0).length / totalResponses) * 100) : 0;
  const passCount = scored.filter((response) => Number(response.marks || 0) >= Number(totalMarks || 0) * 0.5).length;
  const scoreBuckets = [
    { name: "0-39", value: scored.filter((response) => Number(response.marks || 0) < 40).length },
    { name: "40-59", value: scored.filter((response) => Number(response.marks || 0) >= 40 && Number(response.marks || 0) < 60).length },
    { name: "60-79", value: scored.filter((response) => Number(response.marks || 0) >= 60 && Number(response.marks || 0) < 80).length },
    { name: "80+", value: scored.filter((response) => Number(response.marks || 0) >= 80).length }
  ];
  const timeline = responses.slice(-8).map((response, index) => ({ name: `R${index + 1}`, responses: index + 1, score: Number(response.marks || 0) }));
  return {
    totalResponses,
    averageScore,
    submissionRate,
    completionRate,
    passCount,
    failCount: Math.max(0, scored.length - passCount),
    scoreBuckets,
    timeline
  };
}

function calculateTotalQuestionPoints(sections = []) {
  return (sections || []).reduce((sectionTotal, section) => (
    sectionTotal + (section.questions || []).reduce((questionTotal, question) => questionTotal + Number(question.marks || 0), 0)
  ), 0);
}

function cleanPayload(draft) {
  const computedTotalMarks = calculateTotalQuestionPoints(draft.sections);
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    formType: draft.formType,
    department: draft.department,
    academicStage: draft.academicStage,
    sections: draft.sections.map((section) => ({
      ...section,
      title: section.title.trim() || "Untitled section",
      questions: section.questions.map((question) => ({
        ...question,
        title: question.title.trim() || "Untitled question",
        options: optionQuestionTypes.includes(question.type) ? (question.options || []).filter(Boolean) : [],
        marks: Number(question.marks || 0),
        negativeMarks: Number(question.negativeMarks || 0)
      }))
    })),
    settings: {
      ...draft.settings,
      responseLimit: Number(draft.settings.responseLimit || 0),
      passingMarks: Number(draft.settings.passingMarks || draft.passingMarks || 0),
      configuredTotalMarks: Number(draft.settings.configuredTotalMarks || 0),
      gradeScale: draft.settings.gradeScale || "Percentage Based",
      negativeMarking: Number(draft.settings.negativeMarking || 0),
      lateSubmissionPenalty: Number(draft.settings.lateSubmissionPenalty || 0),
      missingFilePenalty: Number(draft.settings.missingFilePenalty || 0),
      plagiarismPenalty: Number(draft.settings.plagiarismPenalty || 0),
      timerMinutes: Number(draft.settings.timerMinutes || 0),
      gradeSemester: Number(draft.settings.gradeSemester || 1),
      gradeCredits: Number(draft.settings.gradeCredits || 0),
      startDate: draft.settings.startDate || undefined,
      endDate: draft.settings.endDate || undefined,
      dueDate: draft.settings.dueDate || undefined,
      submissionDeadline: draft.settings.submissionDeadline || undefined
    },
    status: draft.status,
    totalMarks: computedTotalMarks,
    passingMarks: Number(draft.passingMarks || draft.settings.passingMarks || 0),
    autoGrading: Boolean(draft.autoGrading)
  };
}

function draftPayloadKey(draft) {
  if (!draft) return "";
  try {
    return JSON.stringify(cleanPayload(draft));
  } catch {
    return "";
  }
}

function normalizeQuestionTypeLabel(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function createImportedQuestions(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawTitle, rawType = "short-answer", rawOptions = "", rawAnswer = "", rawMarks = "0"] = line.split("|").map((part) => part.trim());
      const typeToken = normalizeQuestionTypeLabel(rawType);
      const matchedType = questionTypes.find((item) => item.value === typeToken || normalizeQuestionTypeLabel(item.label) === typeToken)?.value || "short-answer";
      const options = optionQuestionTypes.includes(matchedType)
        ? rawOptions.split(";").map((option) => option.trim()).filter(Boolean)
        : [];
      return createQuestion({
        title: rawTitle || "Imported question",
        type: matchedType,
        options: options.length ? options : optionQuestionTypes.includes(matchedType) ? ["Option 1"] : [],
        rows: matchedType.includes("grid") ? ["Row 1"] : [],
        columns: matchedType.includes("grid") ? ["Column 1"] : [],
        answerKey: matchedType === "checkboxes" ? rawAnswer.split(";").map((answer) => answer.trim()).filter(Boolean) : rawAnswer,
        marks: Number(rawMarks || 0)
      });
    });
}

const defaultBuilderTheme = {
  primary: "#1a73e8",
  secondary: "#0d6efd",
  accent: "#1a73e8",
  font: "Roboto",
  fontSize: "12",
  textFont: "Roboto",
  textSize: "11",
  layout: "comfortable",
  background: "#d7e8ff",
  backgroundMode: "solid",
  gradient: "linear-gradient(135deg, #d7e8ff, #e8f0fe)",
  backgroundImage: "",
  headerImage: "",
  universityBranding: true
};

function parseBuilderTheme(settings = {}) {
  try {
    const theme = { ...defaultBuilderTheme, ...(settings.customColors ? JSON.parse(settings.customColors) : {}) };
    return {
      ...theme,
      primary: theme.primary === "#673ab7" ? "#1a73e8" : theme.primary,
      secondary: theme.secondary === "#673ab7" ? "#0d6efd" : theme.secondary,
      accent: theme.accent === "#673ab7" ? "#1a73e8" : theme.accent,
      background: theme.background === "#f0ecff" || theme.background === "#f0ecfa" ? "#d7e8ff" : theme.background,
      gradient: theme.gradient === "linear-gradient(135deg, #f0ecff, #e8f0fe)" ? defaultBuilderTheme.gradient : theme.gradient
    };
  } catch {
    return defaultBuilderTheme;
  }
}

export default function FormsPage({ embedded = false, embeddedFormId = "", embeddedGradingSettings = null, onEmbeddedFormSaved }) {
  const { confirm } = useModal();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingType, setCreatingType] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortMode, setSortMode] = useState("updated");
  const [starredOnly, setStarredOnly] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const [draft, setDraft] = useState(null);
  const [builderTab, setBuilderTab] = useState("questions");
  const [themePanelOpen, setThemePanelOpen] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState("idle");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importQuestionsText, setImportQuestionsText] = useState("");
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [previewForm, setPreviewForm] = useState(null);
  const [responsesForm, setResponsesForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [dragQuestion, setDragQuestion] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [recentAddedQuestionId, setRecentAddedQuestionId] = useState("");
  const builderRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const lastSavedDraftKeyRef = useRef("");
  const [starredIds, setStarredIds] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem("ati-faculty-starred-forms") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem("ati-faculty-starred-forms", JSON.stringify(starredIds));
  }, [starredIds]);

  const loadForms = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/forms");
      setForms(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || "Unable to load forms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  useEffect(() => {
    if (builderTab === "responses") setBuilderTab("questions");
  }, [builderTab]);

  useEffect(() => {
    if (!embedded || !embeddedFormId) return undefined;
    let active = true;
    setError("");
    apiFetch(`/api/forms/${embeddedFormId}`)
      .then((data) => {
        if (!active) return;
        const nextDraft = createDraft({ ...data, status: "draft", settings: normalizeDateSettings(data.settings) });
        setDraft(nextDraft);
        resetDraftHistory(nextDraft);
        setActiveQuestion({ sectionIndex: 0, questionIndex: 0 });
      })
      .catch((err) => {
        if (active) setError(err?.message || "Unable to reopen assignment form.");
      });
    return () => {
      active = false;
    };
  }, [embedded, embeddedFormId]);

  useEffect(() => {
    if (!draft) return;
    window.requestAnimationFrame(() => {
      builderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [draft?._id]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeMenu = () => setMenuOpen(null);
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeMenu();
    };

    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!themePanelOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setThemePanelOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [themePanelOpen]);

  const stats = useMemo(() => {
    const published = forms.filter((form) => form.status === "published").length;
    const closed = forms.filter((form) => form.status === "closed").length;
    const draftCount = forms.filter((form) => form.status === "draft").length;
    const responseCount = forms.reduce((total, form) => total + Number(form.responseCount || 0), 0);
    return { total: forms.length, published, closed, drafts: draftCount, responseCount };
  }, [forms]);

  const filteredForms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return forms
      .filter((form) => {
        const matchesSearch = !query || [form.title, form.description, form.department, form.academicStage, form.formType].some((value) => String(value || "").toLowerCase().includes(query));
        const matchesStatus = statusFilter === "all" || form.status === statusFilter;
        const matchesType = typeFilter === "all" || form.formType === typeFilter;
        const matchesStarred = !starredOnly || starredIds.includes(form._id);
        return matchesSearch && matchesStatus && matchesType && matchesStarred;
      })
      .sort((a, b) => {
        if (sortMode === "title") return String(a.title || "").localeCompare(String(b.title || ""));
        if (sortMode === "responses") return Number(b.responseCount || 0) - Number(a.responseCount || 0);
        if (sortMode === "created") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
      });
  }, [forms, searchQuery, sortMode, starredIds, starredOnly, statusFilter, typeFilter]);

  const hasLibraryFilters = Boolean(searchQuery.trim()) || statusFilter !== "all" || typeFilter !== "all" || starredOnly;

  const resetLibraryFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setSortMode("updated");
    setStarredOnly(false);
  };

  const showStatus = (message) => {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 2800);
  };

  const upsertForm = (form) => {
    setForms((current) => {
      const exists = current.some((item) => item._id === form._id);
      return exists ? current.map((item) => (item._id === form._id ? form : item)) : [form, ...current];
    });
  };

  const resetDraftHistory = (nextDraft) => {
    lastSavedDraftKeyRef.current = draftPayloadKey(nextDraft);
    setUndoStack([]);
    setRedoStack([]);
    setAutoSaveState("saved");
  };

  const commitDraft = useCallback((updater) => {
    setDraft((current) => {
      if (!current) return current;
      const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
      if (!next || next === current) return current;
      const normalizedNext = next.sections ? { ...next, totalMarks: calculateTotalQuestionPoints(next.sections) } : next;
      const currentKey = draftPayloadKey(current);
      const nextKey = draftPayloadKey(normalizedNext);
      if (currentKey !== nextKey) {
        setUndoStack((stack) => [...stack.slice(-39), current]);
        setRedoStack([]);
      }
      return normalizedNext;
    });
  }, []);

  useEffect(() => {
    if (!embedded || !embeddedGradingSettings) return;
    const nextSettings = normalizeEmbeddedGradingSettings(embeddedGradingSettings);
    commitDraft((current) => {
      if (!current) return current;
      const currentSettings = normalizeEmbeddedGradingSettings(current.settings);
      const unchanged = Object.keys(nextSettings).every((key) => String(currentSettings[key]) === String(nextSettings[key]));
      if (unchanged && current.passingMarks === nextSettings.passingMarks && current.autoGrading === (nextSettings.gradingMode !== "manual")) return current;
      return {
        ...current,
        passingMarks: nextSettings.passingMarks,
        autoGrading: nextSettings.gradingMode !== "manual",
        settings: {
          ...current.settings,
          ...nextSettings
        }
      };
    });
  }, [embedded, embeddedGradingSettings, commitDraft]);

  const undoDraft = () => {
    setDraft((current) => {
      if (!current || !undoStack.length) return current;
      const previous = undoStack[undoStack.length - 1];
      setUndoStack((stack) => stack.slice(0, -1));
      setRedoStack((stack) => [current, ...stack].slice(0, 40));
      return previous;
    });
  };

  const redoDraft = () => {
    setDraft((current) => {
      if (!current || !redoStack.length) return current;
      const next = redoStack[0];
      setRedoStack((stack) => stack.slice(1));
      setUndoStack((stack) => [...stack.slice(-39), current]);
      return next;
    });
  };

  const persistDraftSnapshot = async (snapshot, { manual = false } = {}) => {
    if (!snapshot) return false;
    if (!snapshot.title.trim()) {
      if (manual) setError("Form title is required.");
      return false;
    }

    const payloadKey = draftPayloadKey(snapshot);
    if (!manual && payloadKey && payloadKey === lastSavedDraftKeyRef.current) {
      setAutoSaveState("saved");
      return true;
    }

    if (manual) setSaving(true);
    setAutoSaveState("saving");
    setError("");
    try {
      const payload = {
        ...cleanPayload(snapshot),
        ...(embedded ? { status: "draft" } : {})
      };
      const data = snapshot._id
        ? await apiFetch(`/api/forms/${snapshot._id}`, { method: "PUT", body: JSON.stringify(payload) })
        : await apiFetch("/api/forms", { method: "POST", body: JSON.stringify(payload) });
      upsertForm(data);
      if (embedded) onEmbeddedFormSaved?.(data);
      lastSavedDraftKeyRef.current = payloadKey || draftPayloadKey(createDraft({ ...data, settings: normalizeDateSettings(data.settings) }));
      setDraft((current) => {
        if (!current) return current;
        if (!current._id && data._id) return { ...current, _id: data._id, createdAt: data.createdAt, updatedAt: data.updatedAt };
        return current;
      });
      setAutoSaveState("saved");
      if (manual) showStatus("Form saved.");
      return true;
    } catch (err) {
      setAutoSaveState("error");
      setError(err?.message || "Failed to save form.");
      return false;
    } finally {
      if (manual) setSaving(false);
    }
  };

  const handleCreate = async (type, template = null) => {
    if (embedded && (draft || embeddedFormId)) {
      setError("Only one form can be created for this assignment.");
      return;
    }
    setCreatingType(template?.title || type);
    setError("");
    const meta = formTypeMeta(type);
    const embeddedSettings = embeddedGradingSettings ? normalizeEmbeddedGradingSettings(embeddedGradingSettings) : {};
    const payload = cleanPayload(createDraft({
      title: template?.title || `New ${meta.label}`,
      description: template?.description || meta.description,
      formType: embedded ? "assignment" : type,
      status: "draft",
      sections: [createSection({ title: template ? template.title : "Main section", description: template?.description || "", questions: template?.questions || [createQuestion()] })],
      settings: embeddedSettings,
      passingMarks: embeddedSettings.passingMarks || 0,
      autoGrading: embedded ? embeddedSettings.gradingMode !== "manual" : template?.autoGrading || ["quiz"].includes(type),
      totalMarks: embeddedSettings.configuredTotalMarks || template?.totalMarks || 0
    }));

    try {
      const data = await apiFetch("/api/forms", { method: "POST", body: JSON.stringify(payload) });
      upsertForm(data);
      if (embedded) onEmbeddedFormSaved?.(data);
      const nextDraft = createDraft(data);
      setDraft(nextDraft);
      resetDraftHistory(nextDraft);
      setActiveQuestion({ sectionIndex: 0, questionIndex: 0 });
      showStatus(`${data.title} created.`);
    } catch (err) {
      setError(err?.message || "Failed to create form.");
    } finally {
      setCreatingType("");
    }
  };

  const openEditor = async (form) => {
    setMenuOpen(null);
    setError("");
    try {
      const data = await apiFetch(`/api/forms/${form._id}`);
      const nextDraft = createDraft({ ...data, settings: normalizeDateSettings(data.settings) });
      setDraft(nextDraft);
      resetDraftHistory(nextDraft);
      setActiveQuestion({ sectionIndex: 0, questionIndex: 0 });
    } catch (err) {
      setError(err?.message || "Unable to open form.");
    }
  };

  const saveDraft = async () => {
    await persistDraftSnapshot(draft, { manual: true });
  };

  useEffect(() => {
    if (!draft) return undefined;

    const payloadKey = draftPayloadKey(draft);
    if (!payloadKey || payloadKey === lastSavedDraftKeyRef.current) {
      if (payloadKey) setAutoSaveState("saved");
      return undefined;
    }

    setAutoSaveState("dirty");
    window.clearTimeout(autoSaveTimerRef.current);
    const snapshot = draft;
    autoSaveTimerRef.current = window.setTimeout(() => {
      persistDraftSnapshot(snapshot);
    }, 600);

    return () => window.clearTimeout(autoSaveTimerRef.current);
  }, [draft]);

  const updateFormStatus = async (form, nextStatus) => {
    setMenuOpen(null);
    setError("");
    try {
      const data = await apiFetch(`/api/forms/${form._id}/status`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
      upsertForm(data);
      showStatus(`Form marked as ${nextStatus}.`);
    } catch (err) {
      setError(err?.message || "Failed to update form status.");
    }
  };

  const handleDuplicate = async (form) => {
    setMenuOpen(null);
    setError("");
    try {
      const data = await apiFetch(`/api/forms/${form._id}/duplicate`, { method: "POST" });
      upsertForm(data);
      showStatus("Form duplicated.");
    } catch (err) {
      setError(err?.message || "Failed to duplicate form.");
    }
  };

  const handleDelete = async (form) => {
    setMenuOpen(null);
    const confirmed = await confirm({
      title: "Delete Form",
      message: `Delete "${form.title}" permanently? Responses for this form will also be removed.`,
      confirmLabel: "Delete",
      variant: "danger"
    });
    if (!confirmed) return;
    try {
      await apiFetch(`/api/forms/${form._id}`, { method: "DELETE" });
      setForms((current) => current.filter((item) => item._id !== form._id));
      setStarredIds((current) => current.filter((id) => id !== form._id));
      setDraft((current) => (current?._id === form._id ? null : current));
      setPreviewForm((current) => (current?._id === form._id ? null : current));
      setResponsesForm((current) => (current?._id === form._id ? null : current));
      setResponses((current) => (responsesForm?._id === form._id ? [] : current));
      setReviewDrafts((current) => (responsesForm?._id === form._id ? {} : current));
      if (draft?._id === form._id) setActiveQuestion(null);
      showStatus("Form deleted.");
    } catch (err) {
      setError(err?.message || "Failed to delete form.");
    }
  };

  const cancelEmbeddedForm = async () => {
    if (!embedded || !draft) return;
    const confirmed = await confirm({
      title: "Cancel assignment form?",
      message: `Cancel and delete "${draft.title || "Untitled form"}"? You can create a new form for this assignment after cancelling.`,
      confirmLabel: "Cancel form",
      variant: "danger"
    });
    if (!confirmed) return;
    setSaving(true);
    setError("");
    try {
      if (draft._id) {
        await apiFetch(`/api/forms/${draft._id}`, { method: "DELETE" });
        setForms((current) => current.filter((item) => item._id !== draft._id));
      }
      setDraft(null);
      setPreviewForm(null);
      setResponsesForm(null);
      setResponses([]);
      setReviewDrafts({});
      setActiveQuestion(null);
      setUndoStack([]);
      setRedoStack([]);
      setAutoSaveState("idle");
      lastSavedDraftKeyRef.current = "";
      onEmbeddedFormSaved?.(null);
      showStatus("Assignment form cancelled.");
    } catch (err) {
      setError(err?.message || "Unable to cancel assignment form.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStar = (formId) => {
    setStarredIds((current) => (current.includes(formId) ? current.filter((id) => id !== formId) : [...current, formId]));
  };

  const toggleActionMenu = (form, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 224;
    const estimatedMenuHeight = 360;
    const left = Math.min(Math.max(12, rect.right - menuWidth), window.innerWidth - menuWidth - 12);
    const hasRoomBelow = window.innerHeight - rect.bottom > estimatedMenuHeight;
    const top = hasRoomBelow ? rect.bottom + 8 : Math.max(12, rect.top - estimatedMenuHeight - 8);

    setMenuOpen((current) => (current?.id === form._id ? null : { id: form._id, form, left, top }));
  };

  const copyLink = async (form) => {
    setMenuOpen(null);
    const linkText = `${window.location.origin}/faculty/forms?form=${form._id}`;
    try {
      await navigator.clipboard.writeText(linkText);
      showStatus("Form link copied.");
    } catch {
      setError("Clipboard is not available in this browser.");
    }
  };

  const openPreview = async (form) => {
    setMenuOpen(null);
    setError("");
    try {
      const data = await apiFetch(`/api/forms/${form._id}`);
      setPreviewForm(data);
    } catch (err) {
      setError(err?.message || "Unable to preview form.");
    }
  };

  const openResponses = async (form) => {
    setMenuOpen(null);
    setResponsesForm(form);
    setResponses([]);
    setReviewDrafts({});
    setResponsesLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/api/forms/${form._id}/responses`);
      const nextResponses = Array.isArray(data?.responses) ? data.responses : [];
      setResponses(nextResponses);
      setReviewDrafts(Object.fromEntries(nextResponses.map((response) => [response._id, { marks: response.marks ?? "", feedback: response.feedback || "" }])));
    } catch (err) {
      setError(err?.message || "Unable to load responses.");
    } finally {
      setResponsesLoading(false);
    }
  };

  const exportResponses = () => {
    if (!responses.length || !responsesForm) return;
    const rows = responses.map((response, index) => ({
      no: index + 1,
      respondent: response.respondent || "-",
      email: response.respondentEmail || "-",
      submittedAt: formatDateTime(response.submittedAt),
      marks: response.marks ?? "",
      feedback: response.feedback || "",
      answers: (response.answers || []).map((answer) => `${answer.questionId}: ${Array.isArray(answer.value) ? answer.value.join("; ") : answer.value ?? ""}`).join(" | ")
    }));
    downloadCsv(`${responsesForm.title || "form"}-responses.csv`, rows);
  };

  const saveResponseReview = async (response) => {
    if (!responsesForm?._id || !response?._id) return;
    const draftReview = reviewDrafts[response._id] || {};
    setSaving(true);
    setError("");
    try {
      const data = await apiFetch(`/api/forms/${responsesForm._id}/responses/${response._id}`, {
        method: "PATCH",
        body: JSON.stringify(draftReview)
      });
      setResponses((current) => current.map((item) => (item._id === response._id ? { ...item, ...data.response } : item)));
      showStatus("Response review saved.");
    } catch (err) {
      setError(err?.message || "Unable to save response review.");
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = (patch) => commitDraft((current) => ({ ...current, ...patch }));
  const updateSettings = (patch) => commitDraft((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
  const updateTheme = (patch) => {
    commitDraft((current) => {
      const nextTheme = { ...parseBuilderTheme(current.settings), ...patch };
      return { ...current, settings: { ...current.settings, customColors: JSON.stringify(nextTheme), customFonts: nextTheme.font } };
    });
  };
  const updateSection = (sectionIndex, patch) => {
    commitDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) => (index === sectionIndex ? { ...section, ...patch } : section))
    }));
  };
  const updateQuestion = (sectionIndex, questionIndex, patch) => {
    commitDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        return {
          ...section,
          questions: section.questions.map((question, qIndex) => {
            if (qIndex !== questionIndex) return question;
            const next = { ...question, ...patch };
            if (patch.type && patch.type !== question.type) next.answerKey = patch.type === "checkboxes" ? [] : "";
            if (patch.type && !optionQuestionTypes.includes(patch.type)) next.options = [];
            if (patch.type && optionQuestionTypes.includes(patch.type) && !(next.options || []).length) next.options = ["Option 1", "Option 2"];
            if (patch.type && patch.type.includes("grid")) {
              next.rows = (next.rows || []).length ? next.rows : ["Row 1"];
              next.columns = (next.columns || []).length ? next.columns : ["Column 1"];
            }
            return next;
          })
        };
      })
    }));
  };
  const addQuestion = (sectionIndex) => {
    commitDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) => (index === sectionIndex ? { ...section, questions: [...section.questions, createQuestion()] } : section))
    }));
  };
  const addQuestionWithType = (type = "multiple-choice") => {
    const nextQuestion = createQuestion({
      type,
      title: type === "section-break" ? "Untitled section" : type === "page-break" ? "Page break" : type === "rich-text-block" ? "Text block" : "Untitled Question",
      options: optionQuestionTypes.includes(type) ? ["Option 1"] : [],
      rows: type.includes("grid") ? ["Row 1"] : [],
      columns: type.includes("grid") ? ["Column 1"] : []
    });
    commitDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) => {
        const requestedSectionIndex = activeQuestion?.sectionIndex;
        const targetSectionIndex = current.sections[requestedSectionIndex] ? requestedSectionIndex : current.sections.length - 1;
        if (index !== targetSectionIndex) return section;
        const insertIndex = activeQuestion?.questionIndex >= 0 ? Math.min(activeQuestion.questionIndex + 1, section.questions.length) : section.questions.length;
        const questions = [...section.questions];
        questions.splice(insertIndex, 0, nextQuestion);
        window.requestAnimationFrame(() => {
          const nextActive = { sectionIndex: targetSectionIndex, questionIndex: insertIndex };
          setActiveQuestion(nextActive);
          setRecentAddedQuestionId(nextQuestion.id);
          window.setTimeout(() => {
            setRecentAddedQuestionId((current) => (current === nextQuestion.id ? "" : current));
          }, 650);
        });
        return { ...section, questions };
      })
    }));
  };
  const importQuestions = () => {
    const importedQuestions = createImportedQuestions(importQuestionsText);
    if (!importedQuestions.length) {
      setError("Add at least one question to import.");
      return;
    }
    commitDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) => {
        const requestedSectionIndex = activeQuestion?.sectionIndex;
        const targetSectionIndex = current.sections[requestedSectionIndex] ? requestedSectionIndex : current.sections.length - 1;
        if (index !== targetSectionIndex) return section;
        const insertIndex = activeQuestion?.questionIndex >= 0 ? Math.min(activeQuestion.questionIndex + 1, section.questions.length) : section.questions.length;
        const questions = [...section.questions];
        questions.splice(insertIndex, 0, ...importedQuestions);
        window.requestAnimationFrame(() => {
          setActiveQuestion({ sectionIndex: targetSectionIndex, questionIndex: insertIndex });
          setRecentAddedQuestionId(importedQuestions[0].id);
          window.setTimeout(() => {
            setRecentAddedQuestionId((currentId) => (currentId === importedQuestions[0].id ? "" : currentId));
          }, 650);
        });
        return { ...section, questions };
      })
    }));
    setImportQuestionsText("");
    setImportModalOpen(false);
    showStatus(`${importedQuestions.length} question${importedQuestions.length === 1 ? "" : "s"} imported.`);
  };
  const removeQuestion = (sectionIndex, questionIndex) => {
    if (sectionIndex === 0 && questionIndex === 0) {
      showStatus("Question 1 cannot be deleted.");
      return;
    }
    commitDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) => (index === sectionIndex ? { ...section, questions: section.questions.filter((_, qIndex) => qIndex !== questionIndex) } : section))
    }));
    setActiveQuestion((current) => {
      if (!current || current.sectionIndex !== sectionIndex) return current;
      if (current.questionIndex < questionIndex) return current;
      return { sectionIndex, questionIndex: Math.max(0, current.questionIndex - 1) };
    });
  };
  const duplicateQuestion = (sectionIndex, questionIndex) => {
    commitDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        const questions = [...section.questions];
        questions.splice(questionIndex + 1, 0, { ...questions[questionIndex], id: uid("question"), title: `${questions[questionIndex].title} copy` });
        return { ...section, questions };
      })
    }));
    window.requestAnimationFrame(() => setActiveQuestion({ sectionIndex, questionIndex: questionIndex + 1 }));
  };
  const moveQuestion = (sectionIndex, questionIndex, direction) => {
    const target = questionIndex + direction;
    commitDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        if (target < 0 || target >= section.questions.length) return section;
        const questions = [...section.questions];
        [questions[questionIndex], questions[target]] = [questions[target], questions[questionIndex]];
        return { ...section, questions };
      })
    }));
    if (target >= 0) window.requestAnimationFrame(() => setActiveQuestion({ sectionIndex, questionIndex: target }));
  };
  const reorderQuestion = (sectionIndex, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    commitDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        const questions = [...section.questions];
        const [moved] = questions.splice(fromIndex, 1);
        questions.splice(toIndex, 0, moved);
        return { ...section, questions };
      })
    }));
    window.requestAnimationFrame(() => setActiveQuestion({ sectionIndex, questionIndex: toIndex }));
  };
  const addSection = () => {
    const nextSection = createSection({ title: "New section", questions: [createQuestion()] });
    commitDraft((current) => {
      const insertIndex = activeQuestion?.sectionIndex >= 0 ? Math.min(activeQuestion.sectionIndex + 1, current.sections.length) : current.sections.length;
      const sections = [...current.sections];
      sections.splice(insertIndex, 0, nextSection);
      window.requestAnimationFrame(() => {
        setActiveQuestion({ sectionIndex: insertIndex, questionIndex: 0 });
        setRecentAddedQuestionId(nextSection.questions[0].id);
        window.setTimeout(() => {
          setRecentAddedQuestionId((currentId) => (currentId === nextSection.questions[0].id ? "" : currentId));
        }, 650);
      });
      return { ...current, sections };
    });
  };
  const removeSection = (sectionIndex) => {
    commitDraft((current) => {
      if (current.sections.length <= 1) return current;
      return { ...current, sections: current.sections.filter((_, index) => index !== sectionIndex) };
    });
    setActiveQuestion((current) => {
      if (!current) return current;
      if (current.sectionIndex < sectionIndex) return current;
      return { sectionIndex: Math.max(0, current.sectionIndex - 1), questionIndex: 0 };
    });
  };

  function ActionMenu({ form }) {
    return (
      <div
        className="fixed z-[9999] max-h-[calc(100vh-1.5rem)] w-56 overflow-y-auto rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] py-1 shadow-lg"
        style={{ left: menuOpen?.left ?? 12, top: menuOpen?.top ?? 12 }}
        onClick={(event) => event.stopPropagation()}
      >
        <MenuAction icon={Edit3} label="Edit builder" onClick={() => openEditor(form)} />
        <MenuAction icon={Eye} label="Preview form" onClick={() => openPreview(form)} />
        <MenuAction icon={BarChart3} label="View responses" onClick={() => openResponses(form)} />
        <MenuAction icon={Link} label="Copy form link" onClick={() => copyLink(form)} />
        <MenuAction icon={Star} label={starredIds.includes(form._id) ? "Remove star" : "Star form"} onClick={() => { setMenuOpen(null); toggleStar(form._id); }} />
        {form.status !== "published" && <MenuAction icon={Send} label="Publish" onClick={() => updateFormStatus(form, "published")} />}
        {form.status === "published" && <MenuAction icon={EyeOff} label="Close responses" onClick={() => updateFormStatus(form, "closed")} />}
        {form.status !== "draft" && <MenuAction icon={Edit3} label="Move to draft" onClick={() => updateFormStatus(form, "draft")} />}
        {form.status !== "archived" && <MenuAction icon={Archive} label="Archive" onClick={() => updateFormStatus(form, "archived")} />}
        <MenuAction icon={Copy} label="Duplicate" onClick={() => handleDuplicate(form)} />
        <MenuAction icon={Trash2} label="Delete" danger onClick={() => handleDelete(form)} />
      </div>
    );
  }

  function FormCard({ form }) {
    const meta = formTypeMeta(form.formType);
    const Icon = meta.icon;
    const StatusIcon = statusMeta(form.status).icon;
    const starred = starredIds.includes(form._id);

    return (
      <article className="group relative flex min-h-[17.5rem] flex-col overflow-visible rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-[var(--md-shadow-hover)]">
        <div className="h-1.5" style={{ background: meta.color }} />
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-white shadow-sm" style={{ background: meta.color }}>
                <Icon size={21} />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-[color:var(--md-text-primary)]">{form.title}</h3>
                <p className="faculty-form-card-description">{form.description || meta.description}</p>
              </div>
            </div>
            <button type="button" onClick={() => toggleStar(form._id)} className={`rounded-lg p-1.5 transition hover:bg-[color:var(--md-hover)] ${starred ? "text-amber-400" : "text-[color:var(--md-text-secondary)]"}`} aria-label={starred ? "Unstar form" : "Star form"}>
              <Star size={18} fill={starred ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={`portal-badge ${statusMeta(form.status).badge}`}>
              <StatusIcon size={13} />
              {statusMeta(form.status).label}
            </span>
            <span className="portal-badge portal-badge-info">{meta.label}</span>
            {form.academicStage && <span className="portal-badge portal-badge-neutral">{form.academicStage}</span>}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-[color:var(--md-hover)] p-2 text-center">
            <MiniMetric label="Questions" value={countQuestions(form)} />
            <MiniMetric label="Responses" value={form.responseCount || 0} />
            <MiniMetric label="Updated" value={formatDate(form.updatedAt)} />
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 pt-4">
            <button type="button" onClick={() => openEditor(form)} className="portal-btn-primary flex-1 justify-center">
              <Edit3 size={15} />
              Edit
            </button>
            <button type="button" onClick={() => openPreview(form)} className="portal-btn flex-1 justify-center">
              <Eye size={15} />
              Preview
            </button>
            <div className="relative">
              <button type="button" onClick={(event) => toggleActionMenu(form, event)} className="portal-btn" style={{ padding: "0.6rem" }} aria-label="Open form actions">
                <MoreHorizontal size={17} />
              </button>
            </div>
          </div>
        </div>
      </article>
    );
  }

  function FormRow({ form }) {
    const meta = formTypeMeta(form.formType);
    const Icon = meta.icon;
    const starred = starredIds.includes(form._id);

    return (
      <div className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 border-b border-[color:var(--md-border)] px-4 py-3 transition last:border-b-0 hover:bg-[color:var(--md-hover)] lg:grid-cols-[auto_minmax(0,1fr)_9rem_8rem_9rem_auto]">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white" style={{ background: meta.color }}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-[color:var(--md-text-primary)]">{form.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--md-text-secondary)]">
            <span className={`portal-badge ${statusMeta(form.status).badge}`}>{statusMeta(form.status).label}</span>
            <span>{meta.label}</span>
            <span>{countQuestions(form)} questions</span>
            <span className="lg:hidden">{form.responseCount || 0} responses</span>
            <span className="lg:hidden">Updated {formatDate(form.updatedAt)}</span>
          </div>
        </div>
        <div className="hidden text-sm text-[color:var(--md-text-secondary)] lg:block">{form.responseCount || 0} responses</div>
        <div className="hidden text-sm text-[color:var(--md-text-secondary)] lg:block">{formatDate(form.createdAt)}</div>
        <div className="hidden text-sm text-[color:var(--md-text-secondary)] lg:block">{formatDate(form.updatedAt)}</div>
        <div className="flex items-center gap-1 justify-self-end">
          <button type="button" onClick={() => toggleStar(form._id)} className={`rounded-lg p-2 hover:bg-[color:var(--md-card)] ${starred ? "text-amber-400" : "text-[color:var(--md-text-secondary)]"}`} aria-label={starred ? "Unstar form" : "Star form"}>
            <Star size={17} fill={starred ? "currentColor" : "none"} />
          </button>
          <button type="button" onClick={() => openEditor(form)} className="portal-btn" style={{ padding: "0.45rem" }} aria-label="Edit form"><Edit3 size={16} /></button>
          <div className="relative">
            <button type="button" onClick={(event) => toggleActionMenu(form, event)} className="portal-btn" style={{ padding: "0.45rem" }} aria-label="Open form actions"><MoreHorizontal size={16} /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className={`${embedded ? "min-h-[640px] rounded-2xl bg-white" : "-m-6 min-h-screen bg-white"} text-[#202124]`}>
      <header className="flex h-20 items-center gap-4 border-b border-[#eef0f3] bg-white px-8">
        {!embedded && (
          <button type="button" className="rounded-full p-2 text-[#3c4043] hover:bg-[#f1f3f4]" aria-label="Open menu">
            <Menu size={26} />
          </button>
        )}
        <div className="flex items-center gap-3">
          <OrganizationBrand variant="compact" showText={false} className="organization-brand-portal" />
          <span className="text-[1.75rem] leading-none text-[#202124]">{embedded ? "Assignment Form" : "Forms"}</span>
        </div>
        {!embedded && (
          <label className="mx-auto hidden h-[60px] w-full max-w-[900px] items-center gap-5 rounded-full bg-[#f1f3f4] px-6 text-[#3c4043] transition focus-within:bg-white focus-within:shadow-[0_1px_6px_rgba(60,64,67,.28)] md:flex">
            <Search size={26} />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search" className="w-full bg-transparent text-xl outline-none placeholder:text-[#202124]" />
          </label>
        )}
      </header>

      {error && <div className="mx-auto mt-4 max-w-[1180px] rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {status && <div className="mx-auto mt-4 max-w-[1180px] rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{status}</div>}

      {(!embedded || (!draft && !embeddedFormId)) && <section className="bg-[#f1f4f9] py-8">
        <div className="mx-auto max-w-[1180px] px-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-[1.25rem] font-medium text-[#202124]">{embedded ? "Create the assignment form" : "Start a new form"}</h2>
          </div>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-6">
            <GoogleTemplateCard title="Blank form" blank onClick={() => handleCreate("blank")} disabled={Boolean(creatingType)} />
          </div>
        </div>
      </section>}

      {embedded && !draft && embeddedFormId && (
        <section className="mx-auto max-w-[1180px] px-6 py-8">
          <GoogleRecentSkeleton />
        </section>
      )}

      {!embedded && <section className="mx-auto max-w-[1180px] px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-[1.35rem] font-medium text-[#202124]">Recent forms</h2>
          <div className="flex items-center gap-6 text-[#3c4043]">
            <button type="button" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")} className="rounded-full p-2 text-[#5f6368] hover:bg-[#f1f3f4]" aria-label="Toggle layout">
              {viewMode === "grid" ? <List size={25} /> : <LayoutGrid size={25} />}
            </button>
            <button type="button" onClick={() => setSortMode(sortMode === "title" ? "updated" : "title")} className="rounded-full p-2 text-[#5f6368] hover:bg-[#f1f3f4]" aria-label="Sort">
              <ArrowDownAZ size={25} />
            </button>
            <button type="button" className="rounded-full p-2 text-[#5f6368] hover:bg-[#f1f3f4]" aria-label="Open folder">
              <Folder size={27} />
            </button>
            <button type="button" onClick={loadForms} disabled={loading} className="rounded-full p-2 text-[#5f6368] hover:bg-[#f1f3f4]" aria-label="Refresh forms">
              <RefreshCw size={22} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <GoogleRecentSkeleton key={item} />)}
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="rounded-lg border border-[#dadce0] bg-white px-8 py-12 text-center text-[#5f6368]">
            <FileSpreadsheet size={42} className="mx-auto mb-3 text-[#1a73e8]" />
            <p className="text-lg font-medium text-[#202124]">No recent forms</p>
            <p className="mt-1 text-sm">Create a blank form or choose a template above.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredForms.map((form) => <GoogleRecentCard key={form._id} form={form} onOpen={openEditor} onMenu={toggleActionMenu} />)}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[#dadce0] bg-white">
            {filteredForms.map((form) => <GoogleRecentRow key={form._id} form={form} onOpen={openEditor} onMenu={toggleActionMenu} />)}
          </div>
        )}
      </section>}

      {!embedded && menuOpen?.form && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpen(null)} />
          <ActionMenu form={menuOpen.form} />
        </>,
        document.body
      )}

      {draft && (
        <section ref={builderRef} className="scroll-mt-24 bg-[#d7e8ff] text-[#202124]">
          {(() => {
            const theme = parseBuilderTheme(draft.settings);
            const canvasBackground = theme.backgroundMode === "gradient" ? theme.gradient : theme.background;
            const canvasStyle = theme.backgroundMode === "image" && theme.backgroundImage
              ? { backgroundColor: theme.background, backgroundImage: `url(${theme.backgroundImage})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }
              : { background: canvasBackground };
            const activeToolbarQuestion = draft.sections[activeQuestion?.sectionIndex]?.questions?.[activeQuestion?.questionIndex]
              ? activeQuestion
              : { sectionIndex: 0, questionIndex: 0 };
            return (
              <div style={{ fontFamily: theme.font }}>
                <div className="sticky top-0 z-30 border-b border-[#dadce0] bg-white">
                  <div className="flex min-h-[68px] flex-wrap items-center gap-3 px-5 py-2 lg:flex-nowrap lg:px-7">
                    <OrganizationBrand variant="compact" showText={false} className="organization-brand-portal" />
                    <input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} className="min-w-[11rem] flex-1 border-0 bg-transparent text-[1.45rem] outline-none focus:border-b focus:border-[#1a73e8] lg:max-w-xs" placeholder="Untitled form" />
                    <div className="ml-auto flex flex-wrap items-center justify-end gap-2 text-[#5f6368] lg:gap-4">
                      <button type="button" onClick={() => setThemePanelOpen((current) => !current)} className={`rounded-full p-2 hover:bg-[#f1f3f4] ${themePanelOpen ? "bg-[#e8f0fe] text-[#1a73e8]" : ""}`} aria-label="Theme" aria-expanded={themePanelOpen}><Palette size={24} /></button>
                      <button type="button" onClick={() => setPreviewForm(draft)} className="rounded-full p-2 hover:bg-[#f1f3f4]" aria-label="Preview"><Eye size={24} /></button>
                      <span className={`hidden text-xs font-medium sm:inline ${autoSaveState === "error" ? "text-red-600" : "text-[#5f6368]"}`}>
                        {autoSaveState === "saving" ? "Saving draft..." : autoSaveState === "dirty" ? "Unsaved changes" : autoSaveState === "error" ? "Save failed" : "Draft saved"}
                      </span>
                      <button type="button" onClick={undoDraft} disabled={!undoStack.length} className="rounded-full p-2 hover:bg-[#f1f3f4] disabled:opacity-30" aria-label="Undo"><Undo2 size={23} /></button>
                      <button type="button" onClick={redoDraft} disabled={!redoStack.length} className="rounded-full p-2 hover:bg-[#f1f3f4] disabled:opacity-30" aria-label="Redo"><Redo2 size={23} /></button>
                      <button type="button" onClick={saveDraft} disabled={saving} className="rounded-full p-2 hover:bg-[#f1f3f4] disabled:opacity-60" aria-label="Save draft"><Save size={23} /></button>
                      {embedded && (
                        <button type="button" onClick={cancelEmbeddedForm} disabled={saving} className="rounded border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex min-h-[64px] flex-wrap items-end justify-center gap-4 px-4">
                    {["questions", "settings"].map((tab) => (
                      <button key={tab} type="button" onClick={() => setBuilderTab(tab)} className={`px-4 pb-3 text-base font-semibold capitalize ${builderTab === tab ? "border-b-4 border-[#1a73e8] text-[#174ea6]" : "text-[#202124]"}`}>{tab}</button>
                    ))}
                    <span className="pb-4 text-sm text-[#5f6368] lg:ml-28">Total points: {draft.totalMarks || 0}</span>
                  </div>
                </div>

                <div className="relative min-h-[720px]" style={canvasStyle}>
                  <main className="mx-auto max-w-[980px] px-6 py-4">
                    {builderTab === "questions" && (
                      <div className="space-y-4">
                          <div className="overflow-hidden rounded-lg border border-[#dadce0] bg-white shadow-sm">
                            {theme.headerImage && <img src={theme.headerImage} alt="" className="h-36 w-full object-cover" />}
                            <div className="h-3" style={{ background: theme.primary }} />
                            <div className="px-8 py-8">
                              <input value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} className="w-full border-0 border-b border-transparent bg-transparent text-[2.25rem] outline-none focus:border-[#1a73e8]" placeholder="Untitled form" />
                              <RichTextEditor value={draft.description} onChange={(description) => updateDraft({ description })} accent={theme.primary} placeholder="Form description" />
                            </div>
                          </div>

                          {draft.sections.map((section, sectionIndex) => (
                            <div key={section.id} className="space-y-4">
                              {draft.sections.length > 1 && (
                                <div className="rounded-lg border border-[#dadce0] bg-white p-5 shadow-sm">
                                  <div className="flex items-start gap-3">
                                    <input value={section.title} onChange={(event) => updateSection(sectionIndex, { title: event.target.value })} className="min-w-0 flex-1 border-0 border-b bg-transparent text-xl outline-none focus:border-[#1a73e8]" placeholder="Section title" />
                                    <button
                                      type="button"
                                      onClick={() => removeSection(sectionIndex)}
                                      disabled={sectionIndex === 0}
                                      className="rounded-full p-2 text-[#5f6368] transition hover:bg-[#f1f3f4] hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                                      aria-label={sectionIndex === 0 ? "Main section cannot be deleted" : "Delete section"}
                                      title={sectionIndex === 0 ? "Main section cannot be deleted" : "Delete section"}
                                    >
                                      <Trash2 size={20} />
                                    </button>
                                  </div>
                                  <input value={section.description} onChange={(event) => updateSection(sectionIndex, { description: event.target.value })} className="mt-3 w-full border-0 border-b bg-transparent outline-none focus:border-[#1a73e8]" placeholder="Section description" />
                                </div>
                              )}
                              {section.questions.map((question, questionIndex) => (
                                <div key={question.id} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_64px] md:items-start">
                                  <GoogleQuestionCard
                                    question={question}
                                    sectionIndex={sectionIndex}
                                    questionIndex={questionIndex}
                                    isNew={recentAddedQuestionId === question.id}
                                    theme={theme}
                                    updateQuestion={updateQuestion}
                                    duplicateQuestion={duplicateQuestion}
                                    removeQuestion={removeQuestion}
                                    moveQuestion={moveQuestion}
                                    reorderQuestion={reorderQuestion}
                                    dragQuestion={dragQuestion}
                                    setDragQuestion={setDragQuestion}
                                    onActivate={() => setActiveQuestion({ sectionIndex, questionIndex })}
                                    totalQuestions={section.questions.length}
                                  />
                                  {activeToolbarQuestion.sectionIndex === sectionIndex && activeToolbarQuestion.questionIndex === questionIndex && (
                                    <div key={`toolbar-${sectionIndex}-${questionIndex}`} className="forms-builder-toolbar-pop hidden flex-col self-start rounded-lg border border-[#dadce0] bg-white shadow-md md:flex">
                                      <BuilderToolbar addQuestionWithType={addQuestionWithType} addSection={addSection} onImport={() => setImportModalOpen(true)} />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ))}
                      </div>
                    )}

                    {builderTab === "settings" && (
                      <FormSettingsPanel
                        draft={draft}
                        updateDraft={updateDraft}
                        updateSettings={updateSettings}
                      />
                    )}
                  </main>

                  {builderTab === "questions" && (
                    <div className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 rounded-lg border border-[#dadce0] bg-white shadow-lg md:hidden">
                      <BuilderToolbar addQuestionWithType={addQuestionWithType} addSection={addSection} onImport={() => setImportModalOpen(true)} compact />
                    </div>
                  )}

                  {themePanelOpen && (
                    <ThemeCustomizer theme={theme} notifyByEmail={draft.settings.notifyByEmail} updateTheme={updateTheme} updateSettings={updateSettings} onClose={() => setThemePanelOpen(false)} />
                  )}
                </div>
              </div>
            );
          })()}
        </section>
      )}

      <AppModal open={importModalOpen} onClose={() => setImportModalOpen(false)} title="Import questions" size="lg">
        <div className="space-y-4 p-5 pt-0">
          <p className="text-sm text-[color:var(--md-text-secondary)]">
            Add one question per line. Use: title | type | options separated by semicolons | answer | points.
          </p>
          <textarea
            value={importQuestionsText}
            onChange={(event) => setImportQuestionsText(event.target.value)}
            className="portal-input min-h-[220px]"
            placeholder={"Student ID\nCourse choice | Multiple choice | HNDIT; HNDA; HNDE | HNDIT | 5\nSelect facilities | Checkboxes | Lab; Library; WiFi | Lab;WiFi | 10"}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setImportModalOpen(false)} className="portal-btn">Cancel</button>
            <button type="button" onClick={importQuestions} className="portal-btn-primary">Import questions</button>
          </div>
        </div>
      </AppModal>

      <AppModal open={Boolean(previewForm)} onClose={() => setPreviewForm(null)} title={previewForm?.title || "Form Preview"} size="lg">
        {previewForm && <PreviewContent form={previewForm} />}
      </AppModal>

      <AppModal open={Boolean(responsesForm)} onClose={() => setResponsesForm(null)} title={responsesForm ? `${responsesForm.title} Responses` : "Responses"} size="lg">
        <div className="space-y-4 p-5 pt-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[color:var(--md-text-secondary)]">{responses.length} response{responses.length === 1 ? "" : "s"} collected.</p>
            <button type="button" onClick={exportResponses} disabled={!responses.length} className="portal-btn">
              <Download size={15} />
              Export CSV
            </button>
          </div>
          {responsesLoading ? (
            <p className="rounded-lg bg-[color:var(--md-hover)] p-6 text-center text-sm text-[color:var(--md-text-secondary)]">Loading responses...</p>
          ) : responses.length === 0 ? (
            <p className="rounded-lg bg-[color:var(--md-hover)] p-6 text-center text-sm text-[color:var(--md-text-secondary)]">No responses yet.</p>
          ) : (
            <div className="space-y-3">
              {responses.map((response, index) => (
                <div key={response._id || index} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-bg)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[color:var(--md-text-primary)]">{response.respondent || `Response ${index + 1}`}</p>
                      <p className="text-xs text-[color:var(--md-text-secondary)]">{response.respondentEmail || "No email"} - {formatDateTime(response.submittedAt)}</p>
                    </div>
                    {response.marks !== null && response.marks !== undefined && <span className="portal-badge portal-badge-success">{response.marks} marks</span>}
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-[140px_1fr_auto]">
                    <input
                      type="number"
                      min="0"
                      value={reviewDrafts[response._id]?.marks ?? ""}
                      onChange={(event) => setReviewDrafts((current) => ({ ...current, [response._id]: { ...(current[response._id] || {}), marks: event.target.value } }))}
                      className="portal-input"
                      placeholder="Marks"
                    />
                    <input
                      value={reviewDrafts[response._id]?.feedback ?? ""}
                      onChange={(event) => setReviewDrafts((current) => ({ ...current, [response._id]: { ...(current[response._id] || {}), feedback: event.target.value } }))}
                      className="portal-input"
                      placeholder="Feedback for student"
                    />
                    <button type="button" onClick={() => saveResponseReview(response)} disabled={saving} className="portal-btn-primary justify-center">
                      Save review
                    </button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {(response.answers || []).map((answer) => (
                      <div key={answer.questionId} className="rounded-lg bg-[color:var(--md-card)] p-3 text-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--md-text-secondary)]">{answer.questionId}</p>
                        <p className="mt-1 text-[color:var(--md-text-primary)]">{Array.isArray(answer.value) ? answer.value.join(", ") : String(answer.value ?? "-")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AppModal>
    </section>
  );
}

function MenuAction({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-[color:var(--md-hover)] ${danger ? "text-red-400 hover:bg-red-500/10" : "text-[color:var(--md-text-primary)]"}`}>
      <Icon size={16} />
      {label}
    </button>
  );
}

function TemplateMockup({ type = "blank", blank = false }) {
  if (blank) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="relative h-[74px] w-[74px]">
          <span className="absolute left-[31px] top-0 h-full w-3 bg-[#1a73e8]" />
          <span className="absolute left-0 top-[31px] h-3 w-full bg-[#1a73e8]" />
        </div>
      </div>
    );
  }

  const palette = {
    feedback: { top: "#7b3f25", bg: "#f7f3f1", accent: "#d93025" },
    survey: { top: "#2e7d32", bg: "#e8f3e5", accent: "#34a853" },
    blank: { top: "#1a73e8", bg: "#e8f0fe", accent: "#1a73e8" }
  }[type] || { top: "#1a73e8", bg: "#f1f7ff", accent: "#1a73e8" };

  return (
    <div className="h-full overflow-hidden" style={{ background: palette.bg }}>
      <div className="mx-auto mt-0 h-10 w-[64%] rounded-b-sm object-cover" style={{ background: `linear-gradient(135deg, ${palette.top}, #d7ccc8)` }} />
      <div className="mx-auto mt-2 w-[62%] rounded-sm bg-white shadow-sm">
        <div className="h-1.5 rounded-t-sm" style={{ background: palette.top }} />
        <div className="space-y-2 p-2">
          <div className="h-2 w-2/3 rounded bg-[#3c4043]/25" />
          <div className="h-1.5 w-1/2 rounded" style={{ background: palette.accent }} />
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-sm bg-[#f8f9fa] p-2">
              <div className="h-1.5 w-2/3 rounded bg-[#3c4043]/20" />
              <div className="mt-2 h-px w-1/2 bg-[#dadce0]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GoogleTemplateCard({ title, type, blank = false, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="group text-left disabled:opacity-60">
      <div className="h-[162px] overflow-hidden rounded border border-[#c7c9cc] bg-white transition group-hover:border-[#1a73e8] group-hover:shadow-sm">
        <TemplateMockup type={type} blank={blank} />
      </div>
      <p className="mt-3 truncate pl-1 text-[1.05rem] font-semibold text-[#202124]">{title}</p>
    </button>
  );
}

function GoogleRecentCard({ form, onOpen, onMenu }) {
  return (
    <article className="overflow-hidden rounded border border-[#dadce0] bg-white transition hover:border-[#1a73e8] hover:shadow-[0_1px_3px_rgba(60,64,67,.3)]">
      <button type="button" onClick={() => onOpen(form)} className="block h-[194px] w-full overflow-hidden border-b border-[#dadce0] bg-[#f7f3f1] text-left">
        <TemplateMockup type={form.formType} />
      </button>
      <div className="px-6 py-5">
        <button type="button" onClick={() => onOpen(form)} className="block w-full truncate text-left text-[1.1rem] font-semibold text-[#202124] hover:text-[#1a73e8]">
          {form.title || "Untitled form"}
        </button>
        <div className="mt-3 flex items-center gap-2 text-[0.95rem] text-[#3c4043]">
          <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-[#1a73e8] text-white">
            <ClipboardList size={17} />
          </span>
          <Users size={20} className="text-[#5f6368]" />
          <span className="min-w-0 flex-1 truncate">{formatDate(form.updatedAt || form.createdAt)}</span>
          <button type="button" onClick={(event) => onMenu(form, event)} className="rounded-full p-1.5 text-[#5f6368] hover:bg-[#f1f3f4]" aria-label={`Open options for ${form.title}`}>
            <MoreVertical size={23} />
          </button>
        </div>
      </div>
    </article>
  );
}

function GoogleRecentRow({ form, onOpen, onMenu }) {
  return (
    <div className="flex items-center gap-4 border-b border-[#eef0f3] px-4 py-3 last:border-b-0 hover:bg-[#f8f9fa]">
      <button type="button" onClick={() => onOpen(form)} className="h-12 w-16 overflow-hidden rounded border border-[#dadce0] bg-[#f1f3f4]">
        <TemplateMockup type={form.formType} />
      </button>
      <button type="button" onClick={() => onOpen(form)} className="min-w-0 flex-1 truncate text-left font-medium text-[#202124]">
        {form.title || "Untitled form"}
      </button>
      <span className="hidden text-sm text-[#5f6368] md:block">{formatDate(form.updatedAt || form.createdAt)}</span>
      <button type="button" onClick={(event) => onMenu(form, event)} className="rounded-full p-2 text-[#5f6368] hover:bg-[#eef0f3]" aria-label={`Open options for ${form.title}`}>
        <MoreVertical size={22} />
      </button>
    </div>
  );
}

function GoogleRecentSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded border border-[#dadce0] bg-white">
      <div className="h-[194px] bg-[#f1f3f4]" />
      <div className="space-y-3 p-6">
        <div className="h-4 w-2/3 rounded bg-[#e8eaed]" />
        <div className="h-4 w-1/2 rounded bg-[#e8eaed]" />
      </div>
    </div>
  );
}

function PanelBreakIcon(props) {
  return <LayoutGrid {...props} />;
}

function ToolbarButton({ icon: Icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex h-[50px] w-[60px] items-center justify-center text-[#5f6368] hover:bg-[#f8f9fa]" title={label} aria-label={label}>
      <Icon size={26} />
    </button>
  );
}

function RichTextEditor({ value, onChange, accent, placeholder }) {
  const editorRef = useRef(null);
  const selectionRef = useRef(null);
  const [formats, setFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    orderedList: false,
    unorderedList: false,
    block: ""
  });

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== (value || "")) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editorRef.current) return;
    const range = selection.getRangeAt(0);
    const anchor = range.commonAncestorContainer;
    if (editorRef.current.contains(anchor.nodeType === Node.TEXT_NODE ? anchor.parentNode : anchor)) {
      selectionRef.current = range.cloneRange();
    }
  };
  const restoreSelection = () => {
    if (!selectionRef.current) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(selectionRef.current);
  };
  const updateFormats = () => {
    setFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      orderedList: document.queryCommandState("insertOrderedList"),
      unorderedList: document.queryCommandState("insertUnorderedList"),
      block: String(document.queryCommandValue("formatBlock") || "").toLowerCase()
    });
  };
  const normalizeHtml = () => {
    const html = editorRef.current?.innerHTML || "";
    return ["<br>", "<div><br></div>", "<p><br></p>"].includes(html.trim().toLowerCase()) ? "" : html;
  };
  const sync = () => {
    onChange(normalizeHtml());
    saveSelection();
    updateFormats();
  };
  const runCommand = (command, commandValue = null) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    saveSelection();
    sync();
  };
  const addLink = () => {
    saveSelection();
    const url = window.prompt("Enter link URL");
    if (!url) return;
    const normalizedUrl = /^(https?:|mailto:|tel:|#)/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    runCommand("createLink", normalizedUrl);
  };
  const clearFormatting = () => {
    runCommand("removeFormat");
    runCommand("unlink");
    runCommand("formatBlock", "<p>");
  };
  const toggleList = (command, tagName) => {
    const isEmpty = !normalizeHtml();
    if (isEmpty && editorRef.current) {
      editorRef.current.innerHTML = `<${tagName}><li><br></li></${tagName}>`;
      const listItem = editorRef.current.querySelector("li");
      const range = document.createRange();
      range.selectNodeContents(listItem);
      range.collapse(true);
      selectionRef.current = range;
      restoreSelection();
      sync();
      return;
    }
    runCommand(command);
  };

  return (
    <div className="mt-5">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        onMouseUp={sync}
        onKeyUp={sync}
        onFocus={updateFormats}
        className="forms-rich-editor min-h-[46px] w-full border-0 border-b-2 bg-transparent pb-2 text-lg outline-none empty:before:text-[#5f6368] empty:before:content-[attr(data-placeholder)]"
        style={{ borderColor: accent }}
        data-placeholder={placeholder}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[#5f6368]">
        <RichTextButton label="Bold" active={formats.bold} onPreserveSelection={saveSelection} onClick={() => runCommand("bold")}><Bold size={18} /></RichTextButton>
        <RichTextButton label="Italic" active={formats.italic} onPreserveSelection={saveSelection} onClick={() => runCommand("italic")}><Italic size={18} /></RichTextButton>
        <RichTextButton label="Underline" active={formats.underline} onPreserveSelection={saveSelection} onClick={() => runCommand("underline")}><Underline size={18} /></RichTextButton>
        <RichTextButton label="Add hyperlink" onPreserveSelection={saveSelection} onClick={addLink}><Link size={18} /></RichTextButton>
        <RichTextButton label="Numbered list" active={formats.orderedList} onPreserveSelection={saveSelection} onClick={() => toggleList("insertOrderedList", "ol")}><ListOrdered size={18} /></RichTextButton>
        <RichTextButton label="Bulleted list" active={formats.unorderedList} onPreserveSelection={saveSelection} onClick={() => toggleList("insertUnorderedList", "ul")}><List size={18} /></RichTextButton>
        <select
          aria-label="Text formatting"
          value=""
          onMouseDown={saveSelection}
          onChange={(event) => {
            if (!event.target.value) return;
            runCommand("formatBlock", event.target.value);
          }}
          className="h-9 rounded border border-[#dadce0] bg-white px-3 text-sm font-semibold text-[#5f6368] outline-none hover:bg-[#f8f9fa]"
        >
          <option value="">Text formatting</option>
          <option value="<p>">Normal text</option>
          <option value="<h2>">Heading</option>
          <option value="<h3>">Subheading</option>
          <option value="<blockquote>">Quote</option>
        </select>
        <RichTextButton label="Clear formatting" onPreserveSelection={saveSelection} onClick={clearFormatting}><Type size={18} /></RichTextButton>
      </div>
    </div>
  );
}

function RichTextButton({ label, onClick, children, active = false, onPreserveSelection }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        onPreserveSelection?.();
      }}
      onClick={onClick}
      className={`flex h-9 min-w-9 items-center justify-center rounded border px-2 font-semibold transition ${active ? "border-[#1a73e8] bg-[#e8f0fe] text-[#1a73e8]" : "border-transparent hover:border-[#dadce0] hover:bg-[#f8f9fa]"}`}
      aria-label={label}
      title={label}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function BuilderToolbar({ addQuestionWithType, addSection, onImport }) {
  return (
    <>
      <ToolbarButton icon={Plus} label="Add question" onClick={() => addQuestionWithType("multiple-choice")} />
      <ToolbarButton icon={Upload} label="Import questions" onClick={onImport} />
      <ToolbarButton icon={Type} label="Add text" onClick={() => addQuestionWithType("rich-text-block")} />
      <ToolbarButton icon={ImageIcon} label="Add image" onClick={() => addQuestionWithType("image-question")} />
      <ToolbarButton icon={Video} label="Add video" onClick={() => addQuestionWithType("video-question")} />
      <ToolbarButton icon={FileText} label="Add section" onClick={addSection} />
      <ToolbarButton icon={PanelBreakIcon} label="Add page break" onClick={() => addQuestionWithType("page-break")} />
    </>
  );
}

function FormSettingsPanel({ draft, updateDraft, updateSettings }) {
  const isAssessment = ["assignment", "quiz"].includes(draft.formType);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#dadce0] bg-white p-8 shadow-sm">
        <h2 className="text-2xl">Settings</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[#5f6368]">Form type</span>
            <select value={draft.formType} onChange={(event) => updateDraft({ formType: event.target.value })} className="portal-input">
              {formTypes.map((item) => <option key={item.type} value={item.type}>{item.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[#5f6368]">Status</span>
            <select value={draft.status} onChange={(event) => updateDraft({ status: event.target.value })} className="portal-input">
              {["draft", "published", "closed", "archived"].map((status) => <option key={status} value={status}>{statusMeta(status).label}</option>)}
            </select>
          </label>
          <ToggleRow label="Accept responses" checked={draft.settings.acceptResponses} onChange={(checked) => updateSettings({ acceptResponses: checked })} />
          <ToggleRow label="One response per user" checked={draft.settings.oneResponsePerUser} onChange={(checked) => updateSettings({ oneResponsePerUser: checked })} />
          <ToggleRow label="Email verification" checked={draft.settings.emailVerification} onChange={(checked) => updateSettings({ emailVerification: checked })} />
          <ToggleRow label="Show progress bar" checked={draft.settings.progressBar} onChange={(checked) => updateSettings({ progressBar: checked })} />
          <ToggleRow label="Notify by email" checked={draft.settings.notifyByEmail} onChange={(checked) => updateSettings({ notifyByEmail: checked })} />
          <ToggleRow label="Sync grades to student portal" checked={draft.settings.syncGrades} onChange={(checked) => updateSettings({ syncGrades: checked })} />
          <input type="number" min="0" value={draft.settings.responseLimit} onChange={(event) => updateSettings({ responseLimit: event.target.value })} className="portal-input" placeholder="Response limit" />
          <input value={draft.settings.password} onChange={(event) => updateSettings({ password: event.target.value })} className="portal-input" placeholder="Access password" />
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[#5f6368]">Schedule start</span>
            <input type="date" value={draft.settings.startDate || ""} onChange={(event) => updateSettings({ startDate: event.target.value })} className="portal-input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[#5f6368]">Schedule end</span>
            <input type="date" value={draft.settings.endDate || ""} onChange={(event) => updateSettings({ endDate: event.target.value })} className="portal-input" />
          </label>
        </div>
      </div>

      {isAssessment && (
        <div className="rounded-lg border border-[#dadce0] bg-white p-8 shadow-sm">
          <h3 className="text-xl font-semibold">Assignment and quiz controls</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-[#5f6368]">Total marks</span>
              <input type="number" min="0" value={draft.totalMarks || 0} readOnly className="portal-input bg-[#f8f9fa] text-[#5f6368]" />
            </label>
            <input type="number" min="0" value={draft.settings.configuredTotalMarks || ""} onChange={(event) => updateSettings({ configuredTotalMarks: event.target.value })} className="portal-input" placeholder="Configured total marks" />
            <input type="number" min="0" value={draft.settings.passingMarks || draft.passingMarks || ""} onChange={(event) => { updateDraft({ passingMarks: event.target.value }); updateSettings({ passingMarks: event.target.value }); }} className="portal-input" placeholder="Passing marks" />
            <select value={draft.settings.gradeScale || "Percentage Based"} onChange={(event) => updateSettings({ gradeScale: event.target.value })} className="portal-input">
              <option value="Percentage Based">Percentage Based</option>
              <option value="Letter Grade">Letter Grade</option>
              <option value="GPA Based">GPA Based</option>
              <option value="Pass/Fail">Pass/Fail</option>
            </select>
            <select value={draft.settings.gradingMode || "auto"} onChange={(event) => { updateSettings({ gradingMode: event.target.value }); updateDraft({ autoGrading: event.target.value !== "manual" }); }} className="portal-input">
              <option value="auto">Auto grading</option>
              <option value="manual">Manual grading</option>
              <option value="hybrid">Auto + manual review</option>
            </select>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-[#5f6368]">Due date</span>
              <input type="date" value={draft.settings.dueDate || ""} onChange={(event) => updateSettings({ dueDate: event.target.value })} className="portal-input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-[#5f6368]">Submission deadline</span>
              <input type="date" value={draft.settings.submissionDeadline || ""} onChange={(event) => updateSettings({ submissionDeadline: event.target.value })} className="portal-input" />
            </label>
            <input type="number" min="0" value={draft.settings.negativeMarking || ""} onChange={(event) => updateSettings({ negativeMarking: event.target.value })} className="portal-input" placeholder="Default negative marking" />
            <input type="number" min="0" value={draft.settings.lateSubmissionPenalty || ""} onChange={(event) => updateSettings({ lateSubmissionPenalty: event.target.value })} className="portal-input" placeholder="Late submission penalty" />
            <input type="number" min="0" value={draft.settings.missingFilePenalty || ""} onChange={(event) => updateSettings({ missingFilePenalty: event.target.value })} className="portal-input" placeholder="Missing file penalty" />
            <input type="number" min="0" value={draft.settings.plagiarismPenalty || ""} onChange={(event) => updateSettings({ plagiarismPenalty: event.target.value })} className="portal-input" placeholder="Plagiarism penalty" />
            <input type="number" min="0" value={draft.settings.timerMinutes || ""} onChange={(event) => updateSettings({ timerMinutes: event.target.value })} className="portal-input" placeholder="Timer minutes" />
            <input value={draft.settings.gradeSubject || ""} onChange={(event) => updateSettings({ gradeSubject: event.target.value })} className="portal-input" placeholder="Grade subject" />
            <input type="number" min="1" value={draft.settings.gradeSemester || 1} onChange={(event) => updateSettings({ gradeSemester: event.target.value })} className="portal-input" placeholder="Semester" />
            <ToggleRow label="Shuffle questions" checked={draft.settings.shuffleQuestions} onChange={(checked) => updateSettings({ shuffleQuestions: checked })} />
            <ToggleRow label="Shuffle answers" checked={draft.settings.shuffleAnswers} onChange={(checked) => updateSettings({ shuffleAnswers: checked })} />
            <ToggleRow label="Auto submit when timer ends" checked={draft.settings.autoSubmit} onChange={(checked) => updateSettings({ autoSubmit: checked })} />
          </div>
        </div>
      )}
    </div>
  );
}

function ResponsesDashboard({ responses, totalMarks, onOpen }) {
  const analytics = responseAnalytics(responses, totalMarks);
  const pieData = [
    { name: "Passed", value: analytics.passCount, color: "#34a853" },
    { name: "Needs review", value: analytics.failCount, color: "#ea4335" }
  ].filter((item) => item.value > 0);
  const emptyPie = pieData.length ? pieData : [{ name: "No scores", value: 1, color: "#dadce0" }];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#dadce0] bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl">Responses</h2>
            <p className="mt-1 text-[#5f6368]">Summary dashboard, analytics, individual responses, grading, feedback, and export.</p>
          </div>
          <button type="button" onClick={onOpen} className="rounded bg-[#1a73e8] px-5 py-2.5 font-semibold text-white">Open response viewer</button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AnalyticsTile label="Total responses" value={analytics.totalResponses} />
          <AnalyticsTile label="Average score" value={`${analytics.averageScore}${totalMarks ? ` / ${totalMarks}` : ""}`} />
          <AnalyticsTile label="Submission rate" value={`${analytics.submissionRate}%`} />
          <AnalyticsTile label="Completion rate" value={`${analytics.completionRate}%`} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartPanel title="Pass Split">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={emptyPie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78}>
                {emptyPie.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Score Buckets">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics.scoreBuckets}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#1a73e8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Submission Trend">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analytics.timeline.length ? analytics.timeline : [{ name: "No data", responses: 0, score: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="responses" stroke="#1a73e8" strokeWidth={3} />
              <Line type="monotone" dataKey="score" stroke="#34a853" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="rounded-lg border border-[#dadce0] bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold">Individual responses</h3>
        <div className="mt-4 space-y-3">
          {responses.length === 0 ? (
            <p className="rounded bg-[#f8f9fa] p-4 text-sm text-[#5f6368]">No responses yet.</p>
          ) : responses.slice(0, 5).map((response, index) => (
            <div key={response._id || index} className="flex flex-wrap items-center justify-between gap-3 rounded border border-[#dadce0] p-4">
              <div>
                <p className="font-semibold">{response.respondent || `Student response ${index + 1}`}</p>
                <p className="text-sm text-[#5f6368]">{response.respondentEmail || "No email"} | {formatDateTime(response.submittedAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="portal-badge portal-badge-success">{response.marks ?? "-"} marks</span>
                <button type="button" className="portal-btn">Grade</button>
                <button type="button" className="portal-btn">Feedback</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticsTile({ label, value }) {
  return (
    <div className="rounded-lg border border-[#dadce0] bg-[#f8f9fa] p-4">
      <p className="text-sm text-[#5f6368]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#202124]">{value}</p>
    </div>
  );
}

function ChartPanel({ title, children }) {
  return (
    <div className="rounded-lg border border-[#dadce0] bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-semibold text-[#202124]">{title}</h3>
      {children}
    </div>
  );
}

function GoogleQuestionCard({ question, sectionIndex, questionIndex, isNew = false, theme, updateQuestion, duplicateQuestion, removeQuestion, moveQuestion, reorderQuestion, dragQuestion, setDragQuestion, onActivate, totalQuestions }) {
  const isLayout = layoutQuestionTypes.includes(question.type);
  const isDragging = dragQuestion?.sectionIndex === sectionIndex && dragQuestion?.questionIndex === questionIndex;
  const isFirstQuestion = sectionIndex === 0 && questionIndex === 0;
  const [answerKeyOpen, setAnswerKeyOpen] = useState(false);

  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        setDragQuestion({ sectionIndex, questionIndex });
      }}
      onDragOver={(event) => {
        if (dragQuestion?.sectionIndex === sectionIndex) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (dragQuestion?.sectionIndex === sectionIndex) reorderQuestion(sectionIndex, dragQuestion.questionIndex, questionIndex);
        setDragQuestion(null);
      }}
      onDragEnd={() => setDragQuestion(null)}
      onMouseDown={onActivate}
      onFocusCapture={onActivate}
      className={`relative rounded-lg border border-[#dadce0] bg-white shadow-sm transition hover:shadow-md ${isDragging ? "opacity-60 ring-2 ring-[#1a73e8]" : ""} ${isNew ? "forms-question-card-enter" : ""}`}
    >
      <div className="absolute left-0 top-0 h-full w-2 rounded-l-lg" style={{ background: theme.secondary }} />
      <div className="flex justify-center pt-2 text-[#b8b8b8]"><GripVertical size={22} /></div>
      <div className="px-8 pb-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-[#5f6368]">
          <span>Question {questionIndex + 1}</span>
          <span className="rounded-full bg-[#f1f3f4] px-3 py-1 normal-case tracking-normal">{questionTypeLabel(question.type)}</span>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <input
              value={question.title}
              onChange={(event) => updateQuestion(sectionIndex, questionIndex, { title: event.target.value })}
              className="w-full border-0 border-b border-[#9aa0a6] bg-[#f8f9fa] px-5 py-5 text-lg outline-none focus:border-[#1a73e8]"
              placeholder={isLayout ? "Block title" : "Untitled Question"}
            />
            <input
              value={question.description}
              onChange={(event) => updateQuestion(sectionIndex, questionIndex, { description: event.target.value })}
              className="mt-2 w-full border-0 border-b border-transparent bg-transparent py-2 text-sm text-[#5f6368] outline-none focus:border-[#dadce0]"
              placeholder="Add description"
            />
          </div>
          <div className="flex items-start gap-3">
            <button type="button" onClick={() => updateQuestion(sectionIndex, questionIndex, { imageUrl: question.imageUrl ? "" : "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=70" })} className={`mt-2 rounded-full p-2 text-[#5f6368] hover:bg-[#f1f3f4] ${question.imageUrl ? "bg-[#e8f0fe] text-[#1a73e8]" : ""}`} aria-label="Add image">
              <ImageIcon size={24} />
            </button>
            <select value={question.type} onChange={(event) => updateQuestion(sectionIndex, questionIndex, { type: event.target.value })} className="h-[62px] flex-1 rounded border border-[#dadce0] bg-white px-4 text-lg outline-none focus:border-[#1a73e8]">
              {questionTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
        </div>

        <QuestionEditorBody question={question} sectionIndex={sectionIndex} questionIndex={questionIndex} updateQuestion={updateQuestion} theme={theme} />

        <div className="mt-6 border-t border-[#dadce0] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <button type="button" onClick={() => setAnswerKeyOpen((current) => !current)} className={`flex items-center gap-2 rounded px-2 py-1 text-[#1a73e8] hover:bg-[#e8f0fe] ${answerKeyOpen ? "bg-[#e8f0fe]" : ""}`} aria-expanded={answerKeyOpen}>
              <CheckCircle2 size={24} />
              Answer key <span className="text-[#5f6368]">({question.marks || 0} points)</span>
            </button>
            <div className="flex flex-wrap items-center justify-end gap-2 text-[#5f6368]">
              <button type="button" onClick={() => duplicateQuestion(sectionIndex, questionIndex)} className="rounded-full p-2 hover:bg-[#f1f3f4]" aria-label="Duplicate"><Copy size={23} /></button>
              <button type="button" onClick={() => removeQuestion(sectionIndex, questionIndex)} disabled={isFirstQuestion} className="rounded-full p-2 hover:bg-[#f1f3f4] disabled:opacity-30" aria-label={isFirstQuestion ? "Question 1 cannot be deleted" : "Delete"} title={isFirstQuestion ? "Question 1 cannot be deleted" : "Delete"}><Trash2 size={23} /></button>
              <button type="button" onClick={() => moveQuestion(sectionIndex, questionIndex, -1)} disabled={questionIndex === 0} aria-label="Move up" className="rounded-full px-3 py-2 font-semibold hover:bg-[#f1f3f4] disabled:opacity-30">Up</button>
              <button type="button" onClick={() => moveQuestion(sectionIndex, questionIndex, 1)} disabled={questionIndex === totalQuestions - 1} aria-label="Move down" className="rounded-full px-3 py-2 font-semibold hover:bg-[#f1f3f4] disabled:opacity-30">Down</button>
              <span className="h-8 w-px bg-[#dadce0]" />
              <label className="flex items-center gap-3 text-[#202124]">
                Required
                <span className={`relative h-5 w-10 rounded-full transition ${question.required ? "bg-[#1a73e8]" : "bg-[#bdc1c6]"}`}>
                  <input type="checkbox" checked={question.required} onChange={(event) => updateQuestion(sectionIndex, questionIndex, { required: event.target.checked })} className="absolute inset-0 opacity-0" />
                  <span className={`absolute top-[-3px] h-7 w-7 rounded-full bg-white shadow transition ${question.required ? "left-5" : "left-0"}`} />
                </span>
              </label>
            </div>
          </div>
          {answerKeyOpen && (
            <AnswerKeyBuilder
              question={question}
              sectionIndex={sectionIndex}
              questionIndex={questionIndex}
              updateQuestion={updateQuestion}
            />
          )}
          <QuestionOptionsPanel question={question} sectionIndex={sectionIndex} questionIndex={questionIndex} updateQuestion={updateQuestion} />
        </div>
      </div>
    </div>
  );
}

function QuestionOptionsPanel({ question, sectionIndex, questionIndex, updateQuestion }) {
  const validation = question.validation || {};
  const isTextQuestion = ["short-answer", "paragraph", "email", "phone", "url", "number"].includes(question.type);
  const isNumericQuestion = ["number", "linear-scale", "rating"].includes(question.type);
  const isFileQuestion = question.type === "file-upload";
  const isMediaQuestion = ["image-question", "video-question"].includes(question.type);
  const setValidation = (patch) => updateQuestion(sectionIndex, questionIndex, { validation: { ...validation, ...patch } });
  const setNumberValidation = (key, value) => setValidation({ [key]: value === "" ? undefined : Number(value) });
  const clearValidation = () => updateQuestion(sectionIndex, questionIndex, { validation: {} });

  return (
    <details className="group mt-4 overflow-hidden rounded-lg border border-[#dadce0] bg-[#fafafa] text-sm text-[#5f6368]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold text-[#202124] transition hover:bg-[#f1f3f4]">
        <span className="flex min-w-0 items-center gap-2">
          <MoreVertical size={20} />
          <span>More question options</span>
        </span>
        <span className="hidden text-xs font-medium text-[#5f6368] sm:inline">Description, media, validation, logic</span>
      </summary>

      <div className="grid gap-4 border-t border-[#dadce0] p-4">
        <OptionGroup title="Description" description="Add helper text shown under this question.">
          <textarea
            value={question.description || ""}
            onChange={(event) => updateQuestion(sectionIndex, questionIndex, { description: event.target.value })}
            className="portal-input min-h-[84px]"
            placeholder="Write instructions, hints, or extra context for this question."
          />
        </OptionGroup>

        <OptionGroup title="Media" description="Attach image or video URLs to the question.">
          <div className="grid gap-3 md:grid-cols-2">
            <LabeledInput
              label="Image URL"
              value={question.imageUrl || ""}
              onChange={(value) => updateQuestion(sectionIndex, questionIndex, { imageUrl: value })}
              onClear={() => updateQuestion(sectionIndex, questionIndex, { imageUrl: "" })}
              placeholder="https://example.com/image.jpg"
            />
            <LabeledInput
              label="Video URL"
              value={question.videoUrl || ""}
              onChange={(value) => updateQuestion(sectionIndex, questionIndex, { videoUrl: value })}
              onClear={() => updateQuestion(sectionIndex, questionIndex, { videoUrl: "" })}
              placeholder="https://example.com/video"
            />
          </div>
          {(question.imageUrl || question.videoUrl) && (
            <div className="grid gap-3 md:grid-cols-2">
              {question.imageUrl && (
                <div className="overflow-hidden rounded-lg border border-[#dadce0] bg-white">
                  <img src={question.imageUrl} alt="" className="max-h-56 w-full object-cover" />
                </div>
              )}
              {question.videoUrl && (
                <div className="flex min-h-24 items-center justify-between gap-3 rounded-lg border border-[#dadce0] bg-white p-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#202124]">Video attached</p>
                    <p className="truncate text-xs">{question.videoUrl}</p>
                  </div>
                  <Video size={22} className="shrink-0 text-[#1a73e8]" />
                </div>
              )}
            </div>
          )}
        </OptionGroup>

        {(isTextQuestion || isNumericQuestion || isFileQuestion) && (
          <OptionGroup title="Validation rules" description="Control accepted answers and show a clear error message.">
            <div className="grid gap-3 md:grid-cols-2">
              {isTextQuestion && (
                <>
                  <LabeledInput label="Pattern" value={validation.pattern || ""} onChange={(value) => setValidation({ pattern: value })} placeholder="Example: ^[A-Z0-9]+$" />
                  <LabeledInput label="Error message" value={validation.message || ""} onChange={(value) => setValidation({ message: value })} placeholder="Message students see" />
                  <LabeledInput label="Min length" type="number" value={validation.minLength ?? ""} onChange={(value) => setNumberValidation("minLength", value)} placeholder="0" />
                  <LabeledInput label="Max length" type="number" value={validation.maxLength ?? ""} onChange={(value) => setNumberValidation("maxLength", value)} placeholder="255" />
                </>
              )}
              {isNumericQuestion && (
                <>
                  <LabeledInput label="Minimum value" type="number" value={validation.minValue ?? ""} onChange={(value) => setNumberValidation("minValue", value)} placeholder="Minimum" />
                  <LabeledInput label="Maximum value" type="number" value={validation.maxValue ?? ""} onChange={(value) => setNumberValidation("maxValue", value)} placeholder="Maximum" />
                </>
              )}
              {isFileQuestion && (
                <LabeledInput label="Accepted file types" value={question.accept || ""} onChange={(value) => updateQuestion(sectionIndex, questionIndex, { accept: value })} placeholder=".pdf,.docx,image/*" />
              )}
            </div>
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={clearValidation} className="rounded px-3 py-2 font-semibold text-[#5f6368] hover:bg-[#f1f3f4]">Clear validation</button>
            </div>
          </OptionGroup>
        )}

        <OptionGroup title="Logic and branching" description="Use simple rules to guide the next step after this question.">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1 block font-semibold text-[#5f6368]">Conditional logic rule</span>
              <textarea
                value={question.conditionalLogic || ""}
                onChange={(event) => updateQuestion(sectionIndex, questionIndex, { conditionalLogic: event.target.value })}
                className="portal-input min-h-[78px]"
                placeholder="Example: If answer is Yes, continue to next section."
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold text-[#5f6368]">Branching action</span>
              <select className="portal-input" value={validation.branch || ""} onChange={(event) => setValidation({ branch: event.target.value })}>
                <option value="">No branching</option>
                <option value="branch:next">Continue to next section</option>
                <option value="branch:end">Submit form</option>
              </select>
            </label>
            <button type="button" onClick={() => { updateQuestion(sectionIndex, questionIndex, { conditionalLogic: "" }); setValidation({ branch: "" }); }} className="self-end rounded border border-[#dadce0] px-3 py-2 font-semibold text-[#5f6368] transition hover:bg-[#f1f3f4]">
              Clear logic
            </button>
          </div>
        </OptionGroup>

        {isMediaQuestion && (
          <p className="rounded-lg bg-[#e8f0fe] px-3 py-2 text-xs font-medium text-[#1a73e8]">
            This question type uses the media URL as the main question content.
          </p>
        )}
      </div>
    </details>
  );
}

function OptionGroup({ title, description, children }) {
  return (
    <section className="rounded-lg border border-[#dadce0] bg-white p-4">
      <div className="mb-3">
        <h4 className="font-semibold text-[#202124]">{title}</h4>
        <p className="mt-0.5 text-xs text-[#5f6368]">{description}</p>
      </div>
      {children}
    </section>
  );
}

function LabeledInput({ label, value, onChange, onClear, placeholder, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-1 block font-semibold text-[#5f6368]">{label}</span>
      <span className="flex items-center gap-2">
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="portal-input min-w-0 flex-1" placeholder={placeholder} />
        {onClear && value && (
          <button type="button" onClick={onClear} className="rounded-full p-2 text-[#5f6368] hover:bg-[#f1f3f4]" aria-label={`Clear ${label}`}>
            <X size={18} />
          </button>
        )}
      </span>
    </label>
  );
}

function AnswerKeyBuilder({ question, sectionIndex, questionIndex, updateQuestion }) {
  const options = question.options?.length ? question.options : ["Option 1"];
  const isChoice = ["multiple-choice", "dropdown"].includes(question.type);
  const isCheckbox = question.type === "checkboxes";
  const isGrid = question.type.includes("grid");
  const checkboxAnswers = Array.isArray(question.answerKey) ? question.answerKey : String(question.answerKey || "").split(",").map((item) => item.trim()).filter(Boolean);
  const answerKeyText = Array.isArray(question.answerKey) ? question.answerKey.join(", ") : String(question.answerKey || "");

  const setPatch = (patch) => updateQuestion(sectionIndex, questionIndex, patch);
  const toggleCheckboxAnswer = (option) => {
    const next = checkboxAnswers.includes(option)
      ? checkboxAnswers.filter((item) => item !== option)
      : [...checkboxAnswers, option];
    setPatch({ answerKey: next });
  };

  return (
    <div className="mt-4 rounded-lg border border-[#d7c8ff] bg-[#fbf9ff] p-4 text-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-[#202124]">Answer key builder</p>
          <p className="text-[#5f6368]">Set the correct answer, question points, and answer description.</p>
        </div>
        <span className="rounded-full bg-[#e8f0fe] px-3 py-1 font-semibold text-[#1a73e8]">{questionTypeLabel(question.type)}</span>
      </div>

      <div className="grid gap-4">
        {isChoice && (
          <label className="block">
            <span className="mb-1 block font-semibold text-[#5f6368]">Correct answer</span>
            <select value={answerKeyText} onChange={(event) => setPatch({ answerKey: event.target.value })} className="portal-input">
              <option value="">Choose correct answer</option>
              {options.map((option, index) => <option key={`${option}-${index}`} value={option}>{option || `Option ${index + 1}`}</option>)}
            </select>
          </label>
        )}

        {isCheckbox && (
          <div>
            <p className="mb-2 font-semibold text-[#5f6368]">Correct answers</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {options.map((option, index) => (
                <label key={`${option}-${index}`} className="flex items-center gap-2 rounded border border-[#dadce0] bg-white px-3 py-2">
                  <input type="checkbox" checked={checkboxAnswers.includes(option)} onChange={() => toggleCheckboxAnswer(option)} />
                  <span>{option || `Option ${index + 1}`}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {isGrid && (
          <label className="block">
            <span className="mb-1 block font-semibold text-[#5f6368]">Grid answer key</span>
            <textarea value={answerKeyText} onChange={(event) => setPatch({ answerKey: event.target.value })} className="portal-input min-h-[86px]" placeholder="Example: Row 1 = Column 2, Row 2 = Column 1" />
          </label>
        )}

        {!isChoice && !isCheckbox && !isGrid && (
          <label className="block">
            <span className="mb-1 block font-semibold text-[#5f6368]">Correct answer</span>
            <input value={answerKeyText} onChange={(event) => setPatch({ answerKey: event.target.value })} className="portal-input" placeholder="Type correct answer" />
          </label>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block font-semibold text-[#5f6368]">Points</span>
            <input type="number" min="0" value={question.marks || ""} onChange={(event) => setPatch({ marks: Number(event.target.value || 0) })} className="portal-input" placeholder="Points for this question" />
          </label>
          <label className="block">
            <span className="mb-1 block font-semibold text-[#5f6368]">Negative points</span>
            <input type="number" min="0" value={question.negativeMarks || ""} onChange={(event) => setPatch({ negativeMarks: Number(event.target.value || 0) })} className="portal-input" placeholder="Optional negative points" />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block font-semibold text-[#5f6368]">Answer description</span>
          <textarea value={question.answerDescription || ""} onChange={(event) => setPatch({ answerDescription: event.target.value })} className="portal-input min-h-[86px]" placeholder="Explain why this answer is correct or add grading notes." />
        </label>
      </div>
    </div>
  );
}

function QuestionEditorBody({ question, sectionIndex, questionIndex, updateQuestion, theme }) {
  const safeOptions = question.options?.length ? question.options : ["Option 1"];

  if (question.type === "section-break" || question.type === "page-break" || question.type === "rich-text-block") {
    return <textarea value={question.description} onChange={(event) => updateQuestion(sectionIndex, questionIndex, { description: event.target.value })} className="mt-5 w-full rounded border border-[#dadce0] p-4 outline-none focus:border-[#1a73e8]" rows={4} placeholder="Text, instructions, or section content" />;
  }

  if (question.type === "image-question") {
    return <MediaEditor label="Image URL" value={question.imageUrl} onChange={(value) => updateQuestion(sectionIndex, questionIndex, { imageUrl: value })} placeholder="Paste image URL or use Add image" />;
  }

  if (question.type === "video-question") {
    return <MediaEditor label="Video URL" value={question.videoUrl} onChange={(value) => updateQuestion(sectionIndex, questionIndex, { videoUrl: value })} placeholder="Paste video URL" />;
  }

  if (optionQuestionTypes.includes(question.type)) {
    const isGrid = question.type.includes("grid");
    const isCheckbox = question.type === "checkboxes" || question.type === "checkbox-grid";
    const isDropdown = question.type === "dropdown";
    const addOption = (label = `Option ${safeOptions.length + 1}`) => {
      updateQuestion(sectionIndex, questionIndex, { options: [...safeOptions, label] });
    };
    const removeOption = (optionIndex) => {
      if (safeOptions.length <= 1) return;
      const removedOption = safeOptions[optionIndex];
      const nextOptions = safeOptions.filter((_, index) => index !== optionIndex);
      const answerKeyPatch = Array.isArray(question.answerKey)
        ? { answerKey: question.answerKey.filter((answer) => answer !== removedOption) }
        : question.answerKey === removedOption
          ? { answerKey: "" }
          : {};
      updateQuestion(sectionIndex, questionIndex, { options: nextOptions, ...answerKeyPatch });
    };

    return (
      <div className="mt-5 space-y-4">
        {!isGrid && safeOptions.map((option, optionIndex) => (
          <div key={optionIndex} className="flex items-center gap-4 text-lg">
            <span className={`${isCheckbox ? "rounded-sm" : "rounded-full"} flex h-6 w-6 shrink-0 items-center justify-center border-2 border-[#bdc1c6] text-xs text-[#5f6368]`}>
              {isDropdown ? optionIndex + 1 : ""}
            </span>
            <input value={option} onChange={(event) => {
              const next = [...safeOptions];
              const previousOption = next[optionIndex];
              next[optionIndex] = event.target.value;
              const answerKeyPatch = Array.isArray(question.answerKey)
                ? { answerKey: question.answerKey.map((answer) => (answer === previousOption ? event.target.value : answer)) }
                : question.answerKey === previousOption
                  ? { answerKey: event.target.value }
                  : {};
              updateQuestion(sectionIndex, questionIndex, { options: next, ...answerKeyPatch });
            }} className="flex-1 border-0 border-b border-transparent bg-transparent py-1 outline-none focus:border-[#dadce0]" />
            <button type="button" onClick={() => removeOption(optionIndex)} disabled={safeOptions.length <= 1} className="rounded-full p-1 text-[#5f6368] hover:bg-[#f1f3f4] disabled:opacity-30" aria-label="Remove option"><X size={18} /></button>
          </div>
        ))}
        {!isGrid && (
          <div className="ml-10 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => addOption()} className="text-lg text-[#1a73e8]">Add option</button>
            <span className="text-[#5f6368]">or</span>
            <button type="button" onClick={() => !safeOptions.includes("Other") && addOption("Other")} disabled={safeOptions.includes("Other")} className="text-lg text-[#1a73e8] disabled:text-[#9aa0a6]">Add "Other"</button>
          </div>
        )}
        {isGrid && (
          <div className="rounded-lg border border-[#dadce0] bg-[#fafafa] p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input value={(question.rows || []).join(", ")} onChange={(event) => updateQuestion(sectionIndex, questionIndex, { rows: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} className="portal-input" placeholder="Rows, comma separated" />
              <input value={(question.columns || []).join(", ")} onChange={(event) => updateQuestion(sectionIndex, questionIndex, { columns: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} className="portal-input" placeholder="Columns, comma separated" />
            </div>
            <div className="mt-4 overflow-x-auto rounded border border-[#dadce0] bg-white">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-3 text-[#5f6368]">Rows</th>
                    {(question.columns?.length ? question.columns : ["Column 1"]).map((column, index) => <th key={index} className="p-3 text-center font-medium text-[#5f6368]">{column || `Column ${index + 1}`}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(question.rows?.length ? question.rows : ["Row 1"]).map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t border-[#eef0f3]">
                      <td className="p-3">{row || `Row ${rowIndex + 1}`}</td>
                      {(question.columns?.length ? question.columns : ["Column 1"]).map((_, columnIndex) => (
                        <td key={columnIndex} className="p-3 text-center">
                          <span className={`${isCheckbox ? "rounded-sm" : "rounded-full"} inline-block h-5 w-5 border-2 border-[#bdc1c6]`} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (["linear-scale", "rating", "number"].includes(question.type)) {
    return (
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <input type="number" value={question.min ?? ""} onChange={(event) => updateQuestion(sectionIndex, questionIndex, { min: event.target.value === "" ? undefined : Number(event.target.value) })} className="portal-input" placeholder="Minimum" />
        <input type="number" value={question.max ?? ""} onChange={(event) => updateQuestion(sectionIndex, questionIndex, { max: event.target.value === "" ? undefined : Number(event.target.value) })} className="portal-input" placeholder="Maximum / points" />
        <input type="number" value={question.step ?? ""} onChange={(event) => updateQuestion(sectionIndex, questionIndex, { step: event.target.value === "" ? undefined : Number(event.target.value) })} className="portal-input" placeholder="Step" />
      </div>
    );
  }

  if (question.type === "file-upload") {
    return <input value={question.accept} onChange={(event) => updateQuestion(sectionIndex, questionIndex, { accept: event.target.value })} className="portal-input mt-5" placeholder="Accepted files: .pdf,.docx,image/*" />;
  }

  return <div className="mt-5 border-b border-dotted border-[#9aa0a6] py-3 text-[#5f6368]">{question.type === "paragraph" ? "Long answer text" : "Short answer text"}</div>;
}

function MediaEditor({ label, value, onChange, placeholder }) {
  return (
    <label className="mt-5 block">
      <span className="text-sm font-semibold text-[#5f6368]">{label}</span>
      <input value={value || ""} onChange={(event) => onChange(event.target.value)} className="portal-input mt-2" placeholder={placeholder} />
      {value && !value.startsWith("branch:") && <div className="mt-3 overflow-hidden rounded border border-[#dadce0] bg-[#f8f9fa] p-3 text-sm text-[#5f6368]">{value}</div>}
    </label>
  );
}

function ThemeCustomizer({ theme, notifyByEmail, updateTheme, updateSettings, onClose }) {
  const colors = ["#1a73e8", "#0d6efd", "#4285f4", "#03a9f4", "#00acc1", "#3f51b5", "#009688", "#4caf50", "#db4437", "#ff5722", "#ff9800", "#607d8b"];
  const fonts = ["Roboto", "Inter", "Poppins", "Open Sans", "Montserrat"];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/10" onClick={onClose} aria-hidden="true" />
      <aside className="forms-theme-drawer fixed inset-y-0 right-0 z-50 flex w-[min(100vw,410px)] flex-col border-l border-[#dadce0] bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Theme customizer">
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#dadce0] bg-white px-6">
          <h3 className="flex items-center gap-4 text-xl font-semibold"><Palette size={27} /> Theme</h3>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-[#f1f3f4]" aria-label="Close theme panel"><X size={25} /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto p-6">
        <div>
          <h4 className="mb-3 font-semibold">Question</h4>
          <div className="grid grid-cols-[1fr_76px] gap-3">
            <select value={theme.font} onChange={(event) => updateTheme({ font: event.target.value })} className="portal-input">{fonts.map((font) => <option key={font}>{font}</option>)}</select>
            <select value={theme.fontSize} onChange={(event) => updateTheme({ fontSize: event.target.value })} className="portal-input">{["10", "11", "12", "14", "16"].map((size) => <option key={size}>{size}</option>)}</select>
          </div>
        </div>
        <div>
          <h4 className="mb-3 font-semibold">Text</h4>
          <div className="grid grid-cols-[1fr_76px] gap-3">
            <select value={theme.textFont} onChange={(event) => updateTheme({ textFont: event.target.value })} className="portal-input">{fonts.map((font) => <option key={font}>{font}</option>)}</select>
            <select value={theme.textSize} onChange={(event) => updateTheme({ textSize: event.target.value })} className="portal-input">{["10", "11", "12", "14", "16"].map((size) => <option key={size}>{size}</option>)}</select>
          </div>
        </div>
        <div className="border-t border-[#dadce0] pt-6">
          <h4 className="mb-4 font-semibold">Header</h4>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-[#dadce0] px-4 py-2 font-semibold text-[#1a73e8] hover:bg-[#f8f9fa]">
              <ImageIcon size={18} />
              Choose image
              <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) updateTheme({ headerImage: URL.createObjectURL(file) });
                event.target.value = "";
              }} />
            </label>
            {theme.headerImage && <button type="button" onClick={() => updateTheme({ headerImage: "" })} className="rounded border border-[#dadce0] px-4 py-2 text-[#5f6368] hover:bg-[#f8f9fa]">Remove</button>}
          </div>
          {theme.headerImage && <img src={theme.headerImage} alt="" className="mt-3 h-24 w-full rounded border border-[#dadce0] object-cover" />}
        </div>
        <div className="border-t border-[#dadce0] pt-6">
          <h4 className="mb-4 font-semibold">Colour</h4>
          <div className="grid grid-cols-6 gap-3">
            {colors.map((color) => (
              <button key={color} type="button" onClick={() => updateTheme({ primary: color, accent: color })} className="h-8 w-8 rounded-full ring-offset-2" style={{ background: color, outline: theme.primary === color ? "3px solid #1a73e8" : "none" }} aria-label={color} />
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-[#dadce0] p-3">
            <div className="h-3 rounded-t" style={{ background: theme.primary }} />
            <div className="mt-3 h-3 w-3/4 rounded" style={{ background: theme.secondary }} />
            <div className="mt-2 h-3 w-1/2 rounded" style={{ background: theme.accent }} />
          </div>
          <div className="mt-4 grid gap-3">
            <input value={theme.primary} onChange={(event) => updateTheme({ primary: event.target.value })} className="portal-input" placeholder="Primary color" />
            <input value={theme.secondary} onChange={(event) => updateTheme({ secondary: event.target.value })} className="portal-input" placeholder="Secondary color" />
            <input value={theme.accent} onChange={(event) => updateTheme({ accent: event.target.value })} className="portal-input" placeholder="Accent color" />
          </div>
        </div>
        <div className="border-t border-[#dadce0] pt-6">
          <h4 className="mb-4 font-semibold">Layout</h4>
          <div className="grid grid-cols-3 gap-2">
            {["compact", "comfortable", "modern"].map((layout) => (
              <button key={layout} type="button" onClick={() => updateTheme({ layout })} className={`rounded border px-3 py-2 capitalize ${theme.layout === layout ? "border-[#1a73e8] bg-[#e8f0fe]" : "border-[#dadce0]"}`}>{layout}</button>
            ))}
          </div>
        </div>
        <div className="border-t border-[#dadce0] pt-6">
          <h4 className="mb-4 font-semibold">Background</h4>
          <div className="mb-3 flex gap-2">
            <button type="button" onClick={() => updateTheme({ backgroundMode: "solid" })} className={`rounded border px-3 py-2 ${theme.backgroundMode === "solid" ? "border-[#1a73e8]" : "border-[#dadce0]"}`}>Solid</button>
            <button type="button" onClick={() => updateTheme({ backgroundMode: "gradient" })} className={`rounded border px-3 py-2 ${theme.backgroundMode === "gradient" ? "border-[#1a73e8]" : "border-[#dadce0]"}`}>Gradient</button>
            <button type="button" onClick={() => updateTheme({ backgroundMode: "image" })} className={`rounded border px-3 py-2 ${theme.backgroundMode === "image" ? "border-[#1a73e8]" : "border-[#dadce0]"}`}>Image</button>
          </div>
          <input value={theme.background} onChange={(event) => updateTheme({ background: event.target.value })} className="portal-input" placeholder="Background color" />
          <input value={theme.gradient} onChange={(event) => updateTheme({ gradient: event.target.value })} className="portal-input mt-3" placeholder="CSS gradient" />
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-[#dadce0] px-4 py-2 font-semibold text-[#1a73e8] hover:bg-[#f8f9fa]">
              <Upload size={18} />
              Upload background
              <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) updateTheme({ backgroundImage: URL.createObjectURL(file), backgroundMode: "image" });
                event.target.value = "";
              }} />
            </label>
            {theme.backgroundImage && <button type="button" onClick={() => updateTheme({ backgroundImage: "", backgroundMode: "solid" })} className="rounded border border-[#dadce0] px-4 py-2 text-[#5f6368] hover:bg-[#f8f9fa]">Remove</button>}
          </div>
          {theme.backgroundImage && <img src={theme.backgroundImage} alt="" className="mt-3 h-24 w-full rounded border border-[#dadce0] object-cover" />}
        </div>
        <div className="border-t border-[#dadce0] pt-6">
          <ToggleRow label="University branding" checked={theme.universityBranding} onChange={(checked) => updateTheme({ universityBranding: checked })} />
          <ToggleRow label="Email notifications" checked={Boolean(notifyByEmail)} onChange={(checked) => updateSettings({ notifyByEmail: checked })} />
        </div>
        </div>
      </aside>
    </>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] uppercase tracking-wide text-[color:var(--md-text-secondary)]">{label}</p>
      <p className="truncate text-sm font-semibold text-[color:var(--md-text-primary)]">{value}</p>
    </div>
  );
}

function FilterChip({ label, onClear }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-[color:var(--md-hover)] px-2.5 py-1 font-semibold text-[color:var(--md-text-primary)]">
      <span className="truncate">{label}</span>
      <button type="button" onClick={onClear} className="rounded-full p-0.5 text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-card)] hover:text-[color:var(--md-text-primary)]" aria-label={`Clear ${label}`}>
        <X size={12} />
      </button>
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="portal-stat-card">
      <div>
        <p className="portal-stat-label">{label}</p>
        <p className="portal-stat-value" style={{ color }}>{value}</p>
      </div>
      <div className="portal-stat-icon" style={{ background: `${color}18`, color }}>
        <Icon size={22} />
      </div>
    </div>
  );
}

function ControlSelect({ icon: Icon, value, onChange, options }) {
  return (
    <label className="flex min-h-[2.5rem] min-w-0 items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2 text-sm text-[color:var(--md-text-secondary)]">
      <Icon size={15} />
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-[color:var(--md-text-primary)] outline-none">
        {options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
      </select>
    </label>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--md-border)] px-3 py-2 text-sm text-[color:var(--md-text-secondary)]">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function sanitizeRichText(html) {
  if (!html || typeof document === "undefined") return html || "";
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll("script, style, iframe, object, embed").forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith("on") || (["href", "src"].includes(name) && value.startsWith("javascript:"))) {
        node.removeAttribute(attribute.name);
      }
    });
  });
  return template.innerHTML;
}

function RichTextDisplay({ html, fallback = "No description provided.", className = "" }) {
  if (!html) return <p className={className}>{fallback}</p>;
  return <div className={`forms-rich-output ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }} />;
}

function PreviewContent({ form }) {
  return (
    <div className="space-y-4 p-5 pt-0">
      <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-bg)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`portal-badge ${statusMeta(form.status).badge}`}>{statusMeta(form.status).label}</span>
          <span className="portal-badge portal-badge-info">{formTypeMeta(form.formType).label}</span>
          {form.academicStage && <span className="portal-badge portal-badge-neutral">{form.academicStage}</span>}
        </div>
        <RichTextDisplay html={form.description} className="mt-3 text-sm text-[color:var(--md-text-secondary)]" />
      </div>
      {(form.sections || []).map((section, sectionIndex) => (
        <div key={section.id || sectionIndex} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-bg)] p-4">
          <h3 className="font-semibold text-[color:var(--md-text-primary)]">{section.title || `Section ${sectionIndex + 1}`}</h3>
          {section.description && <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">{section.description}</p>}
          <div className="mt-4 space-y-3">
            {(section.questions || []).map((question, questionIndex) => (
              <div key={question.id || questionIndex} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-[color:var(--md-text-primary)]">{questionIndex + 1}. {question.title}{question.required && <span className="text-red-400"> *</span>}</p>
                    {question.description && <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">{question.description}</p>}
                  </div>
                  <span className="portal-badge portal-badge-neutral">{questionTypes.find((item) => item.value === question.type)?.label || question.type}</span>
                </div>
                <QuestionPreview question={question} />
              </div>
            ))}
            {!section.questions?.length && <p className="text-sm text-[color:var(--md-text-secondary)]">No questions in this section.</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionPreview({ question }) {
  if (optionQuestionTypes.includes(question.type)) {
    return (
      <div className="mt-3 space-y-2">
        {(question.options || []).map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm text-[color:var(--md-text-secondary)]">
            <input type={question.type === "checkboxes" ? "checkbox" : "radio"} disabled />
            {option}
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "paragraph") return <textarea disabled rows={3} className="portal-input mt-3" placeholder="Long answer" />;
  if (question.type === "rating") return <div className="mt-3 flex gap-1 text-amber-400">{Array.from({ length: Number(question.max || 5) }, (_, index) => <Star key={index} size={18} />)}</div>;

  const inputType = question.type === "email" ? "email" : question.type === "phone" ? "tel" : question.type === "date-picker" ? "date" : question.type === "time-picker" ? "time" : question.type === "number" ? "number" : "text";
  return <input disabled type={inputType} className="portal-input mt-3" placeholder="Answer" />;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
      <div className="h-10 w-10 rounded-lg bg-[color:var(--md-hover)]" />
      <div className="mt-4 h-4 w-2/3 rounded bg-[color:var(--md-hover)]" />
      <div className="mt-2 h-3 w-full rounded bg-[color:var(--md-hover)]" />
      <div className="mt-5 h-20 rounded bg-[color:var(--md-hover)]" />
    </div>
  );
}
