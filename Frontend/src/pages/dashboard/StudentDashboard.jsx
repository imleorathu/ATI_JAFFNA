import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import {
  BookOpen,
  Bot,
  CalendarCheck,
  Camera,
  Bell,
  ChevronDown,
  Clock,
  Download,
  FileText,
  GraduationCap,
  Inbox,
  Mail,
  MapPin,
  Pin,
  Phone,
  Search,
  ShieldCheck,
  Star,
  User
} from "lucide-react";
import GlassCard from "../../components/GlassCard";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";

const surfaceCard = "classroom-card";
const softPanel = "rounded-xl border border-[color:var(--md-border)] bg-[color:var(--md-card)]";
const actionButton = "inline-flex items-center gap-2 rounded-full border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-4 py-2 text-xs font-medium text-[color:var(--md-text-secondary)] transition hover:bg-[color:var(--md-hover)] hover:text-[color:var(--md-primary)]";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } }
};

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function initials(name = "Student") {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "ST";
}

const categoryStyles = {
  Urgent: "border-red-200 bg-red-50 text-red-700",
  Academic: "border-amber-200 bg-amber-50 text-amber-700",
  Event: "border-emerald-200 bg-emerald-50 text-emerald-700",
  General: "border-blue-200 bg-blue-50 text-blue-700"
};

const categoryDotStyles = {
  Urgent: "bg-red-500",
  Academic: "bg-amber-400",
  Event: "bg-emerald-500",
  General: "bg-blue-500"
};

const filters = ["All", "Urgent", "Academic", "Event", "General"];

function getAnnouncementCategory(notice = {}) {
  if (["Urgent", "Academic", "Event", "General"].includes(notice.category)) return notice.category;
  const text = `${notice.category || ""} ${notice.title || ""} ${notice.body || ""}`.toLowerCase();
  if (text.includes("urgent") || text.includes("important") || text.includes("deadline")) return "Urgent";
  if (text.includes("assignment") || text.includes("lecture") || text.includes("academic")) return "Academic";
  if (text.includes("event") || text.includes("workshop") || text.includes("seminar") || text.includes("meet")) return "Event";
  return "General";
}

