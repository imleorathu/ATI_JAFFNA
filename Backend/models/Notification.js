import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    departmentId: { type: String, trim: true },
    type: {
      type: String,
      enum: ["fee_due_reminder", "payment_confirmation", "refund_notification", "overdue_alert"],
      required: true
    },
    channel: { type: String, enum: ["in_app", "email", "sms"], default: "in_app" },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ["queued", "sent", "failed", "read"], default: "queued" },
    sentAt: { type: Date },
    metadata: { type: Object }
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });
notificationSchema.index({ departmentId: 1, type: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
