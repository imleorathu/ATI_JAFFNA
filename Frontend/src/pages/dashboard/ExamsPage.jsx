import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, FileText, CheckCircle, AlertTriangle, Monitor, Eye, Shield, Award, ChevronRight, Send } from "lucide-react";
import GlassCard from "../../components/GlassCard";
import { examSchedule as fallbackExamSchedule, quizData as fallbackQuizData } from "../../data";
import usePortalData from "../../hooks/usePortalData";

const statusConfig = {
  Scheduled: { class: "bg-blue-500/20 text-[color:var(--md-primary)] border-blue-500/30" },
  Ongoing: { class: "bg-emerald-500/20 text-[color:var(--md-success)] border-emerald-500/30" },
  Completed: { class: "bg-[color:var(--md-hover)] text-[color:var(--md-text-secondary)] border-[color:var(--md-border)]" },
};

const pastExams = [
  { subject: "Web Technologies", score: 86, grade: "A", date: "2025-12-10", status: "passed" },
  { subject: "Mathematics for Computing", score: 75, grade: "B+", date: "2025-12-08", status: "passed" },
  { subject: "Programming Fundamentals", score: 90, grade: "A", date: "2025-07-15", status: "passed" },
  { subject: "Information Systems", score: 78, grade: "B+", date: "2025-07-12", status: "passed" },
];

function getExamStatus(dateStr, timeStr) {
  const examDate = new Date(`${dateStr} ${timeStr}`);
  const now = new Date();
  const diff = examDate - now;
  if (diff < 0 && diff > -3 * 60 * 60 * 1000) return "Ongoing";
  if (diff < 0) return "Completed";
  return "Scheduled";
}

function getTimeToNext(exams) {
  const now = new Date();
  const upcoming = exams
    .map((e) => ({ ...e, dateObj: new Date(`${e.date} ${e.time}`) }))
    .filter((e) => e.dateObj > now)
    .sort((a, b) => a.dateObj - b.dateObj);
  if (!upcoming.length) return null;
  return upcoming[0];
}

