import mongoose from "mongoose";

const materialTypes = ["lecture-note", "presentation", "assignment", "tutorial", "past-paper", "reference", "video-link", "other"];

const studyMaterialSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 2000 },
  materialType: { type: String, enum: materialTypes, required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
  department: { type: String, required: true, trim: true, index: true },
  program: { type: String, trim: true },
  subject: { type: String, trim: true, default: "General" },
  academicYear: { type: String, trim: true },
  academicYears: [{ type: String, trim: true }],
  semester: { type: String, trim: true },
  topic: { type: String, trim: true, maxlength: 160 },
  weekNumber: { type: Number, min: 1, max: 52 },
  externalUrl: { type: String, trim: true },
  storedFileName: { type: String, trim: true, select: false },
  fileName: { type: String, trim: true },
  fileSize: { type: Number, min: 0 },
  mimeType: { type: String, trim: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  uploaderName: { type: String, trim: true },
  isPublished: { type: Boolean, default: false, index: true }
}, { timestamps: true });

studyMaterialSchema.index({ course: 1, isPublished: 1, createdAt: -1 });
studyMaterialSchema.index({ course: 1, subject: 1, createdAt: -1 });

export { materialTypes };
export default mongoose.model("StudyMaterial", studyMaterialSchema);
