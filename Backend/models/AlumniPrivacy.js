import mongoose from "mongoose";
const visibility = ["everyone", "verified_users", "connections", "only_me", "administrators"];
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  fieldVisibility: { type: Map, of: { type: String, enum: visibility }, default: {} },
  profileVisibility: { type: String, enum: visibility, default: "verified_users" },
  connectionRequests: { type: String, enum: ["everyone", "verified_users", "nobody"], default: "verified_users" },
  followers: { type: String, enum: ["everyone", "verified_users", "nobody"], default: "verified_users" },
  messages: { type: String, enum: ["everyone", "connections", "nobody"], default: "connections" },
  mentions: { type: String, enum: ["everyone", "connections", "nobody"], default: "connections" },
  searchVisible: { type: Boolean, default: true }, onlineStatusVisible: { type: Boolean, default: true }, lastSeenVisible: { type: Boolean, default: true }
}, { timestamps: true });
export default mongoose.model("AlumniPrivacy", schema);
