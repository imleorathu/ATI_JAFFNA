import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AlumniConversation",
      required: true,
      index: true,
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    messageType: { type: String, enum: ["user", "system_violation"], default: "user" },
    violatedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, default: "", trim: true, maxlength: 5000 },
    attachments: [{
      url: String,
      storedName: String,
      originalName: String,
      mimeType: String,
      size: Number,
      mediaType: { type: String, enum: ["image", "video", "file"] },
    }],
    moderation: {
      provider: String,
      categories: String,
      moderatedAt: Date,
    },
    editedAt: Date,
    reactions: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      emoji: { type: String, enum: ["👍", "❤️", "😂", "😮", "😢", "🙏"], required: true },
      reactedAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true },
);

schema.index({ conversation: 1, createdAt: -1 });
export default mongoose.model("AlumniChatMessage", schema);
