import assert from "node:assert/strict";
import test from "node:test";
import Student from "../models/Student.js";
import User from "../models/User.js";
import { register } from "../controllers/authController.js";

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

const validRegistration = {
  name: "Study Year Test",
  email: "study-year-test@example.com",
  password: "Password@123",
  studentId: "STUDY-YEAR-TEST",
  nic: "200012345678",
  department: "Higher National Diploma in Information Technology - (HNDIT)",
  program: "Higher National Diploma in Information Technology - (HNDIT)",
  academicYear: "2025/2026",
  academicStage: "Second year Part Time",
  studyMode: "Full-time"
};

test("registration requires a study year", async () => {
  const response = responseRecorder();
  let nextError;

  await register(
    { body: { ...validRegistration, academicStage: "" } },
    response,
    (error) => { nextError = error; }
  );

  assert.equal(nextError, undefined);
  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /study year/i);
});

test("registration requires an academic year", async () => {
  const response = responseRecorder();
  let nextError;

  await register(
    { body: { ...validRegistration, academicYear: "" } },
    response,
    (error) => { nextError = error; }
  );

  assert.equal(nextError, undefined);
  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /academic year/i);
});

test("registration saves the selected study year to both student records", async (context) => {
  const originalStudentFindOne = Student.findOne;
  const originalStudentCreate = Student.create;
  const originalUserFindOne = User.findOne;
  const originalUserCreate = User.create;
  let savedStudent;
  let savedUser;

  context.after(() => {
    Student.findOne = originalStudentFindOne;
    Student.create = originalStudentCreate;
    User.findOne = originalUserFindOne;
    User.create = originalUserCreate;
  });

  Student.findOne = () => ({
    select: async () => null,
    lean: async () => savedStudent
  });
  User.findOne = () => ({ select: async () => null });
  Student.create = async (payload) => {
    savedStudent = { _id: "student-record", ...payload };
    return savedStudent;
  };
  User.create = async (payload) => {
    savedUser = { _id: "user-record", ...payload };
    return savedUser;
  };

  const response = responseRecorder();
  let nextError;
  await register(
    { body: validRegistration },
    response,
    (error) => { nextError = error; }
  );

  assert.equal(nextError, undefined);
  assert.equal(response.statusCode, 201);
  assert.equal(savedStudent.academicStage, "Second year Part Time");
  assert.equal(savedStudent.academicYear, "2025/2026");
  assert.equal(savedStudent.studyMode, "Part-time");
  assert.equal(savedUser.studentProfile.academicStage, "Second year Part Time");
  assert.equal(savedUser.studentProfile.academicYear, "2025/2026");
  assert.equal(savedUser.studentProfile.studyMode, "Part-time");
});
