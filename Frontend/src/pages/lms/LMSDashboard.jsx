import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, Play, FileText, CheckCircle, Clock,
  ChevronRight, Award, Download, Upload, Video,
  MessageSquare, Users, BarChart3, Radio, ClipboardCheck,
  ShieldCheck, Presentation, Sparkles
} from "lucide-react";
import GlassCard from "../../components/GlassCard";
import { apiFetch } from "../../lib/api";

const statusConfig = {
  "not-started": { color: "text-white/40", bg: "bg-white/5", icon: Clock },
  "in-progress": { color: "text-amber-300", bg: "bg-amber-400/15", icon: Play },
  completed: { color: "text-emerald-300", bg: "bg-emerald-400/15", icon: CheckCircle },
};

const gradients = [
  "from-cyan-500/35 to-slate-950",
  "from-emerald-500/35 to-slate-950",
  "from-violet-500/35 to-slate-950",
  "from-rose-500/35 to-slate-950",
  "from-amber-500/35 to-slate-950",
  "from-cyan-500/35 to-slate-950",
];

const panel = "rounded-2xl border border-white/10 bg-[#0f172a]/80 backdrop-blur-sm";
const subPanel = "rounded-lg border border-white/10 bg-white/[0.04]";
const iconBox = "flex shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5";

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
};

function stableScore(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i);
    h |= 0;
  }
  return 70 + (Math.abs(h) % 28);
}

function normalizeCourse(course) {
  const modules = Array.isArray(course.modules) && course.modules.length
    ? course.modules
    : [
        {
          title: "Course Overview",
          lessons: [course.description || course.title],
          quizzes: [],
          assignments: []
        }
      ];

  return {
    id: course._id || course.id,
    title: course.title || "Untitled Course",
    description: course.description || course.entryRequirements || "Course details will be updated by department staff.",
    instructor: course.instructor || "Department Staff",
    progress: Math.min(100, Math.max(0, Number(course.progress || 0))),
    modules: modules.map((module) => ({
      title: module.title || "Course Module",
      lessons: Array.isArray(module.lessons) ? module.lessons.filter(Boolean) : [],
      quizzes: Array.isArray(module.quizzes) ? module.quizzes.filter(Boolean) : [],
      assignments: Array.isArray(module.assignments) ? module.assignments.filter(Boolean) : []
    }))
  };
}

