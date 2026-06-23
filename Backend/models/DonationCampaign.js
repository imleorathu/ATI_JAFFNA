import mongoose from "mongoose";

const donationCampaignSchema = new mongoose.Schema(
  {
    campaignName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    targetAmount: { type: Number, required: true, min: 1 },
    raisedAmount: { type: Number, default: 0, min: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    status: { type: String, enum: ["draft", "active", "paused", "completed"], default: "active" }
  },
  { timestamps: true }
);

donationCampaignSchema.index({ status: 1, startDate: -1 });
donationCampaignSchema.index({ campaignName: 1 });

export default mongoose.model("DonationCampaign", donationCampaignSchema);
