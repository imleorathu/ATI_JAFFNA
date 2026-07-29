import GradeRecord from "../models/GradeRecord.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import { getDepartmentScope } from "../middleware/departmentAccess.js";

const gradeOptions = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"];

function gradeFromScore(score) {
  const value = Number(score);
  if (value >= 90) return "A+";
  if (value >= 80) return "A";
  if (value >= 75) return "A-";
  if (value >= 70) return "B+";
  if (value >= 65) return "B";
  if (value >= 60) return "B-";
  if (value >= 55) return "C+";
  if (value >= 50) return "C";
  if (value >= 45) return "C-";
  if (value >= 40) return "D";
  return "F";
}

const facultyScope = getDepartmentScope;
const departmentStaffRoles = ["lecturer", "department_staff"];

async function studentForUser(req) {
  const user = await User.findById(req.user.id).select("email studentProfile");
  if (!user) return null;
  const email = String(user.email || "").trim().toLowerCase();
  const studentId = String(user.studentProfile?.studentId || "").trim();
  return Student.findOne({ $or: [{ email }, ...(studentId ? [{ studentId }] : [])] });
}

function gradeResponse(record) {
  return {
    _id: record._id,
    student: record.student,
    studentName: record.studentName,
    studentId: record.studentId,
    department: record.department,
    academicStage: record.academicStage,
    subject: record.subject,
    semester: record.semester,
    credits: record.credits,
    score: record.score,
    grade: record.grade,
    remarks: record.remarks,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

async function gradePayload(req, existingRecord = null) {
  const student = await Student.findById(req.body.student || existingRecord?.student);
  if (!student) return { error: "Student record not found." };

  if (departmentStaffRoles.includes(req.user?.role)) {
    const scope = await facultyScope(req);
    if (scope.error) return { error: scope.error, status: 403 };
    if (student.department !== scope.department || (existingRecord && existingRecord.department !== scope.department)) {
      return { error: "You can only manage grades for students in your department.", status: 403 };
    }
  } else if (req.user?.role !== "admin") {
    return { error: "Admin or faculty access required.", status: 403 };
  }

  const score = Number(req.body.score ?? existingRecord?.score ?? 0);
  const credits = Number(req.body.credits ?? existingRecord?.credits ?? 0);
  const semester = Number(req.body.semester ?? existingRecord?.semester ?? 1);

  return {
    payload: {
      student: student._id,
      studentName: student.fullName,
      studentId: student.studentId,
      department: student.department,
      academicStage: student.academicStage,
      subject: String(req.body.subject ?? existingRecord?.subject ?? "").trim(),
      semester,
      credits,
      score,
      grade: req.body.grade || gradeFromScore(score),
      remarks: String(req.body.remarks ?? existingRecord?.remarks ?? "").trim()
    }
  };
}

export async function listGrades(req, res, next) {
  try {
    const query = {};

    if (req.user?.role === "student") {
      const student = await studentForUser(req);
      if (!student) return res.json([]);
      query.student = student._id;
    } else if (departmentStaffRoles.includes(req.user?.role)) {
      const scope = await facultyScope(req);
      if (scope.error) return res.status(403).json({ message: scope.error });
      query.department = scope.department;
    } else if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Grade access is limited to students, faculty, and admins." });
    }

    const records = await GradeRecord.find(query).sort({ semester: 1, subject: 1 });
    res.json(records.map(gradeResponse));
  } catch (error) {
    next(error);
  }
}

export async function createGrade(req, res, next) {
  try {
    const result = await gradePayload(req);
    if (result.error) return res.status(result.status || 400).json({ message: result.error });
    if (!result.payload.subject) return res.status(400).json({ message: "Subject is required." });

    const record = await GradeRecord.create(result.payload);
    res.status(201).json(gradeResponse(record));
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "A grade already exists for this student, subject, and semester." });
    next(error);
  }
}

