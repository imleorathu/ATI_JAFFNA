import Contact from "../models/Contact.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import { getDepartmentScope } from "../middleware/departmentAccess.js";

const facultyScope = getDepartmentScope;
const CONTACT_AUDIENCES = ["admin", "department"];
const DEPARTMENT_MESSAGE_ROLES = ["lecturer", "department_staff"];

async function studentForUser(req) {
  const user = await User.findById(req.user.id).select("email studentProfile name");
  if (!user) return null;
  const email = String(user.email || "").trim().toLowerCase();
  const studentId = String(user.studentProfile?.studentId || "").trim();
  return Student.findOne({ $or: [{ email }, ...(studentId ? [{ studentId }] : [])] });
}

export function normalizeContactAudience(value, fallback = "admin") {
  const audience = String(value || "").trim().toLowerCase();
  return CONTACT_AUDIENCES.includes(audience) ? audience : fallback;
}

export function getContactAudience(record) {
  if (record?.audience) return normalizeContactAudience(record.audience);
  return record?.type === "complaint" ? "department" : "admin";
}

export function contactIsVisibleToScope(record, scope = {}) {
  const audience = getContactAudience(record);
  const role = String(scope.role || "").toLowerCase();

  if (role === "admin") return audience === "admin";
  if (DEPARTMENT_MESSAGE_ROLES.includes(role)) return audience === "department" && record.department === scope.department;
  if (role === "student") return String(record.student || "") === String(scope.studentId || "");
  return false;
}

function adminMessageQuery() {
  return {
    $or: [
      { audience: "admin" },
      { audience: { $exists: false }, type: { $ne: "complaint" } }
    ]
  };
}

function departmentMessageQuery(department) {
  return {
    department,
    type: "complaint",
    $or: [
      { audience: "department" },
      { audience: { $exists: false } }
    ]
  };
}

function contactResponse(record) {
  return {
    _id: record._id,
    name: record.name,
    email: record.email,
    subject: record.subject,
    message: record.message,
    type: record.type,
    audience: getContactAudience(record),
    department: record.department,
    student: record.student,
    studentName: record.studentName,
    studentId: record.studentId,
    status: record.status,
    priority: record.priority,
    category: record.category,
    assignedTo: record.assignedTo,
    internalNote: record.internalNote,
    repliedAt: record.repliedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export async function listContacts(req, res, next) {
  try {
    let query = {};

    if (DEPARTMENT_MESSAGE_ROLES.includes(req.user?.role)) {
      const scope = await facultyScope(req);
      if (scope.error) return res.status(403).json({ message: scope.error });
      query = departmentMessageQuery(scope.department);
    } else if (req.user?.role === "student") {
      const student = await studentForUser(req);
      if (!student) return res.json([]);
      query.student = student._id;
    } else if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Message access is limited to students, faculty, and admins." });
    } else {
      query = adminMessageQuery();
    }

    const records = await Contact.find(query).sort({ createdAt: -1 });
    res.json(records.map(contactResponse));
  } catch (error) {
    next(error);
  }
}

export async function createContact(req, res, next) {
  try {
    let payload = {
      name: String(req.body.name || "").trim(),
      email: String(req.body.email || "").trim().toLowerCase(),
      subject: String(req.body.subject || "").trim(),
      message: String(req.body.message || "").trim(),
      type: req.user?.role === "student" ? "complaint" : "contact",
      audience: "admin",
      department: String(req.body.department || "").trim(),
      priority: req.body.priority || "normal",
      category: req.body.category || "general"
    };

    if (req.user?.role === "student") {
      const student = await studentForUser(req);
      if (!student) return res.status(404).json({ message: "Student profile not found for this account." });
      const audience = normalizeContactAudience(req.body.audience || req.body.target, "department");
      payload = {
        ...payload,
        name: student.fullName,
        email: student.email,
        department: student.department,
        audience,
        student: student._id,
        studentName: student.fullName,
        studentId: student.studentId,
        type: "complaint"
      };
    }

    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      return res.status(400).json({ message: "Name, email, subject, and message are required." });
    }
    if (payload.type === "complaint" && !payload.department) {
      return res.status(400).json({ message: "Student department is required for complaints." });
    }
    if (payload.type === "complaint" && !CONTACT_AUDIENCES.includes(payload.audience)) {
      return res.status(400).json({ message: "Message audience must be admin or department." });
    }

    const record = await Contact.create(payload);
    res.status(201).json(contactResponse(record));
  } catch (error) {
    next(error);
  }
}

export async function updateContact(req, res, next) {
  try {
    const existing = await Contact.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Message not found." });

    if (DEPARTMENT_MESSAGE_ROLES.includes(req.user?.role)) {
      const scope = await facultyScope(req);
      if (scope.error) return res.status(403).json({ message: scope.error });
      if (!contactIsVisibleToScope(existing, { role: req.user.role, department: scope.department })) {
        return res.status(403).json({ message: "You can only manage messages sent to your department." });
      }
    } else if (req.user?.role === "student") {
      const student = await studentForUser(req);
      if (!student || String(existing.student || "") !== String(student._id)) {
        return res.status(403).json({ message: "You can only view your own complaints." });
      }
      return res.status(403).json({ message: "Students cannot edit complaint status." });
    } else if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin or faculty access required." });
    } else if (!contactIsVisibleToScope(existing, { role: "admin" })) {
      return res.status(403).json({ message: "Admins can only manage messages sent to admin." });
    }

    const patch = {
      status: req.body.status ?? existing.status,
      priority: req.body.priority ?? existing.priority,
      category: req.body.category ?? existing.category,
      assignedTo: String(req.body.assignedTo ?? existing.assignedTo ?? "").trim(),
      internalNote: String(req.body.internalNote ?? existing.internalNote ?? "").trim(),
      repliedAt: req.body.repliedAt ?? existing.repliedAt
    };

    const record = await Contact.findByIdAndUpdate(req.params.id, patch, { returnDocument: "after", runValidators: true });
    res.json(contactResponse(record));
  } catch (error) {
    next(error);
  }
}

export async function deleteContact(req, res, next) {
  try {
    const existing = await Contact.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Message not found." });

    if (DEPARTMENT_MESSAGE_ROLES.includes(req.user?.role)) {
      const scope = await facultyScope(req);
      if (scope.error) return res.status(403).json({ message: scope.error });
      if (!contactIsVisibleToScope(existing, { role: req.user.role, department: scope.department })) {
        return res.status(403).json({ message: "You can only delete messages sent to your department." });
      }
    } else if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin or faculty access required." });
    } else if (!contactIsVisibleToScope(existing, { role: "admin" })) {
      return res.status(403).json({ message: "Admins can only delete messages sent to admin." });
    }

    await Contact.findByIdAndDelete(req.params.id);
    res.json({ message: "Message deleted." });
  } catch (error) {
    next(error);
  }
}
