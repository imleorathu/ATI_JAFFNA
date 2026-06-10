import mongoose from "mongoose";

const contentSectionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["card", "feature", "banner", "quote", "embed", "stats"], default: "card" },
    layout: { type: String, enum: ["grid", "wide", "split", "compact"], default: "grid" },
    title: { type: String, trim: true, default: "" },
    eyebrow: { type: String, trim: true, default: "" },
    body: { type: String, trim: true, default: "" },
    imageUrl: { type: String, trim: true, default: "" },
    embedUrl: { type: String, trim: true, default: "" },
    buttonText: { type: String, trim: true, default: "" },
    buttonLink: { type: String, trim: true, default: "" },
    backgroundColor: { type: String, trim: true, default: "" },
    textAlign: { type: String, enum: ["left", "center"], default: "left" },
    visible: { type: Boolean, default: true }
  },
  { _id: true }
);

const contentDraftSchema = new mongoose.Schema(
  {
    heroTitle: { type: String, trim: true, default: "" },
    heroDescription: { type: String, trim: true, default: "" },
    heroImageUrl: { type: String, trim: true, default: "" },
    primaryButtonText: { type: String, trim: true, default: "" },
    primaryButtonLink: { type: String, trim: true, default: "" },
    secondaryButtonText: { type: String, trim: true, default: "" },
    secondaryButtonLink: { type: String, trim: true, default: "" },
    seoTitle: { type: String, trim: true, default: "" },
    seoDescription: { type: String, trim: true, default: "" },
    sections: { type: [contentSectionSchema], default: [] }
  },
  { _id: false }
);

const pageContentSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    title: { type: String, required: true, trim: true },
    status: { type: String, enum: ["draft", "published", "unpublished"], default: "draft" },
    draft: { type: contentDraftSchema, default: () => ({}) },
    published: { type: contentDraftSchema, default: () => ({}) },
    publishedAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model("PageContent", pageContentSchema);
