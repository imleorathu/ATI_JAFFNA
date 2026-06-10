import { Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { changePassword, getProfile, login, register, updateProfilePhoto } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

const router = Router();
const uploadDir = path.resolve("uploads/profiles");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      callback(null, uploadDir);
    },
    filename(req, file, callback) {
      const safeName = file.originalname.replace(/[^a-z0-9.]+/gi, "-").toLowerCase();
      callback(null, `${req.user.id}-${Date.now()}-${safeName}`);
    }
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    if (/^image\/(png|jpe?g|webp)$/i.test(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new Error("Only PNG, JPG, or WEBP images are allowed."));
  }
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.get("/profile", requireAuth, getProfile);
router.post("/change-password", requireAuth, changePassword);
router.post("/profile-photo", requireAuth, upload.single("image"), updateProfilePhoto);

export default router;
