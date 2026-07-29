import mongoose from "mongoose";
const evidenceSchema = new mongoose.Schema({ documentType: String, originalName: String, storedName: String, mimeType: String, size: Number }, { _id: false });
const schema = new mongoose.Schema({
  alumni: { type: mongoose.Schema.Types.ObjectId, ref: "Alumni", required: true, index: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  methods: [{ type: String, enum: ["registration_number", "institutional_email", "graduation_record", "certificate", "identity_document", "manual"] }],
  evidence: [evidenceSchema],
  status: { type: String, enum: ["unverified", "pending", "under_review", "additional_information_required", "verified", "rejected", "suspended"], default: "pending", index: true },
  applicantNote: { type: String, trim: true, maxlength: 2000 },
  adminReason: { type: String, trim: true, maxlength: 2000 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, reviewedAt: Date
}, { timestamps: true });
schema.index({ alumni: 1, createdAt: -1 });
export default mongoose.model("AlumniVerification", schema);
