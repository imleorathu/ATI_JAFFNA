import Assignment from "../models/Assignment.js";
import Faculty from "../models/Faculty.js";
import Student from "../models/Student.js";
import User from "../models/User.js";

const departmentBasedFacultyTypes = ["Teaching Staff", "Head of the department"];
const hnditDepartment = "Higher National Diploma in Information Technology - (HNDIT)";

async function facultyScope(req) {
  const user = await User.findById(req.user.id).select("email");
  if (!user) return { error: "User account not found." };

  const faculty = await Faculty.findOne({ email: String(user.email || "").trim().toLowerCase() });
  if (!faculty) return { error: "Faculty profile not found for this account." };
  if (!departmentBasedFacultyTypes.includes(faculty.staffType) || !faculty.department) {
    return { error: "This staff account is not assigned to a student department." };
  }

  return { faculty, department: faculty.department };
}

async function studentForUser(req) {
  const user = await User.findById(req.user.id).select("email studentProfile");
  if (!user) return null;
  const email = String(user.email || "").trim().toLowerCase();
  const studentId = String(user.studentProfile?.studentId || "").trim();
  return Student.findOne({ $or: [{ email }, ...(studentId ? [{ studentId }] : [])] });
}

function assignmentResponse(record, viewerStudent = null) {
  const viewerStudentId = viewerStudent?._id ? String(viewerStudent._id) : "";
  const visibleComments = viewerStudentId
    ? (record.comments || []).filter((comment) => comment.visibility !== "private" || String(comment.student || "") === viewerStudentId)
    : record.comments || [];
  const visibleAnnouncements = viewerStudentId
    ? (record.announcements || []).filter((comment) => comment.visibility !== "private" || String(comment.student || "") === viewerStudentId)
    : record.announcements || [];
  const visibleSubmissions = viewerStudentId
    ? (record.submissions || []).filter((submission) => String(submission.student || "") === viewerStudentId)
    : record.submissions || [];

  return {
    _id: record._id,
    title: record.title,
    subject: record.subject,
    topicModule: record.topicModule,
    description: record.description,
    department: record.department,
    academicStage: record.academicStage,
    student: record.student,
    studentName: record.studentName,
    studentId: record.studentId,
    dueDate: record.dueDate,
    totalMarks: record.totalMarks,
    status: record.status,
    publishAt: record.publishAt,
    visibility: record.visibility,
    notifyByEmail: record.notifyByEmail,
    attachmentUrl: record.attachmentUrl,
    attachments: record.attachments || [],
    materials: record.materials || [],
    announcements: visibleAnnouncements,
    comments: visibleComments,
    submissions: visibleSubmissions,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function normalizeAttachments(value) {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return items
    .map((item) => {
      if (typeof item === "string") return { name: item, url: item, type: "link" };
      return {
        name: String(item.name || item.url || "").trim(),
        url: String(item.url || "").trim(),
        type: item.type || "link",
        mimeType: String(item.mimeType || "").trim(),
        size: Number(item.size || 0)
      };
    })
    .filter((item) => item.url);
}

function studentCanSeeAssignment(assignment, student) {
  if (!student || assignment.department !== student.department) return false;
  if (assignment.status === "draft") return false;
  if (assignment.publishAt && new Date(assignment.publishAt) > new Date()) return false;
  if (assignment.student) return String(assignment.student) === String(student._id);
  return !assignment.academicStage || assignment.academicStage === student.academicStage;
}

async function requireManageAccess(req, assignment) {
  if (req.user?.role === "admin") return { ok: true };
  if (req.user?.role !== "lecturer") return { ok: false, status: 403, message: "Admin or faculty access required." };
  const scope = await facultyScope(req);
  if (scope.error) return { ok: false, status: 403, message: scope.error };
  if (assignment.department !== scope.department) {
    return { ok: false, status: 403, message: "You can only manage assignments in your department." };
  }
  return { ok: true, scope };
}

async function userDisplayName(req) {
  const user = await User.findById(req.user.id).select("name email");
  return user?.name || user?.email || "User";
}

async function assignmentPayload(req, existingRecord = null) {
  if (!["admin", "lecturer"].includes(req.user?.role)) {
    return { error: "Admin or faculty access required.", status: 403 };
  }

  let department = String(req.body.department ?? existingRecord?.department ?? "").trim();
  if (req.user?.role === "lecturer") {
    const scope = await facultyScope(req);
    if (scope.error) return { error: scope.error, status: 403 };
    if (existingRecord && existingRecord.department !== scope.department) {
      return { error: "You can only manage assignments for students in your department.", status: 403 };
    }
    department = scope.department;
  }

  if (!department) return { error: "Department is required." };

  const studentId = String(req.body.student ?? "").trim();
  let targetStudent = null;
  if (studentId) {
    targetStudent = await Student.findById(studentId);
    if (!targetStudent) return { error: "Student record not found." };
    if (targetStudent.department !== department) {
      return { error: "You can only assign work to students in the selected department.", status: 403 };
    }
  }

  const academicStage = department === hnditDepartment && !targetStudent ? String(req.body.academicStage ?? existingRecord?.academicStage ?? "").trim() : "";
  const dueDate = req.body.dueDate ?? existingRecord?.dueDate;
  if (!dueDate || Number.isNaN(new Date(dueDate).getTime())) return { error: "Valid due date is required." };

  return {
    payload: {
      title: String(req.body.title ?? existingRecord?.title ?? "").trim(),
      subject: String(req.body.subject ?? existingRecord?.subject ?? "").trim(),
      topicModule: String(req.body.topicModule ?? existingRecord?.topicModule ?? "").trim(),
      description: String(req.body.description ?? existingRecord?.description ?? "").trim(),
      department,
      academicStage,
      student: targetStudent?._id || null,
      studentName: targetStudent?.fullName || "",
      studentId: targetStudent?.studentId || "",
      dueDate,
      totalMarks: Number(req.body.totalMarks ?? existingRecord?.totalMarks ?? 100),
      status: req.body.status || existingRecord?.status || "published",
      publishAt: req.body.publishAt || existingRecord?.publishAt || undefined,
      visibility: targetStudent ? "student" : academicStage ? "group" : "department",
      notifyByEmail: Boolean(req.body.notifyByEmail ?? existingRecord?.notifyByEmail ?? false),
      attachmentUrl: String(req.body.attachmentUrl ?? existingRecord?.attachmentUrl ?? "").trim(),
      attachments: normalizeAttachments(req.body.attachments ?? existingRecord?.attachments ?? []),
      materials: normalizeAttachments(req.body.materials ?? existingRecord?.materials ?? []),
      createdBy: existingRecord?.createdBy || req.user?.id
    }
  };
}

export async function listAssignments(req, res, next) {
  try {
    const query = {};
    let viewerStudent = null;

    if (req.user?.role === "student") {
      const student = await studentForUser(req);
      if (!student) return res.json([]);
      viewerStudent = student;
      query.department = student.department;
      query.status = { $ne: "draft" };
      query.$and = [{ $or: [{ publishAt: { $exists: false } }, { publishAt: null }, { publishAt: { $lte: new Date() } }] }];
      query.$or = [
        { student: student._id },
        { student: null, academicStage: "" },
        { student: { $exists: false }, academicStage: "" }
      ];
      if (student.academicStage) {
        query.$or.push({ student: null, academicStage: student.academicStage }, { student: { $exists: false }, academicStage: student.academicStage });
      }
    } else if (req.user?.role === "lecturer") {
      const scope = await facultyScope(req);
      if (scope.error) return res.status(403).json({ message: scope.error });
      query.department = scope.department;
    } else if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Assignment access is limited to students, faculty, and admins." });
    }

    const records = await Assignment.find(query).sort({ dueDate: 1, subject: 1, title: 1 });
    res.json(records.map((record) => assignmentResponse(record, viewerStudent)));
  } catch (error) {
    next(error);
  }
}

export async function duplicateAssignment(req, res, next) {
  try {
    const existing = await Assignment.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Assignment not found." });

    const access = await requireManageAccess(req, existing);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const copy = await Assignment.create({
      title: `${existing.title} (Copy)`,
      subject: existing.subject,
      topicModule: existing.topicModule,
      description: existing.description,
      department: existing.department,
      academicStage: existing.academicStage,
      student: existing.student,
      studentName: existing.studentName,
      studentId: existing.studentId,
      dueDate: existing.dueDate,
      totalMarks: existing.totalMarks,
      status: "draft",
      publishAt: existing.publishAt,
      visibility: existing.visibility,
      notifyByEmail: existing.notifyByEmail,
      attachmentUrl: existing.attachmentUrl,
      attachments: existing.attachments,
      materials: existing.materials,
      createdBy: req.user?.id
    });
    res.status(201).json(assignmentResponse(copy));
  } catch (error) {
    next(error);
  }
}

export async function addAssignmentComment(req, res, next) {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found." });

    let student = null;
    if (req.user?.role === "student") {
      student = await studentForUser(req);
      if (!studentCanSeeAssignment(assignment, student)) return res.status(403).json({ message: "You cannot comment on this assignment." });
    } else {
      const access = await requireManageAccess(req, assignment);
      if (!access.ok) return res.status(access.status).json({ message: access.message });
      if (req.body.student) {
        student = await Student.findById(req.body.student);
        if (!student || student.department !== assignment.department) return res.status(400).json({ message: "Selected student is not in this department." });
      }
    }

    const message = String(req.body.message || "").trim();
    if (!message) return res.status(400).json({ message: "Comment message is required." });

    const comment = {
      author: req.user?.id,
      authorName: await userDisplayName(req),
      student: student?._id || null,
      message,
      visibility: req.body.visibility === "private" ? "private" : "public"
    };
    const field = req.body.kind === "announcement" ? "announcements" : "comments";
    assignment[field].push(comment);
    await assignment.save();
    res.status(201).json(assignmentResponse(assignment, req.user?.role === "student" ? student : null));
  } catch (error) {
    next(error);
  }
}

