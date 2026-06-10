import bcrypt from "bcryptjs";
import Faculty from "../models/Faculty.js";
import User from "../models/User.js";
import { deleteStaffAccountBundle, deleteStaffProfiles, syncStaffProfiles } from "./staffProfileSync.js";
import { staffProfileFromPayload, studentProfileFromPayload } from "../services/userProfileService.js";
import { syncStudentPaymentStatuses } from "../services/paymentStatusService.js";

const departmentBasedFacultyTypes = ["Teaching Staff", "Head of the department"];
const departmentHeadType = "Head of the department";
const minimumPasswordLength = 8;

function normalizePayload(Model, payload) {
  if (Model.modelName === "Faculty") {
    const normalized = { ...payload };
    delete normalized.designation;
    if (!normalized.staffType) normalized.staffType = "Teaching Staff";
    if (!departmentBasedFacultyTypes.includes(normalized.staffType)) normalized.department = "";
    return normalized;
  }

  if (Model.modelName === "Course") {
    const normalized = { ...payload };
    normalized.progress = Math.min(100, Math.max(0, Number(normalized.progress || 0)));
    return normalized;
  }

  if (Model.modelName === "TimetableEntry") {
    const normalized = { ...payload };
    return normalized;
  }

  if (Model.modelName !== "Student") return payload;

  const normalized = { ...payload };
  if (normalized.academicStage) {
    normalized.studyMode = String(normalized.academicStage).includes("Part Time") ? "Part-time" : "Full-time";
  }
  if (normalized.studyMode === "Full-time") {
    normalized.paymentStatus = "not_required";
  } else if (normalized.studyMode === "Part-time" && normalized.paymentStatus === "not_required") {
    normalized.paymentStatus = "pending";
  }

  return normalized;
}

async function facultyScope(req) {
  if (req.user?.role !== "lecturer") return null;

  const user = await User.findById(req.user.id).select("email");
  if (!user) return { error: "User account not found." };

  const faculty = await Faculty.findOne({ email: String(user.email || "").trim().toLowerCase() });
  if (!faculty) return { error: "Faculty profile not found for this account." };
  if (!departmentBasedFacultyTypes.includes(faculty.staffType) || !faculty.department) {
    return { error: "This staff account is not assigned to a student department." };
  }

  return { faculty, department: faculty.department };
}

function facultyLoginPayload(payload, passwordHash) {
  return {
    name: payload.fullName,
    email: String(payload.email || "").trim().toLowerCase(),
    passwordHash,
    role: "lecturer",
    accountStatus: "approved",
    mustChangePassword: false,
    staffProfile: staffProfileFromPayload(payload)
  };
}

function parseSlotTime(value) {
  const [hourText = "0", minuteText = "0"] = String(value || "").trim().split(":");
  let hour = Number(hourText);
  const minute = Number(minuteText);
  if (hour > 0 && hour < 7) hour += 12;
  return hour * 60 + minute;
}

function parseTimeRange(timeRange) {
  const [startText, endText] = String(timeRange || "").split(/\s*-\s*/);
  if (!startText || !endText) return { start: null, end: null };
  return { start: parseSlotTime(startText), end: parseSlotTime(endText) };
}

function validateTimetablePayload(payload) {
  const { start, end } = parseTimeRange(payload.time);
  if (start === null || end === null || end <= start) {
    return "Use a valid time range like 08:00 - 09:00 or 01:00 - 02:00.";
  }
  const [startText, endText] = String(payload.time || "").trim().split(/\s*-\s*/);
  const format = (value) => {
    const [hour = "", minute = ""] = String(value || "").split(":");
    return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  };
  payload.time = `${format(startText)} - ${format(endText)}`;
  return "";
}

async function deleteStudentLogin(student) {
  const email = String(student.email || "").trim().toLowerCase();
  const studentId = String(student.studentId || "").trim();
  await User.findOneAndDelete({
    role: "student",
    $or: [{ email }, ...(studentId ? [{ "studentProfile.studentId": studentId }] : [])]
  });
}

