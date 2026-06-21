import dotenv from "dotenv";
import mongoose from "mongoose";
import Department from "../models/Department.js";
import Student from "../models/Student.js";

dotenv.config();

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ATI_JAFFNA";

const fallbackDepartments = [
  "Higher National Diploma in Accountancy - (HNDA)",
  "Higher National Diploma in English",
  "Higher National Diploma in Engineering - Civil",
  "Higher National Diploma in Engineering - Electrical",
  "Higher National Diploma in Management - (HNDM)",
  "Higher National Diploma in Information Technology - (HNDIT)",
  "Higher National Diploma in Quantity Surveying"
];

const academicStages = [
  "First year Full Time",
  "Second year Full Time",
  "First year Part Time",
  "Second year Part Time"
];

const paymentByMode = {
  "Full-time": "not_required",
  "Part-time": "pending"
};

function slug(value = "") {
  return String(value)
    .replace(/Higher National Diploma in\s*/i, "")
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
}

function buildStudent({ index, department, studyMode, academicStage = "" }) {
  const suffix = String(index).padStart(3, "0");
  const modeCode = studyMode === "Full-time" ? "FT" : "PT";
  const groupCode = academicStage
    ? academicStage.replace(/\s+/g, "-").toUpperCase()
    : modeCode;
  const studentId = `TEST-${slug(department)}-${groupCode}-${suffix}`;

  return {
    fullName: `Test Student ${suffix} ${modeCode}`,
    email: `test.student.${suffix}.${modeCode.toLowerCase()}@example.com`,
    phone: `0770000${suffix}`,
    nic: `TESTNIC${suffix}${modeCode}`,
    studentId,
    department,
    program: department,
    intake: "2026 Test Intake",
    academicYear: "2026",
    academicStage,
    studyMode,
    guardianName: `Test Guardian ${suffix}`,
    guardianPhone: `0780000${suffix}`,
    paymentStatus: paymentByMode[studyMode]
  };
}

try {
  await mongoose.connect(mongoUri);

  const dbDepartments = await Department.find().select("name").sort({ name: 1 }).lean();
  const departmentNames = dbDepartments.map((department) => department.name).filter(Boolean);
  const departments = departmentNames.length ? departmentNames : fallbackDepartments;

  const testStudents = [];
  let index = 1;

  for (const department of departments) {
    for (const academicStage of academicStages) {
      const studyMode = academicStage.includes("Part Time") ? "Part-time" : "Full-time";
      testStudents.push(buildStudent({ index, department, studyMode, academicStage }));
      index += 1;
    }
  }

  const results = await Promise.all(
    testStudents.map((student) =>
      Student.findOneAndUpdate(
        { studentId: student.studentId },
        { $set: student },
        { returnDocument: "after", upsert: true, runValidators: true }
      )
    )
  );
  const currentTestIds = testStudents.map((student) => student.studentId);
  const staleResult = await Student.deleteMany({
    $and: [
      { studentId: /^TEST-/ },
      { studentId: { $nin: currentTestIds } }
    ]
  });

  console.log(`Upserted ${results.length} test students in MongoDB database: ${mongoose.connection.name}`);
  console.log(`Removed ${staleResult.deletedCount} stale test students from previous seed shapes.`);
  console.log(`Departments covered: ${departments.length}`);
  console.log("Study modes covered: Full-time, Part-time");
  console.log(`Current study years covered: ${academicStages.join(", ")}`);
  for (const student of results) {
    console.log(`- ${student.studentId}: ${student.department} | ${student.studyMode}${student.academicStage ? ` | ${student.academicStage}` : ""}`);
  }
} finally {
  await mongoose.disconnect();
}
