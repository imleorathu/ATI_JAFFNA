import mongoose from "mongoose";

const gradeRecordSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    studentName: { type: String, required: true, trim: true },
    studentId: { type: String, trim: true },
    department: { type: String, required: true, trim: true },
    academicStage: { type: String, trim: true },
    subject: { type: String, required: true, trim: true },
    semester: { type: Number, required: true, min: 1 },
    credits: { type: Number, required: true, min: 0 },
    score: { type: Number, required: true, min: 0, max: 100 },
    grade: {
      type: String,
      required: true,
      enum: ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"]
    },
    remarks: { type: String, trim: true }
  },
  { timestamps: true }
);

gradeRecordSchema.index({ student: 1, subject: 1, semester: 1 }, { unique: true });
gradeRecordSchema.index({ department: 1, student: 1 });

export default mongoose.model("GradeRecord", gradeRecordSchema);
