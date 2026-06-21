import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Student from "../models/Student.js";
import User from "../models/User.js";

dotenv.config();

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ATI_JAFFNA";
const password = process.argv[2] || "12345678";

function studentProfileFromStudent(student) {
  return {
    studentId: student.studentId || "",
    nic: student.nic || "",
    department: student.department || "",
    program: student.program || student.department || "",
    intake: student.intake || "",
    academicYear: student.academicYear || "",
    academicStage: student.academicStage || "",
    studyMode: student.studyMode || "",
    phone: student.phone || "",
    guardianName: student.guardianName || "",
    guardianPhone: student.guardianPhone || ""
  };
}

try {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  const passwordHash = await bcrypt.hash(password, 10);
  const testStudents = await Student.find({ studentId: /^TEST-/ }).lean();
  let created = 0;
  let linkedOrUpdated = 0;

  for (const student of testStudents) {
    const email = String(student.email || "").trim().toLowerCase();
    const studentId = String(student.studentId || "").trim();
    if (!email || !studentId) continue;

    const existingUser = await User.findOne({
      $or: [{ email }, { "studentProfile.studentId": studentId }]
    }).select("_id");

    const update = {
      role: "student",
      passwordHash,
      mustChangePassword: false,
      studentProfile: studentProfileFromStudent(student)
    };

    if (existingUser) {
      await User.updateOne({ _id: existingUser._id }, { $set: update }, { runValidators: false });
      linkedOrUpdated += 1;
    } else {
      await User.create({
        name: student.fullName || studentId,
        email,
        ...update,
        accountStatus: "approved"
      });
      created += 1;
    }
  }

  const resetAll = await User.updateMany(
    { role: "student" },
    { $set: { passwordHash, mustChangePassword: false } },
    { runValidators: false }
  );

  const totalTestUsers = await User.countDocuments({ role: "student", "studentProfile.studentId": /^TEST-/ });
  const totalStudentUsers = await User.countDocuments({ role: "student" });

  console.log(`Database: ${mongoose.connection.name}`);
  console.log(`Password set to: ${password}`);
  console.log(`TEST student profiles found: ${testStudents.length}`);
  console.log(`TEST student login accounts created: ${created}`);
  console.log(`TEST student login accounts updated/linked: ${linkedOrUpdated}`);
  console.log(`All student accounts matched: ${resetAll.matchedCount}`);
  console.log(`All student accounts modified: ${resetAll.modifiedCount}`);
  console.log(`Total TEST student login accounts: ${totalTestUsers}`);
  console.log(`Total student login accounts: ${totalStudentUsers}`);
} finally {
  await mongoose.disconnect().catch(() => {});
}
