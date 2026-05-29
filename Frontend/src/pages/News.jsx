import { motion } from "framer-motion";
import { ArrowUpRight, Newspaper } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CmsSections, { CmsPageHeader } from "../components/CmsSections.jsx";
import useCmsPage, { usePageSeo } from "../hooks/useCmsPage.js";
import { apiFetch } from "../lib/api.js";

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } }
};

function formatDate(value) {
  if (!value) return "Recently";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
}

function NewsCard({ item }) {
  const navigate = useNavigate();

  return (
    <motion.article
      variants={fadeUp}
      className="clay-image-card group"
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {item.image ? (
        <img src={item.image} alt="" className="h-52 w-full object-cover transition duration-700 group-hover:scale-110" />
      ) : (
        <div className="flex h-52 w-full items-center justify-center bg-slate-100 text-clay-accent">
          <Newspaper size={42} />
        </div>
      )}
      <div className="flex grow flex-col p-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-clay-accent">{formatDate(item.date)}</p>
        <h3 className="text-xl font-black text-clay-text">{item.title}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-clay-muted">{item.description}</p>
        <motion.button
          className="clay-btn-primary mt-auto gap-2"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate(item.href)}
        >
          Read Blog
          <ArrowUpRight size={16} />
        </motion.button>
      </div>
    </motion.article>
  );
}

export default function News() {
  const cmsPage = useCmsPage("news");
  const [blogs, setBlogs] = useState([]);
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  const [blogError, setBlogError] = useState("");
  usePageSeo(cmsPage, "Blogs - ATI Jaffna", "Read ATI Jaffna campus blogs and official stories.");

  useEffect(() => {
    let active = true;
    setLoadingBlogs(true);
    setBlogError("");

    apiFetch("/api/blogs")
      .then((blogItems) => {
        if (!active) return;
        setBlogs((Array.isArray(blogItems) ? blogItems : []).filter((blog) => blog.published !== false));
      })
      .catch((error) => {
        if (!active) return;
        setBlogs([]);
        setBlogError(error.message || "Unable to load blogs.");
      })
      .finally(() => {
        if (active) setLoadingBlogs(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const blogPreviewItems = useMemo(
    () =>
      blogs.map((blog) => ({
        id: blog._id,
        type: "Blog",
        title: blog.title,
        date: blog.createdAt,
        description: blog.excerpt,
        image: blog.imageUrl || "",
        href: `/news/${blog.slug || blog._id}`
      })),
    [blogs]
  );

  return (
    <section className="page-section">
      <div className="mx-auto max-w-7xl">
        <CmsPageHeader cmsPage={cmsPage} fallbackEyebrow="Blogs" fallbackTitle="Campus Blogs" fallbackText="Stories, announcements, and long-form updates published by ATI Jaffna admins." />
        <CmsSections cmsPage={cmsPage} />
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {loadingBlogs ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm md:col-span-2 lg:col-span-3">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-clay-accent">Loading Blogs</p>
              <p className="mt-2 text-sm text-clay-muted">Preparing the latest published blog previews.</p>
            </div>
          ) : blogPreviewItems.length > 0 ? (
            blogPreviewItems.map((blog) => <NewsCard key={`blog-${blog.id || blog.title}`} item={blog} />)
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm md:col-span-2 lg:col-span-3">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-clay-accent">{blogError ? "Blog Load Error" : "No Blogs"}</p>
              <h2 className="mt-3 text-2xl font-black text-clay-text">{blogError ? "Could not load blogs." : "No published blogs yet."}</h2>
              <p className="mt-2 text-sm text-clay-muted">{blogError || "Published admin blogs will appear here as preview cards."}</p>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
