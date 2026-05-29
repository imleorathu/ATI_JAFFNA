import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    url: { type: String, required: true, trim: true },
    type: { type: String, enum: ["file", "link", "video", "youtube", "google-doc"], default: "link" },
    mimeType: { type: String, trim: true },
    size: { type: Number, default: 0 },
    addedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, trim: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
    message: { type: String, required: true, trim: true },
    visibility: { type: String, enum: ["public", "private"], default: "public" },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const submissionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    studentName: { type: String, required: true, trim: true },
    studentId: { type: String, trim: true },
    files: { type: [attachmentSchema], default: [] },
    googleDocLinks: { type: [attachmentSchema], default: [] },
    note: { type: String, trim: true },
    status: { type: String, enum: ["submitted", "missing", "late", "returned", "resubmission_requested"], default: "submitted" },
    marks: { type: Number, min: 0, default: null },
    rubric: { type: String, trim: true },
    feedback: { type: String, trim: true },
    privateFeedback: { type: String, trim: true },
    submittedAt: { type: Date, default: Date.now },
    gradedAt: { type: Date }
  },
  { _id: true }
);

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    topicModule: { type: String, trim: true },
    description: { type: String, trim: true },
    department: { type: String, required: true, trim: true },
    academicStage: {
      type: String,
      enum: ["First year Full Time", "Second year Full Time", "First year Part Time", "Second year Part Time", ""],
      default: "",
      trim: true
    },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
    studentName: { type: String, trim: true },
    studentId: { type: String, trim: true },
    dueDate: { type: Date, required: true },
    totalMarks: { type: Number, default: 100, min: 0 },
    status: { type: String, enum: ["draft", "published", "closed"], default: "published" },
    publishAt: { type: Date },
    visibility: { type: String, enum: ["department", "group", "student"], default: "department" },
    notifyByEmail: { type: Boolean, default: false },
    attachmentUrl: { type: String, trim: true },
    attachments: { type: [attachmentSchema], default: [] },
    materials: { type: [attachmentSchema], default: [] },
    announcements: { type: [commentSchema], default: [] },
    comments: { type: [commentSchema], default: [] },
    submissions: { type: [submissionSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

assignmentSchema.index({ department: 1, academicStage: 1, dueDate: 1 });
assignmentSchema.index({ student: 1, dueDate: 1 });

export default mongoose.model("Assignment", assignmentSchema);
