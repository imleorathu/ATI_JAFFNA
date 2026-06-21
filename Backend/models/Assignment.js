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

const assignmentDetailsSchema = new mongoose.Schema(
  {
    lecturerDepartment: { type: String, trim: true },
    academicYearSemester: { type: String, trim: true },
    category: { type: String, enum: ["Quiz", "Homework", "Research", "Lab Report", "Presentation", "Project", ""], default: "" },
    coverImage: { type: attachmentSchema, default: null },
    estimatedCompletionTime: { type: String, trim: true },
    difficultyLevel: { type: String, enum: ["Beginner", "Intermediate", "Advanced", "Expert", ""], default: "" },
    plagiarismSettings: { type: String, trim: true },
    autoSaveDraft: { type: Boolean, default: true },
    gradingType: { type: String, enum: ["manual", "auto", "hybrid", ""], default: "" },
    passMark: { type: Number, default: 0 },
    gradeScale: { type: String, trim: true, default: "Percentage Based" },
    lateSubmissionPenalty: { type: Number, default: 0 },
    missingFilePenalty: { type: Number, default: 0 },
    plagiarismPenalty: { type: Number, default: 0 },
    formId: { type: String, trim: true },
    audienceSelection: { type: String, enum: ["course", "batch", "group", "students", ""], default: "" },
    selectedAudienceGroup: { type: String, trim: true },
    selectedStudentIds: { type: [String], default: [] },
    inAppNotification: { type: Boolean, default: true },
    smsNotification: { type: Boolean, default: false },
    confirmationFields: {
      assignmentName: { type: Boolean, default: true },
      totalMarks: { type: Boolean, default: true },
      studentCount: { type: Boolean, default: true },
      estimatedCompletionTime: { type: Boolean, default: true }
    }
  },
  { _id: false }
);

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    topicModule: { type: String, trim: true },
    description: { type: String, trim: true },
    instructions: { type: String, trim: true },
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
    totalMarks: { type: Number, default: 100, min: 0 },
    status: { type: String, enum: ["draft", "published", "closed"], default: "published" },
    publishAt: { type: Date },
    notifyByEmail: { type: Boolean, default: false },
    attachmentUrl: { type: String, trim: true },
    attachments: { type: [attachmentSchema], default: [] },
    materials: { type: [attachmentSchema], default: [] },
    details: { type: assignmentDetailsSchema, default: () => ({}) },
    announcements: { type: [commentSchema], default: [] },
    comments: { type: [commentSchema], default: [] },
    submissions: { type: [submissionSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

assignmentSchema.index({ department: 1, academicStage: 1, createdAt: -1 });
assignmentSchema.index({ student: 1, createdAt: -1 });

export default mongoose.model("Assignment", assignmentSchema);
