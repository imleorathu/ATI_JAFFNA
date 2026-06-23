import mongoose from "mongoose";

const donationSchema = new mongoose.Schema(
  {
    donationId: { type: String, required: true, unique: true, trim: true },
    receiptNumber: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    purpose: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: "DonationCampaign" },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending" },
    transactionId: { type: String, trim: true },
    paymentMethod: { type: String, trim: true },
    paymentProvider: { type: String, trim: true, default: "Local Gateway" },
    isAnonymous: { type: Boolean, default: false },
    message: { type: String, trim: true },
    source: { type: String, trim: true, default: "website" },
    paidAt: { type: Date },
    receiptSentAt: { type: Date },
    certificateNumber: { type: String, trim: true }
  },
  { timestamps: true }
);

donationSchema.index({ createdAt: -1 });
donationSchema.index({ paymentStatus: 1, createdAt: -1 });
donationSchema.index({ purpose: 1, createdAt: -1 });
donationSchema.index({ campaign: 1, createdAt: -1 });
donationSchema.index({ email: 1, createdAt: -1 });

export default mongoose.model("Donation", donationSchema);
