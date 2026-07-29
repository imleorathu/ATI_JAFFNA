import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    feature: { type: String, enum: ["chat", "post"], required: true },
    blocked: { type: Boolean, default: true },
    reason: { type: String, trim: true, maxlength: 1000 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

schema.index({ user: 1, feature: 1 }, { unique: true });
export default mongoose.model("AlumniRestriction", schema);
