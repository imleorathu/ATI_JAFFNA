import { Router } from "express";
import fs from "fs";
import path from "path";
import {
  downloadAlumniDocument,
  getMyAlumniProfile,
  graduateBatch,
  graduateStudent,
  listAlumni,
  registerAlumni,
  serveAlumniPhoto,
  updateAlumniStatus,
  updateMyAlumniProfile,
} from "../controllers/alumniController.js";
import { requireAdmin, requireAuth, requireRole } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { createDiskUpload } from "../middleware/upload.js";

const router = Router();
const uploadDir = path.resolve("private-uploads/alumni");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = createDiskUpload({
  uploadDir,
  groupName: "alumni",
  maxFileSize: 25 * 1024 * 1024,
  filenamePrefix: () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
});

router.post(
  "/register",
  authLimiter,
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "supportingDocuments", maxCount: 1 },
  ]),
  registerAlumni,
);
router.get("/media/:fileName", serveAlumniPhoto);
router.get("/me", requireAuth, requireRole("alumni"), getMyAlumniProfile);
router.put(
  "/me",
  requireAuth,
  requireRole("alumni"),
  upload.fields([
    { name: "profilePhoto", maxCount: 1 },
    { name: "coverPhoto", maxCount: 1 },
    { name: "supportingDocuments", maxCount: 1 },
  ]),
  updateMyAlumniProfile,
);
router.get("/", requireAuth, requireAdmin, listAlumni);
router.post(
  "/graduate/student/:studentId",
  requireAuth,
  requireAdmin,
  graduateStudent,
);
router.post("/graduate/batch", requireAuth, requireAdmin, graduateBatch);
router.put("/:id/status", requireAuth, requireAdmin, updateAlumniStatus);
router.get(
  "/:id/documents/:fileName",
  requireAuth,
  requireAdmin,
  downloadAlumniDocument,
);

export default router;
