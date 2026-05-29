import { Router } from "express";
import jwt from "jsonwebtoken";
import { createContact, deleteContact, listContacts, updateContact } from "../controllers/contactController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    } catch {
      req.user = null;
    }
  }
  next();
}

router.get("/", requireAuth, listContacts);
router.post("/", optionalAuth, createContact);
router.put("/:id", requireAuth, updateContact);
router.delete("/:id", requireAuth, deleteContact);

export default router;