function relativeTime(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function normalizeAnnouncement(notice) {
  const category = getAnnouncementCategory(notice);
  const createdAt = notice.createdAt || new Date().toISOString();
  return {
    id: notice._id || notice.id || `${notice.title}-${createdAt}`,
    title: notice.title || "Untitled announcement",
    description: notice.body || notice.description || "Announcement details will appear here.",
    category,
    date: createdAt,
    author: notice.author || "ATI Jaffna Admin",
    pinned: Boolean(notice.pinned) || category === "Urgent",
    attachments: Array.isArray(notice.attachments) ? notice.attachments : []
  };
}

function LatestAnnouncementsSection() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [expandedIds, setExpandedIds] = useState([]);
  const [visibleCount, setVisibleCount] = useState(4);
  const [readIds, setReadIds] = useState(() => JSON.parse(localStorage.getItem("atiReadAnnouncements") || "[]"));
  const [savedIds, setSavedIds] = useState(() => JSON.parse(localStorage.getItem("atiSavedAnnouncements") || "[]"));

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch("/api/notices")
      .then((items) => {
        if (active) setAnnouncements((Array.isArray(items) ? items : []).map(normalizeAnnouncement));
      })
      .catch(() => {
        if (active) setAnnouncements([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("atiReadAnnouncements", JSON.stringify(readIds));
  }, [readIds]);

  useEffect(() => {
    localStorage.setItem("atiSavedAnnouncements", JSON.stringify(savedIds));
  }, [savedIds]);

  const filteredAnnouncements = useMemo(() => {
    const search = query.trim().toLowerCase();
    return announcements
      .filter((item) => activeFilter === "All" || item.category === activeFilter)
      .filter((item) => !search || [item.title, item.description, item.author, item.category].some((value) => String(value).toLowerCase().includes(search)))
      .sort((a, b) => {
        const priority = (item) => (item.category === "Urgent" ? 3 : 0) + (item.pinned ? 2 : 0);
        return priority(b) - priority(a) || new Date(b.date) - new Date(a.date);
      });
  }, [activeFilter, announcements, query]);

  const visibleAnnouncements = filteredAnnouncements.slice(0, visibleCount);

  const markRead = (id) => setReadIds((current) => (current.includes(id) ? current : [...current, id]));
  const toggleSaved = (id) => setSavedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  const toggleExpanded = (id) => setExpandedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <GlassCard className="student-announcements">
      <div className="student-announcements-header">
        <div className="student-announcements-title">
          <span className="student-announcements-title-icon"><Bell size={20} /></span>
          <div>
            <h2>Latest Announcements</h2>
            <p>{loading ? "Loading campus updates..." : `${filteredAnnouncements.length} updates available`}</p>
          </div>
        </div>
        <Link to="/student/announcements" className="student-announcements-view-all">View All</Link>
      </div>

      <div className="student-announcements-toolbar">
        <label className="student-announcements-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search announcements</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search announcements" />
        </label>
        <div className="student-announcements-filters" role="group" aria-label="Filter announcements by category">
          {filters.map((filter) => (
            <button key={filter} type="button" onClick={() => { setActiveFilter(filter); setVisibleCount(4); }} className={activeFilter === filter ? "active" : ""}>
              {filter === "Event" ? "Events" : filter}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="student-announcements-list" aria-label="Loading announcements">
          {[0, 1, 2].map((item) => <div key={item} className="student-announcement-skeleton" />)}
        </div>
      ) : visibleAnnouncements.length ? (
        <div className="student-announcements-list">
          {visibleAnnouncements.map((announcement) => {
            const isRead = readIds.includes(announcement.id);
            const isSaved = savedIds.includes(announcement.id);
            const isExpanded = expandedIds.includes(announcement.id);
            return (
              <article key={announcement.id} className={`student-announcement-card ${announcement.category === "Urgent" ? "student-announcement-urgent" : ""}`} tabIndex={0}>
                <div className="student-announcement-main">
                  <div className="student-announcement-topline">
                    <span className={`student-announcement-category ${categoryStyles[announcement.category]}`}>
                      <i className={categoryDotStyles[announcement.category]} />
                      {announcement.category}
                    </span>
                    {announcement.pinned && <span className="student-announcement-pin"><Pin size={13} /> Pinned</span>}
                    {!isRead && <span className="student-announcement-new">New</span>}
                  </div>
                  <h3>{announcement.title}</h3>
                  <p className={isExpanded ? "" : "line-clamp-2"}>{announcement.description}</p>
                  <div className="student-announcement-meta">
                    <span>{relativeTime(announcement.date)}</span>
                    <span>{announcement.author}</span>
                  </div>
                </div>
                <div className="student-announcement-actions">
                  <button type="button" onClick={() => toggleExpanded(announcement.id)} aria-expanded={isExpanded} aria-label={`${isExpanded ? "Collapse" : "Expand"} ${announcement.title}`}>
                    <ChevronDown className={isExpanded ? "rotate-180" : ""} size={16} />
                  </button>
                  <button type="button" onClick={() => markRead(announcement.id)} disabled={isRead} aria-label={`Mark ${announcement.title} as read`}>
                    {isRead ? "Read" : "Mark Read"}
                  </button>
                  <button type="button" onClick={() => toggleSaved(announcement.id)} aria-pressed={isSaved} aria-label={`${isSaved ? "Unsave" : "Save"} ${announcement.title}`}>
                    <Star size={16} fill={isSaved ? "currentColor" : "none"} />
                  </button>
                  {announcement.attachments.length > 0 && (
                    <a href={announcement.attachments[0].url} target="_blank" rel="noreferrer" aria-label={`Download attachment for ${announcement.title}`}>
                      <Download size={16} />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
          {visibleCount < filteredAnnouncements.length && (
            <button type="button" onClick={() => setVisibleCount((count) => count + 4)} className="student-announcements-load-more">
              Load more announcements
            </button>
          )}
        </div>
      ) : (
        <div className="student-announcements-empty">
          <Inbox size={34} />
          <h3>No announcements found</h3>
          <p>Try another search term or filter. New student updates will appear here.</p>
        </div>
      )}
    </GlassCard>
  );
}

export default function StudentDashboard({ user }) {
  const { updateUser } = useAuth();
  const studentDetails = user?.studentProfile || {};
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(studentDetails.profilePhotoUrl || "");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [dashboardMessage, setDashboardMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [assignmentMarks, setAssignmentMarks] = useState([]);
  const [marksLoading, setMarksLoading] = useState(true);

  const profile = {
    name: user?.name || "Student",
    email: user?.email || "",
    id: studentDetails.studentId || user?.id || user?._id || "",
    phone: studentDetails.phone || "",
    department: studentDetails.department || "",
    course: studentDetails.program || studentDetails.department || "",
    studyMode: studentDetails.studyMode || "",
    academicStage: studentDetails.academicStage || "",
    guardianName: studentDetails.guardianName || "",
    guardianPhone: studentDetails.guardianPhone || "",
    nic: studentDetails.nic || "",
    address: studentDetails.address || "",
    avatar: profilePhotoUrl
  };

  useEffect(() => {
    setProfilePhotoUrl(studentDetails.profilePhotoUrl || "");
  }, [studentDetails.profilePhotoUrl]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    setMarksLoading(true);
    apiFetch("/api/assignments")
      .then((items) => {
        if (!active) return;
        const marks = (Array.isArray(items) ? items : [])
          .map((assignment) => ({ assignment, submission: assignment.submissions?.[0] }))
          .filter(({ submission }) => submission)
          .sort((a, b) => new Date(b.submission?.gradedAt || b.submission?.submittedAt || 0) - new Date(a.submission?.gradedAt || a.submission?.submittedAt || 0))
          .slice(0, 4);
        setAssignmentMarks(marks);
      })
      .catch(() => {
        if (active) setAssignmentMarks([]);
      })
      .finally(() => {
        if (active) setMarksLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const qrPayload = {
      type: "ATI_JAFFNA_STUDENT_DIGITAL_ID",
      studentId: profile.id || null,
      name: profile.name || null,
      email: profile.email || null,
      phone: profile.phone || null,
      department: profile.department || null,
      programme: profile.course || null,
      studyMode: profile.studyMode || null,
      academicGroup: profile.academicStage || null,
      nic: profile.nic || null,
      guardianName: profile.guardianName || null,
      guardianPhone: profile.guardianPhone || null,
      address: profile.address || null,
      generatedAt: new Date().toISOString()
    };

    QRCode.toDataURL(JSON.stringify(qrPayload), {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
      color: {
        dark: "#202124",
        light: "#ffffff"
      }
    })
      .then(setQrCodeUrl)
      .catch(() => setQrCodeUrl(""));
  }, [
    profile.id,
    profile.name,
    profile.email,
    profile.phone,
    profile.department,
    profile.course,
    profile.studyMode,
    profile.academicStage,
    profile.nic,
    profile.guardianName,
    profile.guardianPhone,
    profile.address
  ]);

  const showMessage = (message) => {
    setDashboardMessage(message);
    window.clearTimeout(showMessage.timer);
    showMessage.timer = window.setTimeout(() => setDashboardMessage(""), 3500);
  };

  const updateProfilePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setPhotoUploading(true);
    setPhotoError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const data = await apiFetch("/api/auth/profile-photo", { method: "POST", body: formData });
      if (data.user) {
        updateUser(data.user);
        setProfilePhotoUrl(data.user.studentProfile?.profilePhotoUrl || "");
        showMessage("Profile photo updated.");
      }
    } catch (err) {
      setPhotoError(err?.message || "Unable to update profile photo.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const profileFields = [
    [GraduationCap, "Student ID", profile.id],
    [Mail, "Email", profile.email],
    [Phone, "Contact", profile.phone],
    [FileText, "NIC", profile.nic],
    [BookOpen, "Department", profile.department],
    [CalendarCheck, "Study mode", profile.studyMode],
    [GraduationCap, "Academic group", profile.academicStage],
    [User, "Guardian", profile.guardianName],
    [Phone, "Guardian phone", profile.guardianPhone],
    [MapPin, "Address", profile.address]
  ];

  const profilePdfRows = [
    ["Name", profile.name],
    ["Student ID", profile.id],
    ["Email", profile.email],
    ["Contact", profile.phone],
    ["NIC", profile.nic],
    ["Department", profile.department],
    ["Programme", profile.course],
    ["Study Mode", profile.studyMode],
    ["Academic Group", profile.academicStage],
    ["Guardian", profile.guardianName],
    ["Guardian Phone", profile.guardianPhone],
    ["Address", profile.address]
  ];

  const downloadProfilePdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const fileSafeId = String(profile.id || profile.name || "student").replace(/[^a-zA-Z0-9]+/g, "-");

    doc.setFillColor(26, 115, 232);
    doc.rect(0, 0, pageWidth, 96, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("ATI Jaffna Student Profile", 48, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 48, 64);

    doc.setTextColor(32, 33, 36);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(profile.name || "Student", 48, 132);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(95, 99, 104);
    doc.text(profile.id ? `Student ID: ${profile.id}` : "Student ID: Not added", 48, 152);

    if (qrCodeUrl) {
      doc.addImage(qrCodeUrl, "PNG", pageWidth - 172, 118, 124, 124);
      doc.setFontSize(8);
      doc.text("Scannable Digital ID QR", pageWidth - 164, 256);
    }

    let y = 198;
    profilePdfRows.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(95, 99, 104);
      doc.text(label, 48, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(32, 33, 36);
      const wrapped = doc.splitTextToSize(value || "Not added", 340);
      doc.text(wrapped, 178, y);
      y += Math.max(24, wrapped.length * 14 + 8);
    });

    doc.setDrawColor(218, 220, 224);
    doc.line(48, y + 12, pageWidth - 48, y + 12);
    doc.setFontSize(9);
    doc.setTextColor(95, 99, 104);
    doc.text("This PDF was generated from the logged-in Student Portal profile.", 48, y + 36);
    doc.save(`ati-jaffna-student-profile-${fileSafeId}.pdf`);
    showMessage("Student profile PDF downloaded.");
  };

  const emptySections = [
    ["Attendance", "Your attendance records will appear after you mark attendance."],
    ["Grades", "Your official grades will appear after department staff publish them."],
    ["Assignments", "Your assignments will appear after department staff publish them."],
    ["Timetable", "Your class timetable will appear after staff assign your group timetable."]
  ];

  return (
    <section className="px-1 py-2 sm:px-2">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between" style={{borderBottom:"1px solid var(--md-border)"}}>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--md-primary)]">ATI Jaffna</p>
              <h1 className="mt-2">Student Dashboard</h1>
              <p className="mt-1 classroom-body text-[color:var(--md-text-secondary)]">
                Welcome back, {profile.name?.split(" ")[0] || "Student"}
                {profile.course ? ` / ${profile.course}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-4 py-2.5 shadow-[var(--md-shadow)]">
              <Clock size={18} className="text-[color:var(--md-primary)]" />
              <div className="text-right">
                <p className="text-sm font-medium text-[color:var(--md-text-primary)]">{formatDate(currentTime)}</p>
                <p className="text-xs text-[color:var(--md-text-secondary)]">{formatTime(currentTime)}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {dashboardMessage && <div className="portal-alert-success">{dashboardMessage}</div>}

        <LatestAnnouncementsSection />

        <GlassCard className={surfaceCard}>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="classroom-section-title">Assignment Marks</h2>
              <p className="mt-1 classroom-body text-[color:var(--md-text-secondary)]">Latest marks and feedback published by department staff.</p>
            </div>
            <Link to="/student/assignments" className={actionButton}>
              <FileText size={14} />
              View Assignments
            </Link>
          </div>

          {marksLoading ? (
            <p className="py-8 text-center text-sm text-[color:var(--md-text-secondary)]">Loading assignment marks...</p>
          ) : assignmentMarks.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {assignmentMarks.map(({ assignment, submission }) => (
                <div key={`${assignment._id}-${submission._id}`} className={softPanel + " p-4"}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--md-primary)]">{assignment.subject || "Assignment"}</p>
                      <h3 className="mt-1 line-clamp-2 text-sm font-medium text-[color:var(--md-text-primary)]">{assignment.title}</h3>
                    </div>
                    <span className="rounded-full bg-[rgba(26,115,232,.10)] px-2 py-1 text-xs font-bold text-[color:var(--md-primary)]">{submission.status || "submitted"}</span>
                  </div>
                  <p className="mt-4 text-2xl font-semibold text-[color:var(--md-text-primary)]">{submission.marks ?? "-"} / {assignment.totalMarks}</p>
                  {submission.feedback && <p className="mt-2 line-clamp-2 text-xs text-[color:var(--md-text-secondary)]">{submission.feedback}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[color:var(--md-text-secondary)]">No assignment marks have been published yet.</p>
          )}
        </GlassCard>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <GlassCard id="student-profile" className={`${surfaceCard} scroll-mt-24`}>
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[color:var(--md-border)] bg-[rgba(26,115,232,.10)] text-lg font-medium text-[color:var(--md-primary)]">
                    {profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : initials(profile.name)}
                  </div>
                  <div>
                    <h2 className="classroom-section-title text-[color:var(--md-text-primary)]">Student Profile</h2>
                    <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">Only real account and registration details are shown here.</p>
                    {photoError && <p className="mt-1 text-xs font-semibold text-[color:var(--md-danger)]">{photoError}</p>}
                  </div>
                </div>
                <label className={`${actionButton} w-fit cursor-pointer`}>
                  <Camera size={14} />
                  {photoUploading ? "Uploading..." : "Update Photo"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={updateProfilePhoto} disabled={photoUploading} className="hidden" />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {profileFields.map(([Icon, label, value]) => (
                  <div key={label} className={`${softPanel} p-3`}>
                    <div className="mb-2 flex items-center gap-2" style={{color:"var(--md-text-secondary)"}}>
                      <Icon size={14} />
                      <span className="text-[11px] font-medium uppercase tracking-[0.12em]">{label}</span>
                    </div>
                    <p className="break-words text-sm font-medium text-[color:var(--md-text-primary)]">{value || "Not added"}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <GlassCard className={surfaceCard}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="classroom-section-title text-[color:var(--md-text-primary)]">Digital ID</h2>
                  <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">Student verification profile.</p>
                </div>
                <ShieldCheck className="text-[color:var(--md-success)]" size={22} />
              </div>
              <div className="flex flex-col items-center rounded-xl border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-5 text-center">
                <div className="mb-4 flex h-40 w-40 items-center justify-center rounded-xl border border-[color:var(--md-border)] bg-white p-2">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt={`QR code for ${profile.name}`} className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xs text-[color:var(--md-text-secondary)]">Generating QR...</span>
                  )}
                </div>
                <p className="text-lg font-medium text-[color:var(--md-text-primary)]">{profile.name}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--md-primary)]">{profile.id || "No student ID"}</p>
                <p className="mt-2 text-sm text-[color:var(--md-text-secondary)]">{profile.course || "Programme not added"}</p>
                <button type="button" onClick={downloadProfilePdf} disabled={!qrCodeUrl} className={`${actionButton} mt-4 disabled:cursor-not-allowed disabled:opacity-60`}>
                  <FileText size={14} />
                  Download Profile PDF
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {emptySections.map(([title, text]) => (
            <GlassCard key={title} className={surfaceCard}>
              <h2 className="classroom-section-title">{title}</h2>
              <p className="mt-2 min-h-12 classroom-body text-[color:var(--md-text-secondary)]">{text}</p>
            </GlassCard>
          ))}
        </div>

        <GlassCard className={surfaceCard}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="classroom-section-title">Student Tools</h2>
              <p className="mt-1 classroom-body text-[color:var(--md-text-secondary)]">Open each section to view live data from the system.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/student/attendance" className={actionButton}>
                <CalendarCheck size={14} />
                Attendance
              </Link>
              <Link to="/student/assignments" className={actionButton}>
                <FileText size={14} />
                Assignments
              </Link>
              <Link to="/student/grades" className={actionButton}>
                <GraduationCap size={14} />
                Grades
              </Link>
              <Link to="/student/ai-assistant" className={actionButton}>
                <Bot size={14} />
                AI Assistant
              </Link>
            </div>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
