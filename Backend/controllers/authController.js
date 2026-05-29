import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Student from "../models/Student.js";
import User from "../models/User.js";
import { getConfig } from "../lib/config.js";

const signToken = (user) => {
  // Read config lazily at call time (not at import time) to ensure dotenv has loaded
  const cfg = getConfig();
  return jwt.sign({ id: user._id, role: user.role }, cfg.jwtSecret, { expiresIn: process.env.JWT_EXPIRES_IN || "1d" });
};
const hnditDepartment = "Higher National Diploma in Information Technology - (HNDIT)";

const authUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  accountStatus: user.accountStatus || "approved",
  mustChangePassword: !!user.mustChangePassword,
  studentProfile: user.studentProfile
});

export async function register(req, res, next) {
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
    const role = ["student", "lecturer", "admin"].includes(String(req.body.role).toLowerCase())
      ? String(req.body.role).toLowerCase()
      : "student";
    const passwordHash = await bcrypt.hash(password, 10);
    const normalizedAcademicStage = department === hnditDepartment ? academicStage || "" : "";
    const normalizedStudyMode = normalizedAcademicStage
      ? normalizedAcademicStage.includes("Part Time") ? "Part-time" : "Full-time"
      : studyMode;
    const studentProfile = {
      studentId,
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
    };
    const accountStatus = role === "admin" ? "approved" : "pending";
    const user = await User.create({ name, email, passwordHash, role, accountStatus, studentProfile });

    if (role === "student") {
      await Student.create({
        fullName: name,
        email,
        phone,
        nic,
        studentId,
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
    }

    const token = signToken(user);

    res.status(201).json({
      user: authUser(user),
      message: "Registration submitted. An admin must approve your account before you can sign in."
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { password } = req.body;
    const email = String(req.body.email || "").trim().toLowerCase();
    const user = await User.findOne({ email });
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

    res.json({ token: signToken(user), user: authUser(user) });
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

    res.json({ user: authUser(user), message: "Password changed successfully." });
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

    res.json({ user: authUser(user), message: "Profile photo updated." });
  } catch (error) {
    next(error);
  }
}
