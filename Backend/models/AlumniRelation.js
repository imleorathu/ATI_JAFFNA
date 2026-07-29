import mongoose from "mongoose";
const schema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["follow", "block"], required: true }
}, { timestamps: true });
schema.index({ actor: 1, target: 1, type: 1 }, { unique: true });
schema.index({ target: 1, type: 1 });
export default mongoose.model("AlumniRelation", schema);
