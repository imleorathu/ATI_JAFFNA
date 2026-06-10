import dotenv from "dotenv";
import mongoose from "mongoose";
import Department from "../models/Department.js";

dotenv.config();

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ATI_Jaffna";

const departments = [
  {
    name: "Higher National Diploma in Accountancy - (HNDA)",
    description: "Accountancy-focused academic department for financial reporting, taxation, auditing, and professional accounting practice."
  },
  {
    name: "Higher National Diploma in English",
    description: "English academic department for communication, academic writing, literature, and professional language skills."
  },
  {
    name: "Higher National Diploma in Engineering - Civil",
    description: "Civil engineering academic department for construction technology, surveying, materials, and infrastructure foundations."
  },
  {
    name: "Higher National Diploma in Engineering - Electrical",
    description: "Electrical engineering academic department for circuits, power systems, machines, and applied electrical technology."
  },
  {
    name: "Higher National Diploma in Management - (HNDM)",
    description: "Management academic department for business operations, leadership, organizational practice, and administration."
  },
  {
    name: "Higher National Diploma in Information Technology - (HNDIT)",
    description: "Information Technology academic department for software development, databases, networking, and digital systems."
  },
  {
    name: "Higher National Diploma in Quantity Surveying",
    description: "Quantity surveying academic department for cost estimation, contracts, measurement, and construction economics."
  }
];

try {
  await mongoose.connect(mongoUri);

  const results = await Promise.all(
    departments.map((department) =>
      Department.findOneAndUpdate(
        { name: department.name },
        { $setOnInsert: department },
        { returnDocument: "after", upsert: true, runValidators: true }
      )
    )
  );

  console.log(`Upserted ${results.length} department records in MongoDB database: ${mongoose.connection.name}`);
  for (const department of results) console.log(`- ${department.name}`);
} finally {
  await mongoose.disconnect();
}
