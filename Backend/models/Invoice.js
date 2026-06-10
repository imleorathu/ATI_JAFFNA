import mongoose from "mongoose";

const invoiceLineSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    feeRecord: { type: mongoose.Schema.Types.ObjectId, ref: "StudentFee" }
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    studentId: { type: String, required: true, trim: true },
    studentName: { type: String, required: true, trim: true },
    departmentId: { type: String, required: true, trim: true },
    semesterName: { type: String, trim: true },
    academicYear: { type: String, trim: true },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    lateFeeAmount: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["unpaid", "partial", "paid", "void"], default: "unpaid" },
    lines: [invoiceLineSchema],
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

invoiceSchema.index({ departmentId: 1, status: 1, dueDate: 1 });
invoiceSchema.index({ student: 1, createdAt: -1 });

export default mongoose.model("Invoice", invoiceSchema);
