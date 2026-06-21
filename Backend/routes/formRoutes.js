import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  listForms,
  getForm,
  getAssignmentForm,
  createForm,
  updateForm,
  deleteForm,
  duplicateForm,
  updateFormStatus,
  submitFormResponse,
  getFormResponses,
  updateFormResponse
} from "../controllers/formController.js";

const router = Router();

router.use(requireAuth);

router.get("/", listForms);
router.get("/assignment/:assignmentId", getAssignmentForm);
router.get("/:id", getForm);
router.post("/", createForm);
router.put("/:id", updateForm);
router.delete("/:id", deleteForm);
router.post("/:id/duplicate", duplicateForm);
router.patch("/:id/status", updateFormStatus);
router.post("/:id/responses", submitFormResponse);
router.get("/:id/responses", getFormResponses);
router.patch("/:id/responses/:responseId", updateFormResponse);

export default router;
