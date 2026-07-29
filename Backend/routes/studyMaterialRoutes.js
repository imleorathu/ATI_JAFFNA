import { Router } from "express";
import path from "path";
import { createDiskUpload } from "../middleware/upload.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createStudyMaterial, deleteStudyMaterial, downloadStudyMaterial, ensureStudyMaterialDirectory, listAllStudentMaterials, listFacultyCourses, listFacultyMaterials, listStudentCourses, listStudentMaterials, updateStudyMaterial } from "../controllers/studyMaterialController.js";

await ensureStudyMaterialDirectory();
const upload = createDiskUpload({ uploadDir: path.resolve("private-uploads", "study-materials"), groupName: "assignment", maxFileSize: 15 * 1024 * 1024, filenamePrefix: () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}` });
const router = Router();
router.get("/faculty/courses", requireAuth, requireRole("lecturer", "department_staff", "admin"), listFacultyCourses);
router.get("/faculty/courses/:courseId/materials", requireAuth, requireRole("lecturer", "department_staff", "admin"), listFacultyMaterials);
router.post("/", requireAuth, requireRole("lecturer", "department_staff", "admin"), upload.single("file"), createStudyMaterial);
router.put("/:id", requireAuth, requireRole("lecturer", "department_staff", "admin"), upload.single("file"), updateStudyMaterial);
router.delete("/:id", requireAuth, requireRole("lecturer", "department_staff", "admin"), deleteStudyMaterial);
router.get("/student/courses", requireAuth, requireRole("student"), listStudentCourses);
router.get("/student/materials", requireAuth, requireRole("student"), listAllStudentMaterials);
router.get("/student/courses/:courseId/materials", requireAuth, requireRole("student"), listStudentMaterials);
router.get("/:id/download", requireAuth, downloadStudyMaterial);
export default router;
