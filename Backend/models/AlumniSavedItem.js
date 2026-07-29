import mongoose from "mongoose";
const schema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, itemType: { type: String, enum: ["post", "profile", "event", "page", "opportunity", "announcement", "reel"], required: true }, itemId: { type: mongoose.Schema.Types.ObjectId, required: true }, collection: { type: String, trim: true, default: "Saved" } }, { timestamps: true });
schema.index({ user: 1, itemType: 1, itemId: 1 }, { unique: true });
export default mongoose.model("AlumniSavedItem", schema);
