import { Router } from "express";
import Notice from "../models/Notice.js";
import { createCrudController } from "../controllers/crudController.js";
import { getVisibleNotice, listVisibleNotices } from "../controllers/noticeController.js";
import { optionalAuth, requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();
const controller = createCrudController(Notice);
const adminOnly = [requireAuth, requireAdmin];

router.get("/", optionalAuth, listVisibleNotices);
router.get("/:id", optionalAuth, getVisibleNotice);
router.post("/", ...adminOnly, controller.create);
router.put("/:id", ...adminOnly, controller.update);
router.delete("/:id", ...adminOnly, controller.remove);

export default router;
