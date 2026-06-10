import mongoose from "mongoose";

const departmentStaffSchema = new mongoose.Schema(
  {
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", unique: true, sparse: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    department: { type: String, required: true, trim: true },
    staffType: { type: String, enum: ["Teaching Staff", "Head of the department"], default: "Teaching Staff" },
    status: { type: String, enum: ["Active", "On Leave", "Inactive"], default: "Active" },
    coursesAssigned: { type: Number, default: 0, min: 0 },
    joinDate: { type: Date },
    office: { type: String, trim: true },
    bio: { type: String, trim: true }
  },
  { timestamps: true }
);

departmentStaffSchema.index({ department: 1, staffType: 1, fullName: 1 });

export default mongoose.model("DepartmentStaff", departmentStaffSchema);
