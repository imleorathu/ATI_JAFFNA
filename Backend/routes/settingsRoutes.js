import { Router } from "express";
import SystemSetting from "../models/SystemSetting.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { defaultSystemSettings, integrationTestResult, mergeSystemSettings, validateSystemSettings } from "../lib/settingsDefaults.js";

const router = Router();
const SETTINGS_KEY = "admin-portal";

router.get("/public", async (req, res, next) => {
  try {
    const settings = await SystemSetting.findOne({ key: SETTINGS_KEY });
    const merged = mergeSystemSettings(settings?.value || defaultSystemSettings);
    res.json({
      maintenanceMode: Boolean(merged.integrations.maintenanceMode),
      institutionName: merged.general.institutionName,
      message: "The ATI Jaffna portal is currently under scheduled maintenance. Please check back later."
    });
  } catch (error) {
    next(error);
  }
});

router.use(requireAuth, requireAdmin);

router.get("/", async (req, res, next) => {
  try {
    const settings = await SystemSetting.findOne({ key: SETTINGS_KEY });
    res.json(mergeSystemSettings(settings?.value || defaultSystemSettings));
  } catch (error) {
    next(error);
  }
});

router.put("/", async (req, res, next) => {
  try {
    const { settings: nextValue, issues } = validateSystemSettings(req.body || {});
    if (issues.length) return res.status(400).json({ message: issues[0], issues });

    const settings = await SystemSetting.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { value: nextValue, updatedBy: req.user.id },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(settings.value);
  } catch (error) {
    next(error);
  }
});

router.post("/reset", async (req, res, next) => {
  try {
    const settings = await SystemSetting.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { value: defaultSystemSettings, updatedBy: req.user.id },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(settings.value);
  } catch (error) {
    next(error);
  }
});

router.post("/integrations/test", async (req, res, next) => {
  try {
    const type = String(req.body?.type || "").trim().toLowerCase();
    const provider = String(req.body?.provider || "").trim();
    const result = integrationTestResult(type, provider);
    res.status(result.ok ? 200 : 400).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
