import mongoose from "mongoose";
const schema = new mongoose.Schema({ recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, type: { type: String, required: true, trim: true }, title: { type: String, required: true, trim: true }, message: { type: String, required: true, trim: true }, targetType: String, targetId: mongoose.Schema.Types.ObjectId, readAt: Date, dedupeKey: { type: String, trim: true } }, { timestamps: true });
schema.index({ recipient: 1, readAt: 1, createdAt: -1 });
schema.index({ recipient: 1, dedupeKey: 1 }, { unique: true, sparse: true });
export default mongoose.model("AlumniNotification", schema);
