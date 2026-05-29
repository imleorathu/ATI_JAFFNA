import { Router } from "express";
import { createCrudController } from "../controllers/crudController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export default function resourceRoutes(Model, { publicCreate = false, protectedRead = false } = {}) {
  const router = Router();
  const controller = createCrudController(Model);
  const adminOnly = [requireAuth, requireAdmin];
  const scopedAccess = ["Student", "Course", "TimetableEntry"].includes(Model.modelName) ? [requireAuth] : adminOnly;

  if (protectedRead) {
    router.get("/", ...scopedAccess, controller.list);
    router.get("/:id", ...scopedAccess, controller.get);
  } else {
    router.get("/", controller.list);
    router.get("/:id", controller.get);
  }
  if (publicCreate) {
    router.post("/", controller.create);
  } else {
    router.post("/", ...scopedAccess, controller.create);
  }
  router.put("/:id", ...scopedAccess, controller.update);
  router.delete("/:id", ...scopedAccess, controller.remove);

  return router;
}
