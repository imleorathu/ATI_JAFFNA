import { Router } from "express";
import fs from "fs";
import path from "path";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { createDiskUpload } from "../middleware/upload.js";
import * as chat from "../controllers/alumniChatController.js";

const chatUploadDir = path.resolve("uploads/alumni-chat");
fs.mkdirSync(chatUploadDir, { recursive: true });
const chatUpload = createDiskUpload({
  uploadDir: chatUploadDir,
  groupName: "alumniChat",
  maxFileSize: 25 * 1024 * 1024,
  filenamePrefix: (req) => `${req.user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
});

export const alumniChatRoutes = Router();
alumniChatRoutes.get("/", requireAuth, chat.listConversations);
alumniChatRoutes.post("/", requireAuth, chat.createConversation);
alumniChatRoutes.get("/access-request/me", requireAuth, chat.myAccessRequest);
alumniChatRoutes.post("/access-request", requireAuth, chat.requestChatAccess);
alumniChatRoutes.delete("/:id", requireAuth, chat.deleteConversationForUser);
alumniChatRoutes.get("/:id/messages", requireAuth, chat.listMessages);
alumniChatRoutes.post(
  "/:id/messages",
  requireAuth,
  chatUpload.fields([{ name: "attachments", maxCount: 5 }, { name: "moderationFrame", maxCount: 1 }]),
  chat.sendMessage,
);
alumniChatRoutes.delete("/:id/messages/:messageId", requireAuth, chat.deleteMessage);
alumniChatRoutes.put("/:id/messages/:messageId", requireAuth, chat.editMessage);
alumniChatRoutes.put("/:id/messages/:messageId/reaction", requireAuth, chat.reactToMessage);
alumniChatRoutes.post("/:id/report/:userId", requireAuth, chat.reportChatUser);

export const alumniChatAdminRoutes = Router();
alumniChatAdminRoutes.use(requireAuth, requireAdmin);
alumniChatAdminRoutes.get("/users", chat.adminAlumni);
alumniChatAdminRoutes.get("/restrictions", chat.restrictions);
alumniChatAdminRoutes.get("/chat-access-requests", chat.accessRequests);
alumniChatAdminRoutes.put("/chat-access-requests/:requestId", chat.reviewAccessRequest);
alumniChatAdminRoutes.put("/users/:userId/restriction", chat.setRestriction);
alumniChatAdminRoutes.delete("/conversations/:id/history", chat.clearConversation);
alumniChatAdminRoutes.delete("/conversations/:id", chat.deleteConversationAdmin);
alumniChatAdminRoutes.delete("/messages/:messageId", chat.deleteMessage);
