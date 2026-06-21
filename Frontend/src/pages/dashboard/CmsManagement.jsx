import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Download, ExternalLink, Eye, EyeOff, FilePenLine, FileUp, Globe2, Plus, RotateCcw, Save, Send, Trash2, Upload } from "lucide-react";
import GlassCard from "../../components/GlassCard";
import { apiFetch } from "../../lib/api";
import { useModal } from "../../contexts/ModalContext.jsx";

const baseEditablePages = [
  ["home", "Home"],
  ["about", "About"],
  ["faculties", "Faculties"],
  ["news", "News"],
  ["contact", "Contact"]
];

function publicPathForPage(pageOrSlug) {
  const slug = typeof pageOrSlug === "string" ? pageOrSlug : pageOrSlug?.slug;
  if (slug === "home") return "/";
  return `/${slug}`;
}

const emptyDraft = {
  heroTitle: "",
  heroDescription: "",
  heroImageUrl: "",
  primaryButtonText: "",
  primaryButtonLink: "",
  secondaryButtonText: "",
  secondaryButtonLink: "",
  seoTitle: "",
  seoDescription: "",
  sections: []
};

const sectionTypes = [
  ["card", "Card"],
  ["feature", "Feature"],
  ["banner", "Banner"],
  ["quote", "Quote"],
  ["embed", "Embed"],
  ["stats", "Stats"]
];

const sectionLayouts = [
  ["grid", "Grid"],
  ["wide", "Wide"],
  ["split", "Split"],
  ["compact", "Compact"]
];

const sectionTemplates = [
  ["blank", "Blank section", {}],
  ["announcement", "Announcement", { type: "banner", layout: "wide", eyebrow: "Announcement", title: "Important Update", body: "Write the announcement details here." }],
  ["staff", "Staff profile", { type: "feature", layout: "split", eyebrow: "Faculty", title: "Staff Member Name", body: "Designation, department, qualifications, and contact details." }],
  ["faq", "FAQ", { type: "card", layout: "compact", eyebrow: "FAQ", title: "Question", body: "Answer the common question here." }],
  ["quote", "Principal message", { type: "quote", layout: "wide", eyebrow: "Message", title: "Principal / Director Message", body: "Add the message text here.", textAlign: "center" }],
  ["map", "Map embed", { type: "embed", layout: "wide", eyebrow: "Location", title: "Visit ATI Jaffna", body: "Embed a Google Map or other public iframe URL.", embedUrl: "https://www.google.com/maps?q=Jaffna%20Sri%20Lanka&output=embed" }]
];

const createSection = (overrides = {}) => ({
  type: "card",
  layout: "grid",
  title: "",
  eyebrow: "",
  body: "",
  imageUrl: "",
  embedUrl: "",
  buttonText: "",
  buttonLink: "",
  backgroundColor: "",
  textAlign: "left",
  visible: true,
  ...overrides
});

function normalizeDraft(draft = {}) {
  return {
    ...emptyDraft,
    ...draft,
    sections: Array.isArray(draft.sections) ? draft.sections.map((section) => createSection(section)) : []
  };
}

function hasDraftContent(draft = {}) {
  return Boolean(
    draft.heroTitle ||
    draft.heroDescription ||
    draft.heroImageUrl ||
    draft.seoTitle ||
    draft.seoDescription ||
    draft.sections?.length
  );
}

function draftForCmsPage(slug, page) {
  if (page?.draft && hasDraftContent(page.draft)) return normalizeDraft(page.draft);
  return normalizeDraft(page?.draft);
}

