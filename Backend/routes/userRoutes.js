import { Router } from "express";
import { createUser, deleteUser, getUser, listUsers, updateUser } from "../controllers/userController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();
const adminOnly = [requireAuth, requireAdmin];

router.get("/", ...adminOnly, listUsers);
router.get("/:id", ...adminOnly, getUser);
router.post("/", ...adminOnly, createUser);
router.put("/:id", ...adminOnly, updateUser);
router.delete("/:id", ...adminOnly, deleteUser);

export default router;
