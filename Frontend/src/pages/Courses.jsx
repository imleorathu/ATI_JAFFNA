import { motion } from "framer-motion";
import { ArrowUpRight, BookOpen, Clock, GraduationCap, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { usePageSeo } from "../hooks/useCmsPage.js";
import { apiFetch } from "../lib/api.js";

const gridVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 26, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] }
  }
};

const panelVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
};

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  usePageSeo(null, "Courses - ATI Jaffna", "Explore ATI Jaffna higher national diploma programmes.");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    apiFetch("/api/public/courses")
      .then((items) => {
        if (active) setCourses(Array.isArray(items) ? items : []);
      })
      .catch((err) => {
        if (!active) return;
        setCourses([]);
        setError(err?.message || "Unable to load courses.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="page-section">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
          variants={gridVariants}
          initial="hidden"
          animate="visible"
        >
          {loading ? (
            <motion.div variants={panelVariants} className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm md:col-span-2 lg:col-span-3">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-clay-accent">Loading Courses</p>
              <p className="mt-2 text-sm text-clay-muted">Reading course records from the database.</p>
            </motion.div>
          ) : error ? (
            <motion.div variants={panelVariants} className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm md:col-span-2 lg:col-span-3">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-red-600">Course Load Error</p>
              <h2 className="mt-3 text-2xl font-black text-clay-text">Could not load courses.</h2>
              <p className="mt-2 text-sm text-clay-muted">{error}</p>
            </motion.div>
          ) : courses.length === 0 ? (
            <motion.div variants={panelVariants} className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm md:col-span-2 lg:col-span-3">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-clay-accent">No Courses</p>
              <h2 className="mt-3 text-2xl font-black text-clay-text">No courses have been added yet.</h2>
              <p className="mt-2 text-sm text-clay-muted">Courses added to the database will appear here.</p>
            </motion.div>
          ) : (
            courses.map((course) => (
              <motion.article
                key={course._id || course.title}
                variants={cardVariants}
                whileHover={{ y: -8, scale: 1.015, transition: { type: "spring", stiffness: 300, damping: 22 } }}
                className="classroom-card group flex h-full flex-col"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-clay-accent transition duration-300 group-hover:rotate-3 group-hover:scale-110">
                    <BookOpen size={20} />
                  </span>
                  {course.department && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-right text-xs font-bold text-clay-muted">
                      {course.department}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-clay-text">{course.title}</h2>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-clay-muted">
                  {course.description || course.entryRequirements}
                </p>
                <div className="mt-5 grow space-y-3 text-sm text-clay-muted">
                  <p className="flex items-start gap-2">
                    <Clock className="mt-0.5 shrink-0 text-clay-accent" size={16} />
                    <span><strong className="text-clay-text">Duration:</strong> {course.duration}</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <GraduationCap className="mt-0.5 shrink-0 text-clay-accent" size={16} />
                    <span><strong className="text-clay-text">Entry:</strong> {course.entryRequirements}</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <WalletCards className="mt-0.5 shrink-0 text-clay-accent" size={16} />
                    <span><strong className="text-clay-text">Fee:</strong> {course.fee || "Contact office"}</span>
                  </p>
                </div>
                <a
                  href="https://apply.sliate.ac.lk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="clay-btn-primary mt-6 inline-flex w-full items-center justify-center gap-2 px-4 py-2 text-sm"
                >
                  Apply
                  <ArrowUpRight size={16} />
                </a>
              </motion.article>
            ))
          )}
        </motion.div>
      </div>
    </section>
  );
}
