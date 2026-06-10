import mongoose from "mongoose";

const studentFeeSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    studentId: { type: String, required: true, trim: true },
    studentName: { type: String, required: true, trim: true },
    departmentId: { type: String, required: true, trim: true },
    departmentName: { type: String, trim: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    courseName: { type: String, trim: true },
    semesterName: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    feeStructure: { type: mongoose.Schema.Types.ObjectId, ref: "FeeStructure" },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "FeeCategory" },
    description: { type: String, trim: true },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    lateFeeAmount: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ["pending", "partial", "paid", "overdue", "cancelled"], default: "pending" },
    installmentPlan: [
      {
        label: { type: String, trim: true },
        amount: { type: Number, min: 0 },
        dueDate: { type: Date },
        status: { type: String, enum: ["pending", "paid", "overdue"], default: "pending" }
      }
    ],
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

studentFeeSchema.virtual("outstandingAmount").get(function outstandingAmount() {
  return Math.max(0, (this.totalAmount || 0) + (this.lateFeeAmount || 0) - (this.discountAmount || 0) - (this.paidAmount || 0));
});

studentFeeSchema.set("toJSON", { virtuals: true });
studentFeeSchema.set("toObject", { virtuals: true });
studentFeeSchema.index({ departmentId: 1, status: 1, dueDate: 1 });
studentFeeSchema.index({ student: 1, semesterName: 1, academicYear: 1 });
studentFeeSchema.index({ studentId: "text", studentName: "text" });

export default mongoose.model("StudentFee", studentFeeSchema);