export async function bulkImportGrades(req, res, next) {
  try {
    if (!Array.isArray(req.body?.grades) || !req.body.grades.length) {
      return res.status(400).json({ message: "Add at least one grade row to import." });
    }
    if (!departmentStaffRoles.includes(req.user?.role) && req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin or faculty access required." });
    }
    if (req.body.grades.length > 1000) {
      return res.status(400).json({ message: "A maximum of 1,000 grade rows can be imported at once." });
    }

    const scope = departmentStaffRoles.includes(req.user?.role) ? await facultyScope(req) : null;
    if (scope?.error) return res.status(403).json({ message: scope.error });

    const results = { created: 0, updated: 0, errors: [] };
    const seen = new Set();

    for (let index = 0; index < req.body.grades.length; index += 1) {
      const row = req.body.grades[index] || {};
      const rowNumber = index + 2;
      const studentId = String(row.studentId || "").trim();
      const email = String(row.email || "").trim().toLowerCase();
      const subject = String(row.subject || "").trim();
      const semester = Number(row.semester);
      const credits = Number(row.credits);
      const score = Number(row.score);

      if ((!studentId && !email) || !subject || !Number.isInteger(semester) || semester < 1 || !Number.isFinite(credits) || credits < 0 || !Number.isFinite(score) || score < 0 || score > 100) {
        results.errors.push({ row: rowNumber, message: "Use studentId or email, subject, semester (1+), credits (0+), and score (0-100)." });
        continue;
      }

      const student = await Student.findOne({ $or: [...(studentId ? [{ studentId }] : []), ...(email ? [{ email }] : [])] });
      if (!student) {
        results.errors.push({ row: rowNumber, message: "Student was not found." });
        continue;
      }
      if (scope && student.department !== scope.department) {
        results.errors.push({ row: rowNumber, message: "Student is outside your department." });
        continue;
      }

      const key = `${student._id}:${subject.toLowerCase()}:${semester}`;
      if (seen.has(key)) {
        results.errors.push({ row: rowNumber, message: "This file contains a duplicate student, subject, and semester." });
        continue;
      }
      seen.add(key);

      const payload = {
        student: student._id,
        studentName: student.fullName,
        studentId: student.studentId,
        department: student.department,
        academicStage: student.academicStage,
        subject,
        semester,
        credits,
        score,
        grade: gradeOptions.includes(String(row.grade || "").trim()) ? String(row.grade).trim() : gradeFromScore(score),
        remarks: String(row.remarks || "").trim()
      };
      const existing = await GradeRecord.exists({ student: student._id, subject, semester });
      await GradeRecord.findOneAndUpdate(
        { student: student._id, subject, semester },
        { $set: payload },
        { upsert: true, new: true, runValidators: true }
      );
      if (existing) results.updated += 1;
      else results.created += 1;
    }

    res.status(200).json({ message: `Imported ${results.created + results.updated} grade record(s).`, ...results });
  } catch (error) {
    next(error);
  }
}

export async function updateGrade(req, res, next) {
  try {
    const existing = await GradeRecord.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Grade record not found." });

    const result = await gradePayload(req, existing);
    if (result.error) return res.status(result.status || 400).json({ message: result.error });
    if (!result.payload.subject) return res.status(400).json({ message: "Subject is required." });

    const record = await GradeRecord.findByIdAndUpdate(req.params.id, result.payload, { returnDocument: "after", runValidators: true });
    res.json(gradeResponse(record));
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "A grade already exists for this student, subject, and semester." });
    next(error);
  }
}

export async function deleteGrade(req, res, next) {
  try {
    const existing = await GradeRecord.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Grade record not found." });

    if (departmentStaffRoles.includes(req.user?.role)) {
      const scope = await facultyScope(req);
      if (scope.error) return res.status(403).json({ message: scope.error });
      if (existing.department !== scope.department) {
        return res.status(403).json({ message: "You can only delete grades for students in your department." });
      }
    } else if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin or faculty access required." });
    }

    await GradeRecord.findByIdAndDelete(req.params.id);
    res.json({ message: "Grade record deleted." });
  } catch (error) {
    next(error);
  }
}
