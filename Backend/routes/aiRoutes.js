import { Router } from "express";
import fs from "fs";
import path from "path";
import { chatWithKnowledge, deleteKnowledgeDocument, listKnowledgeDocuments, publicChat, updateKnowledgeDocument, uploadKnowledgeDocument } from "../controllers/aiController.js";
import { requireAuth } from "../middleware/auth.js";
import { createDiskUpload } from "../middleware/upload.js";

const router = Router();
const uploadDir = path.resolve("uploads/knowledge");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = createDiskUpload({
  uploadDir,
  groupName: "document",
  maxFileSize: 40 * 1024 * 1024
});

router.get("/knowledge", requireAuth, listKnowledgeDocuments);
router.post("/knowledge", requireAuth, upload.single("file"), uploadKnowledgeDocument);
router.put("/knowledge/:id", requireAuth, updateKnowledgeDocument);
router.delete("/knowledge/:id", requireAuth, deleteKnowledgeDocument);
router.post("/public-chat", publicChat);
router.post("/chat", requireAuth, chatWithKnowledge);

export default router;
