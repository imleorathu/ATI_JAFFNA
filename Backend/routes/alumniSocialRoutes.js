import fs from "fs";
import path from "path";
import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { createDiskUpload } from "../middleware/upload.js";
import * as social from "../controllers/alumniSocialController.js";

const verificationDir = path.resolve("private-uploads/alumni-verification");
fs.mkdirSync(verificationDir, { recursive: true });
const verificationUpload = createDiskUpload({
  uploadDir: verificationDir,
  groupName: "alumni",
  maxFileSize: 10 * 1024 * 1024,
  filenamePrefix: (req) => `${req.user.id}-${Date.now()}`,
});
const postUploadDir = path.resolve("uploads/alumni-posts");
fs.mkdirSync(postUploadDir, { recursive: true });
const postUpload = createDiskUpload({
  uploadDir: postUploadDir,
  groupName: "alumniPost",
  maxFileSize: 25 * 1024 * 1024,
  filenamePrefix: (req) =>
    `${req.user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
});
const commentUploadDir = path.resolve("uploads/alumni-comments");
fs.mkdirSync(commentUploadDir, { recursive: true });
const commentUpload = createDiskUpload({
  uploadDir: commentUploadDir,
  groupName: "alumniComment",
  maxFileSize: 10 * 1024 * 1024,
  filenamePrefix: (req) =>
    `${req.user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
});
const auth = [requireAuth],
  admin = [requireAuth, requireAdmin];

export const directoryRoutes = Router();
directoryRoutes.get("/", ...auth, social.listDirectory);
directoryRoutes.get("/suggestions", ...auth, social.suggestions);
directoryRoutes.get("/:id", ...auth, social.getPublicProfile);
export const connectionRoutes = Router();
connectionRoutes.get("/profile/:alumniId", ...auth, social.profileConnections);
connectionRoutes.get("/request-count", ...auth, social.connectionRequestCount);
connectionRoutes.get("/", ...auth, social.listConnections);
connectionRoutes.post("/:userId", ...auth, social.sendConnection);
connectionRoutes.patch("/request/:id", ...auth, social.connectionAction);
export const followRoutes = Router();
followRoutes.post("/:userId", ...auth, social.relationAction);
followRoutes.delete("/:userId", ...auth, social.relationAction);
export const blockRoutes = Router();
blockRoutes.post("/:userId", ...auth, social.relationAction);
blockRoutes.delete("/:userId", ...auth, social.relationAction);
export const feedRoutes = Router();
feedRoutes.get("/", ...auth, social.feed);
export const postRoutes = Router();
postRoutes.get("/:id", ...auth, social.getPost);
postRoutes.post("/", ...auth, postUpload.array("media", 10), social.createPost);
postRoutes.put("/:id", ...auth, social.updatePost);
postRoutes.delete("/:id", ...auth, social.deletePost);
postRoutes.put("/:id/reaction", ...auth, social.reactPost);
postRoutes.put("/:id/hide", ...auth, social.hidePost);
postRoutes.post("/:id/share", ...auth, social.sharePost);
postRoutes.post(
  "/:id/comments",
  ...auth,
  commentUpload.array("media", 1),
  social.addComment,
);
postRoutes.put("/:id/poll-vote", ...auth, social.votePoll);
postRoutes.put("/:postId/comments/:commentId", ...auth, social.updateComment);
postRoutes.put(
  "/:postId/comments/:commentId/reaction",
  ...auth,
  social.reactComment,
);
postRoutes.delete(
  "/:postId/comments/:commentId",
  ...auth,
  social.deleteComment,
);
export const savedRoutes = Router();
savedRoutes.get("/", ...auth, social.listSaved);
savedRoutes.post("/", ...auth, social.saveItem);
savedRoutes.delete("/item/:itemType/:itemId", ...auth, social.removeSavedItem);
savedRoutes.delete("/:id", ...auth, social.removeSaved);
export const alumniNotificationRoutes = Router();
alumniNotificationRoutes.get("/", ...auth, social.notifications);
alumniNotificationRoutes.patch("/:id", ...auth, social.notificationAction);
alumniNotificationRoutes.patch("/", ...auth, social.notificationAction);
alumniNotificationRoutes.delete("/:id", ...auth, social.notificationAction);
export const privacyRoutes = Router();
privacyRoutes.get("/", ...auth, social.getPrivacy);
privacyRoutes.put("/", ...auth, social.updatePrivacy);
export const reportRoutes = Router();
reportRoutes.post("/", ...auth, social.submitReport);
reportRoutes.get("/admin", ...admin, social.adminReports);
reportRoutes.put("/admin/:id", ...admin, social.moderateReport);
export const verificationRoutes = Router();
verificationRoutes.get("/me", ...auth, social.myVerification);
verificationRoutes.post(
  "/",
  ...auth,
  verificationUpload.array("evidence", 4),
  social.submitVerification,
);
verificationRoutes.get("/admin", ...admin, social.adminVerifications);
verificationRoutes.put("/admin/bulk", ...admin, social.bulkReviewVerifications);
verificationRoutes.put("/admin/:id", ...admin, social.reviewVerification);
verificationRoutes.get(
  "/admin/:id/evidence/:fileName",
  ...admin,
  social.downloadVerificationEvidence,
);
