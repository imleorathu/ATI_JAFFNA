import mongoose from "mongoose";

const amountHistorySchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changedAt: { type: Date, default: Date.now },
    reason: { type: String, trim: true }
  },
  { _id: false }
);

const feeStructureSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "FeeCategory", required: true },
    departmentId: { type: String, required: true, trim: true },
    departmentName: { type: String, trim: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    courseName: { type: String, trim: true },
    semesterId: { type: mongoose.Schema.Types.ObjectId, ref: "Semester" },
    semesterName: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "LKR", trim: true },
    dueDays: { type: Number, default: 30, min: 0 },
    lateFeeType: { type: String, enum: ["none", "fixed", "percentage"], default: "fixed" },
    lateFeeValue: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    amountHistory: [amountHistorySchema]
  },
  { timestamps: true }
);

feeStructureSchema.index({ departmentId: 1, academicYear: 1, semesterName: 1, isActive: 1 });
feeStructureSchema.index({ category: 1, departmentId: 1, courseId: 1, semesterName: 1, academicYear: 1 });

export default mongoose.model("FeeStructure", feeStructureSchema);
