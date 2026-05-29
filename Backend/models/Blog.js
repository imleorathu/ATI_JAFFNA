import mongoose from "mongoose";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, unique: true, sparse: true },
    excerpt: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    imageUrl: { type: String, trim: true },
    author: { type: String, trim: true, default: "ATI Jaffna Admin" },
    published: { type: Boolean, default: true }
  },
  { timestamps: true }
);

blogSchema.pre("validate", function setSlug() {
  if (!this.slug && this.title) {
    this.slug = `${slugify(this.title)}-${Date.now().toString(36)}`;
  } else if (this.slug) {
    this.slug = slugify(this.slug);
  }
});

export default mongoose.model("Blog", blogSchema);
