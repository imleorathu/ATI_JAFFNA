import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Student from "../models/Student.js";
import User from "../models/User.js";
import { getConfig } from "../lib/config.js";
import { buildRoleProfile, studentProfileFromPayload } from "../services/userProfileService.js";

const signToken = (profile) => {
  // Read config lazily at call time (not at import time) to ensure dotenv has loaded
  const cfg = getConfig();
  return jwt.sign(
    {
      id: profile._id || profile.id,
      role: profile.role,
      department_id: profile.department_id || ""
    },
    cfg.jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
};
const minimumPasswordLength = 8;

const normalizedEmail = (value) => String(value || "").trim().toLowerCase();
const normalizedStudentId = (value) => String(value || "").trim();

export async function register(req, res, next) {
  let createdStudent = null;
  let createdUser = null;

  try {
    const {
      name,
      email,
      password,
      studentId,
      nic,
      department,
      program,
      intake,
      academicYear,
      academicStage,
      studyMode,
      phone,
      guardianName,
      guardianPhone
    } = req.body;
    const emailAddress = normalizedEmail(email);
    const studentIdentifier = normalizedStudentId(studentId);
    const role = "student";

    if (!name || !emailAddress || !password || !studentIdentifier || !nic || !department) {
      return res.status(400).json({ message: "Name, email, password, Student ID, NIC, and department are required." });
    }
    if (String(password).length < minimumPasswordLength) {
      return res.status(400).json({ message: `Password must be at least ${minimumPasswordLength} characters.` });
    }
    if (req.body.confirmPassword !== undefined && password !== req.body.confirmPassword) {
      return res.status(400).json({ message: "Password and confirm password do not match." });
    }

    const existingUser = await User.findOne({
      $or: [{ email: emailAddress }, ...(studentIdentifier ? [{ "studentProfile.studentId": studentIdentifier }] : [])]
    }).select("_id");
    const existingStudent = await Student.findOne({
      $or: [{ email: emailAddress }, ...(studentIdentifier ? [{ studentId: studentIdentifier }] : [])]
    }).select("_id");
    if (existingUser || existingStudent) {
      return res.status(409).json({ message: "An account already exists with this email or Student ID." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const normalizedAcademicStage = academicStage || "";
    const normalizedStudyMode = normalizedAcademicStage
      ? normalizedAcademicStage.includes("Part Time") ? "Part-time" : "Full-time"
      : studyMode;
    const studentProfile = studentProfileFromPayload({
      studentId: studentIdentifier,
      nic,
      department,
      program,
      intake,
      academicYear,
      academicStage: normalizedAcademicStage,
      studyMode: normalizedStudyMode,
      phone,
      guardianName,
      guardianPhone
    });
    const accountStatus = "pending";
    createdStudent = await Student.create({
      fullName: name,
      email: emailAddress,
      phone,
      nic,
      studentId: studentIdentifier,
      department,
      program,
      intake,
      academicYear,
      academicStage: normalizedAcademicStage,
      studyMode: normalizedStudyMode,
      guardianName,
      guardianPhone,
      paymentStatus: normalizedStudyMode === "Full-time" ? "not_required" : "pending"
    });
    createdUser = await User.create({ name, email: emailAddress, passwordHash, role, accountStatus, studentProfile });

    res.status(201).json({
      user: await buildRoleProfile(createdUser),
      message: "Registration submitted. An admin must approve your account before you can sign in."
    });
  } catch (error) {
    if (createdUser?._id) await User.findByIdAndDelete(createdUser._id).catch(() => {});
    if (createdStudent?._id) await Student.findByIdAndDelete(createdStudent._id).catch(() => {});
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { password } = req.body;
    const identifier = String(req.body.identifier || req.body.email || "").trim();
    if (!identifier || !password) {
      return res.status(400).json({ message: "Email or Student ID and password are required." });
    }

    const user = await User.findOne({
      $or: [{ email: normalizedEmail(identifier) }, { "studentProfile.studentId": normalizedStudentId(identifier) }]
    });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) return res.status(401).json({ message: "Invalid credentials" });
    if (req.body.role && user.role !== String(req.body.role).toLowerCase()) {
      return res.status(403).json({ message: `Please use the ${user.role} login role for this account.` });
    }
    if ((user.accountStatus || "approved") === "pending") {
      return res.status(403).json({ message: "Your account is waiting for admin approval." });
    }
    if (user.accountStatus === "rejected") {
      return res.status(403).json({ message: "Your account registration was rejected. Contact administration." });
    }

    const profile = await buildRoleProfile(user);
    res.json({ token: signToken(profile), user: profile });
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ user: await buildRoleProfile(user) });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) return res.status(401).json({ message: "Current password is incorrect." });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    await user.save();

    res.json({ user: await buildRoleProfile(user), message: "Password changed successfully." });
  } catch (error) {
    next(error);
  }
}

export async function updateProfilePhoto(req, res, next) {
  try {
    if (req.user?.role !== "student") {
      return res.status(403).json({ message: "Only students can update their profile photo." });
    }
    if (!req.file) return res.status(400).json({ message: "Upload an image file." });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.studentProfile = user.studentProfile || {};
    user.studentProfile.profilePhotoUrl = `${req.protocol}://${req.get("host")}/uploads/profiles/${req.file.filename}`;
    await user.save();

    res.json({ user: await buildRoleProfile(user), message: "Profile photo updated." });
  } catch (error) {
    next(error);
  }
}
