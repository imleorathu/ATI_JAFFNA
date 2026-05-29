import bcrypt from "bcryptjs";
import Faculty from "../models/Faculty.js";
import User from "../models/User.js";

const departmentBasedFacultyTypes = ["Teaching Staff", "Head of the department"];
const hnditDepartment = "Higher National Diploma in Information Technology - (HNDIT)";

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
    if (normalized.department && normalized.department !== hnditDepartment) normalized.academicStage = "";
    return normalized;
  }

  if (Model.modelName !== "Student") return payload;

  const normalized = { ...payload };
  if (normalized.department !== hnditDepartment) {
    normalized.academicStage = "";
  } else if (normalized.academicStage) {
    normalized.studyMode = String(normalized.academicStage).includes("Part Time") ? "Part-time" : "Full-time";
  }
  if (normalized.studyMode === "Full-time") {
    normalized.paymentStatus = "not_required";
  } else if (normalized.studyMode === "Part-time" && normalized.paymentStatus === "not_required") {
    normalized.paymentStatus = "pending";
  }

  return normalized;
}

function studentProfileFromPayload(payload) {
  return {
    studentId: payload.studentId,
    nic: payload.nic,
    department: payload.department,
    program: payload.program,
    intake: payload.intake,
    academicYear: payload.academicYear,
    academicStage: payload.academicStage,
    studyMode: payload.studyMode,
    phone: payload.phone,
    guardianName: payload.guardianName,
    guardianPhone: payload.guardianPhone
  };
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
    mustChangePassword: false
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
  if (payload.department !== hnditDepartment) payload.academicStage = "";
  return "";
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
          return res.json(items);
        }

        if (Model.modelName === "Student" && req.user?.role !== "admin") {
          return res.status(403).json({ message: "Admin or faculty access required." });
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
          if (password !== confirmPassword) return res.status(400).json({ message: "Password and confirm password do not match." });

          const email = String(payload.email || "").trim().toLowerCase();
          const facultyExists = await Model.findOne({ email }).select("_id");
          if (facultyExists) return res.status(409).json({ message: "A faculty member with this email already exists." });

          const userExists = await User.findOne({ email }).select("_id");
          if (userExists) return res.status(409).json({ message: "A login account with this email already exists." });

          const { password: _password, confirmPassword: _confirmPassword, ...facultyBody } = req.body;
          const facultyPayload = normalizePayload(Model, facultyBody);
          const item = await Model.create(facultyPayload);
          try {
            await User.create(facultyLoginPayload(facultyPayload, await bcrypt.hash(password, 10)));
          } catch (error) {
            await Model.findByIdAndDelete(item._id);
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
          const item = await Model.findByIdAndUpdate(req.params.id, payload, { returnDocument: "after", runValidators: true });

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
            const fallbackPassword = password || String(payload.studentId || "").trim();
            if (!fallbackPassword) {
              return res.status(400).json({ message: "Password is required because this student has no login account yet." });
            }
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

          const previousEmail = String(currentFaculty.email || "").trim().toLowerCase();
          const user = await User.findOne({ email: previousEmail });
          const { password: _password, confirmPassword: _confirmPassword, ...facultyBody } = req.body;
          const payload = normalizePayload(Model, facultyBody);
          const nextEmail = String(payload.email || "").trim().toLowerCase();
          const facultyExists = await Model.findOne({ email: nextEmail, _id: { $ne: req.params.id } }).select("_id");
          if (facultyExists) return res.status(409).json({ message: "A faculty member with this email already exists." });

          const userExists = await User.findOne({
            email: nextEmail,
            ...(user ? { _id: { $ne: user._id } } : {})
          }).select("_id");
          if (userExists) return res.status(409).json({ message: "A login account with this email already exists." });

          const item = await Model.findByIdAndUpdate(req.params.id, payload, { returnDocument: "after", runValidators: true });

          if (user) {
            user.name = payload.fullName;
            user.email = nextEmail;
            user.role = "lecturer";
            user.accountStatus = "approved";
            if (password) {
              user.passwordHash = await bcrypt.hash(password, 10);
              user.mustChangePassword = false;
            }
            await user.save();
          } else if (password) {
            await User.create(facultyLoginPayload(payload, await bcrypt.hash(password, 10)));
          }

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
          return res.json({ message: "Record deleted" });
        }

        if (Model.modelName === "Student" && req.user?.role !== "admin") {
          return res.status(403).json({ message: "Admin or faculty access required." });
        }

        const item = await Model.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ message: "Record not found" });
        if (Model.modelName === "Faculty") {
          await User.findOneAndDelete({ email: String(item.email || "").trim().toLowerCase(), role: "lecturer" });
        }
        res.json({ message: "Record deleted" });
      } catch (error) {
        next(error);
      }
    }
  };
}
