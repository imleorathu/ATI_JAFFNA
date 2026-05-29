import { useState } from "react";
import { motion } from "framer-motion";
import {
  Briefcase, Building2, Users, Calendar, FileText, Download,
  CheckCircle, Clock, Star, TrendingUp, ExternalLink, Award, ChevronRight
} from "lucide-react";
import GlassCard from "../../components/GlassCard";
import { placementData } from "../../data";

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const statusColors = {
  registered: "bg-blue-500/20 text-blue-600 border-blue-500/30",
  placed: "bg-green-500/20 text-green-600 border-green-500/30",
  searching: "bg-amber-500/20 text-amber-600 border-amber-500/30"
};

const appStatusColors = {
  applied: "bg-blue-500/15 text-blue-600 border-blue-500/25",
  shortlisted: "bg-amber-500/15 text-amber-600 border-amber-500/25",
  rejected: "bg-red-500/15 text-red-600 border-red-500/25",
  offer: "bg-emerald-500/15 text-emerald-600 border-emerald-500/25",
  interview: "bg-purple-500/15 text-purple-600 border-purple-500/25"
};

const interviewModeColors = {
  Online: "bg-sky-500/15 text-sky-600 border-sky-500/25",
  Offline: "bg-violet-500/15 text-violet-600 border-violet-500/25"
};

const careerResources = [
  { name: "LeetCode", url: "#", desc: "Coding practice & interview prep" },
  { name: "HackerRank", url: "#", desc: "Skill-based coding challenges" },
  { name: "InterviewBit", url: "#", desc: "Interview preparation guide" },
  { name: "Coding Ninjas", url: "#", desc: "DSA & system design courses" },
  { name: "Pramp", url: "#", desc: "Free mock interviews" },
  { name: "Big Interview", url: "#", desc: "AI-powered interview training" }
];

const placementStats = [
  { year: "2022", placed: 68, total: 120 },
  { year: "2023", placed: 89, total: 135 },
  { year: "2024", placed: 112, total: 148 },
  { year: "2025", placed: 134, total: 160 },
  { year: "2026", placed: 78, total: 95 }
];

const skillSuggestions = [
  "React", "Node.js", "Python", "Java", "SQL", "JavaScript", "TypeScript",
  "CSS", "HTML", "Git", "Docker", "AWS", "MongoDB", "Express", "Angular",
  "Vue.js", "C++", "C#", "PHP", "Ruby", "Go", "Rust", "Kubernetes", "GraphQL"
];

