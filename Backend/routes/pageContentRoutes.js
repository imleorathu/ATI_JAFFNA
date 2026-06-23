import { Router } from "express";
import fs from "fs";
import path from "path";
import { getPublishedPage, listPages, publishPage, saveDraft, unpublishPage } from "../controllers/pageContentController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { createDiskUpload } from "../middleware/upload.js";

const router = Router();
const adminOnly = [requireAuth, requireAdmin];
const uploadDir = path.resolve("uploads/cms");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = createDiskUpload({
  uploadDir,
  groupName: "cmsImage",
  maxFileSize: 5 * 1024 * 1024
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