export default function CmsManagement() {
  const { confirm } = useModal();
  const [pages, setPages] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("home");
  const [draft, setDraft] = useState(emptyDraft);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [templateKey, setTemplateKey] = useState("blank");

  const selectedPage = useMemo(
    () => pages.find((page) => page.slug === selectedSlug) || { slug: selectedSlug, title: baseEditablePages.find(([slug]) => slug === selectedSlug)?.[1] || selectedSlug, status: "draft" },
    [pages, selectedSlug]
  );
  const selectedTemplate = useMemo(() => sectionTemplates.find(([key]) => key === templateKey) || sectionTemplates[0], [templateKey]);
  const mainPages = useMemo(() => {
    const baseSlugs = new Set(baseEditablePages.map(([slug]) => slug));
    const otherDynamicPages = pages
      .filter((page) => !baseSlugs.has(page.slug) && !page.slug.startsWith("faculty-details-"))
      .sort((a, b) => String(a.title || a.slug).localeCompare(String(b.title || b.slug)))
      .map((page) => [page.slug, page.title || page.slug]);
    return [...baseEditablePages, ...otherDynamicPages];
  }, [pages]);

  const loadPages = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch("/api/cms/pages");
      setPages(result);
      const current = result.find((page) => page.slug === selectedSlug) || result[0];
      if (current) {
        setSelectedSlug(current.slug);
        setDraft(draftForCmsPage(current.slug, current));
        setDirty(false);
      }
    } catch (err) {
      setError(err?.message || "Unable to load CMS pages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const selectPage = async (slug) => {
    if (dirty && !await confirm({ title: "Discard unsaved changes?", message: "Switch pages and discard the current CMS draft changes?", confirmLabel: "Discard changes", tone: "warning" })) return;
    const page = pages.find((item) => item.slug === slug);
    setSelectedSlug(slug);
    setDraft(draftForCmsPage(slug, page));
    setPreview(false);
    setStatus("");
    setError("");
    setDirty(false);
  };

  const updateDraft = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const updateSection = (index, key, value) => {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [key]: value } : section
      )
    }));
    setDirty(true);
  };

  const addSection = () => {
    setDraft((current) => ({
      ...current,
      sections: [...current.sections, createSection()]
    }));
    setDirty(true);
  };

  const addTemplateSection = () => {
    const [, , template] = selectedTemplate;
    setDraft((current) => ({
      ...current,
      sections: [...current.sections, createSection(template)]
    }));
    setDirty(true);
  };

  const removeSection = async (index) => {
    if (!await confirm({ title: "Delete section?", message: `Delete section ${index + 1} from this draft?`, confirmLabel: "Delete section", tone: "danger" })) return;
    setDraft((current) => ({
      ...current,
      sections: current.sections.filter((_, sectionIndex) => sectionIndex !== index)
    }));
    setDirty(true);
  };

  const duplicateSection = (index) => {
    setDraft((current) => ({
      ...current,
      sections: current.sections.flatMap((section, sectionIndex) =>
        sectionIndex === index ? [section, { ...section, title: section.title ? `${section.title} Copy` : "" }] : [section]
      )
    }));
    setDirty(true);
  };

  const moveSection = (index, direction) => {
    setDraft((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.sections.length) return current;
      const sections = [...current.sections];
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...current, sections };
    });
    setDirty(true);
  };

  const restorePublished = async () => {
    if (!selectedPage?.publishedAt) return;
    if (!await confirm({ title: "Restore published content?", message: "Replace the current draft with the live published content?", confirmLabel: "Restore content", tone: "warning" })) return;
    setDraft(normalizeDraft(selectedPage.published));
    setDirty(true);
    setStatus("Published content restored into the draft editor.");
  };

  const resetDraft = async () => {
    if (!await confirm({ title: "Clear this draft?", message: "Published content stays live until you publish again.", confirmLabel: "Clear draft", tone: "danger" })) return;
    setDraft(emptyDraft);
    setPreview(false);
    setDirty(true);
    setStatus("Draft cleared. Save draft or publish to apply this change.");
  };

  const openPublicPage = () => {
    const path = publicPathForPage(selectedPage);
    window.open(path, "_blank", "noopener,noreferrer");
  };

  const uploadImage = async (file, onComplete) => {
    if (!file) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const result = await apiFetch("/api/cms/uploads", { method: "POST", body: formData });
      onComplete(result.url);
      setDirty(true);
      setStatus("Image uploaded.");
    } catch (err) {
      setError(err?.message || "Unable to upload image.");
    } finally {
      setSaving(false);
    }
  };

  const mergeUpdatedPage = (updated) => {
    setPages((current) => {
      const exists = current.some((page) => page.slug === updated.slug);
      return exists
        ? current.map((page) => (page.slug === updated.slug ? updated : page))
        : [...current, updated];
    });
  };

  const persistDraft = async () => {
    const updated = await apiFetch(`/api/cms/pages/${selectedSlug}/draft`, {
      method: "PUT",
      body: JSON.stringify({ title: selectedPage.title, draft })
    });
    mergeUpdatedPage(updated);
    setDraft(normalizeDraft(updated.draft));
    setDirty(false);
    return updated;
  };

  const saveDraft = async () => {
    setSaving(true);
    setError("");
    setStatus("");
    try {
      await persistDraft();
      setStatus("Draft saved.");
    } catch (err) {
      setError(err?.message || "Unable to save draft.");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setSaving(true);
    setError("");
    setStatus("");
    try {
      await persistDraft();
      const updated = await apiFetch(`/api/cms/pages/${selectedSlug}/publish`, { method: "POST" });
      mergeUpdatedPage(updated);
      setDirty(false);
      setStatus("Page published.");
    } catch (err) {
      setError(err?.message || "Unable to publish page.");
    } finally {
      setSaving(false);
    }
  };

  const unpublish = async () => {
    if (!await confirm({ title: "Unpublish page?", message: "Remove this CMS content from the public website?", confirmLabel: "Unpublish", tone: "warning" })) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const updated = await apiFetch(`/api/cms/pages/${selectedSlug}/unpublish`, { method: "POST" });
      mergeUpdatedPage(updated);
      setStatus("Page unpublished.");
    } catch (err) {
      setError(err?.message || "Unable to unpublish page.");
    } finally {
      setSaving(false);
    }
  };

  const exportDraft = () => {
    const blob = new Blob([JSON.stringify({ slug: selectedSlug, title: selectedPage.title, draft }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ati-cms-${selectedSlug}-draft.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importDraft = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        const importedDraft = normalizeDraft(parsed.draft || parsed);
        setDraft(importedDraft);
        setPreview(false);
        setDirty(true);
        setStatus("Draft imported. Review it, then save or publish.");
        setError("");
      } catch {
        setError("The selected file is not valid CMS draft JSON.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[color:var(--md-border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="portal-page-label">Advanced CMS</p>
          <h1 className="portal-page-title">Page Customization</h1>
          <p className="portal-page-subtitle">Edit website text, banners, buttons, SEO, sections, drafts, and publishing status.</p>
          {dirty && <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--md-warning)]">Unsaved changes</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={saveDraft} disabled={saving} className="portal-btn disabled:opacity-60">
            <Save size={16} />
            Save Draft
          </button>
          <button type="button" onClick={restorePublished} disabled={!selectedPage?.publishedAt || saving} className="portal-btn">
            <RotateCcw size={16} />
            Restore Live
          </button>
          <button type="button" onClick={openPublicPage} className="portal-btn">
            <ExternalLink size={16} />
            View Page
          </button>
          <button type="button" onClick={exportDraft} className="portal-btn">
            <Download size={16} />
            Export
          </button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] transition hover:bg-[color:var(--md-hover)]">
            <FileUp size={16} />
            Import
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                importDraft(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          <button type="button" onClick={resetDraft} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-[color:var(--md-danger)] transition hover:bg-red-500/20 disabled:opacity-60">
            <Trash2 size={16} />
            Clear Draft
          </button>
          <button type="button" onClick={publish} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60">
            <Send size={16} />
            Publish
          </button>
          <button type="button" onClick={unpublish} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-red-500/15 px-3 py-2 text-sm font-bold text-[color:var(--md-danger)] transition hover:bg-red-500/25 disabled:opacity-60">
            <EyeOff size={16} />
            Unpublish
          </button>
        </div>
      </div>

      {error && <div className="portal-alert-danger">{error}</div>}
      {status && <div className="portal-alert-success">{status}</div>}

      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
        <GlassCard className="p-4">
          <h2 className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-[color:var(--md-text-secondary)]">Pages</h2>
          <div className="space-y-2">
            {mainPages.map(([slug, title]) => {
              const page = pages.find((item) => item.slug === slug);
              const active = selectedSlug === slug;
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => selectPage(slug)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition ${active ? "bg-sky-500 text-slate-950" : "bg-[color:var(--md-hover)] text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)] hover:text-[color:var(--md-text-primary)]"}`}
                >
                  <span className="font-bold">{title}</span>
                  <span className={`text-xs capitalize ${active ? "text-slate-800" : "text-[color:var(--md-text-secondary)]"}`}>{page?.status || "draft"}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 grid gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-3 text-xs text-[color:var(--md-text-secondary)]">
            <div className="flex justify-between"><span>Draft sections</span><strong className="text-[color:var(--md-text-primary)]">{draft.sections.length}</strong></div>
            <div className="flex justify-between"><span>Visible</span><strong className="text-[color:var(--md-success)]">{draft.sections.filter((section) => section.visible !== false).length}</strong></div>
            <div className="flex justify-between"><span>Hidden</span><strong className="text-[color:var(--md-warning)]">{draft.sections.filter((section) => section.visible === false).length}</strong></div>
            <div className="flex justify-between"><span>Published</span><strong className="text-[color:var(--md-primary)]">{selectedPage?.publishedAt ? new Date(selectedPage.publishedAt).toLocaleDateString() : "No"}</strong></div>
            <div className="flex justify-between"><span>Draft status</span><strong className={dirty ? "text-[color:var(--md-warning)]" : "text-[color:var(--md-success)]"}>{dirty ? "Unsaved" : "Saved"}</strong></div>
          </div>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="classroom-section-title">{selectedPage.title} Content</h2>
                <p className="text-xs text-[color:var(--md-text-secondary)]">{loading ? "Loading CMS data..." : `Status: ${selectedPage.status || "draft"}`}</p>
              </div>
              <button type="button" onClick={() => setPreview((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)]">
                <Eye size={16} />
                {preview ? "Edit" : "Preview"}
              </button>
            </div>

            {preview ? (
              <div className="space-y-5 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--md-primary)]">Hero</p>
                  <h3 className="portal-page-title">{draft.heroTitle || selectedPage.title}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--md-text-secondary)]">{draft.heroDescription || "No description added."}</p>
                </div>
                {draft.heroImageUrl && <img src={draft.heroImageUrl} alt="" className="max-h-80 w-full rounded-lg object-cover" />}
                <div className="grid gap-3 md:grid-cols-2">
                  {draft.sections.filter((section) => section.visible !== false).map((section, index) => (
                    <div key={`${section.title}-${index}`} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
                      {section.imageUrl && <img src={section.imageUrl} alt="" className="mb-3 h-36 w-full rounded-lg object-cover" />}
                      {section.eyebrow && <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--md-primary)]">{section.eyebrow}</p>}
                      <h4 className="font-semibold" style={{color:"var(--md-text-primary)"}}>{section.title || "Untitled section"}</h4>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[color:var(--md-text-secondary)]">{section.body || "No body text."}</p>
                      {section.embedUrl && <p className="mt-2 text-xs text-[color:var(--md-text-secondary)]">Embed: {section.embedUrl}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
                  <input value={draft.heroTitle} onChange={(event) => updateDraft("heroTitle", event.target.value)} placeholder="Hero title" className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400" />
                  <input value={draft.heroImageUrl} onChange={(event) => updateDraft("heroImageUrl", event.target.value)} placeholder="Hero image or banner URL" className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400" />
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2.5 text-sm font-bold text-[color:var(--md-text-secondary)] transition hover:bg-[color:var(--md-hover)]">
                    <Upload size={16} />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        uploadImage(event.target.files?.[0], (url) => updateDraft("heroImageUrl", url));
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <textarea value={draft.heroDescription} onChange={(event) => updateDraft("heroDescription", event.target.value)} placeholder="Hero description" rows={3} className="resize-none rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400" />
                <div className="grid gap-4 lg:grid-cols-4">
                  <input value={draft.heroTitle} onChange={(event) => updateDraft("heroTitle", event.target.value)} placeholder="Hero title" className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400" />
                  <input value={draft.heroImageUrl} onChange={(event) => updateDraft("heroImageUrl", event.target.value)} placeholder="Hero image or banner URL" className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400" />
                </div>
              </div>
            )}
          </GlassCard>

          {!preview && (
            <>
              <GlassCard className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="classroom-section-title">Sections</h2>
                    <p className="text-xs text-[color:var(--md-text-secondary)]">Add custom page sections and hide or show each one.</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select value={templateKey} onChange={(event) => setTemplateKey(event.target.value)} className="portal-input">
                      {sectionTemplates.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                    <button type="button" onClick={addTemplateSection} className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-3 py-2 text-sm font-black text-slate-950">
                      <Plus size={16} />
                      Add
                    </button>
                    <button type="button" onClick={addSection} className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)]">
                      <Plus size={16} />
                      Blank
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {draft.sections.length === 0 ? (
                    <p className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-4 py-6 text-center text-sm text-[color:var(--md-text-secondary)]">No custom sections yet.</p>
                  ) : (
                    draft.sections.map((section, index) => (
                      <div key={section._id || index} className="portal-row-item">
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-black text-[color:var(--md-text-primary)]">Section {index + 1}</p>
                            <p className="text-xs capitalize text-[color:var(--md-text-secondary)]">{section.type} | {section.layout}</p>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => moveSection(index, -1)} disabled={index === 0} className="rounded-lg bg-[color:var(--md-hover)] p-2 text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)] disabled:opacity-30">
                              <ArrowUp size={16} />
                            </button>
                            <button type="button" onClick={() => moveSection(index, 1)} disabled={index === draft.sections.length - 1} className="rounded-lg bg-[color:var(--md-hover)] p-2 text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)] disabled:opacity-30">
                              <ArrowDown size={16} />
                            </button>
                            <button type="button" onClick={() => duplicateSection(index)} className="rounded-lg bg-[color:var(--md-hover)] p-2 text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
                              <Copy size={16} />
                            </button>
                            <button type="button" onClick={() => updateSection(index, "visible", section.visible === false)} className="rounded-lg bg-[color:var(--md-hover)] p-2 text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]">
                              {section.visible === false ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <button type="button" onClick={() => removeSection(index)} className="rounded-lg bg-red-500/10 p-2 text-[color:var(--md-danger)] hover:bg-red-500/20">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="mb-3 grid gap-3 lg:grid-cols-4">
                          <select value={section.type || "card"} onChange={(event) => updateSection(index, "type", event.target.value)} className="portal-input">
                            {sectionTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                          <select value={section.layout || "grid"} onChange={(event) => updateSection(index, "layout", event.target.value)} className="portal-input">
                            {sectionLayouts.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </select>
                          <select value={section.textAlign || "left"} onChange={(event) => updateSection(index, "textAlign", event.target.value)} className="portal-input">
                            <option value="left">Left align</option>
                            <option value="center">Center align</option>
                          </select>
                          <input value={section.backgroundColor || ""} onChange={(event) => updateSection(index, "backgroundColor", event.target.value)} placeholder="Background color (#ffffff)" className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400" />
                        </div>
                        <div className="grid gap-3 lg:grid-cols-2">
                          <input value={section.backgroundColor || ""} onChange={(event) => updateSection(index, "backgroundColor", event.target.value)} placeholder="Background color (#ffffff)" className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400" />
                          <input value={section.eyebrow || ""} onChange={(event) => updateSection(index, "eyebrow", event.target.value)} placeholder="Small label / eyebrow" className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400" />
                          <input value={section.title || ""} onChange={(event) => updateSection(index, "title", event.target.value)} placeholder="Section title" className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400" />
                          <input value={section.imageUrl || ""} onChange={(event) => updateSection(index, "imageUrl", event.target.value)} placeholder="Image URL" className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400" />
                          <input value={section.embedUrl || ""} onChange={(event) => updateSection(index, "embedUrl", event.target.value)} placeholder="Embed URL (map, video, form)" className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400" />
                          <input value={section.buttonText || ""} onChange={(event) => updateSection(index, "buttonText", event.target.value)} placeholder="Button text" className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400" />
                          <input value={section.buttonLink || ""} onChange={(event) => updateSection(index, "buttonLink", event.target.value)} placeholder="Button link" className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400" />
                        </div>
                        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] transition hover:bg-[color:var(--md-hover)]">
                          <Upload size={16} />
                          Upload section image
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              uploadImage(event.target.files?.[0], (url) => updateSection(index, "imageUrl", url));
                              event.target.value = "";
                            }}
                          />
                        </label>
                        <textarea value={section.body || ""} onChange={(event) => updateSection(index, "body", event.target.value)} placeholder="Section body text" rows={4} className="mt-3 w-full resize-none rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400" />
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Globe2 className="text-[color:var(--md-primary)]" size={20} />
                  <h2 className="classroom-section-title">SEO</h2>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <input value={draft.seoTitle} onChange={(event) => updateDraft("seoTitle", event.target.value)} placeholder="SEO title" className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400" />
                  <input value={draft.seoDescription} onChange={(event) => updateDraft("seoDescription", event.target.value)} placeholder="SEO description" className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400" />
                </div>
              </GlassCard>
            </>
          )}

          <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-4 py-3 text-xs leading-5 text-[color:var(--md-text-secondary)]">
            <FilePenLine className="mr-2 inline text-[color:var(--md-text-secondary)]" size={14} />
            Uploads are stored under the backend /uploads/cms folder. You can also paste external image and banner URLs.
          </div>
        </div>
      </div>
    </section>
  );
}
