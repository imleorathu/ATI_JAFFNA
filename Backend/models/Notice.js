import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    audience: { type: String, enum: ["all", "students", "lecturers", "admins"], default: "all" }
  },
  { timestamps: true }
);

export default mongoose.model("Notice", noticeSchema);
