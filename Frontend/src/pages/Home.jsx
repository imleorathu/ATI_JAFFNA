import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Bell, BookOpen, CalendarDays, GraduationCap, Newspaper, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassCard from "../components/GlassCard.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import CmsSections from "../components/CmsSections.jsx";
import { courses, departments, stats } from "../data.js";
import useCmsPage, { usePageSeo } from "../hooks/useCmsPage.js";
import { apiFetch } from "../lib/api.js";
import heroBg from "../assets/ChatGPT Image May 22, 2026, 10_31_39 PM.png";

const icons = [BookOpen, GraduationCap, Users, Users, CalendarDays];

const heroTextVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.3 + i * 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  })
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  })
};

function formatDate(value) {
  if (!value) return "Recently";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default function Home() {
  const heroSection = useRef(null);
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const [notices, setNotices] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const cmsPage = useCmsPage("home");
  const cmsContent = cmsPage?.published || {};
  const visibleCmsPage = useMemo(() => {
    if (!cmsPage?.published?.sections) return cmsPage;

    return {
      ...cmsPage,
      published: {
        ...cmsPage.published,
        sections: cmsPage.published.sections.filter((section) => {
          const title = String(section.title || "").toLowerCase();
          const eyebrow = String(section.eyebrow || "").toLowerCase();
          return !(title.includes("important instructions") || eyebrow.includes("graduates must bring their student id/nic"));
        })
      }
    };
  }, [cmsPage]);
  const hasCmsSections = (visibleCmsPage?.published?.sections || []).some((section) => section.visible !== false && (section.title || section.body || section.imageUrl || section.embedUrl));
  usePageSeo(cmsPage, "ATI Jaffna", "Empowering students through quality education.");

  const openHeroLink = (link) => {
    if (/^https?:\/\//i.test(link)) {
      window.open(link, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(link);
  };

  useEffect(() => {
    let active = true;

    apiFetch("/api/notices")
      .then((items) => {
        if (!active) return;
        setNotices((Array.isArray(items) ? items : []).filter((notice) => !notice.audience || notice.audience === "all").slice(0, 3));
      })
      .catch(() => {
        if (active) setNotices([]);
      });

    apiFetch("/api/blogs")
      .then((items) => {
        if (!active) return;
        setBlogs((Array.isArray(items) ? items : []).filter((blog) => blog.published !== false).slice(0, 3));
      })
      .catch(() => {
        if (active) setBlogs([]);
      });

    return () => {
      active = false;
    };
  }, []);

  // ── Parallax transforms ──
  const heroImageY = useTransform(scrollY, [0, 800], [0, 280]);
  const auroraY = useTransform(scrollY, [0, 800], [0, 120]);
  const heroTextY = useTransform(scrollY, [0, 500], [0, -40]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0.65]);
  const campusBgY = useTransform(scrollY, [0, 600], [0, 120]);

  return (
    <>
      <section ref={heroSection} className="relative h-screen overflow-hidden">
        <motion.div
          className="hero-aurora absolute inset-0 z-10 opacity-70 will-change-transform"
          style={{ y: auroraY }}
        />
        <motion.img
          src={cmsContent.heroImageUrl || heroBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
          style={{ scale: 1.08, y: heroImageY }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/85 via-[#0f172a]/75 to-[#0f172a]/90" />
        <div
          onMouseMove={(e) => {
            const rect = heroSection.current?.getBoundingClientRect();
            if (!rect) return;
            const x = (e.clientX / window.innerWidth - 0.5) * -6;
            const y = (e.clientY / window.innerHeight - 0.5) * -6;
            heroSection.current?.style.setProperty("--mx", `${x}px`);
            heroSection.current?.style.setProperty("--my", `${y}px`);
          }}
          className="relative z-20 mx-auto flex h-screen max-w-7xl items-center px-4 pb-16 pt-32 sm:px-6 lg:px-8"
        >
          <motion.div className="max-w-3xl text-white" style={{ y: heroTextY, opacity: heroOpacity }}>
            <motion.p
              custom={0}
              variants={heroTextVariants}
              initial="hidden"
              animate="visible"
              className="mb-4 text-sm font-bold uppercase tracking-[0.28em] text-blue-200"
            >
              Advanced Technological Institute
            </motion.p>
            <motion.h1
              custom={1}
              variants={heroTextVariants}
              initial="hidden"
              animate="visible"
              className="text-shimmer text-5xl font-black leading-tight md:text-7xl"
            >
              {cmsContent.heroTitle || "ATI Jaffna"}
            </motion.h1>
            <motion.p
              custom={2}
              variants={heroTextVariants}
              initial="hidden"
              animate="visible"
              className="mt-5 max-w-2xl text-xl leading-8 text-slate-100"
            >
              {cmsContent.heroDescription || "Empowering Students Through Quality Education"}
            </motion.p>
            <motion.div
              custom={3}
              variants={heroTextVariants}
              initial="hidden"
              animate="visible"
              className="mt-8 flex flex-wrap gap-3"
            >
              <motion.button
                onClick={() => openHeroLink(cmsContent.primaryButtonLink || "/courses")}
                className="clay-btn-primary px-5"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                {cmsContent.primaryButtonText || "View Courses"}
              </motion.button>
              <motion.button
                onClick={() => openHeroLink(cmsContent.secondaryButtonLink || "/courses")}
                className="clay-btn-secondary"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                {cmsContent.secondaryButtonText || "View Courses"}
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="-mt-20 px-4 pb-20 sm:px-6 lg:px-8">
        <div className="relative mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stats.map((item, index) => {
            const Icon = icons[index];
            return (
              <motion.div
                key={item.label}
                variants={fadeUpVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                custom={index}
                whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 20 } }}
              >
                <GlassCard className="group text-center">
                  <Icon className="mx-auto mb-4 text-clay-accent transition duration-300 group-hover:scale-110" size={30} />
                  <p className="text-3xl font-black text-clay-text">{item.value}</p>
                  <p className="mt-1 text-sm font-bold text-clay-muted">{item.label}</p>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </section>

      {hasCmsSections && (
        <section className="page-section pt-0">
          <div className="mx-auto max-w-7xl">
            <CmsSections cmsPage={visibleCmsPage} />
          </div>
        </section>
      )}

      {notices.length > 0 && (
        <section className="page-section pt-0">
          <div className="mx-auto max-w-7xl">
            <SectionHeader eyebrow="Notices" title="Latest Announcements" text="Important updates from ATI Jaffna administration." />
            <motion.div
              className="grid gap-5 md:grid-cols-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            >
              {notices.map((notice, index) => (
                <motion.article
                  key={notice._id || `${notice.title}-${index}`}
                  variants={fadeUpVariants}
                  whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                >
                  <GlassCard className="h-full">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-clay-accent">
                        <Bell size={18} />
                      </span>
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-clay-muted">{formatDate(notice.createdAt)}</span>
                    </div>
                    <h3 className="text-xl font-black text-clay-text">{notice.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-clay-muted">{notice.body}</p>
                  </GlassCard>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      <section className="relative isolate overflow-hidden py-24">
        <motion.div
          className="absolute -inset-x-8 -inset-y-20 bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#0d6efd]/30 bg-cover bg-center will-change-transform"
          style={{ scale: 1.05, y: campusBgY }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/88 via-[#0f172a]/64 to-[#0d6efd]/42" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-2xl text-white"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-blue-200">Campus Life</p>
            <h2 className="mt-3 text-3xl font-black md:text-5xl">A focused place to learn, build, and grow.</h2>
            <p className="mt-5 text-base leading-7 text-slate-100">From lecture rooms to practical labs, ATI Jaffna gives students the environment to turn ambition into skill.</p>
          </motion.div>
        </div>
      </section>

      <section className="page-section pt-0">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Pathways" title="Popular Courses" text="Industry-aware programmes designed for practical skills, confidence, and progression." />
          <motion.div
            className="grid gap-5 md:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            {courses.slice(0, 3).map((course) => (
              <motion.div
                key={course.title}
                variants={fadeUpVariants}
                whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 20 } }}
              >
                <GlassCard className="group">
                  <h3 className="text-xl font-black text-clay-text">{course.title}</h3>
                  <p className="mt-3 text-sm text-clay-muted">{course.duration} | {course.requirements}</p>
                  <button onClick={() => navigate("/courses")} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-clay-accent transition group-hover:gap-3">
                    View Courses <ArrowRight size={16} />
                  </button>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="page-section bg-clay-card/60">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Departments" title="Learning Communities" text="Focused academic departments support students with hands-on learning and close lecturer guidance." />
          <motion.div
            className="grid gap-5 md:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            {departments.slice(0, 3).map((department) => (
              <motion.article
                key={department.title}
                variants={fadeUpVariants}
                whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                className="clay-image-card group"
              >
                <img src={department.image} alt="" className="h-48 w-full object-cover transition duration-700 group-hover:scale-110" />
                <div className="grow p-5">
                  <h3 className="text-lg font-black text-clay-text">{department.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-clay-muted">{department.description}</p>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="page-section">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="News" title="Campus Events" text="Keep up with admin-published blogs and campus updates." />
          <motion.div
            className="grid gap-5 md:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            {blogs.length > 0 ? (
              blogs.map((blog) => (
                <motion.article
                  key={blog._id || blog.title}
                  variants={fadeUpVariants}
                  whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 20 } }}
                  className="clay-image-card group"
                >
                  {blog.imageUrl ? (
                    <img src={blog.imageUrl} alt="" className="h-44 w-full object-cover transition duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="flex h-44 w-full items-center justify-center bg-slate-100 text-clay-accent">
                      <Newspaper size={38} />
                    </div>
                  )}
                  <div className="flex grow flex-col p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay-accent">{formatDate(blog.createdAt)}</p>
                    <h3 className="mt-2 text-lg font-black text-clay-text">{blog.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-clay-muted">{blog.excerpt}</p>
                    <button
                      onClick={() => navigate(`/news/${blog.slug || blog._id}`)}
                      className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold text-clay-accent transition group-hover:gap-3"
                    >
                      Read Blog <ArrowRight size={16} />
                    </button>
                  </div>
                </motion.article>
              ))
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm md:col-span-3">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-clay-accent">No Blogs</p>
                <h3 className="mt-3 text-2xl font-black text-clay-text">No published blogs yet.</h3>
                <p className="mt-2 text-sm text-clay-muted">Admin-published blogs will appear here.</p>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </>
  );
}
