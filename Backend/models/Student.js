import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    nic: { type: String, trim: true },
    studentId: { type: String, trim: true },
    department: { type: String, trim: true },
    program: { type: String, trim: true },
    intake: { type: String, trim: true },
    academicYear: { type: String, trim: true },
    academicStage: {
      type: String,
      enum: ["First year Full Time", "Second year Full Time", "First year Part Time", "Second year Part Time", ""],
      default: "",
      trim: true
    },
    studyMode: { type: String, enum: ["Full-time", "Part-time", ""], default: "" },
    guardianName: { type: String, trim: true },
    guardianPhone: { type: String, trim: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    paymentStatus: { type: String, enum: ["not_required", "pending", "paid", "partial"], default: "pending" }
  },
  { timestamps: true }
);

studentSchema.pre("validate", function normalizePaymentStatus() {
  if (this.studyMode === "Full-time") {
    this.paymentStatus = "not_required";
  } else if (this.studyMode === "Part-time" && this.paymentStatus === "not_required") {
    this.paymentStatus = "pending";
  }
});

studentSchema.pre("findOneAndUpdate", function normalizePaymentStatusUpdate() {
  const update = this.getUpdate() || {};
  const target = update.$set || update;

  if (target.studyMode === "Full-time") {
    target.paymentStatus = "not_required";
  } else if (target.studyMode === "Part-time" && target.paymentStatus === "not_required") {
    target.paymentStatus = "pending";
  }

  if (update.$set) {
    update.$set = target;
  }

  this.setUpdate(update);
});

export default mongoose.model("Student", studentSchema);
