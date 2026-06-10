import AdminStaff from "../models/AdminStaff.js";
import DepartmentStaff from "../models/DepartmentStaff.js";
import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

export function studentProfileFromPayload(payload) {
  return {
    studentId: payload.studentId,
    nic: payload.nic,
    department: payload.department,
    program: payload.program || payload.department,
    intake: payload.intake,
    academicYear: payload.academicYear,
    academicStage: payload.academicStage,
    studyMode: payload.studyMode,
    phone: payload.phone,
    guardianName: payload.guardianName,
    guardianPhone: payload.guardianPhone,
    profilePhotoUrl: payload.profilePhotoUrl
  };
}

export function staffProfileFromPayload(payload) {
  return {
    staffId: payload.staffId,
    department: payload.department,
    staffType: payload.staffType || "Teaching Staff",
    phone: payload.phone,
    office: payload.office,
    bio: payload.bio,
    profilePhotoUrl: payload.profilePhotoUrl
  };
}

export function adminProfileFromPayload(payload = {}) {
  return {
    staffId: payload.staffId,
    designation: payload.designation || "Administrator",
    department: payload.department,
    phone: payload.phone,
    office: payload.office,
    profilePhotoUrl: payload.profilePhotoUrl
  };
}

function mergeDefined(base, fallback) {
  const merged = { ...fallback };
  Object.entries(base || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") merged[key] = value;
  });
  return Object.fromEntries(Object.entries(merged).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

export async function getStudentProfileForUser(user) {
  const email = normalizeEmail(user.email);
  const studentId = String(user.studentProfile?.studentId || "").trim();
  const student = await Student.findOne({
    $or: [{ email }, ...(studentId ? [{ studentId }] : [])]
  }).lean();

  if (!student) return user.studentProfile || undefined;

  return mergeDefined(user.studentProfile || {}, studentProfileFromPayload(student));
}

export async function getStaffProfileForUser(user) {
  const email = normalizeEmail(user.email);
  const departmentStaff = await DepartmentStaff.findOne({ email }).lean();
  const adminStaff = departmentStaff ? null : await AdminStaff.findOne({ email }).lean();
  const faculty = departmentStaff || adminStaff ? null : await Faculty.findOne({ email }).lean();
  const staff = departmentStaff || adminStaff || faculty;

  if (!staff) return user.staffProfile || undefined;

  return mergeDefined(user.staffProfile || {}, staffProfileFromPayload(staff));
}

export async function buildRoleProfile(user) {
  if (!user) return null;
  const plain = user.toObject ? user.toObject() : user;
  const base = {
    id: plain._id,
    _id: plain._id,
    name: plain.name,
    email: plain.email,
    role: plain.role,
    accountStatus: plain.accountStatus || "approved",
    mustChangePassword: !!plain.mustChangePassword,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt
  };

  if (plain.role === "student") {
    const studentProfile = await getStudentProfileForUser(plain);
    return { ...base, department_id: studentProfile?.department || "", studentProfile };
  }

  if (["lecturer", "department_staff", "finance_officer"].includes(plain.role)) {
    const staffProfile = await getStaffProfileForUser(plain);
    return { ...base, department_id: staffProfile?.department || "", staffProfile, facultyProfile: staffProfile };
  }

  if (plain.role === "admin") {
    const adminProfile = plain.adminProfile || adminProfileFromPayload();
    return { ...base, department_id: adminProfile?.department || "", adminProfile };
  }

  return base;
}

export async function buildRoleProfiles(users) {
  return Promise.all(users.map((user) => buildRoleProfile(user)));
}
