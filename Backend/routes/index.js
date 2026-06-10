import { Router } from "express";
import mongoose from "mongoose";
import Blog from "../models/Blog.js";
import Application from "../models/Application.js";
import Course from "../models/Course.js";
import Department from "../models/Department.js";
import Event from "../models/Event.js";
import Faculty from "../models/Faculty.js";
import Notice from "../models/Notice.js";
import Student from "../models/Student.js";
import TimetableEntry from "../models/TimetableEntry.js";
import { listMyDepartmentStudents, listTimetableLecturers } from "../controllers/facultyStudentController.js";
import { requireAuth } from "../middleware/auth.js";
import assignmentRoutes from "./assignmentRoutes.js";
import attendanceRoutes from "./attendanceRoutes.js";
import aiRoutes from "./aiRoutes.js";
import authRoutes from "./authRoutes.js";
import contactRoutes from "./contactRoutes.js";
import gradeRoutes from "./gradeRoutes.js";
import resourceRoutes from "./resourceRoutes.js";
import settingsRoutes from "./settingsRoutes.js";
import pageContentRoutes from "./pageContentRoutes.js";
import partTimeFeesRoutes from "./partTimeFeesRoutes.js";
import portalDataRoutes from "./portalDataRoutes.js";
import userRoutes from "./userRoutes.js";

const router = Router();

router.get("/public/stats", async (_req, res, next) => {
  try {
    const [courses, departments, students, lecturers, events] = await Promise.all([
      Course.countDocuments(),
      Department.countDocuments(),
      Student.countDocuments(),
      Faculty.countDocuments({
        staffType: { $in: ["Teaching Staff", "Head of the department"] },
        status: { $ne: "Inactive" }
      }),
      Event.countDocuments()
    ]);

    res.json({ courses, departments, students, lecturers, events });
  } catch (error) {
    next(error);
  }
});

const publicFacultyFields = "fullName email phone department staffType status coursesAssigned rating joinDate office bio";
const publicCourseFields = "title duration entryRequirements fee department description instructor progress modules";
const publicDepartmentFields = "name imageUrl description";

router.get("/public/faculty", async (_req, res, next) => {
  try {
    const faculty = await Faculty.find({ status: { $ne: "Inactive" } })
      .select(publicFacultyFields)
      .sort({ department: 1, staffType: 1, fullName: 1 });

    res.json(faculty);
  } catch (error) {
    next(error);
  }
});

router.get("/public/departments", async (_req, res, next) => {
  try {
    const departments = await Department.find()
      .select(publicDepartmentFields)
      .sort({ name: 1 })
      .lean();

    const existingNames = new Set(departments.map((department) => department.name).filter(Boolean));
    const [courseDepartments, facultyDepartments] = await Promise.all([
      Course.distinct("department", { department: { $nin: ["", null] } }),
      Faculty.distinct("department", { department: { $nin: ["", null] }, status: { $ne: "Inactive" } })
    ]);
    const generatedDepartments = [...new Set([...courseDepartments, ...facultyDepartments])]
      .filter((name) => name && !existingNames.has(name))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({
        _id: encodeURIComponent(name),
        name,
        imageUrl: "",
        description: "Department details will be updated by ATI Jaffna staff."
      }));

    const departmentsWithStats = await Promise.all(
      [...departments, ...generatedDepartments].map(async (department) => {
        const [courseCount, lecturerCount] = await Promise.all([
          Course.countDocuments({ department: department.name }),
          Faculty.countDocuments({ department: department.name, status: { $ne: "Inactive" } })
        ]);

        return {
          ...department,
          courseCount,
          lecturerCount
        };
      })
    );

    res.json(departmentsWithStats);
  } catch (error) {
    next(error);
  }
});

