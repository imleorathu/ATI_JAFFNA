import mongoose from "mongoose";
import Student from "../models/Student.js";
import User from "../models/User.js";

export const FEE_ROLES = {
  ADMIN: "admin",
  FINANCE: "finance_officer",
  DEPARTMENT: "department_staff",
  LECTURER: "lecturer",
  STUDENT: "student"
};

export function normalizeRole(role) {
  const value = String(role || "").toLowerCase();
  if (["finance", "finance-officer", "finance officer"].includes(value)) return FEE_ROLES.FINANCE;
  if (["department-staff", "department staff", "faculty", "staff"].includes(value)) return FEE_ROLES.DEPARTMENT;
  return value;
}

export function isAdmin(user) {
  return normalizeRole(user?.role) === FEE_ROLES.ADMIN;
}

export function isFinance(user) {
  return normalizeRole(user?.role) === FEE_ROLES.FINANCE;
}

export function isDepartmentStaff(user) {
  return [FEE_ROLES.DEPARTMENT, FEE_ROLES.LECTURER].includes(normalizeRole(user?.role));
}

export function isStudent(user) {
  return normalizeRole(user?.role) === FEE_ROLES.STUDENT;
}

export function requireFeeRole(...roles) {
  const allowed = roles.map(normalizeRole);
  return (req, res, next) => {
    if (!allowed.includes(normalizeRole(req.user?.role))) {
      return res.status(403).json({ message: `Access requires one of these roles: ${allowed.join(", ")}` });
    }
    next();
  };
}

export function requireFinanceAccess(req, res, next) {
  if (isAdmin(req.user) || isFinance(req.user)) return next();
  return res.status(403).json({ message: "Finance officer or admin access required." });
}

export function requireFeeManagementAccess(req, res, next) {
  if (isAdmin(req.user) || isFinance(req.user) || isDepartmentStaff(req.user)) return next();
  return res.status(403).json({ message: "Fee management access required." });
}

export async function requirePartTimeStudentFeeAccess(req, res, next) {
  try {
    if (!isStudent(req.user)) return next();

    const scope = await resolveFeeScope(req);
    if (scope.error) {
      return res.status(403).json({ message: scope.error });
    }
    if (scope.student?.studyMode !== "Part-time") {
      return res.status(403).json({ message: "Student fees are available only to part-time students." });
    }

    req.feeScope = scope;
    return next();
  } catch (error) {
    return next(error);
  }
}

export async function getLoggedInUser(req) {
  if (!req.user?.id) return null;
  return User.findById(req.user.id).lean();
}

export function departmentFromUser(userDoc, tokenUser = {}) {
  return (
    tokenUser.department_id ||
    userDoc?.department_id ||
    userDoc?.staffProfile?.department ||
    userDoc?.studentProfile?.department ||
    userDoc?.adminProfile?.department ||
    ""
  );
}

export async function resolveFeeScope(req) {
  const userDoc = await getLoggedInUser(req);
  if (!userDoc) return { error: "User account not found." };

  if (isAdmin(req.user) || isFinance(req.user)) {
    return { mode: "all", user: userDoc, departmentId: req.query.departmentId || req.query.department || "" };
  }

  if (isDepartmentStaff(req.user)) {
    const departmentId = departmentFromUser(userDoc, req.user);
    if (!departmentId) return { error: "Department staff account is not assigned to a department." };
    return { mode: "department", user: userDoc, departmentId };
  }

  if (isStudent(req.user)) {
    const studentProfile = userDoc.studentProfile || {};
    const student = await Student.findOne({
      $or: [
        { email: userDoc.email },
        ...(studentProfile.studentId ? [{ studentId: studentProfile.studentId }] : [])
      ]
    }).lean();
    if (!student) return { error: "Student profile not found for this account." };
    return { mode: "student", user: userDoc, student, departmentId: student.department || studentProfile.department || "" };
  }

  return { error: "Fee module access denied." };
}

export async function scopeQuery(req, baseQuery = {}) {
  const scope = await resolveFeeScope(req);
  if (scope.error) return { scope, query: null };

  const query = { ...baseQuery };
  if (scope.mode === "department") {
    query.departmentId = scope.departmentId;
  } else if (scope.mode === "student") {
    query.student = scope.student._id;
  } else if (scope.departmentId) {
    query.departmentId = scope.departmentId;
  }

  return { scope, query };
}

export function assertDepartmentAccess(req, resourceDepartmentId) {
  if (isAdmin(req.user) || isFinance(req.user)) return true;
  const expected = req.feeScope?.departmentId;
  return Boolean(expected && resourceDepartmentId && String(expected) === String(resourceDepartmentId));
}

export function assertStudentAccess(req, resourceStudentId) {
  if (!isStudent(req.user)) return true;
  return String(req.feeScope?.student?._id || "") === String(resourceStudentId || "");
}

export function assertObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}
