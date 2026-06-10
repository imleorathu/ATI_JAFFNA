import mongoose from "mongoose";

const receiptSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true, unique: true, trim: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    studentId: { type: String, required: true, trim: true },
    studentName: { type: String, required: true, trim: true },
    departmentId: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    issuedAt: { type: Date, default: Date.now },
    qrVerificationCode: { type: String, required: true, unique: true, trim: true },
    reprintHistory: [
      {
        printedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        printedAt: { type: Date, default: Date.now },
        reason: { type: String, trim: true }
      }
    ]
  },
  { timestamps: true }
);

receiptSchema.index({ departmentId: 1, issuedAt: -1 });
receiptSchema.index({ student: 1, issuedAt: -1 });

export default mongoose.model("Receipt", receiptSchema);
