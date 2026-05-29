import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    entryRequirements: { type: String, required: true, trim: true },
    fee: { type: String, default: "Contact office" },
    department: { type: String, trim: true },
    description: { type: String, trim: true },
    instructor: { type: String, trim: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    modules: [
      {
        title: { type: String, trim: true },
        lessons: [{ type: String, trim: true }],
        quizzes: [{ type: String, trim: true }],
        assignments: [{ type: String, trim: true }]
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("Course", courseSchema);
