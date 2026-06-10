import mongoose from "mongoose";

const transactionLogSchema = new mongoose.Schema(
  {
    status: { type: String, trim: true },
    message: { type: String, trim: true },
    metadata: { type: Object },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    paymentNumber: { type: String, required: true, unique: true, trim: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    studentId: { type: String, required: true, trim: true },
    studentName: { type: String, required: true, trim: true },
    departmentId: { type: String, required: true, trim: true },
    feeRecord: { type: mongoose.Schema.Types.ObjectId, ref: "StudentFee" },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    amount: { type: Number, required: true, min: 1 },
    method: {
      type: String,
      enum: [
        "Cash",
        "Card",
        "Credit/Debit Card",
        "Bank Transfer",
        "Internet Banking",
        "Mobile Wallet",
        "UPI/QR Payment",
        "Online Payment",
        "PayHere",
        "Stripe",
        "PayPal"
      ],
      required: true
    },
    transactionReference: { type: String, trim: true },
    paymentDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["pending", "validated", "failed", "refunded"], default: "validated" },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    transactionLogs: [transactionLogSchema]
  },
  { timestamps: true }
);

paymentSchema.index({ departmentId: 1, paymentDate: -1 });
paymentSchema.index({ student: 1, paymentDate: -1 });

export default mongoose.model("Payment", paymentSchema);