export default function PlacementPage() {
  const [resumeForm, setResumeForm] = useState({
    name: "", email: "", phone: "", education: "", skills: "", experience: "", projects: ""
  });
  const [showPreview, setShowPreview] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [skillFilter, setSkillFilter] = useState([]);

  const statusKey = placementData.status || "registered";
  const totalCompanies = placementData.companies.length;
  const totalApps = placementData.applications.length;
  const totalInterviews = placementData.interviews.length;
  const offersCount = placementData.applications.filter(a => a.status === "offer").length;

  const handleFormChange = (field) => (e) => {
    setResumeForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleGeneratePreview = (e) => {
    e.preventDefault();
    setShowPreview(true);
  };

  const handleAddSkill = (skill) => {
    const currentSkills = resumeForm.skills ? resumeForm.skills.split(", ").filter(s => s.trim()) : [];
    if (!currentSkills.includes(skill)) {
      currentSkills.push(skill);
      setResumeForm(prev => ({ ...prev, skills: currentSkills.join(", ") }));
    }
    setSkillInput("");
    setSkillFilter([]);
  };

  const handleSkillInputChange = (e) => {
    const val = e.target.value;
    setSkillInput(val);
    if (val.trim()) {
      const filtered = skillSuggestions.filter(s =>
        s.toLowerCase().includes(val.toLowerCase()) &&
        !(resumeForm.skills || "").split(", ").includes(s)
      );
      setSkillFilter(filtered);
    } else {
      setSkillFilter([]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && skillInput.trim()) {
      e.preventDefault();
      if (skillFilter.length > 0) {
        handleAddSkill(skillFilter[0]);
      } else {
        handleAddSkill(skillInput.trim());
      }
    }
  };

  return (
    <section className="page-section py-8">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-clay-text">Placement Portal</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border capitalize ${statusColors[statusKey]}`}>
                {statusKey}
              </span>
            </div>
            <p className="text-clay-muted mt-1 flex items-center gap-2">
              <Briefcase size={14} />
              ATI Jaffna Training & Placement Cell
            </p>
          </motion.div>
          <motion.div variants={fadeUp}>
            <GlassCard className="px-5 py-3 flex items-center gap-3">
              <Award className="text-clay-accent" size={22} />
              <div>
                <p className="text-xs text-clay-muted">Placement Score</p>
                <p className="text-lg font-black text-clay-text">86%</p>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <GlassCard className="text-center p-5">
              <Building2 className="mx-auto text-clay-accent" size={28} />
              <p className="text-3xl font-black text-clay-text mt-3">{totalCompanies}</p>
              <p className="text-sm text-clay-muted">Companies Visited</p>
            </GlassCard>
          </motion.div>
          <motion.div variants={fadeUp}>
            <GlassCard className="text-center p-5">
              <FileText className="mx-auto text-clay-accent" size={28} />
              <p className="text-3xl font-black text-clay-text mt-3">{totalApps}</p>
              <p className="text-sm text-clay-muted">Applications Sent</p>
            </GlassCard>
          </motion.div>
          <motion.div variants={fadeUp}>
            <GlassCard className="text-center p-5">
              <Calendar className="mx-auto text-clay-accent" size={28} />
              <p className="text-3xl font-black text-clay-text mt-3">{totalInterviews}</p>
              <p className="text-sm text-clay-muted">Interviews Scheduled</p>
            </GlassCard>
          </motion.div>
          <motion.div variants={fadeUp}>
            <GlassCard className="text-center p-5">
              <CheckCircle className="mx-auto text-clay-accent" size={28} />
              <p className="text-3xl font-black text-clay-text mt-3">{offersCount}</p>
              <p className="text-sm text-clay-muted">Offers Received</p>
            </GlassCard>
          </motion.div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-clay-text flex items-center gap-2">
                  <Building2 size={20} className="text-clay-accent" />
                  Upcoming Companies
                </h2>
                <a href="#" className="text-sm text-clay-accent flex items-center gap-1 hover:underline">
                  View All <ChevronRight size={14} />
                </a>
              </div>
              <div className="space-y-4">
                {placementData.companies.map((company, index) => (
                  <motion.div key={company.name} variants={fadeUp}>
                    <GlassCard className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-clay-text">{company.name}</h3>
                            <Star size={14} className="text-amber-500 fill-amber-500" />
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-clay-muted">
                            <span className="flex items-center gap-1">
                              <Building2 size={13} />
                              {company.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users size={13} />
                              {company.roles.join(", ")}
                            </span>
                            <span className="flex items-center gap-1 font-medium text-emerald-600">
                              <TrendingUp size={13} />
                              {company.stipend}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button className="clay-btn-primary text-xs px-4">
                            Apply Now
                          </button>
                          <button className="clay-btn-secondary text-xs px-4">
                            View Details
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          <div>
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
            >
              <h2 className="text-xl font-bold text-clay-text mb-4 flex items-center gap-2">
                <Calendar size={20} className="text-clay-accent" />
                Upcoming Interviews
              </h2>
              <div className="space-y-4">
                {placementData.interviews.length === 0 ? (
                  <GlassCard className="p-6 text-center">
                    <p className="text-clay-muted text-sm">No interviews scheduled yet</p>
                  </GlassCard>
                ) : (
                  placementData.interviews.map((interview) => (
                    <motion.div key={interview.id} variants={fadeUp}>
                      <GlassCard className="p-5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-clay-accent/15 flex items-center justify-center shrink-0">
                            <Briefcase size={20} className="text-clay-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-clay-text">{interview.company}</h3>
                            <p className="text-sm text-clay-muted">{interview.role}</p>
                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-clay-muted">
                              <span className="flex items-center gap-1">
                                <Calendar size={12} />
                                {interview.date}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                {interview.time}
                              </span>
                            </div>
                            <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium capitalize border ${interviewModeColors[interview.mode] || "bg-gray-500/15 text-gray-600 border-gray-500/25"}`}>
                              {interview.mode}
                            </span>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 mb-8">
          <div className="lg:col-span-3">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
            >
              <h2 className="text-xl font-bold text-clay-text mb-4 flex items-center gap-2">
                <FileText size={20} className="text-clay-accent" />
                My Applications
              </h2>
              <GlassCard className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-clay-border/50">
                      <th className="p-3 text-left text-clay-muted font-medium">Company</th>
                      <th className="p-3 text-left text-clay-muted font-medium">Role</th>
                      <th className="p-3 text-left text-clay-muted font-medium">Status</th>
                      <th className="p-3 text-left text-clay-muted font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {placementData.applications.map((app) => (
                      <tr key={app.id} className="border-b border-clay-border/30 hover:bg-clay-accent/5 transition-colors">
                        <td className="p-3 font-medium text-clay-text">{app.company}</td>
                        <td className="p-3 text-clay-muted">{app.role}</td>
                        <td className="p-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-medium capitalize border ${appStatusColors[app.status] || "bg-gray-500/15 text-gray-600 border-gray-500/25"}`}>
                            {app.status === "interview" ? "Interview" : app.status}
                          </span>
                        </td>
                        <td className="p-3 text-clay-muted">{app.appliedDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </GlassCard>
            </motion.div>
          </div>

          <div className="lg:col-span-2">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
            >
              <h2 className="text-xl font-bold text-clay-text mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-clay-accent" />
                Placement Stats
              </h2>
              <GlassCard className="p-5">
                <div className="space-y-4">
                  {placementStats.map((stat) => {
                    const percentage = Math.round((stat.placed / stat.total) * 100);
                    return (
                      <div key={stat.year}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-clay-text">{stat.year}</span>
                          <span className="text-clay-muted">{stat.placed}/{stat.total} placed</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-gray-200/60 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-clay-accent to-blue-400"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${percentage}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                        </div>
                        <p className="text-xs text-clay-muted mt-0.5 text-right">{percentage}%</p>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>

        <motion.div
          className="mb-8"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-clay-text flex items-center gap-2">
              <Award size={20} className="text-clay-accent" />
              AI Resume Builder
            </h2>
            <span className="text-xs bg-clay-accent/15 text-clay-accent px-2.5 py-1 rounded-full font-medium">
              Powered by AI
            </span>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            <GlassCard className="p-6">
              <form onSubmit={handleGeneratePreview}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-clay-text mb-1">Full Name</label>
                    <input
                      type="text"
                      className="clay-input"
                      placeholder="e.g. Kumaralingam Sutharsan"
                      value={resumeForm.name}
                      onChange={handleFormChange("name")}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-clay-text mb-1">Email</label>
                    <input
                      type="email"
                      className="clay-input"
                      placeholder="sutharsan.k@ati-jaffna.lk"
                      value={resumeForm.email}
                      onChange={handleFormChange("email")}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-clay-text mb-1">Phone</label>
                    <input
                      type="tel"
                      className="clay-input"
                      placeholder="+94 77 123 4567"
                      value={resumeForm.phone}
                      onChange={handleFormChange("phone")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-clay-text mb-1">Education</label>
                    <input
                      type="text"
                      className="clay-input"
                      placeholder="e.g. HND in IT, ATI Jaffna"
                      value={resumeForm.education}
                      onChange={handleFormChange("education")}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-clay-text mb-1">Skills</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="clay-input"
                      placeholder="Type a skill and press Enter..."
                      value={skillInput}
                      onChange={handleSkillInputChange}
                      onKeyDown={handleKeyDown}
                    />
                    {skillFilter.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-clay-border/50 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                        {skillFilter.map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm text-clay-text hover:bg-clay-accent/10 transition-colors"
                            onClick={() => handleAddSkill(skill)}
                          >
                            {skill}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {resumeForm.skills && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {resumeForm.skills.split(", ").filter(Boolean).map((skill) => (
                        <span key={skill} className="px-2 py-0.5 rounded text-xs font-medium bg-clay-accent/15 text-clay-accent">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-clay-text mb-1">Experience</label>
                    <textarea
                      className="clay-input"
                      rows={3}
                      placeholder="Brief description of work experience..."
                      value={resumeForm.experience}
                      onChange={handleFormChange("experience")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-clay-text mb-1">Projects</label>
                    <textarea
                      className="clay-input"
                      rows={3}
                      placeholder="Key projects you've worked on..."
                      value={resumeForm.projects}
                      onChange={handleFormChange("projects")}
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button type="submit" className="clay-btn-primary">
                    Generate Resume
                  </button>
                  {showPreview && (
                    <button type="button" className="clay-btn-secondary" onClick={() => {}}>
                      <Download size={16} className="mr-1" />
                      Download
                    </button>
                  )}
                </div>
              </form>
            </GlassCard>

            <div>
              {showPreview ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-lg font-black text-clay-text">Resume Preview</h3>
                      <button className="clay-btn-primary text-xs px-3 py-1.5">
                        <Download size={14} className="mr-1" />
                        Download PDF
                      </button>
                    </div>
                    <div className="border-b border-clay-border/30 pb-4 mb-4">
                      <h4 className="text-xl font-black text-clay-text">{resumeForm.name || "Your Name"}</h4>
                      <p className="text-sm text-clay-muted mt-1">
                        {resumeForm.email || "email@example.com"}
                        {resumeForm.phone && ` | ${resumeForm.phone}`}
                      </p>
                    </div>
                    {resumeForm.education && (
                      <div className="mb-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-clay-accent mb-1">Education</p>
                        <p className="text-sm text-clay-text">{resumeForm.education}</p>
                      </div>
                    )}
                    {resumeForm.skills && (
                      <div className="mb-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-clay-accent mb-1">Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {resumeForm.skills.split(", ").filter(Boolean).map((skill) => (
                            <span key={skill} className="px-2 py-0.5 rounded text-xs font-medium bg-clay-accent/15 text-clay-accent">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {resumeForm.experience && (
                      <div className="mb-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-clay-accent mb-1">Experience</p>
                        <p className="text-sm text-clay-text whitespace-pre-wrap">{resumeForm.experience}</p>
                      </div>
                    )}
                    {resumeForm.projects && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-clay-accent mb-1">Projects</p>
                        <p className="text-sm text-clay-text whitespace-pre-wrap">{resumeForm.projects}</p>
                      </div>
                    )}
                    {!resumeForm.name && !resumeForm.email && !resumeForm.education && (
                      <p className="text-clay-muted text-sm text-center py-8">
                        Fill in the form and click generate to see your resume preview.
                      </p>
                    )}
                  </GlassCard>
                </motion.div>
              ) : (
                <GlassCard className="p-6 flex items-center justify-center min-h-64">
                  <div className="text-center">
                    <FileText size={48} className="mx-auto text-clay-accent/40 mb-3" />
                    <p className="text-clay-muted text-sm">Your resume preview will appear here</p>
                    <p className="text-clay-muted/60 text-xs mt-1">Fill in the form and click Generate</p>
                  </div>
                </GlassCard>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          <h2 className="text-xl font-bold text-clay-text mb-4 flex items-center gap-2">
            <ExternalLink size={20} className="text-clay-accent" />
            Career Resources
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {careerResources.map((resource) => (
              <motion.a
                key={resource.name}
                href={resource.url}
                variants={fadeUp}
                className="clay-card p-4 rounded-xl no-underline block hover:border-clay-accent/30 transition-all"
              >
                <p className="font-bold text-clay-text text-sm">{resource.name}</p>
                <p className="text-xs text-clay-muted mt-1">{resource.desc}</p>
                <span className="inline-flex items-center gap-0.5 text-xs text-clay-accent mt-2 font-medium">
                  Visit <ExternalLink size={10} />
                </span>
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
