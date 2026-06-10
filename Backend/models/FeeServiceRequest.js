import mongoose from "mongoose";

const feeServiceRequestSchema = new mongoose.Schema(
  {
    requestNumber: { type: String, required: true, unique: true, trim: true },
    type: {
      type: String,
      enum: [
        "bank_slip_upload",
        "installment_plan",
        "fee_extension",
        "statement_download",
        "fee_policy",
        "no_due_certificate",
        "fee_waiver",
        "scholarship",
        "discount"
      ],
      required: true
    },
    title: { type: String, required: true, trim: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    studentId: { type: String, required: true, trim: true },
    studentName: { type: String, required: true, trim: true },
    departmentId: { type: String, required: true, trim: true },
    feeRecord: { type: mongoose.Schema.Types.ObjectId, ref: "StudentFee" },
    amount: { type: Number, min: 0 },
    note: { type: String, trim: true },
    attachmentUrl: { type: String, trim: true },
    status: { type: String, enum: ["requested", "approved", "rejected", "completed"], default: "requested" },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true },
    history: [
      {
        action: { type: String, trim: true },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
        note: { type: String, trim: true }
      }
    ]
  },
  { timestamps: true }
);

feeServiceRequestSchema.index({ departmentId: 1, status: 1, createdAt: -1 });
feeServiceRequestSchema.index({ student: 1, createdAt: -1 });

export default mongoose.model("FeeServiceRequest", feeServiceRequestSchema);