export default function LMSDashboard() {
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [expandedModule, setExpandedModule] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCourses() {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch("/api/courses");
        if (active) setCourses(Array.isArray(data) ? data.map(normalizeCourse) : []);
      } catch (err) {
        if (active) setError(err?.message || "Unable to load your courses.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCourses();
    return () => {
      active = false;
    };
  }, []);

  const totalLessons = courses.reduce(
    (s, c) => s + c.modules.reduce((a, m) => a + m.lessons.length, 0), 0
  );
  const totalQuizzes = courses.reduce(
    (s, c) => s + c.modules.reduce((a, m) => a + m.quizzes.length, 0), 0
  );
  const totalAssignments = courses.reduce(
    (s, c) => s + c.modules.reduce((a, m) => a + m.assignments.length, 0), 0
  );
  const avgProgress = useMemo(
    () => (courses.length ? Math.round(courses.reduce((s, c) => s + c.progress, 0) / courses.length) : 0),
    [courses]
  );

  const completedLessons = Math.round((totalLessons * avgProgress) / 100);
  const completedQuizzes = Math.round((totalQuizzes * avgProgress) / 100);
  const completedAssignments = Math.round((totalAssignments * avgProgress) / 100);

  const stats = [
    { label: "Completed Lessons", value: completedLessons, icon: CheckCircle, color: "text-green-400" },
    { label: "Quizzes Passed", value: completedQuizzes, icon: Award, color: "text-yellow-400" },
    { label: "Assignments Submitted", value: completedAssignments, icon: Upload, color: "text-blue-400" },
    { label: "Course Progress", value: `${avgProgress}%`, icon: BarChart3, color: "text-purple-400" },
  ];

  const learningTools = [
    { icon: Video, title: "Video Lessons", detail: `${totalLessons} recorded lessons ready`, color: "var(--color-ocean)" },
    { icon: Radio, title: "Live Classes", detail: "3 sessions scheduled this week", color: "#ef4444" },
    { icon: ClipboardCheck, title: "Auto Grading", detail: `${totalQuizzes} quizzes with instant marks`, color: "var(--color-mint)" },
    { icon: Award, title: "Certificates", detail: "Generated after course completion", color: "#f59e0b" },
    { icon: MessageSquare, title: "Discussion Forums", detail: "Ask questions and share notes", color: "#8b5cf6" },
    { icon: ShieldCheck, title: "Progress Readiness", detail: "Progress checks before final assessments", color: "#06b6d4" },
  ];

  const liveClasses = [
    ...(courses[0] ? [{ course: courses[0].title, topic: "Department session", time: "Today, 10:00 AM", room: "Lab 1" }] : []),
    ...(courses[1] ? [{ course: courses[1].title, topic: "Course discussion", time: "Tomorrow, 02:00 PM", room: "Lab 2" }] : []),
    ...(courses[2] ? [{ course: courses[2].title, topic: "Progress review", time: "Friday, 09:00 AM", room: "Seminar Hall" }] : []),
  ];

  function getItemStatus(globalIdx, grandTotal, progress) {
    const done = Math.round((grandTotal * progress) / 100);
    if (globalIdx < done) return "completed";
    if (globalIdx === done) return "in-progress";
    return "not-started";
  }

  if (selectedCourse) {
    const course = selectedCourse;

    let counter = 0;
    const flatItems = course.modules.flatMap((mod) => [
      ...mod.lessons.map((title) => ({ type: "lesson", title, moduleTitle: mod.title, idx: counter++ })),
      ...mod.quizzes.map((title) => ({ type: "quiz", title, moduleTitle: mod.title, idx: counter++ })),
      ...mod.assignments.map((title) => ({ type: "assignment", title, moduleTitle: mod.title, idx: counter++ })),
    ]);
    const grandTotal = counter;

    const moduleMap = course.modules.map((mod) => ({
      ...mod,
      items: flatItems.filter((i) => i.moduleTitle === mod.title),
    }));

    return (
      <section className="px-1 py-2 sm:px-2">
        <div className="mx-auto max-w-7xl">
          <button
            onClick={() => { setSelectedCourse(null); setExpandedModule(null); }}
            className="mb-6 flex items-center gap-2 text-sm font-bold text-white/50 transition-colors hover:text-white"
          >
            <ChevronRight className="rotate-180" size={20} />
            <span>Back to My Learning</span>
          </button>

          <GlassCard className="mb-8 p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <p className="portal-page-label">Course Workspace</p>
                <h2 className="portal-page-title">{course.title}</h2>
                <p className="mt-1 text-white/55">{course.instructor}</p>
                <p className="mt-2 text-sm leading-6 text-white/45">{course.description}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-3xl font-black text-sky-300">{course.progress}%</span>
                <span className="text-sm text-white/45">Overall Progress</span>
                <div className="h-2 w-32 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-sky-400 transition-all duration-700"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </GlassCard>

          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {[
              { icon: Presentation, label: "Next Live Class", value: "Today 10:00 AM", note: "React Router project clinic" },
              { icon: ClipboardCheck, label: "Auto Grade Queue", value: "2 pending", note: "Quiz and assignment review" },
              { icon: MessageSquare, label: "Forum Activity", value: "18 replies", note: "Questions from your cohort" },
            ].map((item) => (
              <GlassCard key={item.label} dark className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`${iconBox} h-11 w-11 text-sky-300`}>
                    <item.icon size={22} />
                  </div>
                  <div>
                    <p className="text-sm text-white/45">{item.label}</p>
                    <p className="mt-1 text-lg font-black text-white">{item.value}</p>
                    <p className="mt-1 text-xs text-white/35">{item.note}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>

          <div className="space-y-4">
            {moduleMap.map((mod, idx) => {
              const isOpen = expandedModule === idx;
              const completedInModule = mod.items.filter(
                (i) => getItemStatus(i.idx, grandTotal, course.progress) === "completed"
              ).length;

              return (
                <GlassCard key={mod.title} dark className="p-5">
                  <button
                    onClick={() => setExpandedModule(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="text-sky-300" size={20} />
                      <div>
                        <h3 className="classroom-section-title">{mod.title}</h3>
                        <p className="text-sm text-white/45">
                          {completedInModule}/{mod.items.length} completed
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className={`text-white/40 transition-transform duration-300 ${
                        isOpen ? "rotate-90" : ""
                      }`}
                      size={20}
                    />
                  </button>

                  <motion.div
                    initial={false}
                    animate={{
                      height: isOpen ? "auto" : 0,
                      opacity: isOpen ? 1 : 0,
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                      {mod.items.map((item) => {
                        if (item.type === "lesson") {
                          const status = getItemStatus(item.idx, grandTotal, course.progress);
                          const sc = statusConfig[status];
                          const StatusIcon = sc.icon;
                          return (
                            <div
                              key={item.title}
                              className={`${subPanel} flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.07]`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`rounded-full p-1.5 ${sc.bg}`}>
                                  <StatusIcon size={14} className={sc.color} />
                                </div>
                                <span className="text-sm text-white/75">{item.title}</span>
                              </div>
                              <span className={`text-xs font-medium capitalize ${sc.color}`}>
                                {status.replace("-", " ")}
                              </span>
                            </div>
                          );
                        }
                        if (item.type === "quiz") {
                          const status = getItemStatus(item.idx, grandTotal, course.progress);
                          const isDone = status === "completed";
                          return (
                            <div
                              key={item.title}
                              className={`${subPanel} flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.07]`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="rounded-full bg-sky-400/15 p-1.5">
                                  <FileText size={14} className="text-sky-300" />
                                </div>
                                <span className="text-sm text-white/75">{item.title}</span>
                              </div>
                              {isDone ? (
                                <span className="text-xs font-medium text-green-400">
                                  Score: {stableScore(course.title + item.title)}%
                                </span>
                              ) : (
                                <span className="text-xs text-white/40">Not Attempted</span>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div
                            key={item.title}
                            className={`${subPanel} flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/[0.07]`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="rounded-full bg-purple-500/20 p-1.5">
                                <Upload size={14} className="text-purple-400" />
                              </div>
                              <span className="text-sm text-white/75">{item.title}</span>
                            </div>
                            <span className="text-xs font-medium text-yellow-400">Pending</span>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-1 py-2 sm:px-2">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 pb-5" style={{borderBottom:"1px solid var(--md-border)"}}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="portal-page-label">Student Portal</p>
              <h1 className="portal-page-title">My Courses</h1>
              <p className="portal-page-subtitle">
                Video lessons, live classes, quizzes, assignments, certificates, and discussion spaces.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Live now", "AI study plan", "Certificate ready"].map((tag) => (
                <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/55">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <GlassCard key={stat.label} dark className="p-5">
              <div className="flex items-center gap-4">
                <div className={`rounded-lg bg-white/10 p-3 ${stat.color}`}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <p className="text-2xl font-black text-white">{stat.value}</p>
                  <p className="text-sm text-white/45">{stat.label}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        <motion.div
          className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          {learningTools.map((tool) => (
            <motion.div key={tool.title} variants={fadeUp}>
              <GlassCard className="p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/10"
                    style={{ backgroundColor: `${tool.color}20`, color: tool.color }}
                  >
                    <tool.icon size={22} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{color:"var(--md-text-primary)"}}>{tool.title}</h3>
                    <p className="portal-page-subtitle">{tool.detail}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="classroom-section-title">Upcoming Live Classes</h2>
              <Radio size={18} className="text-red-400" />
            </div>
            <div className="space-y-3">
              {liveClasses.map((item) => (
                <div key={item.topic} className={subPanel + " p-4"}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-white">{item.topic}</p>
                      <p className="mt-1 text-xs text-white/40">{item.course}</p>
                    </div>
                    <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-bold text-red-300">
                      {item.room}
                    </span>
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-sky-300">
                    <Clock size={14} />
                    {item.time}
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="classroom-section-title">AI Learning Coach</h2>
              <Sparkles size={18} className="text-sky-300" />
            </div>
            <div className="space-y-3">
              {[
                courses[0] ? `Continue ${courses[0].title} from your department course list.` : "Your department staff will publish courses here.",
                "Check new lessons and assignments after staff updates.",
                "Track your course progress from this page.",
                "Use messages to contact department staff for course support.",
              ].map((tip) => (
                <div key={tip} className={`${subPanel} flex items-start gap-3 p-3`}>
                  <CheckCircle size={16} className="mt-0.5 text-green-400" />
                  <p className="text-sm text-white/50">{tip}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <motion.div
          className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          {loading ? (
            <GlassCard className="p-6 sm:col-span-2 xl:col-span-3">
              <p className="text-sm font-semibold text-white/50">Loading your department courses...</p>
            </GlassCard>
          ) : error ? (
            <GlassCard className="p-6 sm:col-span-2 xl:col-span-3">
              <p className="text-sm font-semibold text-red-200">{error}</p>
            </GlassCard>
          ) : courses.length === 0 ? (
            <GlassCard className="p-6 sm:col-span-2 xl:col-span-3">
              <h3 className="classroom-section-title">No courses published yet</h3>
              <p className="mt-2 text-sm text-white/45">Courses added by your department staff will appear here.</p>
            </GlassCard>
          ) : courses.map((course, idx) => (
            <motion.div key={course.id} variants={fadeUp}>
              <GlassCard className="group cursor-pointer overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
                <button
                  onClick={() => setSelectedCourse(course)}
                  className="w-full p-5 text-left"
                >
                  <div
                    className={`-mx-5 -mt-5 mb-4 flex h-36 items-center justify-center border-b border-white/10 bg-gradient-to-br ${
                      gradients[idx % gradients.length]
                    }`}
                  >
                    <span className="select-none text-5xl font-black text-white/25">
                      {course.title[0]}
                    </span>
                  </div>

                  <h3 className="classroom-section-title">{course.title}</h3>
                  <p className="portal-page-subtitle">{course.instructor}</p>

                  <p className="mt-2 text-xs text-white/35">
                    {course.modules.reduce((s, m) => s + m.lessons.length, 0)} Lessons
                    {" \u00B7 "}
                    {course.modules.reduce((s, m) => s + m.quizzes.length, 0)} Quizzes
                    {" \u00B7 "}
                    {course.modules.reduce((s, m) => s + m.assignments.length, 0)} Assignments
                  </p>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/45">Progress</span>
                      <span className="font-bold text-sky-300">{course.progress}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-sky-400 transition-all duration-700"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-sky-300 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Continue Learning
                    <ChevronRight size={16} />
                  </div>
                </button>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
