import { Router } from "express";
import { createContact, deleteContact, listContacts, updateContact } from "../controllers/contactController.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, listContacts);
router.post("/", optionalAuth, createContact);
router.put("/:id", requireAuth, updateContact);
router.delete("/:id", requireAuth, deleteContact);

export default router;