async function applySyncedStudentPaymentStatuses(students, source) {
  const partTimeStudentIds = students
    .filter((student) => student.studyMode === "Part-time")
    .map((student) => student._id);
  if (!partTimeStudentIds.length) return students;

  const statusMap = await syncStudentPaymentStatuses(partTimeStudentIds, { source });
  return students.map((student) => {
    const syncedStatus = statusMap.get(String(student._id));
    const plainStudent = typeof student.toObject === "function" ? student.toObject() : student;
    return syncedStatus ? { ...plainStudent, paymentStatus: syncedStatus } : plainStudent;
  });
}

async function validateDepartmentHead(payload, excludeId = null) {
  if (payload.staffType !== departmentHeadType) return "";
  if (!payload.department) return "Department is required for a Head of the department.";

  const existingHead = await Faculty.exists({
    department: payload.department,
    staffType: departmentHeadType,
    ...(excludeId ? { _id: { $ne: excludeId } } : {})
  });
  return existingHead ? "This department already has a Head of the department." : "";
}

async function validateTimetableLecturer(payload) {
  if (["Lunch Break", "Free Period", "Interval"].includes(payload.subject)) {
    payload.lecturer = "";
    return "";
  }

  const lecturer = String(payload.lecturer || "").trim();
  if (!lecturer) return "Select a lecturer from the registered faculty list.";

  const faculty = await Faculty.exists({
    fullName: lecturer,
    department: payload.department,
    staffType: { $in: departmentBasedFacultyTypes },
    status: "Active"
  });
  return faculty ? "" : "Select an active lecturer already registered for this department.";
}

