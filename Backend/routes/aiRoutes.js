import { Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { chatWithKnowledge, deleteKnowledgeDocument, listKnowledgeDocuments, publicChat, updateKnowledgeDocument, uploadKnowledgeDocument } from "../controllers/aiController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const uploadDir = path.resolve("uploads/knowledge");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) => callback(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-")}`)
  }),
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    if (["pdf", "docx", "pptx", "txt"].includes(ext)) return callback(null, true);
    callback(new Error("Only PDF, DOCX, PPTX, and TXT files are supported."));
  }
});

router.get("/knowledge", requireAuth, listKnowledgeDocuments);
router.post("/knowledge", requireAuth, upload.single("file"), uploadKnowledgeDocument);
router.put("/knowledge/:id", requireAuth, updateKnowledgeDocument);
router.delete("/knowledge/:id", requireAuth, deleteKnowledgeDocument);
router.post("/public-chat", publicChat);
router.post("/chat", requireAuth, chatWithKnowledge);

export default router;
