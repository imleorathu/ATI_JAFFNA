import "dotenv/config";
import mongoose from "mongoose";
import AdminStaff from "../models/AdminStaff.js";
import DepartmentStaff from "../models/DepartmentStaff.js";
import Faculty from "../models/Faculty.js";
import User from "../models/User.js";
import { adminProfileFromPayload, staffProfileFromPayload } from "../services/userProfileService.js";

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ATI_JAFFNA";
const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const isEmptyProfile = (profile) => !profile || Object.values(profile).every((value) => value === undefined || value === null || value === "");

async function staffSourceFor(email) {
  return await DepartmentStaff.findOne({ email }).lean()
    || await AdminStaff.findOne({ email }).lean()
    || await Faculty.findOne({ email }).lean();
}

async function migrate() {
  await mongoose.connect(uri);

  const users = await User.find();
  let students = 0;
  let staff = 0;
  let admins = 0;

  for (const user of users) {
    if (user.role === "student") {
      user.staffProfile = undefined;
      user.adminProfile = undefined;
      students += 1;
      await user.save();
      continue;
    }

    if (user.role === "lecturer") {
      const source = await staffSourceFor(normalizeEmail(user.email));
      const existingPhoto = user.staffProfile?.profilePhotoUrl || user.studentProfile?.profilePhotoUrl;
      user.studentProfile = undefined;
      user.adminProfile = undefined;
      user.staffProfile = {
        ...(source ? staffProfileFromPayload(source) : { staffType: "Staff" }),
        ...(!isEmptyProfile(user.staffProfile) ? user.staffProfile.toObject?.() || user.staffProfile : {}),
        profilePhotoUrl: existingPhoto
      };
      staff += 1;
      await user.save();
      continue;
    }

    if (user.role === "admin") {
      const existingPhoto = user.adminProfile?.profilePhotoUrl || user.studentProfile?.profilePhotoUrl;
      user.studentProfile = undefined;
      user.staffProfile = undefined;
      user.adminProfile = {
        ...adminProfileFromPayload(user.adminProfile || {}),
        profilePhotoUrl: existingPhoto
      };
      admins += 1;
      await user.save();
    }
  }

  await User.syncIndexes();
  console.log(`Migrated role profiles in ${mongoose.connection.name}: ${students} students, ${staff} staff, ${admins} admins.`);
  await mongoose.disconnect();
}

migrate().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
