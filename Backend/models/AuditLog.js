import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String, trim: true },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    departmentId: { type: String, trim: true },
    before: { type: Object },
    after: { type: Object },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true }
  },
  { timestamps: true }
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ departmentId: 1, createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
