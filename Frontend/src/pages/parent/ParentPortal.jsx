import { useState } from "react";
import { motion } from "framer-motion";
import {
  User, GraduationCap, CalendarCheck, BarChart3, Wallet, Bell,
  BookOpen, TrendingUp, Award, AlertTriangle, CheckCircle, MessageSquare, Eye
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import GlassCard from "../../components/GlassCard";
import { studentProfile, attendanceData, gradeData, feeData, notifications } from "../../data";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const gradeColors = { A: "#19b890", B: "#0d6efd", C: "#f59e0b", D: "#f97316", F: "#ef4444" };

function mapGrade(grade) {
  const g = grade.charAt(0).toUpperCase();
  if (g === "A") return "A";
  if (g === "B") return "B";
  if (g === "C") return "C";
  if (g === "D") return "D";
  return "F";
}

function getGradeColor(grade) {
  return gradeColors[mapGrade(grade)] || "#94a3b8";
}

const conductData = {
  rating: "Excellent",
  score: 92,
  remarks: "Consistently follows rules, participates actively, and demonstrates leadership qualities.",
  categories: [
    { label: "Discipline", value: 95 },
    { label: "Participation", value: 90 },
    { label: "Punctuality", value: 88 },
    { label: "Teamwork", value: 92 },
    { label: "Respect", value: 94 },
  ]
};

const recentExams = gradeData
  .filter((g) => g.semester === studentProfile.semester)
  .slice(0, 6);

const subjectScores = recentExams.map((g) => ({
  subject: g.subject.length > 16 ? g.subject.slice(0, 14) + "..." : g.subject,
  score: g.score,
  fullName: g.subject
}));

const monthlyAttendance = (() => {
  const totals = Array(6).fill(0);
  attendanceData.forEach((s) => {
    s.trend.forEach((v, i) => { totals[i] += v; });
  });
  const avg = totals.map((v) => Math.round(v / attendanceData.length));
  return months.map((m, i) => ({ month: m, attendance: avg[i] }));
})();

const overallAttendance = Math.round(
  attendanceData.reduce((s, c) => s + c.percentage, 0) / attendanceData.length
);

const overallGPA = (() => {
  const gpaMap = { "A+": 4.0, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "F": 0 };
  let totalPoints = 0, totalCredits = 0;
  gradeData.forEach((g) => {
    const pts = gpaMap[g.grade] || 0;
    totalPoints += pts * g.credits;
    totalCredits += g.credits;
  });
  return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";
})();

const feePercent = feeData.totalFee > 0 ? Math.round((feeData.paid / feeData.totalFee) * 100) : 0;

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const parentNotifications = notifications.filter((n) =>
  ["Exam Schedule Published", "Fee Payment", "Result Published"].includes(n.title)
).slice(0, 5);

if (parentNotifications.length < 4) {
  parentNotifications.push(
    { id: 100, title: "Parent-Teacher Meeting", message: "Annual parent-teacher meeting scheduled for June 15th.", type: "info", time: "3 days ago", read: false },
    { id: 101, title: "Academic Progress Report", message: "Your child's semester report is now available for review.", type: "success", time: "1 week ago", read: true },
    { id: 102, title: "Sports Day Invitation", message: "You are cordially invited to the annual sports day on July 20th.", type: "info", time: "2 weeks ago", read: true }
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="clay-panel !bg-[#0f172a]/90 !border-white/10 px-4 py-3 text-sm shadow-xl">
        <p className="font-semibold text-white">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-medium">
            {p.name}: {p.value}{p.name === "attendance" || p.name === "score" ? "%" : ""}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function ParentPortal() {
  const [messageSent, setMessageSent] = useState(false);

  const statsCards = [
    { icon: TrendingUp, label: "Attendance %", value: overallAttendance, suffix: "%", color: "#19b890" },
    { icon: Award, label: "Current GPA", value: parseFloat(overallGPA), suffix: "", color: "#0d6efd" },
    { icon: CalendarCheck, label: "Upcoming Exams", value: gradeData.filter((g) => g.semester === studentProfile.semester).length, suffix: "", color: "#f59e0b" },
    { icon: Wallet, label: "Fee Due", value: feeData.due, suffix: "", color: "#ef4444", prefix: "LKR " },
  ];

  const handleMessageTeacher = () => {
    setMessageSent(true);
    setTimeout(() => setMessageSent(false), 3000);
  };

  const handleDownloadReports = () => {
    const el = document.createElement("a");
    el.setAttribute("href", "data:text/plain;charset=utf-8,Parent Portal Report - ATI Jaffna");
    el.setAttribute("download", "child_progress_report.txt");
    el.style.display = "none";
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
  };

  return (
    <section className="page-section !pt-6 !pb-10">
      <div className="mx-auto max-w-7xl">

        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-8">
          <GlassCard className="!bg-[#0f172a]/80 !border-white/10 p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#0d6efd] to-[#0754c9] text-white shadow-lg shadow-[#0d6efd]/30">
                  <User size={32} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white sm:text-3xl">Parent Portal</h1>
                  <p className="mt-1 text-sm text-white/60">
                    Monitoring: {studentProfile.name} &middot; {studentProfile.course} &middot; Year {studentProfile.year}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white/5 px-5 py-3 border border-white/10">
                <GraduationCap size={20} className="text-[#0d6efd]" />
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{studentProfile.course}</p>
                  <p className="text-xs text-white/50">Semester {studentProfile.semester}</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-30px" }}
        >
          {statsCards.map((stat) => (
            <motion.div key={stat.label} variants={fadeUp}>
              <GlassCard className="!bg-[#0f172a]/80 !border-white/10 p-5">
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${stat.color}20` }}
                  >
                    <stat.icon size={20} style={{ color: stat.color }} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-black text-white">
                    {stat.prefix || ""}{typeof stat.value === "number" ? stat.value : stat.value}
                    {stat.suffix}
                  </p>
                  <p className="mt-1 text-xs font-medium text-white/50 uppercase tracking-wider">{stat.label}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }}>
            <GlassCard className="!bg-[#0f172a]/80 !border-white/10 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d6efd]/20 text-[#0d6efd]">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="classroom-section-title">Child's Profile</h3>
                  <p className="text-xs text-white/40">Student information</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 border border-white/5">
                  <span className="text-sm text-white/50">Name</span>
                  <span className="text-sm font-semibold text-white">{studentProfile.name}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 border border-white/5">
                  <span className="text-sm text-white/50">Student ID</span>
                  <span className="text-sm font-semibold text-white">{studentProfile.id}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 border border-white/5">
                  <span className="text-sm text-white/50">Course</span>
                  <span className="text-sm font-semibold text-white">{studentProfile.course}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 border border-white/5">
                  <span className="text-sm text-white/50">Year</span>
                  <span className="text-sm font-semibold text-white">Year {studentProfile.year}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 border border-white/5">
                  <span className="text-sm text-white/50">Semester</span>
                  <span className="text-sm font-semibold text-white">Semester {studentProfile.semester}</span>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }} className="lg:col-span-2">
            <GlassCard className="!bg-[#0f172a]/80 !border-white/10 p-6">
              <h3 className="mb-1 text-lg font-black text-white">Attendance Overview</h3>
              <p className="mb-6 text-xs text-white/40">Monthly attendance trend this semester</p>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyAttendance} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="attendGradParent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#19b890" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#19b890" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.25)" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.25)" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="attendance" stroke="#19b890" strokeWidth={2.5} fill="url(#attendGradParent)" dot={{ fill: "#19b890", stroke: "#0f172a", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: "#19b890", stroke: "#fff", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }}>
            <GlassCard className="!bg-[#0f172a]/80 !border-white/10 p-6">
              <h3 className="mb-1 text-lg font-black text-white">Academic Performance</h3>
              <p className="mb-6 text-xs text-white/40">Subject scores with pass threshold</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectScores} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="subject" stroke="rgba(255,255,255,0.25)" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.25)" tick={{ fontSize: 12, fill: "rgba(255,255,255,0.5)" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {subjectScores.map((entry) => (
                      <Cell key={entry.fullName} fill={entry.score >= 75 ? "#19b890" : entry.score >= 60 ? "#0d6efd" : entry.score >= 45 ? "#f59e0b" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
                <div className="h-3 w-3 rounded bg-[#ef4444]" />
                <span>Below Pass (&lt;45)</span>
                <div className="ml-3 h-3 w-3 rounded bg-[#f59e0b]" />
                <span>Pass (45-59)</span>
                <div className="ml-3 h-3 w-3 rounded bg-[#0d6efd]" />
                <span>Good (60-74)</span>
                <div className="ml-3 h-3 w-3 rounded bg-[#19b890]" />
                <span>Excellent (75+)</span>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }}>
            <GlassCard className="!bg-[#0f172a]/80 !border-white/10 p-6">
              <h3 className="mb-4 text-lg font-black text-white">Recent Grades</h3>
              <div className="space-y-3">
                {recentExams.map((g) => (
                  <div key={g.subject} className="flex items-center gap-4 rounded-xl bg-white/5 p-3 border border-white/5">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black"
                      style={{ backgroundColor: `${getGradeColor(g.grade)}20`, color: getGradeColor(g.grade) }}
                    >
                      {g.grade}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{g.subject}</p>
                      <p className="text-xs text-white/40">Score: {g.score}%</p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: `${getGradeColor(g.grade)}20`, color: getGradeColor(g.grade) }}
                    >
                      {g.credits} cr
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }}>
            <GlassCard className="!bg-[#0f172a]/80 !border-white/10 p-6">
              <h3 className="mb-4 text-lg font-black text-white">Fee Status</h3>
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/5 p-3 text-center border border-white/5">
                  <p className="text-xs text-white/40">Total</p>
                  <p className="classroom-section-title">LKR {feeData.totalFee.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3 text-center border border-white/5">
                  <p className="text-xs text-white/40">Paid</p>
                  <p className="text-lg font-black text-[#19b890]">LKR {feeData.paid.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-3 text-center border border-white/5">
                  <p className="text-xs text-white/40">Due</p>
                  <p className="text-lg font-black text-[#ef4444]">LKR {feeData.due.toLocaleString()}</p>
                </div>
              </div>
              <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #0d6efd, #19b890)" }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${feePercent}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/30">Payment progress</span>
                <span className="text-xs font-bold text-white/50">{feePercent}%</span>
              </div>
              {feeData.scholarships.length > 0 && (
                <div className="mt-4 rounded-xl bg-[#19b890]/10 border border-[#19b890]/20 p-3">
                  <p className="text-xs font-bold text-[#19b890] mb-1">Active Scholarships</p>
                  {feeData.scholarships.map((s, i) => (
                    <p key={i} className="text-[11px] text-white/60">
                      {s.name} &middot; LKR {s.amount.toLocaleString()}
                    </p>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }}>
            <GlassCard className="!bg-[#0f172a]/80 !border-white/10 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f59e0b]/20 text-[#f59e0b]">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="classroom-section-title">Behavior / Conduct</h3>
                  <p className="text-xs text-white/40">Mock conduct report</p>
                </div>
              </div>
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-[#19b890]/10 border border-[#19b890]/20 px-4 py-3">
                <CheckCircle size={20} className="text-[#19b890]" />
                <div>
                  <p className="text-sm font-bold text-[#19b890]">{conductData.rating}</p>
                  <p className="text-xs text-white/50">Overall conduct rating: {conductData.score}%</p>
                </div>
              </div>
              <p className="mb-4 text-xs text-white/40 leading-relaxed">{conductData.remarks}</p>
              <div className="space-y-2.5">
                {conductData.categories.map((cat) => (
                  <div key={cat.label}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-white/60">{cat.label}</span>
                      <span className="text-xs font-bold text-white/70">{cat.value}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: cat.value >= 90 ? "linear-gradient(90deg, #19b890, #10b981)" : cat.value >= 80 ? "linear-gradient(90deg, #0d6efd, #3b82f6)" : "linear-gradient(90deg, #f59e0b, #f97316)" }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${cat.value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }}>
            <GlassCard className="!bg-[#0f172a]/80 !border-white/10 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d6efd]/20 text-[#0d6efd]">
                    <Bell size={20} />
                  </div>
                  <h3 className="classroom-section-title">Notifications</h3>
                </div>
                <span className="rounded-full bg-[#ef4444]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#ef4444]">
                  {parentNotifications.filter((n) => !n.read).length}
                </span>
              </div>
              <div className="space-y-0 divide-y divide-white/5">
                {parentNotifications.slice(0, 5).map((n) => {
                  const typeStyles = {
                    warning: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },
                    info: { bg: "rgba(13,110,253,0.15)", color: "#0d6efd" },
                    success: { bg: "rgba(25,184,144,0.15)", color: "#19b890" },
                    error: { bg: "rgba(239,68,68,0.15)", color: "#ef4444" }
                  };
                  const style = typeStyles[n.type] || typeStyles.info;
                  return (
                    <div key={n.id} className="flex items-start gap-3 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: style.bg }}>
                        <Bell size={14} style={{ color: style.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold ${n.read ? "text-white/50" : "text-white"}`}>{n.title}</p>
                          {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0d6efd]" />}
                        </div>
                        <p className="text-xs text-white/40">{n.message}</p>
                        <p className="text-[10px] text-white/20 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        <motion.div
          className="mb-8"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-30px" }}
        >
          <GlassCard className="!bg-[#0f172a]/80 !border-white/10 p-6">
            <h3 className="mb-4 text-lg font-black text-white">Actions</h3>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleMessageTeacher}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all duration-200"
                style={{
                  background: messageSent ? "rgba(25,184,144,0.15)" : "linear-gradient(135deg, #0d6efd, #0754c9)",
                  color: messageSent ? "#19b890" : "#fff",
                  boxShadow: messageSent ? "none" : "0 4px 18px rgba(13,110,253,0.35)",
                  border: messageSent ? "1px solid rgba(25,184,144,0.3)" : "none"
                }}
              >
                {messageSent ? <CheckCircle size={18} /> : <MessageSquare size={18} />}
                {messageSent ? "Message Sent" : "Direct Message Teacher"}
              </button>
              <button
                onClick={handleDownloadReports}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "#f1f5f9",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <Eye size={18} />
                Download Reports
              </button>
            </div>
          </GlassCard>
        </motion.div>

      </div>
    </section>
  );
}
