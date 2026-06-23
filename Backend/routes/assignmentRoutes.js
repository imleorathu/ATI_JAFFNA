import { Router } from "express";
import fs from "fs";
import path from "path";
import {
  addAssignmentComment,
  createAssignment,
  deleteAssignment,
  listAssignments,
  reviewSubmission,
  submitAssignment,
  updateAssignment,
  uploadAssignmentFiles
} from "../controllers/assignmentController.js";
import { requireAuth } from "../middleware/auth.js";
import { createDiskUpload } from "../middleware/upload.js";

const router = Router();
const uploadDir = path.resolve("uploads/assignments");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = createDiskUpload({
  uploadDir,
  groupName: "assignment",
  maxFileSize: 25 * 1024 * 1024
});

router.get("/", requireAuth, listAssignments);
router.post("/uploads", requireAuth, upload.array("files", 10), uploadAssignmentFiles);
router.post("/", requireAuth, createAssignment);
router.post("/:id/comments", requireAuth, addAssignmentComment);
router.post("/:id/submissions", requireAuth, submitAssignment);
router.put("/:id/submissions/:submissionId", requireAuth, reviewSubmission);
router.put("/:id", requireAuth, updateAssignment);
router.delete("/:id", requireAuth, deleteAssignment);

export default router;
