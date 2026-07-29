import mongoose from "mongoose";

const supportingDocumentSchema = new mongoose.Schema(
  {
    documentType: { type: String, required: true, trim: true },
    originalName: { type: String, required: true, trim: true },
    storedName: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true },
    size: { type: Number, min: 0 }
  },
  { _id: false }
);

const alumniSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    nameWithInitials: { type: String, trim: true },
    identityNumber: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["Male", "Female", "Other", "Prefer not to say", ""] },
    profilePhotoUrl: { type: String, trim: true },
    coverPhotoUrl: { type: String, trim: true },
    alumniIdentificationNumber: { type: String, trim: true },
    introduction: { type: String, trim: true, maxlength: 1000 },
    mobileNumber: { type: String, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    currentAddress: { type: String, trim: true },
    studentRegistrationNumber: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    programme: { type: String, required: true, trim: true },
    batch: { type: String, required: true, trim: true },
    admissionAcademicYear: { type: String, required: true, trim: true },
    graduationYear: { type: String, required: true, trim: true },
    finalStudyYear: { type: String, required: true, trim: true },
    employmentStatus: { type: String, trim: true },
    companyName: { type: String, trim: true },
    jobTitle: { type: String, trim: true },
    industry: { type: String, trim: true },
    employmentHistory: [{ company: String, jobTitle: String, startYear: String, endYear: String, description: String }],
    skills: [{ type: String, trim: true }],
    professionalQualifications: [{ type: String, trim: true }],
    higherEducationQualifications: [{ type: String, trim: true }],
    achievements: [{ type: String, trim: true }],
    currentCountry: { type: String, trim: true },
    currentCity: { type: String, trim: true },
    portfolioUrl: { type: String, trim: true },
    linkedInUrl: { type: String, trim: true },
    githubUrl: { type: String, trim: true },
    personalWebsite: { type: String, trim: true },
    mentorAvailable: { type: Boolean, default: false },
    recruitmentAvailable: { type: Boolean, default: false },
    businessOwner: { type: Boolean, default: false },
    profileCompletion: { type: Number, min: 0, max: 100, default: 0 },
    verificationStatus: { type: String, enum: ["unverified", "pending", "under_review", "additional_information_required", "verified", "rejected", "suspended"], default: "unverified" },
    verifiedAt: { type: Date },
    lastActiveAt: { type: Date, default: Date.now },
    interests: [{ type: String, trim: true }],
    supportingDocuments: [supportingDocumentSchema],
    accountStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    ,graduatedFromStudent: { type: Boolean, default: false }
    ,graduatedAt: { type: Date }
    ,sourceStudentRecordId: { type: mongoose.Schema.Types.ObjectId }
    ,studentRecordSnapshot: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

alumniSchema.index({ email: 1 }, { unique: true });
alumniSchema.index({ studentRegistrationNumber: 1 }, { unique: true });
alumniSchema.index({ accountStatus: 1, createdAt: -1 });
alumniSchema.index({ verificationStatus: 1, department: 1, graduationYear: 1 });
alumniSchema.index({ fullName: "text", programme: "text", department: "text", skills: "text", companyName: "text", jobTitle: "text", currentCity: "text", currentCountry: "text" });

export default mongoose.model("Alumni", alumniSchema);
