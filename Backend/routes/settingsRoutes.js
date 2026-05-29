import { Router } from "express";
import SystemSetting from "../models/SystemSetting.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();
const SETTINGS_KEY = "admin-portal";

router.use(requireAuth, requireAdmin);

router.get("/", async (req, res, next) => {
  try {
    const settings = await SystemSetting.findOne({ key: SETTINGS_KEY });
    res.json(settings?.value || {});
  } catch (error) {
    next(error);
  }
});

router.put("/", async (req, res, next) => {
  try {
    const settings = await SystemSetting.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { value: req.body || {}, updatedBy: req.user.id },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(settings.value);
  } catch (error) {
    next(error);
  }
});

export default router;
