import mongoose from "mongoose";

const refundAuditSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    at: { type: Date, default: Date.now },
    note: { type: String, trim: true }
  },
  { _id: false }
);

const refundSchema = new mongoose.Schema(
  {
    refundNumber: { type: String, required: true, unique: true, trim: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    studentId: { type: String, required: true, trim: true },
    studentName: { type: String, required: true, trim: true },
    departmentId: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ["requested", "approved", "rejected", "paid"], default: "requested" },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true },
    auditTrail: [refundAuditSchema]
  },
  { timestamps: true }
);

refundSchema.index({ departmentId: 1, status: 1, createdAt: -1 });
refundSchema.index({ student: 1, createdAt: -1 });

export default mongoose.model("Refund", refundSchema);