router.get("/public/departments/:id/details", async (req, res, next) => {
  try {
    const requestedId = req.params.id;
    const departmentName = decodeURIComponent(requestedId);
    const department = mongoose.Types.ObjectId.isValid(requestedId)
      ? await Department.findById(requestedId).select(publicDepartmentFields).lean()
      : await Department.findOne({ name: departmentName }).select(publicDepartmentFields).lean();

    if (!department && !departmentName) {
      res.status(404).json({ message: "Department not found." });
      return;
    }

    const resolvedDepartment = department || {
      _id: encodeURIComponent(departmentName),
      name: departmentName,
      imageUrl: "",
      description: "Department details will be updated by ATI Jaffna staff."
    };

    const [courses, lecturers] = await Promise.all([
      Course.find({ department: resolvedDepartment.name }).select(publicCourseFields).sort({ title: 1 }).lean(),
      Faculty.find({ department: resolvedDepartment.name, status: { $ne: "Inactive" } })
        .select(publicFacultyFields)
        .sort({ staffType: 1, fullName: 1 })
        .lean()
    ]);

    res.json({
      department: resolvedDepartment,
      courses,
      lecturers
    });
  } catch (error) {
    next(error);
  }
});

router.get("/public/faculty/:id", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(404).json({ message: "Faculty member not found." });
      return;
    }

    const faculty = await Faculty.findOne({ _id: req.params.id, status: { $ne: "Inactive" } }).select(publicFacultyFields);

    if (!faculty) {
      res.status(404).json({ message: "Faculty member not found." });
      return;
    }

    res.json(faculty);
  } catch (error) {
    next(error);
  }
});

router.get("/public/faculty/:id/course-details", async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(404).json({ message: "Faculty member not found." });
      return;
    }

    const faculty = await Faculty.findOne({ _id: req.params.id, status: { $ne: "Inactive" } })
      .select(publicFacultyFields)
      .lean();

    if (!faculty) {
      res.status(404).json({ message: "Faculty member not found." });
      return;
    }

    const department = faculty.department || "";
    const [courses, departmentLecturers, departmentInfo] = await Promise.all([
      department
        ? Course.find({ department }).select(publicCourseFields).sort({ title: 1 }).lean()
        : [],
      department
        ? Faculty.find({ department, status: { $ne: "Inactive" } }).select(publicFacultyFields).sort({ staffType: 1, fullName: 1 }).lean()
        : [],
      department ? Department.findOne({ name: department }).select("name description imageUrl").lean() : null
    ]);

    res.json({
      faculty,
      department: departmentInfo || {
        name: department || (faculty.staffType === "Administrative Staff" ? "Administration" : "Department not assigned"),
        description: "",
        imageUrl: ""
      },
      courses,
      departmentLecturers
    });
  } catch (error) {
    next(error);
  }
});

router.use("/auth", authRoutes);
router.use("/cms", pageContentRoutes);
router.use("/portal-data", portalDataRoutes);
router.use("/part-time-fees", partTimeFeesRoutes);
router.use("/settings", settingsRoutes);
router.use("/ai", aiRoutes);
router.use("/assignments", assignmentRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/grades", gradeRoutes);
router.use("/users", userRoutes);
router.get("/students/my-department", requireAuth, listMyDepartmentStudents);
router.get("/faculty/timetable-options", requireAuth, listTimetableLecturers);
router.use("/students", resourceRoutes(Student, { protectedRead: true }));
router.use("/faculty", resourceRoutes(Faculty, { protectedRead: true }));
router.use("/courses", resourceRoutes(Course, { protectedRead: true }));
router.use("/timetable", resourceRoutes(TimetableEntry, { protectedRead: true }));
router.use("/departments", resourceRoutes(Department));
router.use("/blogs", resourceRoutes(Blog));
router.use("/notices", resourceRoutes(Notice));
router.use("/events", resourceRoutes(Event));
router.use("/applications", resourceRoutes(Application, { protectedRead: true }));
router.use("/contacts", contactRoutes);

export default router;
