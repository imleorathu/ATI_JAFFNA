import fs from "fs/promises";
import path from "path";
import Course from "../models/Course.js";
import StudyMaterial, { materialTypes } from "../models/StudyMaterial.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import { getDepartmentScope } from "../middleware/departmentAccess.js";

const staffRoles = ["lecturer", "department_staff"];
const uploadDirectory = path.resolve("private-uploads", "study-materials");

function clean(value, max = 2000) { return String(value || "").trim().slice(0, max); }
function cleanList(value, max = 80) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(values.map((item) => clean(item, max)).filter(Boolean))];
}
function isSafeUrl(value) { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol); } catch { return false; } }
function publicMaterial(item, includeManage = false) {
  const data = item.toObject ? item.toObject() : item;
  const result = { ...data, downloadUrl: data.fileName ? `/api/study-materials/${data._id}/download` : "" };
  delete result.storedFileName;
  if (!includeManage) delete result.uploadedBy;
  return result;
}
async function currentStudent(req) {
  const user = await User.findById(req.user.id).select("email studentProfile");
  if (!user) return null;
  const email = clean(user.email).toLowerCase();
  const studentId = clean(user.studentProfile?.studentId);
  return Student.findOne({ $or: [{ email }, ...(studentId ? [{ studentId }] : [])] });
}
async function staffScope(req) {
  if (req.user?.role === "admin") return { admin: true };
  if (!staffRoles.includes(req.user?.role)) return { error: "Faculty access required." };
  return getDepartmentScope(req);
}
function studentMaterialQuery(student) {
  const program = clean(student.program || student.department);
  const studyYears = [clean(student.academicStage), clean(student.academicYear)].filter(Boolean);
  return {
    department: student.department,
    isPublished: true,
    ...(program ? { $or: [{ program: "" }, { program }, { program: { $exists: false } }] } : {}),
    ...(studyYears.length ? { $and: [{ $or: [{ academicYears: { $in: studyYears } }, { academicYear: { $in: studyYears } }] }] } : { _id: null })
  };
}
async function departmentStudyYears(department) {
  const [stages, years] = await Promise.all([
    Student.distinct("academicStage", { department, academicStage: { $nin: ["", null] } }),
    Student.distinct("academicYear", { department, academicYear: { $nin: ["", null] } })
  ]);
  return [...new Set([...stages, ...years].map((value) => clean(value)).filter(Boolean))].sort();
}
async function eligibleCourse(req, courseId) {
  const student = await currentStudent(req);
  if (!student) return { error: "Student profile not found.", status: 403 };
  const course = await Course.findOne({ _id: courseId, department: student.department });
  if (!course) return { error: "Course not available to this student.", status: 404 };
  return { student, course };
}

export async function listFacultyCourses(req, res, next) {
  try {
    const scope = await staffScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const query = scope.admin ? {} : { department: scope.department };
    const courses = await Course.find(query).sort({ title: 1 }).lean();
    const ids = courses.map((course) => course._id);
    const counts = await StudyMaterial.aggregate([{ $match: { course: { $in: ids } } }, { $group: { _id: "$course", count: { $sum: 1 } } }]);
    const byCourse = new Map(counts.map((item) => [String(item._id), item.count]));
    const departments = [...new Set(courses.map((course) => course.department).filter(Boolean))];
    const yearEntries = await Promise.all(departments.map(async (department) => [department, await departmentStudyYears(department)]));
    const yearsByDepartment = new Map(yearEntries);
    res.json(courses.map((course) => ({ ...course, materialCount: byCourse.get(String(course._id)) || 0, studyYears: yearsByDepartment.get(course.department) || [] })));
  } catch (error) { next(error); }
}

