import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, Newspaper, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api.js";

function formatDate(value) {
  if (!value) return "Recently";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(parsed);
}

export default function BlogDetail() {
  const { slug } = useParams();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    apiFetch("/api/blogs")
      .then((items) => {
        if (active) setBlogs(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (active) setBlogs([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const blog = useMemo(
    () => blogs.find((item) => item.published !== false && (item.slug === slug || item._id === slug)),
    [blogs, slug]
  );

  useEffect(() => {
    if (!blog) return;
    document.title = `${blog.title} - ATI Jaffna`;
  }, [blog]);

  if (loading) {
    return (
      <section className="page-section">
        <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-8 text-center text-clay-muted shadow-sm">
          Loading blog...
        </div>
      </section>
    );
  }

  if (!blog) {
    return (
      <section className="page-section">
        <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-clay-accent">Blog not found</p>
          <h1 className="mt-3 text-2xl font-black text-clay-text">This article is not available.</h1>
          <Link to="/news" className="news-feature-action mx-auto mt-6">
            <ArrowLeft size={17} />
            Back to News
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <motion.article
        className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        {blog.imageUrl && <img src={blog.imageUrl} alt="" className="max-h-[460px] w-full object-cover" />}
        <div className="p-6 sm:p-10">
          <Link to="/news" className="mb-7 inline-flex items-center gap-2 text-sm font-black text-clay-accent">
            <ArrowLeft size={17} />
            Back to News
          </Link>
          <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-clay-accent">
            <Newspaper size={14} />
            Blog
          </p>
          <h1 className="mt-5 text-3xl font-black leading-tight text-clay-text sm:text-5xl">{blog.title}</h1>
          <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-clay-muted">
            <span className="inline-flex items-center gap-2">
              <CalendarDays size={16} />
              {formatDate(blog.createdAt)}
            </span>
            <span className="inline-flex items-center gap-2">
              <UserRound size={16} />
              {blog.author || "ATI Jaffna Admin"}
            </span>
          </div>
          <p className="mt-7 border-l-4 border-blue-500 pl-5 text-lg font-semibold leading-8 text-clay-text">{blog.excerpt}</p>
          <div className="mt-8 space-y-5 whitespace-pre-line text-base leading-8 text-slate-700">
            {blog.content}
          </div>
        </div>
      </motion.article>
    </section>
  );
}
