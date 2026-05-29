import mongoose from "mongoose";

const facultySchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    department: { type: String, trim: true },
    staffType: { type: String, default: "Teaching Staff", trim: true },
    status: { type: String, enum: ["Active", "On Leave", "Inactive"], default: "Active" },
    coursesAssigned: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    joinDate: { type: Date },
    office: { type: String, trim: true },
    bio: { type: String, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model("Faculty", facultySchema);
