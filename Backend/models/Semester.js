import mongoose from "mongoose";

const semesterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, unique: true },
    academicYear: { type: String, required: true, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    status: { type: String, enum: ["planned", "active", "completed"], default: "planned" }
  },
  { timestamps: true }
);

semesterSchema.index({ academicYear: 1, status: 1 });

export default mongoose.model("Semester", semesterSchema);
