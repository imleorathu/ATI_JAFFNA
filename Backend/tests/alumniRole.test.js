import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import User from "../models/User.js";

test("alumni is a valid user role with a linked alumni profile", async () => {
  const user = new User({
    name: "Alumni Test",
    email: "alumni-test@example.com",
    passwordHash: "hashed-password",
    role: "alumni",
    accountStatus: "pending",
    alumniProfile: {
      alumniId: new mongoose.Types.ObjectId(),
      studentRegistrationNumber: "ATI/AL/001",
      department: "HNDIT",
      graduationYear: "2024"
    }
  });

  await user.validate();
  assert.equal(user.role, "alumni");
  assert.equal(user.alumniProfile.studentRegistrationNumber, "ATI/AL/001");
});

test("alumni users require a linked alumni record", async () => {
  const user = new User({ name: "Invalid Alumni", email: "invalid-alumni@example.com", passwordHash: "hash", role: "alumni" });
  await assert.rejects(user.validate(), /Alumni profile/i);
});
