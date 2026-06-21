import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Bell, BookOpen, CalendarDays, GraduationCap, Newspaper, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassCard from "../components/GlassCard.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import CmsSections from "../components/CmsSections.jsx";
import HeroSlider from "../components/HeroSlider.jsx";
import { stats as statCards } from "../data.js";
import useCmsPage, { usePageSeo } from "../hooks/useCmsPage.js";
import { apiFetch } from "../lib/api.js";
import heroBg from "../assets/ChatGPT Image May 22, 2026, 10_31_39 PM.png";
import { useLanguage } from "../contexts/LanguageContext.jsx";

const icons = [BookOpen, GraduationCap, Users, Users, CalendarDays];
const statKeys = ["courses", "departments", "students", "lecturers", "events"];
const newsStatIndex = statKeys.indexOf("events");
const emptyStats = statCards.map((item) => ({ ...item, value: "--" }));
const noticeCategoryClasses = {
  Urgent: "border-red-200 bg-red-50 text-red-700",
  Academic: "border-amber-200 bg-amber-50 text-amber-700",
  Event: "border-emerald-200 bg-emerald-50 text-emerald-700",
  General: "border-blue-200 bg-blue-50 text-blue-700"
};
function normalizeDepartmentName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function formatStatValue(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toLocaleString() : "--";
}

function formatDate(value) {
  if (!value) return "Recently";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function noticeCategory(notice = {}) {
  return noticeCategoryClasses[notice.category] ? notice.category : "General";
}

function noticePriority(notice = {}) {
  const category = noticeCategory(notice);
  return (category === "Urgent" ? 3 : 0) + (notice.pinned ? 2 : 0);
}

function ParallaxSection({ children, className = "", speed = 28 }) {
  const ref = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [speed, -speed]);
  const smoothY = useSpring(y, { stiffness: 90, damping: 26, mass: 0.35 });

  return (
    <section ref={ref} className={className}>
      <motion.div style={{ y: smoothY }}>
        {children}
      </motion.div>
    </section>
  );
}

