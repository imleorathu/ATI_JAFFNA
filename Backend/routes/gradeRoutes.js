import { Router } from "express";
import { createGrade, deleteGrade, listGrades, updateGrade } from "../controllers/gradeController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, listGrades);
router.post("/", requireAuth, createGrade);
router.put("/:id", requireAuth, updateGrade);
router.delete("/:id", requireAuth, deleteGrade);

export default router;
