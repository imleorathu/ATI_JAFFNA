import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    message: { type: String, trim: true, maxlength: 1000, required: true },
    adminNote: { type: String, trim: true, maxlength: 1000 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
  },
  { timestamps: true },
);

schema.index({ user: 1, createdAt: -1 });
export default mongoose.model("AlumniChatAccessRequest", schema);