export async function submitAssignment(req, res, next) {
  try {
    if (req.user?.role !== "student") return res.status(403).json({ message: "Student access required." });
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found." });

    const student = await studentForUser(req);
    if (!studentCanSeeAssignment(assignment, student)) return res.status(403).json({ message: "You cannot submit this assignment." });
    if (assignment.status === "closed") return res.status(400).json({ message: "This assignment is closed." });

    const files = normalizeAttachments(req.body.files);
    const googleDocLinks = normalizeAttachments(req.body.googleDocLinks).map((item) => ({ ...item, type: "google-doc" }));
    const now = new Date();
    const status = now > new Date(assignment.dueDate) ? "late" : "submitted";
    const existing = assignment.submissions.find((item) => String(item.student) === String(student._id));
    const payload = {
      student: student._id,
      studentName: student.fullName,
      studentId: student.studentId,
      files,
      googleDocLinks,
      note: String(req.body.note || "").trim(),
      status,
      submittedAt: now
    };

    if (existing) {
      if (new Date() > new Date(assignment.dueDate)) return res.status(400).json({ message: "You cannot edit submission after the deadline." });
      Object.assign(existing, payload);
    } else {
      assignment.submissions.push(payload);
    }

    await assignment.save();
    res.status(201).json(assignmentResponse(assignment, student));
  } catch (error) {
    next(error);
  }
}

