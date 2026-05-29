import { Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import {
  addAssignmentComment,
  createAssignment,
  deleteAssignment,
  duplicateAssignment,
  listAssignments,
  reviewSubmission,
  submitAssignment,
  updateAssignment,
  uploadAssignmentFiles
} from "../controllers/assignmentController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const uploadDir = path.resolve("uploads/assignments");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
      callback(null, `${Date.now()}-${safeName}`);
    }
  }),
  limits: { fileSize: 100 * 1024 * 1024 }
});

router.get("/", requireAuth, listAssignments);
router.post("/uploads", requireAuth, upload.array("files", 10), uploadAssignmentFiles);
router.post("/", requireAuth, createAssignment);
router.post("/:id/duplicate", requireAuth, duplicateAssignment);
router.post("/:id/comments", requireAuth, addAssignmentComment);
router.post("/:id/submissions", requireAuth, submitAssignment);
router.put("/:id/submissions/:submissionId", requireAuth, reviewSubmission);
router.put("/:id", requireAuth, updateAssignment);
router.delete("/:id", requireAuth, deleteAssignment);

export default router;
