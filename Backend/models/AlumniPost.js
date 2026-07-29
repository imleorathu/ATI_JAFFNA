import mongoose from "mongoose";
const reactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: {
      type: String,
      enum: ["like", "haha", "celebrate", "support", "helpful", "interested"],
    },
  },
  { timestamps: true },
);
const replySchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    edited: { type: Boolean, default: false },
    reactions: [reactionSchema],
  },
  { timestamps: true },
);
const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    parentId: { type: mongoose.Schema.Types.ObjectId, default: null },
    content: { type: String, default: "", trim: true, maxlength: 3000 },
    media: [
      {
        url: { type: String, trim: true },
        originalName: { type: String, trim: true },
        mimeType: { type: String, trim: true },
        size: { type: Number, min: 0 },
        source: { type: String, enum: ["upload", "giphy", "tenor"], default: "upload" },
      },
    ],
    edited: { type: Boolean, default: false },
    reactions: [reactionSchema],
    replies: [replySchema],
  },
  { timestamps: true },
);
const schema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: { type: String, default: "", trim: true, maxlength: 10000 },
    postType: {
      type: String,
      enum: [
        "text",
        "image",
        "video",
        "document",
        "career_update",
        "achievement",
        "job_opportunity",
        "question",
        "poll",
        "event",
        "mentorship_opportunity",
        "business_promotion",
        "institutional_announcement",
      ],
      default: "text",
    },
    media: [
      { url: String, originalName: String, mimeType: String, size: Number },
    ],
    visibility: {
      type: String,
      enum: [
        "everyone",
        "verified_alumni",
        "students_alumni",
        "connections",
        "administrators",
        "only_me",
      ],
      default: "verified_alumni",
      index: true,
    },
    pollOptions: [
      {
        text: String,
        voters: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      },
    ],
    pollClosesAt: Date,
    pollMultipleAnswers: { type: Boolean, default: false },
    taggedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    hashtags: [String],
    location: String,
    feelingActivity: String,
    structuredData: { type: mongoose.Schema.Types.Mixed, default: {} },
    backgroundColor: String,
    edited: { type: Boolean, default: false },
    commentsEnabled: { type: Boolean, default: true },
    sharingEnabled: { type: Boolean, default: true },
    hideReactionCounts: { type: Boolean, default: false },
    hiddenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    reactions: [reactionSchema],
    comments: [commentSchema],
    originalPost: { type: mongoose.Schema.Types.ObjectId, ref: "AlumniPost" },
    shareText: String,
    shareCount: { type: Number, default: 0 },
    moderationStatus: {
      type: String,
      enum: ["published", "under_review", "removed"],
      default: "published",
      index: true,
    },
  },
  { timestamps: true },
);
schema.index({ moderationStatus: 1, createdAt: -1 });
schema.index({ hashtags: 1, createdAt: -1 });
export default mongoose.model("AlumniPost", schema);
