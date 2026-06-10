import mongoose from "mongoose";

const adminStaffSchema = new mongoose.Schema(
  {
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", unique: true, sparse: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    staffType: { type: String, enum: ["Administrative Staff", "Director"], default: "Administrative Staff" },
    status: { type: String, enum: ["Active", "On Leave", "Inactive"], default: "Active" },
    joinDate: { type: Date },
    office: { type: String, trim: true },
    bio: { type: String, trim: true }
  },
  { timestamps: true }
);

adminStaffSchema.index({ staffType: 1, fullName: 1 });

export default mongoose.model("AdminStaff", adminStaffSchema);