export async function listFacultyMaterials(req, res, next) {
  try {
    const scope = await staffScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const course = await Course.findById(req.params.courseId);
    if (!course || (!scope.admin && course.department !== scope.department)) return res.status(404).json({ message: "Course not found in your faculty." });
    const materials = await StudyMaterial.find({ course: course._id }).sort({ createdAt: -1 });
    res.json({ course, materials: materials.map((item) => publicMaterial(item, true)) });
  } catch (error) { next(error); }
}

export async function createStudyMaterial(req, res, next) {
  try {
    const scope = await staffScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const course = await Course.findById(req.body.courseId);
    if (!course || (!scope.admin && course.department !== scope.department)) return res.status(403).json({ message: "You can only upload materials to courses in your faculty." });
    const title = clean(req.body.title, 160);
    const materialType = clean(req.body.materialType, 40);
    const externalUrl = clean(req.body.externalUrl, 1000);
    const academicYears = cleanList(req.body.academicYears || req.body.academicYear);
    if (!title || !materialTypes.includes(materialType) || !academicYears.length) return res.status(400).json({ message: "A title, valid material type, and at least one target study group are required." });
    const validStudyYears = await departmentStudyYears(course.department);
    if (academicYears.some((year) => !validStudyYears.includes(year))) return res.status(400).json({ message: "Select only current study groups from students in this department." });
    if (!req.file && !externalUrl) return res.status(400).json({ message: "Upload a file or provide an external link." });
    if (externalUrl && !isSafeUrl(externalUrl)) return res.status(400).json({ message: "External links must use http or https." });
    const user = await User.findById(req.user.id).select("name");
    const material = await StudyMaterial.create({
      title, materialType, course: course._id, department: course.department, program: clean(req.body.program, 120), subject: clean(req.body.subject, 160) || "General", academicYear: academicYears[0], academicYears, semester: clean(req.body.semester, 40), topic: clean(req.body.topic, 160),
      weekNumber: req.body.weekNumber ? Number(req.body.weekNumber) : undefined, description: clean(req.body.description), externalUrl, isPublished: req.body.isPublished === "true" || req.body.isPublished === true,
      ...(req.file ? { storedFileName: req.file.filename, fileName: req.file.originalname, fileSize: req.file.size, mimeType: req.file.mimetype } : {}),
      uploadedBy: req.user.id, uploaderName: user?.name || "Faculty staff"
    });
    res.status(201).json(publicMaterial(material, true));
  } catch (error) { next(error); }
}

export async function updateStudyMaterial(req, res, next) {
  try {
    const scope = await staffScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const material = await StudyMaterial.findById(req.params.id).select("+storedFileName");
    if (!material || (!scope.admin && (material.department !== scope.department || String(material.uploadedBy) !== String(req.user.id)))) return res.status(404).json({ message: "Material not found." });
    const title = clean(req.body.title, 160); const type = clean(req.body.materialType, 40); const externalUrl = clean(req.body.externalUrl, 1000); const academicYears = cleanList(req.body.academicYears || req.body.academicYear);
    if (!title || !materialTypes.includes(type) || !academicYears.length) return res.status(400).json({ message: "A title, valid material type, and at least one target study group are required." });
    const validStudyYears = await departmentStudyYears(material.department);
    if (academicYears.some((year) => !validStudyYears.includes(year))) return res.status(400).json({ message: "Select only current study groups from students in this department." });
    if (externalUrl && !isSafeUrl(externalUrl)) return res.status(400).json({ message: "External links must use http or https." });
    const previousStoredFileName = material.storedFileName;
    Object.assign(material, { title, materialType: type, description: clean(req.body.description), externalUrl, program: clean(req.body.program, 120), subject: clean(req.body.subject, 160) || "General", academicYear: academicYears[0], academicYears, semester: clean(req.body.semester, 40), topic: clean(req.body.topic, 160), weekNumber: req.body.weekNumber ? Number(req.body.weekNumber) : undefined, isPublished: req.body.isPublished === "true" || req.body.isPublished === true });
    if (req.file) {
      Object.assign(material, {
        storedFileName: req.file.filename,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });
    }
    if (!material.storedFileName && !externalUrl) return res.status(400).json({ message: "A file or external link is required." });
    await material.save();
    if (req.file && previousStoredFileName && previousStoredFileName !== req.file.filename) {
      await fs.unlink(path.join(uploadDirectory, previousStoredFileName)).catch(() => {});
    }
    res.json(publicMaterial(material, true));
  } catch (error) { next(error); }
}

