import { Router } from "express";
import multer from "multer";
import { importStudents } from "../controllers/studentImportController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    const allowed = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];
    if (allowed.includes(file.mimetype) || /\.(csv|xls|xlsx)$/i.test(file.originalname)) {
      callback(null, true);
      return;
    }

    callback(new Error("Only CSV, XLS, or XLSX files are allowed."));
  }
});

router.post("/", requireAuth, requireAdmin, upload.single("file"), importStudents);

export default router;
