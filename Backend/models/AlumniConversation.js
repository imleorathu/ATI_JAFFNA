import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["direct", "department", "global", "custom"],
      required: true,
      index: true,
    },
    name: { type: String, trim: true, maxlength: 120 },
    department: { type: String, trim: true, index: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    clearedFor: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      clearedAt: { type: Date, required: true },
    }],
  },
  { timestamps: true },
);

schema.index({ members: 1, lastMessageAt: -1 });
schema.index(
  { type: 1, department: 1 },
  { unique: true, partialFilterExpression: { type: "department" } },
);
schema.index(
  { type: 1 },
  { unique: true, partialFilterExpression: { type: "global" } },
);

export default mongoose.model("AlumniConversation", schema);
