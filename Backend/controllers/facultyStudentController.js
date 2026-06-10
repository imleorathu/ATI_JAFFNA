import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
import User from "../models/User.js";

const departmentBasedFacultyTypes = ["Teaching Staff", "Head of the department"];

export async function listTimetableLecturers(req, res, next) {
  try {
    const query = {
      staffType: { $in: departmentBasedFacultyTypes },
      status: "Active",
      department: { $ne: "" }
    };

    if (req.user?.role === "lecturer") {
      const user = await User.findById(req.user.id).select("email");
      if (!user) return res.status(404).json({ message: "User account not found." });

      const faculty = await Faculty.findOne({ email: String(user.email || "").trim().toLowerCase() });
      if (!faculty || !departmentBasedFacultyTypes.includes(faculty.staffType) || !faculty.department) {
        return res.status(403).json({ message: "This staff account is not assigned to a student department." });
      }
      query.department = faculty.department;
    } else if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin or faculty access required." });
    }

    const faculty = await Faculty.find(query)
      .select("fullName department staffType")
      .sort({ department: 1, fullName: 1 })
      .lean();
    res.json(faculty);
  } catch (error) {
    next(error);
  }
}

export async function listMyDepartmentStudents(req, res, next) {
  try {
    if (req.user?.role === "admin") {
      const students = await Student.find().sort({ fullName: 1 });
      return res.json({ students, faculty: null, scope: "all" });
    }

    if (req.user?.role !== "lecturer") {
      return res.status(403).json({ message: "Faculty access required." });
    }

    const user = await User.findById(req.user.id).select("email name role");
    if (!user) return res.status(404).json({ message: "User account not found." });

    const faculty = await Faculty.findOne({ email: String(user.email || "").trim().toLowerCase() });
    if (!faculty) return res.status(404).json({ message: "Faculty profile not found for this account." });

    if (!departmentBasedFacultyTypes.includes(faculty.staffType) || !faculty.department) {
      return res.json({ students: [], faculty, scope: "none" });
    }

    const students = await Student.find({ department: faculty.department }).sort({ fullName: 1 });
    res.json({ students, faculty, scope: "department" });
  } catch (error) {
    next(error);
  }
}