export async function deleteStudyMaterial(req, res, next) {
  try {
    const scope = await staffScope(req); if (scope.error) return res.status(403).json({ message: scope.error });
    const material = await StudyMaterial.findById(req.params.id).select("+storedFileName");
    if (!material || (!scope.admin && (material.department !== scope.department || String(material.uploadedBy) !== String(req.user.id)))) return res.status(404).json({ message: "Material not found." });
    await material.deleteOne();
    if (material.storedFileName) await fs.unlink(path.join(uploadDirectory, material.storedFileName)).catch(() => {});
    res.json({ message: "Study material deleted." });
  } catch (error) { next(error); }
}

export async function listStudentCourses(req, res, next) {
  try {
    const student = await currentStudent(req); if (!student) return res.status(403).json({ message: "Student profile not found." });
    const courses = await Course.find({ department: student.department }).sort({ title: 1 }).lean();
    const materialQuery = studentMaterialQuery(student); const counts = await StudyMaterial.aggregate([{ $match: { ...materialQuery, course: { $in: courses.map((item) => item._id) } } }, { $group: { _id: "$course", count: { $sum: 1 } } }]);
    const byCourse = new Map(counts.map((item) => [String(item._id), item.count]));
    res.json(courses.map((course) => ({ ...course, materialCount: byCourse.get(String(course._id)) || 0 })));
  } catch (error) { next(error); }
}

export async function listAllStudentMaterials(req, res, next) {
  try {
    const student = await currentStudent(req);
    if (!student) return res.status(403).json({ message: "Student profile not found." });

    const materials = await StudyMaterial.find(studentMaterialQuery(student))
      .populate("course", "title department")
      .sort({ subject: 1, weekNumber: 1, createdAt: -1 });

    res.json({
      department: student.department,
      studyGroup: student.academicStage || student.academicYear || "",
      materials: materials.map((item) => publicMaterial(item))
    });
  } catch (error) { next(error); }
}

export async function listStudentMaterials(req, res, next) {
  try {
    const access = await eligibleCourse(req, req.params.courseId); if (access.error) return res.status(access.status).json({ message: access.error });
    const materials = await StudyMaterial.find({ ...studentMaterialQuery(access.student), course: access.course._id }).sort({ weekNumber: 1, createdAt: -1 });
    res.json({ course: access.course, materials: materials.map((item) => publicMaterial(item)) });
  } catch (error) { next(error); }
}

export async function downloadStudyMaterial(req, res, next) {
  try {
    const material = await StudyMaterial.findById(req.params.id).select("+storedFileName"); if (!material?.storedFileName) return res.status(404).json({ message: "File not found." });
    if (staffRoles.includes(req.user?.role) || req.user?.role === "admin") { const scope = await staffScope(req); if (scope.error || (!scope.admin && material.department !== scope.department)) return res.status(403).json({ message: "Access denied." }); }
    else if (req.user?.role === "student") { const access = await eligibleCourse(req, material.course); if (access.error || !material.isPublished) return res.status(404).json({ message: "Material not available." }); const allowed = await StudyMaterial.exists({ _id: material._id, ...studentMaterialQuery(access.student) }); if (!allowed) return res.status(404).json({ message: "Material not available." }); }
    else return res.status(403).json({ message: "Access denied." });
    res.download(path.join(uploadDirectory, material.storedFileName), material.fileName);
  } catch (error) { next(error); }
}

export async function ensureStudyMaterialDirectory() { await fs.mkdir(uploadDirectory, { recursive: true }); }
