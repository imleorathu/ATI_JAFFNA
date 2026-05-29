import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, enum: ["contact", "complaint"], default: "contact" },
    department: { type: String, trim: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", default: null },
    studentName: { type: String, trim: true },
    studentId: { type: String, trim: true },
    status: { type: String, enum: ["new", "read", "resolved", "archived"], default: "new" },
    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
    category: { type: String, enum: ["general", "fees", "academic", "technical"], default: "general" },
    assignedTo: { type: String, trim: true },
    internalNote: { type: String, trim: true },
    repliedAt: { type: Date }
  },
  { timestamps: true }
);

contactSchema.index({ department: 1, status: 1, createdAt: -1 });
contactSchema.index({ student: 1, createdAt: -1 });

export default mongoose.model("Contact", contactSchema);
