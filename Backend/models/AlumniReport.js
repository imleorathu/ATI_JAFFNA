import mongoose from "mongoose";
const schema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, targetType: { type: String, enum: ["profile", "post", "comment", "chat_user", "chat_message"], required: true }, targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reason: { type: String, required: true, trim: true }, explanation: { type: String, trim: true, maxlength: 3000 },
  status: { type: String, enum: ["submitted", "under_review", "action_required", "resolved", "rejected", "escalated"], default: "submitted", index: true },
  assignedModerator: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, resolution: String, resolvedAt: Date
}, { timestamps: true });
schema.index({ targetType: 1, targetId: 1, createdAt: -1 });
export default mongoose.model("AlumniReport", schema);
