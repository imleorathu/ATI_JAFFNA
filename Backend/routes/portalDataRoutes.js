import { Router } from "express";
import PortalData from "../models/PortalData.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();
const PORTAL_DATA_KEY = "default";

router.get("/", requireAuth, async (_req, res, next) => {
  try {
    const portalData = await PortalData.findOne({ key: PORTAL_DATA_KEY }).lean();
    res.json(portalData?.value || {});
  } catch (error) {
    next(error);
  }
});

router.put("/", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const portalData = await PortalData.findOneAndUpdate(
      { key: PORTAL_DATA_KEY },
      { value: req.body || {}, updatedBy: req.user.id },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(portalData.value);
  } catch (error) {
    next(error);
  }
});

export default router;
