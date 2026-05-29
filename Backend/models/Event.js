import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    imageUrl: { type: String, trim: true },
    description: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema);