function formatCountdown(ms) {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const seconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

function CountdownTimer({ targetDate }) {
  const [remaining, setRemaining] = useState(targetDate - Date.now());

  useEffect(() => {
    const interval = setInterval(() => setRemaining(targetDate - Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const c = formatCountdown(remaining);
  if (remaining <= 0) return <span className="text-emerald-400 font-semibold">Now</span>;

  return (
    <span className="font-mono text-sm text-white/80">
      {c.days > 0 && `${c.days}d `}{String(c.hours).padStart(2, "0")}:{String(c.minutes).padStart(2, "0")}:{String(c.seconds).padStart(2, "0")}
    </span>
  );
}

function QuizTimer({ duration, onTimeUp }) {
  const [remaining, setRemaining] = useState(duration * 60);

  useEffect(() => {
    if (remaining <= 0) { onTimeUp(); return; }
    const interval = setInterval(() => setRemaining((p) => p - 1), 1000);
    return () => clearInterval(interval);
  }, [remaining, onTimeUp]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const pct = remaining / (duration * 60);
  const color = pct > 0.5 ? "text-emerald-400" : pct > 0.25 ? "text-amber-400" : "text-red-400";

  return (
    <div className={`flex items-center gap-2 font-mono text-lg font-bold ${color}`}>
      <Clock size={18} />
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export default function ExamsPage() {
  const { examSchedule = fallbackExamSchedule, quizData = fallbackQuizData } = usePortalData({
    examSchedule: fallbackExamSchedule,
    quizData: fallbackQuizData
  });
  const [activeTab, setActiveTab] = useState("exams");
  const [selectedQuizId, setSelectedQuizId] = useState(null);
  const [quizPhase, setQuizPhase] = useState("select");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [nextExam, setNextExam] = useState(null);

  useEffect(() => {
    const exam = getTimeToNext(examSchedule);
    if (exam) setNextExam(exam);
  }, []);

  const selectedQuiz = quizData.find((q) => q.id === selectedQuizId);

  function startQuiz() {
    setQuizPhase("in-progress");
    setCurrentQ(0);
    setAnswers({});
    setSubmitted(false);
    setResult(null);
  }

  function handleAnswer(qId, optionIndex) {
    setAnswers((prev) => ({ ...prev, [qId]: optionIndex }));
  }

  function submitQuiz() {
    if (!selectedQuiz) return;
    let correct = 0;
    const breakdown = selectedQuiz.questions.map((q) => {
      const isCorrect = answers[q.id] === q.correctAnswer;
      if (isCorrect) correct++;
      return { ...q, selected: answers[q.id], isCorrect };
    });
    const total = selectedQuiz.questions.length;
    const percentage = Math.round((correct / total) * 100);
    setResult({ correct, total, percentage, breakdown });
    setSubmitted(true);
    setQuizPhase("submitted");
  }

  function handleTimeUp() {
    if (!submitted) submitQuiz();
  }

  function resetQuiz() {
    setSelectedQuizId(null);
    setQuizPhase("select");
    setCurrentQ(0);
    setAnswers({});
    setSubmitted(false);
    setResult(null);
  }

  const stats = {
    quizzesTaken: quizData.length + 2,
    averageScore: Math.round(
      (pastExams.reduce((s, e) => s + e.score, 0) + 86 + 74) / (pastExams.length + 2)
    ),
    bestScore: Math.max(...pastExams.map((e) => e.score), 86, 74),
    pendingExams: examSchedule.filter((e) => getExamStatus(e.date, e.time) === "Scheduled").length,
  };

  return (
    <section className="min-h-screen">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-white">Examinations</h1>
          <p className="portal-page-subtitle">Manage exams, take quizzes, and review results</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
          <button
            onClick={() => setActiveTab("exams")}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "exams"
                ? "text-white shadow-lg"
                : "text-white/50 hover:text-white hover:bg-white/5"
            }`}
            style={{background: activeTab === "exams" ? "var(--color-ocean)" : "transparent", boxShadow: activeTab === "exams" ? "0 0 20px var(--color-ocean)/30" : "none"}}
          >
            Upcoming Exams
          </button>
          <button
            onClick={() => setActiveTab("quiz")}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === "quiz"
                ? "text-white shadow-lg"
                : "text-white/50 hover:text-white hover:bg-white/5"
            }`}
            style={{background: activeTab === "quiz" ? "var(--color-ocean)" : "transparent", boxShadow: activeTab === "quiz" ? "0 0 20px var(--color-ocean)/30" : "none"}}
          >
            Take Quiz
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "exams" ? (
            <motion.div
              key="exams"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: 10 }}
            >
              {/* Next Exam Countdown */}
              {nextExam && (
                <motion.div variants={itemVariants} className="mb-6">
                  <GlassCard className="border-white/10" style={{background: "linear-gradient(135deg, var(--color-ocean)/10, transparent)"}}>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{background: "var(--color-ocean)/20", color: "var(--color-ocean)"}}>
                          <Clock size={24} />
                        </div>
                        <div>
                          <p className="text-xs text-white/50 uppercase tracking-wider">Next Exam</p>
                          <p className="classroom-section-title">{nextExam.subject}</p>
                          <p className="text-sm text-white/60">{nextExam.date} at {nextExam.time} &middot; {nextExam.room}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/50 mb-1">Countdown</p>
                        <CountdownTimer targetDate={new Date(`${nextExam.date} ${nextExam.time}`)} />
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Stats */}
              <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Pending Exams", value: stats.pendingExams, icon: FileText, color: "text-blue-400" },
                  { label: "Completed", value: pastExams.length, icon: CheckCircle, color: "text-emerald-400" },
                  { label: "Average Score", value: `${stats.averageScore}%`, icon: Award, color: "text-amber-400" },
                  { label: "Best Score", value: `${stats.bestScore}%`, icon: Shield, color: "text-purple-400" },
                ].map((s) => (
                  <GlassCard key={s.label}>
                    <div className="flex items-center gap-3">
                      <s.icon size={20} className={s.color} />
                      <div>
                        <p className="text-xs text-white/50">{s.label}</p>
                        <p className="text-xl font-bold text-white">{s.value}</p>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </motion.div>

              {/* Exams Table */}
              <motion.div variants={itemVariants}>
                <GlassCard dark>
                  <h2 className="text-lg font-bold text-white mb-4">Exam Schedule</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-left">
                          <th className="pb-3 text-white/50 font-semibold">Subject</th>
                          <th className="pb-3 text-white/50 font-semibold">Date</th>
                          <th className="pb-3 text-white/50 font-semibold">Time</th>
                          <th className="pb-3 text-white/50 font-semibold">Duration</th>
                          <th className="pb-3 text-white/50 font-semibold">Room</th>
                          <th className="pb-3 text-white/50 font-semibold">Type</th>
                          <th className="pb-3 text-white/50 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {examSchedule.map((exam, i) => {
                          const status = getExamStatus(exam.date, exam.time);
                          const config = statusConfig[status];
                          return (
                            <motion.tr
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                            >
                              <td className="py-3 text-white font-medium">{exam.subject}</td>
                              <td className="py-3 text-white/70">{exam.date}</td>
                              <td className="py-3 text-white/70">{exam.time}</td>
                              <td className="py-3 text-white/70">{exam.duration}</td>
                              <td className="py-3 text-white/70">{exam.room}</td>
                              <td className="py-3 text-white/70">{exam.type}</td>
                              <td className="py-3">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${config.class}`}>
                                  {status}
                                </span>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Results History */}
              <motion.div variants={itemVariants} className="mt-6">
                <GlassCard dark>
                  <h2 className="text-lg font-bold text-white mb-4">Results History</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-left">
                          <th className="pb-3 text-white/50 font-semibold">Subject</th>
                          <th className="pb-3 text-white/50 font-semibold">Date</th>
                          <th className="pb-3 text-white/50 font-semibold">Score</th>
                          <th className="pb-3 text-white/50 font-semibold">Grade</th>
                          <th className="pb-3 text-white/50 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastExams.map((exam, i) => (
                          <motion.tr
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                          >
                            <td className="py-3 text-white font-medium">{exam.subject}</td>
                            <td className="py-3 text-white/70">{exam.date}</td>
                            <td className="py-3">
                              <span className={`font-semibold ${exam.score >= 80 ? "text-emerald-400" : exam.score >= 65 ? "text-amber-400" : "text-red-400"}`}>
                                {exam.score}%
                              </span>
                            </td>
                            <td className="py-3 text-white/70">{exam.grade}</td>
                            <td className="py-3">
                              <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-500/20 text-[color:var(--md-success)] border-emerald-500/30">
                                Passed
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="quiz"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: 10 }}
            >
              {quizPhase === "select" && (
                <>
                  {/* Quiz Stats */}
                  <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {[
                      { label: "Quizzes Taken", value: stats.quizzesTaken, icon: FileText },
                      { label: "Average Score", value: `${stats.averageScore}%`, icon: Award },
                      { label: "Best Score", value: `${stats.bestScore}%`, icon: Shield },
                      { label: "Pending Exams", value: stats.pendingExams, icon: Clock },
                    ].map((s) => (
                      <GlassCard key={s.label}>
                        <div className="flex items-center gap-3">
                          <s.icon size={20} className="text-[#0d6efd]" />
                          <div>
                            <p className="text-xs text-white/50">{s.label}</p>
                            <p className="text-xl font-bold text-white">{s.value}</p>
                          </div>
                        </div>
                      </GlassCard>
                    ))}
                  </motion.div>

                  {/* Quiz Selection */}
                  <motion.div variants={itemVariants}>
                    <GlassCard dark>
                      <h2 className="text-lg font-bold text-white mb-4">Available Quizzes</h2>
                      <div className="space-y-3">
                        {quizData.map((q) => (
                          <button
                            key={q.id}
                            onClick={() => { setSelectedQuizId(q.id); }}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 text-left ${
                              selectedQuizId === q.id
                                ? "bg-[#0d6efd]/10 border-[#0d6efd]/40"
                                : "bg-white/5 border-white/10 hover:bg-white/10"
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-[#0d6efd]/20 flex items-center justify-center">
                                <FileText size={20} className="text-[#0d6efd]" />
                              </div>
                              <div>
                                <p className="text-white font-semibold">{q.title}</p>
                                <p className="text-xs text-white/50">{q.subject} &middot; {q.totalQuestions} questions &middot; {q.duration} min</p>
                              </div>
                            </div>
                            <ChevronRight size={18} className="text-white/30" />
                          </button>
                        ))}
                      </div>

                      <AnimatePresence>
                        {selectedQuizId && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-6 pt-6 border-t border-white/10"
                          >
                            <div className="flex items-center gap-4 flex-wrap">
                              <p className="text-sm text-white/60">
                                Starting <span className="text-white font-semibold">{selectedQuiz?.title}</span>
                              </p>
                              <button onClick={startQuiz} className="clay-btn-primary px-6 py-2.5">
                                <Send size={16} className="mr-2" />
                                Start Quiz
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </GlassCard>
                  </motion.div>
                </>
              )}

              {quizPhase === "in-progress" && selectedQuiz && (
                <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main Quiz Area */}
                  <div className="lg:col-span-2">
                    <GlassCard dark>
                      {/* Quiz Header */}
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                        <div>
                          <p className="text-xs text-white/50 uppercase tracking-wider">{selectedQuiz.title}</p>
                          <p className="classroom-section-title">Q {currentQ + 1}/{selectedQuiz.questions.length}</p>
                        </div>
                        <QuizTimer duration={selectedQuiz.duration} onTimeUp={handleTimeUp} />
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-white/10 rounded-full mb-6 overflow-hidden">
                        <motion.div
                          className="h-full bg-[#0d6efd] rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${((currentQ + 1) / selectedQuiz.questions.length) * 100}%` }}
                        />
                      </div>

                      {/* Question */}
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentQ}
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -30 }}
                          transition={{ duration: 0.2 }}
                        >
                          <h3 className="text-lg font-semibold text-white mb-6">
                            {selectedQuiz.questions[currentQ].question}
                          </h3>

                          <div className="space-y-3">
                            {selectedQuiz.questions[currentQ].options.map((opt, oi) => (
                              <label
                                key={oi}
                                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                                  answers[selectedQuiz.questions[currentQ].id] === oi
                                    ? "bg-[#0d6efd]/10 border-[#0d6efd]/40"
                                    : "bg-white/5 border-white/10 hover:bg-white/10"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`q-${currentQ}`}
                                  checked={answers[selectedQuiz.questions[currentQ].id] === oi}
                                  onChange={() => handleAnswer(selectedQuiz.questions[currentQ].id, oi)}
                                  className="appearance-none w-4 h-4 rounded-full border-2 border-white/30 checked:border-[#0d6efd] checked:bg-[#0d6efd] transition-colors"
                                />
                                <span className="text-white/80 text-sm">{opt}</span>
                              </label>
                            ))}
                          </div>
                        </motion.div>
                      </AnimatePresence>

                      {/* Navigation */}
                      <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/10">
                        <button
                          onClick={() => setCurrentQ((p) => Math.max(0, p - 1))}
                          disabled={currentQ === 0}
                          className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/5 text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          Previous
                        </button>

                        <span className="text-xs text-white/40">
                          {Object.keys(answers).length} of {selectedQuiz.questions.length} answered
                        </span>

                        {currentQ < selectedQuiz.questions.length - 1 ? (
                          <button
                            onClick={() => setCurrentQ((p) => Math.min(selectedQuiz.questions.length - 1, p + 1))}
                            className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#0d6efd] text-white hover:bg-[#0d6efd]/90 transition-all"
                          >
                            Next
                          </button>
                        ) : (
                          <button
                            onClick={submitQuiz}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                          >
                            <Send size={16} />
                            Submit
                          </button>
                        )}
                      </div>
                    </GlassCard>
                  </div>

                  {/* Proctoring Panel */}
                  <div className="space-y-4">
                    <GlassCard dark>
                      <div className="flex items-center gap-3 mb-3">
                        <Monitor size={20} className="text-emerald-400" />
                        <div>
                          <p className="text-sm font-semibold text-white">AI Proctoring</p>
                          <p className="text-xs text-emerald-400">Webcam monitoring active</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Recording session</span>
                      </div>
                    </GlassCard>

                    <GlassCard dark>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                          <AlertTriangle size={18} className="text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">Anti-Cheating</p>
                          <p className="text-xs text-amber-400">Tab switching detected will flag your session</p>
                        </div>
                      </div>
                    </GlassCard>

                    <GlassCard dark>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#0d6efd]/20 flex items-center justify-center">
                          <Eye size={18} className="text-[#0d6efd]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">Face Detection</p>
                          <p className="text-xs text-white/50">Multiple faces not allowed</p>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </motion.div>
              )}

              {quizPhase === "submitted" && result && selectedQuiz && (
                <motion.div
                  variants={itemVariants}
                  className="max-w-2xl mx-auto"
                >
                  <GlassCard dark>
                    {/* Score Circle */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="flex flex-col items-center mb-8"
                    >
                      <div className="relative w-28 h-28 mb-4">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                          <motion.circle
                            cx="60" cy="60" r="52" fill="none"
                            stroke={result.percentage >= 80 ? "#34d399" : result.percentage >= 60 ? "#fbbf24" : "#f87171"}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 52}`}
                            initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - result.percentage / 100) }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <motion.span
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="text-3xl font-bold text-white"
                          >
                            {result.percentage}%
                          </motion.span>
                        </div>
                      </div>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="text-lg font-semibold text-white"
                      >
                        {result.percentage >= 80 ? "Excellent!" : result.percentage >= 60 ? "Good Job!" : "Keep Practicing!"}
                      </motion.p>
                      <p className="text-sm text-white/50 mt-1">
                        {result.correct} / {result.total} correct answers
                      </p>
                    </motion.div>

                    {/* Score Breakdown */}
                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Breakdown</h3>
                    <div className="space-y-2 mb-6">
                      {result.breakdown.map((q, i) => (
                        <motion.div
                          key={q.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 + i * 0.06 }}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            q.isCorrect
                              ? "bg-emerald-500/10 border-emerald-500/20"
                              : "bg-red-500/10 border-red-500/20"
                          }`}
                        >
                          {q.isCorrect
                            ? <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                            : <AlertTriangle size={16} className="text-red-400 shrink-0" />
                          }
                          <div>
                            <p className="text-sm text-white">{q.question}</p>
                            {!q.isCorrect && (
                              <p className="text-xs text-emerald-400 mt-0.5">
                                Correct: {q.options[q.correctAnswer]}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <button
                      onClick={resetQuiz}
                      className="w-full py-3 rounded-xl text-sm font-bold bg-[#0d6efd] text-white hover:bg-[#0d6efd]/90 transition-all"
                    >
                      Back to Quizzes
                    </button>
                  </GlassCard>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
