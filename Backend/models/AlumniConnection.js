import mongoose from "mongoose";
const schema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected", "cancelled"], default: "pending" },
  requestMessage: { type: String, trim: true, maxlength: 500, default: "" },
  recipientSeenAt: { type: Date, default: null }
}, { timestamps: true });
schema.index({ requester: 1, recipient: 1 }, { unique: true });
schema.index({ recipient: 1, status: 1, createdAt: -1 });
export default mongoose.model("AlumniConnection", schema);
