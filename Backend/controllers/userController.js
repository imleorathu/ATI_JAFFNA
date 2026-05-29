import bcrypt from "bcryptjs";
import User from "../models/User.js";

const allowedRoles = ["student", "lecturer", "admin"];
const allowedStatuses = ["pending", "approved", "rejected"];

const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  accountStatus: user.accountStatus || "approved",
  studentProfile: user.studentProfile,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

export async function listUsers(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users.map(publicUser));
  } catch (error) {
    next(error);
  }
}

export async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const role = allowedRoles.includes(String(req.body.role).toLowerCase()) ? String(req.body.role).toLowerCase() : "student";
    const accountStatus = allowedStatuses.includes(String(req.body.accountStatus).toLowerCase())
      ? String(req.body.accountStatus).toLowerCase()
      : "approved";
    const passwordHash = await bcrypt.hash(req.body.password || "Password@123", 10);
    const user = await User.create({
      name: req.body.name,
      email: req.body.email,
      passwordHash,
      role,
      accountStatus,
      studentProfile: req.body.studentProfile || {}
    });

    res.status(201).json(publicUser(user));
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.email !== undefined) updates.email = String(req.body.email).trim().toLowerCase();
    if (req.body.role !== undefined) {
      const role = String(req.body.role).toLowerCase();
      if (!allowedRoles.includes(role)) return res.status(400).json({ message: "Invalid role." });
      updates.role = role;
    }
    if (req.body.accountStatus !== undefined) {
      const accountStatus = String(req.body.accountStatus).toLowerCase();
      if (!allowedStatuses.includes(accountStatus)) return res.status(400).json({ message: "Invalid account status." });
      updates.accountStatus = accountStatus;
    }
    if (req.body.studentProfile !== undefined) updates.studentProfile = req.body.studentProfile;
    if (req.body.password !== undefined && String(req.body.password).trim()) {
      const password = String(req.body.password);
      const confirmPassword = String(req.body.confirmPassword || password);
      if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
      if (password !== confirmPassword) return res.status(400).json({ message: "Password and confirm password do not match." });
      updates.passwordHash = await bcrypt.hash(password, 10);
      updates.mustChangePassword = false;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (error) {
    next(error);
  }
}
