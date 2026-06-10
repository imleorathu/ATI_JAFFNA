import mongoose from "mongoose";

const feeCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      enum: ["Registration Fee", "Course Fee", "Examination Fee", "Library Fee", "Certificate Fee"]
    },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model("FeeCategory", feeCategorySchema);
