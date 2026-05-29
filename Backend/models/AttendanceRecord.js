import mongoose from "mongoose";

const attendanceRecordSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    timetableEntry: { type: mongoose.Schema.Types.ObjectId, ref: "TimetableEntry", required: true },
    studentName: { type: String, required: true, trim: true },
    studentId: { type: String, trim: true },
    department: { type: String, required: true, trim: true },
    academicStage: { type: String, trim: true },
    subject: { type: String, required: true, trim: true },
    lecturer: { type: String, trim: true },
    room: { type: String, trim: true },
    date: { type: String, required: true, trim: true },
    day: { type: String, required: true, trim: true },
    time: { type: String, required: true, trim: true },
    status: { type: String, enum: ["present"], default: "present" },
    method: { type: String, enum: ["GPS"], default: "GPS" },
    markedAt: { type: Date, default: Date.now },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number },
    distanceMeters: { type: Number }
  },
  { timestamps: true }
);

attendanceRecordSchema.index({ student: 1, timetableEntry: 1, date: 1 }, { unique: true });
attendanceRecordSchema.index({ department: 1, subject: 1, date: 1 });

export default mongoose.model("AttendanceRecord", attendanceRecordSchema);