export function createCrudController(Model) {
  return {
    async list(req, res, next) {
      try {
        if (Model.modelName === "TimetableEntry" && req.user?.role === "lecturer") {
          const scope = await facultyScope(req);
          if (scope?.error) return res.json([]);
          const items = await Model.find({ department: scope.department }).sort({ day: 1, time: 1 });
          return res.json(items);
        }

        if (Model.modelName === "TimetableEntry" && req.user?.role === "student") {
          const user = await User.findById(req.user.id).select("studentProfile");
          const department = user?.studentProfile?.department || user?.studentProfile?.program;
          if (!department) return res.json([]);
          const academicStage = user?.studentProfile?.academicStage || "";
          const items = await Model.find({
            department,
            $or: [{ academicStage: "" }, { academicStage: { $exists: false } }, ...(academicStage ? [{ academicStage }] : [])]
          }).sort({ day: 1, time: 1 });
          return res.json(items);
        }

        if (Model.modelName === "TimetableEntry" && req.user && req.user.role !== "admin") {
          return res.status(403).json({ message: "Timetable access is limited to students, faculty, and admins." });
        }

        if (Model.modelName === "Course" && req.user?.role === "lecturer") {
          const scope = await facultyScope(req);
          if (scope?.error) return res.json([]);
          const items = await Model.find({ department: scope.department }).sort({ createdAt: -1 });
          return res.json(items);
        }

        if (Model.modelName === "Course" && req.user?.role === "student") {
          const user = await User.findById(req.user.id).select("studentProfile");
          const department = user?.studentProfile?.department || user?.studentProfile?.program;
          if (!department) return res.json([]);
          const items = await Model.find({ department }).sort({ createdAt: -1 });
          return res.json(items);
        }

        if (Model.modelName === "Course" && req.user && req.user.role !== "admin") {
          return res.status(403).json({ message: "Course access is limited to students, faculty, and admins." });
        }

        if (Model.modelName === "Student" && req.user?.role === "lecturer") {
          const scope = await facultyScope(req);
          if (scope?.error) return res.json([]);
          const items = await Model.find({ department: scope.department }).sort({ createdAt: -1 });
          return res.json(await applySyncedStudentPaymentStatuses(items, "student.list.department"));
        }

        if (Model.modelName === "Student" && req.user?.role !== "admin") {
          return res.status(403).json({ message: "Admin or faculty access required." });
        }

        if (Model.modelName === "Student") {
          const items = await Model.find().sort({ createdAt: -1 });
          return res.json(await applySyncedStudentPaymentStatuses(items, "student.list.admin"));
        }

        const items = await Model.find().sort({ createdAt: -1 });
        res.json(items);
      } catch (error) {
        next(error);
      }
    },

    async get(req, res, next) {
      try {
        const item = await Model.findById(req.params.id);
        if (!item) return res.status(404).json({ message: "Record not found" });
        if (Model.modelName === "TimetableEntry" && req.user?.role === "lecturer") {
          const scope = await facultyScope(req);
          if (scope?.error || item.department !== scope.department) return res.status(403).json({ message: "You can only access timetable entries in your department." });
        } else if (Model.modelName === "TimetableEntry" && req.user?.role === "student") {
          const user = await User.findById(req.user.id).select("studentProfile");
          const department = user?.studentProfile?.department || user?.studentProfile?.program;
          const academicStage = user?.studentProfile?.academicStage || "";
          const allowedStage = !item.academicStage || item.academicStage === academicStage;
          if (!department || item.department !== department || !allowedStage) return res.status(403).json({ message: "You can only access timetable entries for your department and student group." });
        } else if (Model.modelName === "TimetableEntry" && req.user && req.user.role !== "admin") {
          return res.status(403).json({ message: "Timetable access is limited to students, faculty, and admins." });
        }
        if (Model.modelName === "Course" && req.user?.role === "lecturer") {
          const scope = await facultyScope(req);
          if (scope?.error || item.department !== scope.department) return res.status(403).json({ message: "You can only access courses in your department." });
        } else if (Model.modelName === "Course" && req.user?.role === "student") {
          const user = await User.findById(req.user.id).select("studentProfile");
          const department = user?.studentProfile?.department || user?.studentProfile?.program;
          if (!department || item.department !== department) return res.status(403).json({ message: "You can only access courses in your department." });
        } else if (Model.modelName === "Course" && req.user && req.user.role !== "admin") {
          return res.status(403).json({ message: "Course access is limited to students, faculty, and admins." });
        }
        if (Model.modelName === "Student" && req.user?.role === "lecturer") {
          const scope = await facultyScope(req);
          if (scope?.error || item.department !== scope.department) return res.status(403).json({ message: "You can only access students in your department." });
        } else if (Model.modelName === "Student" && req.user?.role !== "admin") {
          return res.status(403).json({ message: "Admin or faculty access required." });
        }
        res.json(item);
      } catch (error) {
        next(error);
      }
    },

    async create(req, res, next) {
      try {
        const payload = normalizePayload(Model, req.body);

        if (Model.modelName === "Student") {
          if (!["admin", "lecturer"].includes(req.user?.role)) {
            return res.status(403).json({ message: "Admin or faculty access required." });
          }

          if (req.user?.role === "lecturer") {
            const scope = await facultyScope(req);
            if (scope?.error) return res.status(403).json({ message: scope.error });
            payload.department = scope.department;
            payload.program = payload.program || scope.department;
          }

          const password = String(req.body.password || "");
          const confirmPassword = String(req.body.confirmPassword || "");
          if (!password) return res.status(400).json({ message: "Password is required to create a student login." });
          if (password.length < minimumPasswordLength) return res.status(400).json({ message: `Password must be at least ${minimumPasswordLength} characters.` });
          if (password !== confirmPassword) return res.status(400).json({ message: "Password and confirm password do not match." });

          const email = String(payload.email || "").trim().toLowerCase();
          const studentId = String(payload.studentId || "").trim();
          const studentExists = await Model.findOne({
            $or: [{ email }, ...(studentId ? [{ studentId }] : [])]
          }).select("_id");
          if (studentExists) return res.status(409).json({ message: "A student with this email or Student ID already exists." });

          const userExists = await User.findOne({
            $or: [{ email }, ...(studentId ? [{ "studentProfile.studentId": studentId }] : [])]
          }).select("_id");
          if (userExists) return res.status(409).json({ message: "A login account with this email or Student ID already exists." });

          const item = await Model.create(payload);
          try {
            await User.create({
              name: payload.fullName,
              email,
              passwordHash: await bcrypt.hash(password, 10),
              role: "student",
              accountStatus: "approved",
              mustChangePassword: false,
              studentProfile: studentProfileFromPayload(payload)
            });
          } catch (error) {
            await Model.findByIdAndDelete(item._id);
            throw error;
          }

          return res.status(201).json(item);
        }

        if (Model.modelName === "Faculty") {
          const password = String(req.body.password || "");
          const confirmPassword = String(req.body.confirmPassword || "");
          if (!password) return res.status(400).json({ message: "Password is required to create a faculty login." });
          if (password.length < minimumPasswordLength) return res.status(400).json({ message: `Password must be at least ${minimumPasswordLength} characters.` });
          if (password !== confirmPassword) return res.status(400).json({ message: "Password and confirm password do not match." });

          const email = String(payload.email || "").trim().toLowerCase();
          const facultyExists = await Model.findOne({ email }).select("_id");
          if (facultyExists) return res.status(409).json({ message: "A faculty member with this email already exists." });

          const userExists = await User.findOne({ email }).select("_id");
          if (userExists) return res.status(409).json({ message: "A login account with this email already exists." });

          const { password: _password, confirmPassword: _confirmPassword, ...facultyBody } = req.body;
          const facultyPayload = normalizePayload(Model, facultyBody);
          const departmentHeadError = await validateDepartmentHead(facultyPayload);
          if (departmentHeadError) return res.status(409).json({ message: departmentHeadError });
          const item = await Model.create(facultyPayload);
          try {
            await User.create(facultyLoginPayload(facultyPayload, await bcrypt.hash(password, 10)));
            await syncStaffProfiles(item);
          } catch (error) {
            await Model.findByIdAndDelete(item._id);
            await deleteStaffProfiles(item);
            await User.findOneAndDelete({ email, role: "lecturer" });
            throw error;
          }

          return res.status(201).json(item);
        }

        if (Model.modelName === "Course") {
          if (!["admin", "lecturer"].includes(req.user?.role)) {
            return res.status(403).json({ message: "Admin or faculty access required." });
          }

          if (req.user?.role === "lecturer") {
            const scope = await facultyScope(req);
            if (scope?.error) return res.status(403).json({ message: scope.error });
            payload.department = scope.department;
          }

          const item = await Model.create(payload);
          return res.status(201).json(item);
        }

        if (Model.modelName === "TimetableEntry") {
          if (!["admin", "lecturer"].includes(req.user?.role)) {
            return res.status(403).json({ message: "Admin or faculty access required." });
          }

          if (req.user?.role === "lecturer") {
            const scope = await facultyScope(req);
            if (scope?.error) return res.status(403).json({ message: scope.error });
            payload.department = scope.department;
          }

          const validationError = validateTimetablePayload(payload);
          if (validationError) return res.status(400).json({ message: validationError });
          const lecturerError = await validateTimetableLecturer(payload);
          if (lecturerError) return res.status(400).json({ message: lecturerError });

          const item = await Model.create(payload);
          return res.status(201).json(item);
        }

        const item = await Model.create(payload);
        res.status(201).json(item);
      } catch (error) {
        next(error);
      }
    },

    async update(req, res, next) {
      try {
        if (Model.modelName === "Student") {
          if (!["admin", "lecturer"].includes(req.user?.role)) {
            return res.status(403).json({ message: "Admin or faculty access required." });
          }

          const currentStudent = await Model.findById(req.params.id);
          if (!currentStudent) return res.status(404).json({ message: "Record not found" });

          let scope = null;
          if (req.user?.role === "lecturer") {
            scope = await facultyScope(req);
            if (scope?.error) return res.status(403).json({ message: scope.error });
            if (currentStudent.department !== scope.department) {
              return res.status(403).json({ message: "You can only update students in your department." });
            }
          }

          const password = String(req.body.password || "");
          const confirmPassword = String(req.body.confirmPassword || "");
          if ((password || confirmPassword) && password !== confirmPassword) {
            return res.status(400).json({ message: "Password and confirm password do not match." });
          }
          if (password && password.length < minimumPasswordLength) {
            return res.status(400).json({ message: `Password must be at least ${minimumPasswordLength} characters.` });
          }

          const previousEmail = String(currentStudent.email || "").trim().toLowerCase();
          const previousStudentId = String(currentStudent.studentId || "").trim();
          const user = await User.findOne({
            $or: [{ email: previousEmail }, ...(previousStudentId ? [{ "studentProfile.studentId": previousStudentId }] : [])]
          });

          const { password: _password, confirmPassword: _confirmPassword, ...studentBody } = req.body;
          const payload = normalizePayload(Model, studentBody);
          if (scope?.department) {
            payload.department = scope.department;
            payload.program = payload.program || scope.department;
          }
          const nextEmail = String(payload.email || "").trim().toLowerCase();
          const nextStudentId = String(payload.studentId || "").trim();
          const studentExists = await Model.findOne({
            _id: { $ne: req.params.id },
            $or: [{ email: nextEmail }, ...(nextStudentId ? [{ studentId: nextStudentId }] : [])]
          }).select("_id");
          if (studentExists) return res.status(409).json({ message: "A student with this email or Student ID already exists." });

          const userExists = await User.findOne({
            ...(user ? { _id: { $ne: user._id } } : {}),
            $or: [{ email: nextEmail }, ...(nextStudentId ? [{ "studentProfile.studentId": nextStudentId }] : [])]
          }).select("_id");
          if (userExists) return res.status(409).json({ message: "A login account with this email or Student ID already exists." });

          const fallbackPassword = password || nextStudentId;
          if (!user && !fallbackPassword) {
            return res.status(400).json({ message: "Password is required because this student has no login account yet." });
          }
          const item = await Model.findByIdAndUpdate(req.params.id, payload, { returnDocument: "after", runValidators: true });
          await syncStaffProfiles(item);

          if (user) {
            user.name = payload.fullName;
            user.email = String(payload.email || "").trim().toLowerCase();
            user.studentProfile = {
              ...studentProfileFromPayload(payload),
              profilePhotoUrl: user.studentProfile?.profilePhotoUrl
            };
            if (password) {
              user.passwordHash = await bcrypt.hash(password, 10);
              user.mustChangePassword = false;
            }
            await user.save();
          } else {
            await User.create({
              name: payload.fullName,
              email: String(payload.email || "").trim().toLowerCase(),
              passwordHash: await bcrypt.hash(fallbackPassword, 10),
              role: "student",
              accountStatus: "approved",
              mustChangePassword: !password,
              studentProfile: studentProfileFromPayload(payload)
            });
          }

          return res.json(item);
        }

        if (Model.modelName === "Faculty") {
          const currentFaculty = await Model.findById(req.params.id);
          if (!currentFaculty) return res.status(404).json({ message: "Record not found" });

          const password = String(req.body.password || "");
          const confirmPassword = String(req.body.confirmPassword || "");
          if ((password || confirmPassword) && password !== confirmPassword) {
            return res.status(400).json({ message: "Password and confirm password do not match." });
          }
          if (password && password.length < minimumPasswordLength) {
            return res.status(400).json({ message: `Password must be at least ${minimumPasswordLength} characters.` });
          }

          const previousEmail = String(currentFaculty.email || "").trim().toLowerCase();
          const user = await User.findOne({ email: previousEmail });
          const { password: _password, confirmPassword: _confirmPassword, ...facultyBody } = req.body;
          const payload = normalizePayload(Model, facultyBody);
          const departmentHeadError = await validateDepartmentHead(payload, req.params.id);
          if (departmentHeadError) return res.status(409).json({ message: departmentHeadError });
          const nextEmail = String(payload.email || "").trim().toLowerCase();
          const facultyExists = await Model.findOne({ email: nextEmail, _id: { $ne: req.params.id } }).select("_id");
          if (facultyExists) return res.status(409).json({ message: "A faculty member with this email already exists." });

          const userExists = await User.findOne({
            email: nextEmail,
            ...(user ? { _id: { $ne: user._id } } : {})
          }).select("_id");
          if (userExists) return res.status(409).json({ message: "A login account with this email already exists." });
          if (!user && !password) {
            return res.status(400).json({ message: "Password is required because this faculty member has no login account yet." });
          }

          const item = await Model.findByIdAndUpdate(req.params.id, payload, { returnDocument: "after", runValidators: true });

          if (user) {
            user.name = payload.fullName;
            user.email = nextEmail;
            user.role = "lecturer";
            user.accountStatus = "approved";
            user.studentProfile = undefined;
            user.staffProfile = staffProfileFromPayload(payload);
            user.adminProfile = undefined;
            if (password) {
              user.passwordHash = await bcrypt.hash(password, 10);
              user.mustChangePassword = false;
            }
            await user.save();
          } else if (password) {
            await User.create(facultyLoginPayload(payload, await bcrypt.hash(password, 10)));
          }

          await syncStaffProfiles(item);
          return res.json(item);
        }

        if (Model.modelName === "Course") {
          if (!["admin", "lecturer"].includes(req.user?.role)) {
            return res.status(403).json({ message: "Admin or faculty access required." });
          }

          const currentCourse = await Model.findById(req.params.id);
          if (!currentCourse) return res.status(404).json({ message: "Record not found" });

          const payload = normalizePayload(Model, req.body);
          if (req.user?.role === "lecturer") {
            const scope = await facultyScope(req);
            if (scope?.error) return res.status(403).json({ message: scope.error });
            if (currentCourse.department !== scope.department) {
              return res.status(403).json({ message: "You can only update courses in your department." });
            }
            payload.department = scope.department;
          }

          const item = await Model.findByIdAndUpdate(req.params.id, payload, { returnDocument: "after", runValidators: true });
          return res.json(item);
        }

        if (Model.modelName === "TimetableEntry") {
          if (!["admin", "lecturer"].includes(req.user?.role)) {
            return res.status(403).json({ message: "Admin or faculty access required." });
          }

          const currentEntry = await Model.findById(req.params.id);
          if (!currentEntry) return res.status(404).json({ message: "Record not found" });

          const payload = normalizePayload(Model, req.body);
          if (req.user?.role === "lecturer") {
            const scope = await facultyScope(req);
            if (scope?.error) return res.status(403).json({ message: scope.error });
            if (currentEntry.department !== scope.department) {
              return res.status(403).json({ message: "You can only update timetable entries in your department." });
            }
            payload.department = scope.department;
          }

          const validationError = validateTimetablePayload(payload);
          if (validationError) return res.status(400).json({ message: validationError });
          const lecturerError = await validateTimetableLecturer(payload);
          if (lecturerError) return res.status(400).json({ message: lecturerError });

          const item = await Model.findByIdAndUpdate(req.params.id, payload, { returnDocument: "after", runValidators: true });
          return res.json(item);
        }

        const item = await Model.findByIdAndUpdate(req.params.id, normalizePayload(Model, req.body), { returnDocument: "after", runValidators: true });
        if (!item) return res.status(404).json({ message: "Record not found" });
        res.json(item);
      } catch (error) {
        next(error);
      }
    },

    async remove(req, res, next) {
      try {
        if (Model.modelName === "TimetableEntry" && req.user?.role === "lecturer") {
          const scope = await facultyScope(req);
          if (scope?.error) return res.status(403).json({ message: scope.error });
          const item = await Model.findOneAndDelete({ _id: req.params.id, department: scope.department });
          if (!item) return res.status(404).json({ message: "Record not found in your department" });
          return res.json({ message: "Record deleted" });
        }

        if (Model.modelName === "TimetableEntry" && req.user?.role !== "admin") {
          return res.status(403).json({ message: "Admin or faculty access required." });
        }

        if (Model.modelName === "Course" && req.user?.role === "lecturer") {
          const scope = await facultyScope(req);
          if (scope?.error) return res.status(403).json({ message: scope.error });
          const item = await Model.findOneAndDelete({ _id: req.params.id, department: scope.department });
          if (!item) return res.status(404).json({ message: "Record not found in your department" });
          return res.json({ message: "Record deleted" });
        }

        if (Model.modelName === "Course" && req.user?.role !== "admin") {
          return res.status(403).json({ message: "Admin or faculty access required." });
        }

        if (Model.modelName === "Student" && req.user?.role === "lecturer") {
          const scope = await facultyScope(req);
          if (scope?.error) return res.status(403).json({ message: scope.error });
          const item = await Model.findOneAndDelete({ _id: req.params.id, department: scope.department });
          if (!item) return res.status(404).json({ message: "Record not found in your department" });
          await deleteStudentLogin(item);
          return res.json({ message: "Record deleted" });
        }

        if (Model.modelName === "Student" && req.user?.role !== "admin") {
          return res.status(403).json({ message: "Admin or faculty access required." });
        }

        const item = await Model.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ message: "Record not found" });
        if (Model.modelName === "Faculty") {
          await deleteStaffAccountBundle(item);
        }
        if (Model.modelName === "Student") {
          await deleteStudentLogin(item);
        }
        res.json({ message: "Record deleted" });
      } catch (error) {
        next(error);
      }
    }
  };
}
