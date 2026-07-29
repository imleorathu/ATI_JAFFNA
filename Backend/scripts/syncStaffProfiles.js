import dotenv from "dotenv";
import mongoose from "mongoose";
import Faculty from "../models/Faculty.js";
import { syncStaffProfiles } from "../controllers/staffProfileSync.js";

dotenv.config();

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ATI_Jaffna";

try {
  await mongoose.connect(mongoUri);
  const faculty = await Faculty.find();
  for (const member of faculty) {
    await syncStaffProfiles(member);
  }
  console.log(`Synced ${faculty.length} staff profiles in MongoDB database: ${mongoose.connection.name}`);
} finally {
  await mongoose.disconnect();
}
