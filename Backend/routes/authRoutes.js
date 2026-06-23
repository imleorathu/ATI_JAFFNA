import { Router } from "express";
import fs from "fs";
import path from "path";
import { changePassword, getProfile, login, register, updateProfilePhoto } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { createDiskUpload } from "../middleware/upload.js";

const router = Router();
const uploadDir = path.resolve("uploads/profiles");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = createDiskUpload({
  uploadDir,
  groupName: "image",
  maxFileSize: 3 * 1024 * 1024,
  filenamePrefix: (req) => `${req.user.id}-${Date.now()}`
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/profile", requireAuth, getProfile);
router.post("/change-password", requireAuth, changePassword);
router.post("/profile-photo", requireAuth, upload.single("image"), updateProfilePhoto);

export default router;
