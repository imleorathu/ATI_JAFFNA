import mongoose from "mongoose";

const timetableEntrySchema = new mongoose.Schema(
  {
    department: { type: String, required: true, trim: true },
    academicStage: {
      type: String,
      enum: ["First year Full Time", "Second year Full Time", "First year Part Time", "Second year Part Time", ""],
      default: "",
      trim: true
    },
    day: {
      type: String,
      required: true,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    },
    time: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    lecturer: { type: String, trim: true },
    room: { type: String, trim: true }
  },
  { timestamps: true }
);

export default mongoose.model("TimetableEntry", timetableEntrySchema);
