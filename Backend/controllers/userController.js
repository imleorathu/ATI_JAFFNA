import bcrypt from "bcryptjs";
import Alumni from "../models/Alumni.js";
import DepartmentStaff from "../models/DepartmentStaff.js";
import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import { deleteStaffAccountBundle } from "./staffProfileSync.js";
import { adminProfileFromPayload, buildRoleProfile, buildRoleProfiles, staffProfileFromPayload, studentProfileFromPayload } from "../services/userProfileService.js";
import { canonicalDepartmentName } from "../services/departmentService.js";

const allowedRoles = ["student", "lecturer", "staff", "faculty", "department_staff", "finance_officer", "finance", "admin"];
const allowedStatuses = ["pending", "approved", "rejected"];

function normalizeRole(value) {
  const role = String(value || "student").toLowerCase();
  if (["staff", "faculty"].includes(role)) return "lecturer";
  if (["finance", "finance officer", "finance-officer"].includes(role)) return "finance_officer";
  if (["department staff", "department-staff"].includes(role)) return "department_staff";
  return role;
}

function profilePatchForRole(role, body) {
  if (role === "student") {
    return {
      studentProfile: studentProfileFromPayload(body.studentProfile || body),
      staffProfile: undefined,
      adminProfile: undefined
    };
  }

  if (["lecturer", "department_staff", "finance_officer"].includes(role)) {
    return {
      studentProfile: undefined,
      staffProfile: staffProfileFromPayload(body.staffProfile || body.facultyProfile || body),
      adminProfile: undefined
    };
  }

  if (role === "admin") {
    return {
      studentProfile: undefined,
      staffProfile: undefined,
      adminProfile: adminProfileFromPayload(body.adminProfile || body)
    };
  }

  return {};
}

async function canonicalizeProfileDepartment(role, body) {
  const profileKey = role === "student"
    ? "studentProfile"
    : role === "alumni"
      ? "alumniProfile"
      : ["lecturer", "department_staff", "finance_officer"].includes(role)
        ? (body.staffProfile !== undefined ? "staffProfile" : "facultyProfile")
        : role === "admin"
          ? "adminProfile"
          : "";
  const profile = profileKey ? body[profileKey] : null;
  if (!profile || profile.department === undefined) return;

  profile.department = await canonicalDepartmentName(profile.department, { required: role !== "admin" && role !== "finance_officer" });
}

async function syncLinkedProfile(user, previousEmail) {
  const emailOptions = [...new Set([previousEmail, user.email].map((email) => String(email || "").trim().toLowerCase()).filter(Boolean))];
  if (!emailOptions.length) return;

  if (user.role === "student" && user.studentProfile) {
    const profile = user.studentProfile;
    await Student.findOneAndUpdate(
      {
        $or: [
          { email: { $in: emailOptions } },
          ...(profile.studentId ? [{ studentId: profile.studentId }] : [])
        ]
      },
      {
        fullName: user.name,
        email: user.email,
        phone: profile.phone,
        nic: profile.nic,
        studentId: profile.studentId,
        department: profile.department,
        program: profile.program || profile.department,
        intake: profile.intake,
        academicYear: profile.academicYear,
        academicStage: profile.academicStage,
        studyMode: profile.studyMode,
        guardianName: profile.guardianName,
        guardianPhone: profile.guardianPhone
      },
      { runValidators: true }
    );
  }

  if (["lecturer", "department_staff", "finance_officer"].includes(user.role) && user.staffProfile) {
    const profile = user.staffProfile;
    const staffUpdate = {
      fullName: user.name,
      email: user.email,
      phone: profile.phone,
      department: profile.department,
      staffType: profile.staffType,
      office: profile.office,
      bio: profile.bio
    };

    await Promise.all([
      DepartmentStaff.findOneAndUpdate({ email: { $in: emailOptions } }, staffUpdate, { runValidators: true }),
      Faculty.findOneAndUpdate({ email: { $in: emailOptions } }, staffUpdate, { runValidators: true })
    ]);
  }
}

export async function listUsers(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(await buildRoleProfiles(users));
  } catch (error) {
    next(error);
  }
}

export async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(await buildRoleProfile(user));
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const requestedRole = String(req.body.role || "student").toLowerCase();
    if (!allowedRoles.includes(requestedRole)) return res.status(400).json({ message: "Invalid role." });

    const role = normalizeRole(requestedRole);
    await canonicalizeProfileDepartment(role, req.body);
    const accountStatus = allowedStatuses.includes(String(req.body.accountStatus).toLowerCase())
      ? String(req.body.accountStatus).toLowerCase()
      : "approved";
    const passwordHash = await bcrypt.hash(req.body.password || "Password@123", 10);
    const user = await User.create({
      name: req.body.name,
      email: String(req.body.email || "").trim().toLowerCase(),
      passwordHash,
      role,
      accountStatus,
      ...profilePatchForRole(role, req.body)
    });

    res.status(201).json(await buildRoleProfile(user));
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const current = await User.findById(req.params.id);
    if (!current) return res.status(404).json({ message: "User not found" });
    const previousEmail = current.email;

    if (req.body.name !== undefined) current.name = req.body.name;
    if (req.body.email !== undefined) current.email = String(req.body.email).trim().toLowerCase();
    if (req.body.role !== undefined) {
      const requestedRole = String(req.body.role).toLowerCase();
      if (!allowedRoles.includes(requestedRole)) return res.status(400).json({ message: "Invalid role." });
      current.role = normalizeRole(requestedRole);
    }
    if (req.body.accountStatus !== undefined) {
      const accountStatus = String(req.body.accountStatus).toLowerCase();
      if (!allowedStatuses.includes(accountStatus)) return res.status(400).json({ message: "Invalid account status." });
      current.accountStatus = accountStatus;
      if (current.role === "alumni" && current.alumniProfile?.alumniId) {
        await Alumni.findByIdAndUpdate(current.alumniProfile.alumniId, {
          accountStatus,
          reviewedAt: new Date(),
          reviewedBy: req.user.id
        });
      }
    }

    if (req.body.studentProfile !== undefined || req.body.alumniProfile !== undefined || req.body.staffProfile !== undefined || req.body.facultyProfile !== undefined || req.body.adminProfile !== undefined) {
      await canonicalizeProfileDepartment(current.role, req.body);
      if (current.role === "alumni" && req.body.alumniProfile !== undefined) {
        current.alumniProfile = {
          ...current.alumniProfile.toObject(),
          ...req.body.alumniProfile
        };
        await Alumni.findByIdAndUpdate(current.alumniProfile.alumniId, {
          department: current.alumniProfile.department
        }, { runValidators: true });
      } else {
        Object.assign(current, profilePatchForRole(current.role, req.body));
      }
    }

    if (req.body.password !== undefined && String(req.body.password).trim()) {
      const password = String(req.body.password);
      const confirmPassword = String(req.body.confirmPassword || password);
      if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
      if (password !== confirmPassword) return res.status(400).json({ message: "Password and confirm password do not match." });
      current.passwordHash = await bcrypt.hash(password, 10);
      current.mustChangePassword = false;
    }

    await current.save();
    await syncLinkedProfile(current, previousEmail);
    res.json(await buildRoleProfile(current));
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (["lecturer", "department_staff", "finance_officer"].includes(user.role)) {
      await deleteStaffAccountBundle(user);
    }
    if (user.role === "alumni" && user.alumniProfile?.alumniId) {
      await Alumni.findByIdAndDelete(user.alumniProfile.alumniId);
    }
    res.json({ message: "User deleted" });
  } catch (error) {
    next(error);
  }
}