export async function reviewSubmission(req, res, next) {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found." });

    const access = await requireManageAccess(req, assignment);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const submission = assignment.submissions.id(req.params.submissionId);
    if (!submission) return res.status(404).json({ message: "Submission not found." });

    submission.status = req.body.status || submission.status;
    submission.marks = req.body.marks === "" || req.body.marks == null ? submission.marks : Number(req.body.marks);
    submission.rubric = String(req.body.rubric ?? submission.rubric ?? "").trim();
    submission.feedback = String(req.body.feedback ?? submission.feedback ?? "").trim();
    submission.privateFeedback = String(req.body.privateFeedback ?? submission.privateFeedback ?? "").trim();
    submission.gradedAt = new Date();

    await assignment.save();
    res.json(assignmentResponse(assignment));
  } catch (error) {
    next(error);
  }
}

export async function uploadAssignmentFiles(req, res, next) {
  try {
    const files = (req.files || []).map((file) => ({
      name: file.originalname,
      url: `${req.protocol}://${req.get("host")}/uploads/assignments/${file.filename}`,
      type: "file",
      mimeType: file.mimetype,
      size: file.size
    }));
    res.status(201).json({ files });
  } catch (error) {
    next(error);
  }
}

export async function createAssignment(req, res, next) {
  try {
    const result = await assignmentPayload(req);
    if (result.error) return res.status(result.status || 400).json({ message: result.error });
    if (!result.payload.title) return res.status(400).json({ message: "Assignment title is required." });
    if (!result.payload.subject) return res.status(400).json({ message: "Subject is required." });

    const record = await Assignment.create(result.payload);
    res.status(201).json(assignmentResponse(record));
  } catch (error) {
    next(error);
  }
}

export async function updateAssignment(req, res, next) {
  try {
    const existing = await Assignment.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Assignment not found." });

    const result = await assignmentPayload(req, existing);
    if (result.error) return res.status(result.status || 400).json({ message: result.error });
    if (!result.payload.title) return res.status(400).json({ message: "Assignment title is required." });
    if (!result.payload.subject) return res.status(400).json({ message: "Subject is required." });

    const record = await Assignment.findByIdAndUpdate(req.params.id, result.payload, { returnDocument: "after", runValidators: true });
    res.json(assignmentResponse(record));
  } catch (error) {
    next(error);
  }
}

export async function deleteAssignment(req, res, next) {
  try {
    const existing = await Assignment.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Assignment not found." });

    if (req.user?.role === "lecturer") {
      const scope = await facultyScope(req);
      if (scope.error) return res.status(403).json({ message: scope.error });
      if (existing.department !== scope.department) {
        return res.status(403).json({ message: "You can only delete assignments in your department." });
      }
    } else if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin or faculty access required." });
    }

    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ message: "Assignment deleted." });
  } catch (error) {
    next(error);
  }
}
