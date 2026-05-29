import mongoose from "mongoose";

const knowledgeChunkSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: "KnowledgeDocument", required: true },
    department: { type: String, required: true, trim: true },
    topicModule: { type: String, trim: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    tokens: { type: [String], default: [] },
    vector: { type: Map, of: Number, default: {} },
    visibility: { type: String, enum: ["department", "private"], default: "department" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

knowledgeChunkSchema.index({ department: 1, visibility: 1, document: 1 });
knowledgeChunkSchema.index({ uploadedBy: 1, visibility: 1, document: 1 });
knowledgeChunkSchema.index({ tokens: 1 });

export default mongoose.model("KnowledgeChunk", knowledgeChunkSchema);