function CampusParallaxSection({ children }) {
  const ref = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  const backgroundY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [-54, 54]);
  const contentY = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? [0, 0] : [26, -26]);
  const smoothBackgroundY = useSpring(backgroundY, { stiffness: 80, damping: 28, mass: 0.4 });
  const smoothContentY = useSpring(contentY, { stiffness: 90, damping: 26, mass: 0.35 });

  return (
    <section ref={ref} className="relative isolate overflow-hidden py-24">
      <motion.div
        className="absolute -inset-x-8 -inset-y-28 bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#0d6efd]/30 bg-cover bg-center will-change-transform"
        style={{ y: smoothBackgroundY, scale: 1.08 }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/88 via-[#0f172a]/64 to-[#0d6efd]/42" />
      <motion.div style={{ y: smoothContentY }} className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {children}
      </motion.div>
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [publicCourses, setPublicCourses] = useState([]);
  const [publicDepartments, setPublicDepartments] = useState([]);
  const [blogsLoaded, setBlogsLoaded] = useState(false);
  const [liveStats, setLiveStats] = useState(emptyStats);
  const cmsPage = useCmsPage("home");
  const facultiesCmsPage = useCmsPage("faculties");
  const { t, translate } = useLanguage();
  const cmsContent = cmsPage?.published || {};
  const cmsDepartmentImageFallbacks = useMemo(() => {
    const sections = (facultiesCmsPage?.published?.sections || []).filter((section) => section.visible !== false && section.imageUrl);
    const byName = sections.reduce((images, section) => {
      images[normalizeDepartmentName(section.title)] = section.imageUrl;
      return images;
    }, {});

    return {
      byName,
      images: sections.map((section) => section.imageUrl)
    };
  }, [facultiesCmsPage]);
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

  useEffect(() => {
    document.documentElement.classList.add("home-page-scrollbar-hidden");
    return () => document.documentElement.classList.remove("home-page-scrollbar-hidden");
  }, []);

  useEffect(() => {
    let active = true;
    const refreshStats = () => {
      apiFetch("/api/public/stats")
        .then((counts) => {
          if (!active) return;
          setLiveStats(
            statCards.map((item, index) => ({
              ...item,
              value: formatStatValue(counts?.[statKeys[index]])
            }))
          );
        })
        .catch(() => {});
    };

    refreshStats();
    const statsInterval = window.setInterval(refreshStats, 30000);

    apiFetch("/api/notices")
      .then((items) => {
        if (!active) return;
        setNotices(
          (Array.isArray(items) ? items : [])
            .filter((notice) => !notice.audience || ["all", "students"].includes(notice.audience))
            .sort((a, b) => noticePriority(b) - noticePriority(a) || new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 3)
        );
      })
      .catch(() => {
        if (active) setNotices([]);
      });

    apiFetch("/api/blogs")
      .then((items) => {
        if (!active) return;
        setBlogs((Array.isArray(items) ? items : []).filter((blog) => blog.published !== false));
        setBlogsLoaded(true);
      })
      .catch(() => {
        if (active) {
          setBlogs([]);
          setBlogsLoaded(true);
        }
      });

    apiFetch("/api/public/courses")
      .then((items) => {
        if (!active) return;
        setPublicCourses(Array.isArray(items) ? items.slice(0, 3) : []);
      })
      .catch(() => {
        if (active) setPublicCourses([]);
      });

    apiFetch("/api/public/departments")
      .then((items) => {
        if (!active) return;
        setPublicDepartments(Array.isArray(items) ? items.slice(0, 3) : []);
      })
      .catch(() => {
        if (active) setPublicDepartments([]);
      });

    return () => {
      active = false;
      window.clearInterval(statsInterval);
    };
  }, []);

  const visibleBlogs = blogs.slice(0, 3);
  const statsWithBlogCount = liveStats.map((item, index) =>
    index === newsStatIndex ? { ...item, value: blogsLoaded ? formatStatValue(blogs.length) : "--" } : item
  );
  const departmentImage = (department, index) =>
    department?.imageUrl ||
    cmsDepartmentImageFallbacks.byName[normalizeDepartmentName(department?.name)] ||
    cmsDepartmentImageFallbacks.images[index % cmsDepartmentImageFallbacks.images.length];
  const currentHeroImage = cmsContent.heroImageUrl || heroBg;
  const heroSlides = useMemo(
    () => [
      {
        title: "Advanced Technological Institute Jaffna",
        subtitle: translate(cmsContent.heroDescription) || t("home.heroText"),
        image: currentHeroImage,
        ctaText: "Explore Courses",
        ctaLink: "/courses"
      },
      {
        title: "Learn With Purpose",
        subtitle: "Build practical skills, professional confidence, and a clear pathway into Sri Lanka's technology and industry sectors.",
        image: currentHeroImage,
        ctaText: "Student Portal",
        ctaLink: "/login"
      },
      {
        title: "A Campus For Tomorrow",
        subtitle: "Discover programmes, announcements, student services, and ATI Jaffna updates in one connected digital experience.",
        image: currentHeroImage,
        ctaText: "Latest News",
        ctaLink: "/news"
      }
    ],
    [cmsContent.heroDescription, currentHeroImage, t, translate]
  );

  return (
    <>
      <HeroSlider slides={heroSlides} autoplay autoplayDelay={5000} />

      <ParallaxSection className="px-4 py-20 sm:px-6 lg:px-8" speed={18}>
        <div className="relative mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {statsWithBlogCount.map((item, index) => {
            const Icon = icons[index];
            return (
              <div
                key={item.label}
              >
                <GlassCard className="group text-center">
                  <Icon className="mx-auto mb-4 text-clay-accent transition duration-300 group-hover:scale-110" size={30} />
                  <p className="text-3xl font-black text-clay-text">{item.value}</p>
                  <p className="mt-1 text-sm font-bold text-clay-muted">{item.label}</p>
                </GlassCard>
              </div>
            );
          })}
        </div>
      </ParallaxSection>

      {hasCmsSections && (
        <ParallaxSection className="page-section pt-0" speed={24}>
          <div className="mx-auto max-w-7xl">
            <CmsSections cmsPage={visibleCmsPage} />
          </div>
        </ParallaxSection>
      )}

      {notices.length > 0 && (
        <ParallaxSection className="page-section pt-0" speed={28}>
          <div className="mx-auto max-w-7xl">
            <SectionHeader eyebrow={t("home.notices")} title={t("home.latestAnnouncements")} text={t("home.noticesText")} />
            <div
              className="grid gap-5 md:grid-cols-3"
            >
              {notices.map((notice, index) => (
                <article
                  key={notice._id || `${notice.title}-${index}`}
                >
                  <GlassCard className="h-full">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-clay-accent">
                        <Bell size={18} />
                      </span>
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-clay-muted">{formatDate(notice.createdAt)}</span>
                    </div>
                    <span className={`mb-3 inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-black ${noticeCategoryClasses[noticeCategory(notice)]}`}>
                      {noticeCategory(notice) === "Event" ? "Events" : noticeCategory(notice)}
                    </span>
                    <h3 className="text-xl font-black text-clay-text">{notice.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-clay-muted">{notice.body}</p>
                  </GlassCard>
                </article>
              ))}
            </div>
          </div>
        </ParallaxSection>
      )}

      <CampusParallaxSection>
          <div
            className="max-w-2xl text-white"
          >
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-blue-200">{t("home.campusLife")}</p>
            <h2 className="mt-3 text-3xl font-black md:text-5xl">{t("home.campusTitle")}</h2>
            <p className="mt-5 text-base leading-7 text-slate-100">{t("home.campusText")}</p>
          </div>
      </CampusParallaxSection>

      <ParallaxSection className="page-section pt-0" speed={24}>
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow={t("home.pathways")} title={t("home.popularCourses")} text={t("home.coursesText")} />
          <div
            className="grid gap-5 md:grid-cols-3"
          >
            {publicCourses.map((course) => (
              <div
                key={course._id || course.title}
              >
                <GlassCard className="group">
                  <h3 className="text-xl font-black text-clay-text">{course.title}</h3>
                  <p className="mt-3 text-sm text-clay-muted">
                    {[course.duration, course.entryRequirements].filter(Boolean).join(" | ") || "Course details will be updated soon."}
                  </p>
                  <a href="/courses" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-clay-accent transition group-hover:gap-3">
                    {t("common.viewCourses")} <ArrowRight size={16} />
                  </a>
                </GlassCard>
              </div>
            ))}
          </div>
        </div>
      </ParallaxSection>

      <ParallaxSection className="page-section bg-clay-card/60" speed={22}>
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow={t("home.departments")} title={t("home.communities")} text={t("home.departmentsText")} />
          <div
            className="grid gap-5 md:grid-cols-3"
          >
            {publicDepartments.map((department, index) => (
              <article
                key={department._id || department.name}
                className="clay-image-card group"
              >
                {departmentImage(department, index) ? (
                  <img src={departmentImage(department, index)} alt="" className="h-48 w-full object-cover transition duration-700 group-hover:scale-110" />
                ) : (
                  <div className="flex h-48 w-full items-center justify-center bg-slate-100 text-clay-accent">
                    <GraduationCap size={40} />
                  </div>
                )}
                <div className="grow p-5">
                  <h3 className="text-lg font-black text-clay-text">{department.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-clay-muted">
                    {department.description || "Department details will be updated by ATI Jaffna staff."}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </ParallaxSection>

      <ParallaxSection className="page-section" speed={20}>
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow={t("home.news")} title={t("home.events")} text={t("home.eventsText")} />
          <div
            className="grid gap-5 md:grid-cols-3"
          >
            {visibleBlogs.length > 0 ? (
              visibleBlogs.map((blog) => (
                <article
                  key={blog._id || blog.title}
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
                      {t("common.readBlog")} <ArrowRight size={16} />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm md:col-span-3">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-clay-accent">{t("common.noBlogs")}</p>
                <h3 className="mt-3 text-2xl font-black text-clay-text">{t("common.noBlogsText")}</h3>
                <p className="mt-2 text-sm text-clay-muted">{t("common.noBlogsHint")}</p>
              </div>
            )}
          </div>
        </div>
      </ParallaxSection>
    </>
  );
}
