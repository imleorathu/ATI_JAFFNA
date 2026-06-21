import dotenv from "dotenv";
import mongoose from "mongoose";
import Course from "../models/Course.js";

dotenv.config();

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ATI_JAFFNA";

const courses = [
  {
    title: "HND in IT",
    duration: "2.5 Years",
    entryRequirements: "A/L with ICT or equivalent",
    fee: "Contact office",
    department: "Higher National Diploma in Information Technology - (HNDIT)",
    description: "Software, networking, databases, and practical digital problem solving."
  },
  {
    title: "HND in Management",
    duration: "2 Years",
    entryRequirements: "A/L in any stream",
    fee: "Contact office",
    department: "Higher National Diploma in Management - (HNDM)",
    description: "Leadership, operations, organizational practice, and administration."
  },
  {
    title: "HND in English",
    duration: "2 Years",
    entryRequirements: "A/L and English proficiency",
    fee: "Contact office",
    department: "Higher National Diploma in English",
    description: "Communication, academic writing, literature, and professional fluency."
  },
  {
    title: "HND in Accountancy",
    duration: "2.5 Years",
    entryRequirements: "A/L commerce preferred",
    fee: "Contact office",
    department: "Higher National Diploma in Accountancy - (HNDA)",
    description: "Financial reporting, taxation, auditing, and professional accounting practice."
  },
  {
    title: "HND in Engineering Technology",
    duration: "3 Years",
    entryRequirements: "A/L technology or maths stream",
    fee: "Contact office",
    department: "Higher National Diploma in Engineering - Civil",
    description: "Construction technology, surveying, materials, and infrastructure foundations."
  },
  {
    title: "Diploma in Business IT",
    duration: "1 Year",
    entryRequirements: "O/L with basic computer literacy",
    fee: "Contact office",
    department: "Higher National Diploma in Information Technology - (HNDIT)",
    description: "Business-focused IT foundations for office systems, software tools, and digital workflows."
  }
];

try {
  await mongoose.connect(mongoUri);

  const results = await Promise.all(
    courses.map((course) =>
      Course.findOneAndUpdate(
        { title: course.title },
        { $set: course },
        { upsert: true, returnDocument: "after", runValidators: true }
      )
    )
  );

  console.log(`Upserted ${results.length} course records in MongoDB database: ${mongoose.connection.name}`);
} catch (error) {
  console.error("Unable to seed courses:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect().catch(() => {});
}
