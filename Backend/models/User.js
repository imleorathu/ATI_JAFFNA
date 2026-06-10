import mongoose from "mongoose";

const studentProfileSchema = new mongoose.Schema(
  {
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
  },
  { _id: false }
);

const staffProfileSchema = new mongoose.Schema(
  {
    staffId: { type: String, trim: true },
    department: { type: String, trim: true },
    staffType: { type: String, trim: true },
    phone: { type: String, trim: true },
    office: { type: String, trim: true },
    bio: { type: String, trim: true },
    profilePhotoUrl: { type: String, trim: true }
  },
  { _id: false }
);

const adminProfileSchema = new mongoose.Schema(
  {
    staffId: { type: String, trim: true },
    designation: { type: String, trim: true },
    department: { type: String, trim: true },
    phone: { type: String, trim: true },
    office: { type: String, trim: true },
    profilePhotoUrl: { type: String, trim: true }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    mustChangePassword: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ["student", "lecturer", "admin", "finance_officer", "department_staff"],
      default: "student",
      set: (value) => {
        const role = String(value || "student").toLowerCase();
        if (["staff", "faculty"].includes(role)) return "lecturer";
        if (["finance officer", "finance-officer", "finance"].includes(role)) return "finance_officer";
        if (["department staff", "department-staff"].includes(role)) return "department_staff";
        return role;
      }
    },
    accountStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    studentProfile: { type: studentProfileSchema, default: undefined },
    staffProfile: { type: staffProfileSchema, default: undefined },
    adminProfile: { type: adminProfileSchema, default: undefined }
  },
  { timestamps: true }
);

const emptyProfile = (profile) => !profile || Object.values(profile.toObject ? profile.toObject() : profile).every((value) => value === undefined || value === null || value === "");

userSchema.pre("validate", function validateProfileForRole() {
  if (this.role === "student") {
    this.staffProfile = undefined;
    this.adminProfile = undefined;
    if (!this.studentProfile?.studentId || !this.studentProfile?.nic || !this.studentProfile?.department) {
      this.invalidate("studentProfile", "Student ID, NIC, and department are required for student accounts.");
    }
  } else if (["lecturer", "department_staff", "finance_officer"].includes(this.role)) {
    this.studentProfile = undefined;
    this.adminProfile = undefined;
    if (emptyProfile(this.staffProfile)) {
      this.invalidate("staffProfile", "Staff profile is required for staff accounts.");
    }
    const staffType = String(this.staffProfile?.staffType || "").trim();
    if (["lecturer", "department_staff"].includes(this.role) && ["Teaching Staff", "Head of the department", "Department Staff", ""].includes(staffType) && !this.staffProfile?.department) {
      this.invalidate("staffProfile.department", "Department is required for teaching staff accounts.");
    }
  } else if (this.role === "admin") {
    this.studentProfile = undefined;
    this.staffProfile = undefined;
    if (emptyProfile(this.adminProfile)) {
      this.adminProfile = { designation: "Administrator" };
    }
  }
});

userSchema.index({ role: 1, accountStatus: 1, createdAt: -1 });
userSchema.index(
  { "studentProfile.studentId": 1 },
  {
    unique: true,
    partialFilterExpression: { role: "student", "studentProfile.studentId": { $exists: true, $type: "string" } }
  }
);
userSchema.index(
  { "staffProfile.department": 1, role: 1 },
  {
    partialFilterExpression: { role: "lecturer", "staffProfile.department": { $exists: true, $type: "string" } }
  }
);

export default mongoose.model("User", userSchema);
