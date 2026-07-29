import assert from "node:assert/strict";
import test from "node:test";
import Alumni from "../models/Alumni.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import { promoteStudentToAlumni } from "../controllers/alumniController.js";

test("graduation moves a student to alumni while preserving the linked login", async (context) => {
  const originals = { userFindOne: User.findOne, alumniFindOne: Alumni.findOne, alumniCreate: Alumni.create, studentDelete: Student.findByIdAndDelete };
  context.after(() => {
    User.findOne = originals.userFindOne; Alumni.findOne = originals.alumniFindOne;
    Alumni.create = originals.alumniCreate; Student.findByIdAndDelete = originals.studentDelete;
  });

  const savedUser = {
    role: "student", accountStatus: "approved", studentProfile: { profilePhotoUrl: "photo.jpg" },
    async save() { this.saved = true; }
  };
  let alumniPayload;
  let deletedStudentId;
  User.findOne = async () => savedUser;
  Alumni.findOne = async () => null;
  Alumni.create = async (payload) => { alumniPayload = payload; return { _id: "alumni-1", ...payload }; };
  Student.findByIdAndDelete = async (id) => { deletedStudentId = id; };

  const student = {
    _id: "student-1", fullName: "Graduate Student", email: "graduate@example.com", phone: "0771234567",
    nic: "200012345678", studentId: "ATI/2022/001", department: "HNDIT", program: "HNDIT",
    intake: "2022", academicYear: "2022/2023", academicStage: "Second year Full Time",
    toObject() { return { ...this, toObject: undefined }; }
  };
  await promoteStudentToAlumni(student, { graduationYear: "2026", reviewedBy: "admin-1" });

  assert.equal(savedUser.role, "alumni");
  assert.equal(savedUser.accountStatus, "approved");
  assert.equal(savedUser.alumniProfile.studentRegistrationNumber, "ATI/2022/001");
  assert.equal(savedUser.saved, true);
  assert.equal(alumniPayload.graduatedFromStudent, true);
  assert.equal(alumniPayload.graduationYear, "2026");
  assert.equal(deletedStudentId, "student-1");
});
