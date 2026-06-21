import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: [
      "short-answer", "paragraph", "multiple-choice", "checkboxes",
      "dropdown", "file-upload", "linear-scale", "multiple-choice-grid",
      "checkbox-grid", "date-picker", "time-picker", "email",
      "phone", "url", "number", "rating", "signature",
      "section-break", "page-break", "rich-text-block", "image-question", "video-question"
    ],
    required: true
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
  required: { type: Boolean, default: false },
  options: [{ type: String, trim: true }],
  rows: [{ type: String, trim: true }],
  columns: [{ type: String, trim: true }],
  min: { type: Number },
  max: { type: Number },
  step: { type: Number },
  accept: { type: String },
  validation: {
    pattern: { type: String },
    message: { type: String },
    minLength: { type: Number },
    maxLength: { type: Number },
    minValue: { type: Number },
    maxValue: { type: Number }
  },
  conditionalLogic: { type: String, trim: true, default: "" },
  answerKey: { type: mongoose.Schema.Types.Mixed, default: "" },
  answerDescription: { type: String, trim: true, default: "" },
  marks: { type: Number, default: 0 },
  negativeMarks: { type: Number, default: 0 },
  imageUrl: { type: String },
  videoUrl: { type: String }
}, { _id: false });

const sectionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, trim: true, default: "" },
  description: { type: String, trim: true, default: "" },
  questions: [questionSchema]
}, { _id: false });

const formSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
  formType: {
    type: String,
    enum: ["blank", "assignment", "quiz", "survey", "feedback", "attendance", "template"],
    default: "blank"
  },
  department: { type: String, required: true, trim: true },
  academicStage: {
    type: String,
    enum: ["First year Full Time", "Second year Full Time", "First year Part Time", "Second year Part Time", ""],
    default: ""
  },
  sections: [sectionSchema],
  settings: {
    acceptResponses: { type: Boolean, default: true },
    responseLimit: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    password: { type: String, default: "" },
    notifyByEmail: { type: Boolean, default: false },
    oneResponsePerUser: { type: Boolean, default: false },
    emailVerification: { type: Boolean, default: false },
    progressBar: { type: Boolean, default: false },
    passingMarks: { type: Number, default: 0 },
    configuredTotalMarks: { type: Number, default: 0 },
    gradeScale: { type: String, trim: true, default: "Percentage Based" },
    dueDate: { type: Date },
    submissionDeadline: { type: Date },
    gradingMode: { type: String, enum: ["auto", "manual", "hybrid"], default: "auto" },
    negativeMarking: { type: Number, default: 0 },
    lateSubmissionPenalty: { type: Number, default: 0 },
    missingFilePenalty: { type: Number, default: 0 },
    plagiarismPenalty: { type: Number, default: 0 },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleAnswers: { type: Boolean, default: false },
    timerMinutes: { type: Number, default: 0 },
    autoSubmit: { type: Boolean, default: false },
    syncGrades: { type: Boolean, default: true },
    gradeSubject: { type: String, trim: true, default: "Form Assessment" },
    gradeSemester: { type: Number, default: 1 },
    gradeCredits: { type: Number, default: 0 },
    theme: { type: String, default: "default" },
    customColors: { type: String, default: "" },
    customFonts: { type: String, default: "" }
  },
  status: {
    type: String,
    enum: ["draft", "published", "closed", "archived"],
    default: "draft"
  },
  totalMarks: { type: Number, default: 0 },
  passingMarks: { type: Number, default: 0 },
  autoGrading: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  responses: [{
    respondent: { type: String, default: "" },
    respondentEmail: { type: String, default: "" },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
    studentId: { type: String, trim: true, default: "" },
    answers: [{
      questionId: { type: String, required: true },
      value: { type: mongoose.Schema.Types.Mixed }
    }],
    marks: { type: Number, default: null },
    feedback: { type: String, default: "" },
    gradeSynced: { type: Boolean, default: false },
    submittedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

formSchema.index({ department: 1, status: 1, createdAt: -1 });
formSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.model("Form", formSchema);
