import mongoose from "mongoose";

const knowledgeDocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    originalName: { type: String, trim: true },
    department: { type: String, required: true, trim: true },
    topicModule: { type: String, trim: true },
    fileType: { type: String, enum: ["pdf", "docx", "pptx", "txt"], required: true },
    fileUrl: { type: String, trim: true },
    status: { type: String, enum: ["indexing", "indexed", "failed"], default: "indexing" },
    error: { type: String, trim: true },
    chunkCount: { type: Number, default: 0 },
    visibility: { type: String, enum: ["department", "private"], default: "department" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    uploadedByName: { type: String, trim: true }
  },
  { timestamps: true }
);

knowledgeDocumentSchema.index({ department: 1, visibility: 1, status: 1, createdAt: -1 });
knowledgeDocumentSchema.index({ uploadedBy: 1, visibility: 1, createdAt: -1 });

export default mongoose.model("KnowledgeDocument", knowledgeDocumentSchema);
