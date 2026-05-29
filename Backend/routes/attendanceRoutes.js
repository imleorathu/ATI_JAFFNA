import { Router } from "express";
import { getAttendanceSession, listAttendanceRecords, markGpsAttendance } from "../controllers/attendanceController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, listAttendanceRecords);
router.get("/session", requireAuth, getAttendanceSession);
router.post("/mark", requireAuth, markGpsAttendance);

export default router;
