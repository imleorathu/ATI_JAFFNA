import { Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { getPublishedPage, listPages, publishPage, saveDraft, unpublishPage } from "../controllers/pageContentController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();
const adminOnly = [requireAuth, requireAdmin];
const uploadDir = path.resolve("uploads/cms");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      callback(null, uploadDir);
    },
    filename(req, file, callback) {
      const safeName = file.originalname.replace(/[^a-z0-9.]+/gi, "-").toLowerCase();
      callback(null, `${Date.now()}-${safeName}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    if (/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new Error("Only image files are allowed."));
  }
});

router.get("/public/pages/:slug", getPublishedPage);
router.get("/pages", ...adminOnly, listPages);
router.post("/uploads", ...adminOnly, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Upload an image file." });
  res.status(201).json({ url: `${req.protocol}://${req.get("host")}/uploads/cms/${req.file.filename}` });
});
router.put("/pages/:slug/draft", ...adminOnly, saveDraft);
router.post("/pages/:slug/publish", ...adminOnly, publishPage);
router.post("/pages/:slug/unpublish", ...adminOnly, unpublishPage);

export default router;
