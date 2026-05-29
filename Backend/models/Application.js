import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    nic: { type: String, required: true, trim: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    documentUrls: [{ type: String }],
    status: { type: String, enum: ["pending", "reviewing", "approved", "rejected"], default: "pending" }
  },
  { timestamps: true }
);

export default mongoose.model("Application", applicationSchema);
