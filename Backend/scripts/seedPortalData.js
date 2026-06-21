import dotenv from "dotenv";
import mongoose from "mongoose";
import PortalData from "../models/PortalData.js";
import * as portalData from "../../Frontend/src/data.js";

dotenv.config();

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ATI_JAFFNA";

try {
  await mongoose.connect(mongoUri);
  await PortalData.findOneAndUpdate(
    { key: "default" },
    { value: portalData },
    { upsert: true, runValidators: true }
  );
  console.log(`Seeded portal data in MongoDB database: ${mongoose.connection.name}`);
} finally {
  await mongoose.disconnect();
}
