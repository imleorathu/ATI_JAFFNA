import PageContent from "../models/PageContent.js";

const editablePages = [
  { slug: "home", title: "Home" },
  { slug: "about", title: "About" },
  { slug: "faculties", title: "Faculties" },
  { slug: "courses", title: "Courses" },
  { slug: "news", title: "News" },
  { slug: "contact", title: "Contact" }
];

const emptyContent = {
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

const aboutDefaults = {
  ...emptyContent,
  sections: [
    {
      type: "card",
      layout: "grid",
      title: "University History",
      body: "ATI Jaffna has grown as a regional hub for higher national diplomas, helping students connect academic learning with employable skills and community contribution."
    },
    {
      type: "card",
      layout: "grid",
      title: "Vision & Mission",
      body: "Our vision is to develop confident graduates. Our mission is to provide accessible, high-quality, practical education through committed teaching and industry relevance."
    },
    {
      type: "quote",
      layout: "wide",
      title: "Principal / Director Message",
      body: "We welcome learners who are ready to build knowledge, discipline, and purpose. ATI Jaffna is committed to creating a supportive environment where students can prepare for professional life."
    },
    {
      type: "feature",
      layout: "grid",
      imageUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=900&q=80"
    },
    {
      type: "feature",
      layout: "grid",
      imageUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=900&q=80"
    },
    {
      type: "feature",
      layout: "grid",
      imageUrl: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=900&q=80"
    }
  ]
};

const facultiesDefaults = {
  ...emptyContent,
  sections: [
    {
      type: "feature",
      layout: "grid",
      title: "Higher National Diploma in Information Technology - (HNDIT)",
      body: "Information technology, software development, networking, databases, and practical digital problem solving.",
      imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=900&q=80",
      buttonText: "",
      buttonLink: ""
    },
    {
      type: "feature",
      layout: "grid",
      title: "Higher National Diploma in Management - (HNDM)",
      body: "Management, leadership, operations, accounting, and modern organizational practice.",
      imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
      buttonText: "",
      buttonLink: ""
    },
    {
      type: "feature",
      layout: "grid",
      title: "Higher National Diploma in English",
      body: "English language, communication, academic writing, literature, and professional fluency.",
      imageUrl: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80",
      buttonText: "",
      buttonLink: ""
    },
    {
      type: "feature",
      layout: "grid",
      title: "Higher National Diploma in Engineering",
      body: "Applied engineering foundations with workshop and project-based learning.",
      imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=900&q=80",
      buttonText: "",
      buttonLink: ""
    },
    {
      type: "feature",
      layout: "grid",
      title: "Higher National Diploma in Accountancy - (HNDA)",
      body: "Accountancy, finance, taxation, auditing, and practical business reporting.",
      imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=900&q=80",
      buttonText: "",
      buttonLink: ""
    }
  ]
};

const coursesDefaults = {
  ...emptyContent,
  sections: [
    {
      type: "card",
      layout: "grid",
      title: "HND in IT",
      body: "Duration: 2.5 Years\nEntry: A/L with ICT or equivalent\nFee: Contact office",
      buttonText: "Contact",
      buttonLink: "/contact"
    },
    {
      type: "card",
      layout: "grid",
      title: "HND in Management",
      body: "Duration: 2 Years\nEntry: A/L in any stream\nFee: Contact office",
      buttonText: "Contact",
      buttonLink: "/contact"
    },
    {
      type: "card",
      layout: "grid",
      title: "HND in English",
      body: "Duration: 2 Years\nEntry: A/L and English proficiency\nFee: Contact office",
      buttonText: "Contact",
      buttonLink: "/contact"
    },
    {
      type: "card",
      layout: "grid",
      title: "HND in Accountancy",
      body: "Duration: 2.5 Years\nEntry: A/L commerce preferred\nFee: Contact office",
      buttonText: "Contact",
      buttonLink: "/contact"
    },
    {
      type: "card",
      layout: "grid",
      title: "HND in Engineering Technology",
      body: "Duration: 3 Years\nEntry: A/L technology or maths stream\nFee: Contact office",
      buttonText: "Contact",
      buttonLink: "/contact"
    },
    {
      type: "card",
      layout: "grid",
      title: "Diploma in Business IT",
      body: "Duration: 1 Year\nEntry: O/L with basic computer literacy\nFee: Contact office",
      buttonText: "Contact",
      buttonLink: "/contact"
    }
  ]
};

function normalizeContent(content = {}) {
  return {
    ...emptyContent,
    ...content,
    sections: Array.isArray(content.sections)
      ? content.sections.map((section) => ({
          type: section.type || "card",
          layout: section.layout || "grid",
          title: section.title || "",
          eyebrow: section.eyebrow || "",
          body: section.body || "",
          imageUrl: section.imageUrl || "",
          embedUrl: section.embedUrl || "",
          buttonText: section.buttonText || "",
          buttonLink: section.buttonLink || "",
          backgroundColor: section.backgroundColor || "",
          textAlign: section.textAlign === "center" ? "center" : "left",
          visible: section.visible !== false
        }))
      : []
  };
}

function titleForSlug(slug) {
  return editablePages.find((page) => page.slug === slug)?.title || slug;
}

function isEditableSlug(slug) {
  return editablePages.some((page) => page.slug === slug);
}

function defaultContentForSlug(slug) {
  if (slug === "about") return aboutDefaults;
  if (slug === "faculties") return facultiesDefaults;
  if (slug === "courses") return coursesDefaults;
  return emptyContent;
}

function shouldPublishDefault(slug) {
  return ["about", "faculties", "courses"].includes(slug);
}

async function ensurePages() {
  await Promise.all(
    editablePages.map((page) => {
      const defaultContent = normalizeContent(defaultContentForSlug(page.slug));
      return PageContent.updateOne(
        { slug: page.slug },
        {
          $setOnInsert: {
            slug: page.slug,
            title: page.title,
            draft: defaultContent,
            published: defaultContent,
            status: shouldPublishDefault(page.slug) ? "published" : "draft",
            ...(shouldPublishDefault(page.slug) ? { publishedAt: new Date() } : {})
          }
        },
        { upsert: true }
      );
    })
  );

  await PageContent.updateOne(
    { slug: "about", "draft.sections": { $size: 0 }, "published.sections": { $size: 0 } },
    {
      $set: {
        "draft.sections": normalizeContent(aboutDefaults).sections,
        "published.sections": normalizeContent(aboutDefaults).sections,
        status: "published",
        publishedAt: new Date()
      }
    }
  );

  await PageContent.updateOne(
    { slug: "faculties", "draft.sections": { $size: 0 }, "published.sections": { $size: 0 } },
    {
      $set: {
        "draft.sections": normalizeContent(facultiesDefaults).sections,
        "published.sections": normalizeContent(facultiesDefaults).sections,
        status: "published",
        publishedAt: new Date()
      }
    }
  );

  await PageContent.updateOne(
    { slug: "courses", "draft.sections": { $size: 0 }, "published.sections": { $size: 0 } },
    {
      $set: {
        "draft.sections": normalizeContent(coursesDefaults).sections,
        "published.sections": normalizeContent(coursesDefaults).sections,
        status: "published",
        publishedAt: new Date()
      }
    }
  );

  const facultiesPage = await PageContent.findOne({ slug: "faculties" });
  if (facultiesPage) {
    const removeDetailLinks = (sections = []) => sections.map((section) => {
      const rawSection = section.toObject?.() || section;
      const currentLink = String(section.buttonLink || "");
      const isFacultyDetailLink = currentLink.startsWith("/faculties/");
      return {
        ...rawSection,
        buttonText: isFacultyDetailLink || section.buttonText === "View Details" ? "" : section.buttonText,
        buttonLink: isFacultyDetailLink ? "" : section.buttonLink
      };
    });

    const draftContent = facultiesPage.draft?.toObject?.() || facultiesPage.draft || {};
    const publishedContent = facultiesPage.published?.toObject?.() || facultiesPage.published || {};
    facultiesPage.draft = normalizeContent({ ...draftContent, sections: removeDetailLinks(draftContent.sections || []) });
    facultiesPage.published = normalizeContent({ ...publishedContent, sections: removeDetailLinks(publishedContent.sections || []) });
    await facultiesPage.save();
  }
}

export async function listPages(req, res, next) {
  try {
    await ensurePages();
    const pages = await PageContent.find({ slug: { $not: /^faculty-details/ } }).sort({ title: 1 });
    res.json(pages);
  } catch (error) {
    next(error);
  }
}

export async function saveDraft(req, res, next) {
  try {
    const slug = String(req.params.slug || "").toLowerCase();
    if (!isEditableSlug(slug)) return res.status(404).json({ message: "Page content not found" });
    const existing = await PageContent.findOne({ slug });
    const page = await PageContent.findOneAndUpdate(
      { slug },
      {
        slug,
        title: req.body.title || titleForSlug(slug),
        draft: normalizeContent(req.body.draft || req.body),
        status: existing?.status || "draft"
      },
      { upsert: true, returnDocument: "after", runValidators: true }
    );

    res.json(page);
  } catch (error) {
    next(error);
  }
}

export async function publishPage(req, res, next) {
  try {
    const slug = String(req.params.slug || "").toLowerCase();
    if (!isEditableSlug(slug)) return res.status(404).json({ message: "Page content not found" });
    const page = await PageContent.findOne({ slug });
    if (!page) return res.status(404).json({ message: "Page content not found" });

    page.published = normalizeContent(page.draft);
    page.status = "published";
    page.publishedAt = new Date();
    await page.save();

    res.json(page);
  } catch (error) {
    next(error);
  }
}

export async function unpublishPage(req, res, next) {
  try {
    const slug = String(req.params.slug || "").toLowerCase();
    if (!isEditableSlug(slug)) return res.status(404).json({ message: "Page content not found" });
    const page = await PageContent.findOneAndUpdate(
      { slug },
      { status: "unpublished" },
      { returnDocument: "after" }
    );
    if (!page) return res.status(404).json({ message: "Page content not found" });

    res.json(page);
  } catch (error) {
    next(error);
  }
}

export async function getPublishedPage(req, res, next) {
  try {
    await ensurePages();
    const slug = String(req.params.slug || "").toLowerCase();
    if (!isEditableSlug(slug)) return res.json(null);
    const page = await PageContent.findOne({
      slug,
      status: "published"
    }).select("slug title status published publishedAt updatedAt");

    if (!page) return res.json(null);
    res.json(page);
  } catch (error) {
    next(error);
  }
}
