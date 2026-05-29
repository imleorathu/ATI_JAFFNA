import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    mustChangePassword: { type: Boolean, default: false },
    role: { type: String, enum: ["student", "lecturer", "admin"], default: "student" },
    accountStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    studentProfile: {
      studentId: { type: String, trim: true },
      nic: { type: String, trim: true },
      department: { type: String, trim: true },
      program: { type: String, trim: true },
      intake: { type: String, trim: true },
      academicYear: { type: String, trim: true },
      academicStage: {
        type: String,
        enum: ["First year Full Time", "Second year Full Time", "First year Part Time", "Second year Part Time", ""],
        default: "",
        trim: true
      },
      studyMode: { type: String, enum: ["Full-time", "Part-time", ""], default: "" },
      phone: { type: String, trim: true },
      guardianName: { type: String, trim: true },
      guardianPhone: { type: String, trim: true },
      profilePhotoUrl: { type: String, trim: true }
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
