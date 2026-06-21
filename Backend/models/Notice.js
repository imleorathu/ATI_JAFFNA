import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    audience: { type: String, enum: ["all", "students", "lecturers", "admins"], default: "all" },
    category: { type: String, enum: ["Urgent", "Academic", "Event", "General"], default: "General" }
  },
  { timestamps: true }
);

export default mongoose.model("Notice", noticeSchema);
