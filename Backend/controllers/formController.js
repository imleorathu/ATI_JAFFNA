import Form from "../models/Form.js";
import Assignment from "../models/Assignment.js";
import GradeRecord from "../models/GradeRecord.js";
import Student from "../models/Student.js";
import User from "../models/User.js";
import { getDepartmentScope } from "../middleware/departmentAccess.js";

const facultyScope = getDepartmentScope;
const formManagerRoles = ["admin", "lecturer", "department_staff"];
const departmentManagerRoles = ["lecturer", "department_staff"];

function gradeFromScore(score) {
  const value = Number(score);
  if (value >= 90) return "A+";
  if (value >= 80) return "A";
  if (value >= 75) return "A-";
  if (value >= 70) return "B+";
  if (value >= 65) return "B";
  if (value >= 60) return "B-";
  if (value >= 55) return "C+";
  if (value >= 50) return "C";
  if (value >= 45) return "C-";
  if (value >= 40) return "D";
  return "F";
}

async function studentForUser(req) {
  if (req.user?.role !== "student") return null;
  const user = await User.findById(req.user.id).select("email studentProfile");
  if (!user) return null;
  const email = String(user.email || "").trim().toLowerCase();
  const studentId = String(user.studentProfile?.studentId || "").trim();
  return Student.findOne({ $or: [{ email }, ...(studentId ? [{ studentId }] : [])] });
}

function studentCanSeeAssignment(assignment, student) {
  if (!student || assignment.department !== student.department) return false;
  if (assignment.status === "draft") return false;
  if (assignment.publishAt && new Date(assignment.publishAt) > new Date()) return false;
  if ((assignment.details?.selectedStudentIds || []).length) return assignment.details.selectedStudentIds.map(String).includes(String(student._id));
  if (assignment.student) return String(assignment.student) === String(student._id);
  return !assignment.academicStage || assignment.academicStage === student.academicStage;
}

function normalizeAnswer(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim().toLowerCase()).sort().join("|");
  return String(value ?? "").trim().toLowerCase();
}

function calculateMarks(form, answers = []) {
  const answerMap = new Map(answers.map((answer) => [String(answer.questionId), answer.value]));
  let marks = 0;

  for (const section of form.sections || []) {
    for (const question of section.questions || []) {
      if (!question.answerKey && question.answerKey !== 0) continue;
      const submitted = answerMap.get(String(question.id));
      const correct = normalizeAnswer(question.answerKey);
      if (!correct) continue;
      if (normalizeAnswer(submitted) === correct) {
        marks += Number(question.marks || 0);
      } else {
        marks -= Number(question.negativeMarks || form.settings?.negativeMarking || 0);
      }
    }
  }

  return Math.max(0, marks);
}

function calculateTotalQuestionPoints(sections = []) {
  return (sections || []).reduce((sectionTotal, section) => (
    sectionTotal + (section.questions || []).reduce((questionTotal, question) => questionTotal + Number(question.marks || 0), 0)
  ), 0);
}

async function syncAssignmentSubmissionFromForm(form, student, response) {
  if (!student || !form?._id) return null;
  const assignment = await Assignment.findOne({ "details.formId": String(form._id) });
  if (!assignment || !studentCanSeeAssignment(assignment, student)) return null;

  const now = response?.submittedAt ? new Date(response.submittedAt) : new Date();
  const status = assignment.dueDate && now > new Date(assignment.dueDate) ? "late" : "submitted";
  const existing = assignment.submissions.find((item) => String(item.student) === String(student._id));
  const payload = {
    student: student._id,
    studentName: student.fullName,
    studentId: student.studentId,
    files: [],
    googleDocLinks: [],
    note: `Submitted answers through ${form.title}.`,
    status,
    marks: response?.marks ?? null,
    feedback: response?.marks == null ? "" : `Auto-graded form score: ${response.marks} / ${form.totalMarks || 0}`,
    submittedAt: now,
    gradedAt: response?.marks == null ? undefined : now
  };

  if (existing) {
    Object.assign(existing, payload);
  } else {
    assignment.submissions.push(payload);
  }

  await assignment.save();
  return assignment;
}

function formResponse(record) {
  return {
    _id: record._id,
    title: record.title,
    description: record.description,
    formType: record.formType,
    department: record.department,
    academicStage: record.academicStage,
    sections: record.sections || [],
    settings: record.settings || {},
    status: record.status,
    totalMarks: record.totalMarks,
    passingMarks: record.passingMarks,
    autoGrading: record.autoGrading,
    responseCount: (record.responses || []).length,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

function formDetailResponse(record) {
  return {
    ...formResponse(record),
    responses: record.responses || []
  };
}

async function formPayload(req, existingRecord = null) {
  if (!formManagerRoles.includes(req.user?.role)) {
    return { error: "Admin or faculty access required.", status: 403 };
  }

  let department = String(req.body.department ?? existingRecord?.department ?? "").trim();
  if (departmentManagerRoles.includes(req.user?.role)) {
    const scope = await facultyScope(req);
    if (scope.error) return { error: scope.error, status: 403 };
    if (existingRecord && existingRecord.department !== scope.department) {
      return { error: "You can only manage forms in your department.", status: 403 };
    }
    department = scope.department;
  }

  if (!department) return { error: "Department is required." };

  const acceptedTypes = ["blank", "assignment", "quiz", "survey", "feedback", "attendance", "template"];
  const fallbackType = acceptedTypes.includes(existingRecord?.formType) ? existingRecord.formType : "blank";
  const formType = acceptedTypes.includes(req.body.formType) ? req.body.formType : fallbackType;
  const sections = req.body.sections ?? existingRecord?.sections ?? [];

  return {
    payload: {
      title: String(req.body.title ?? existingRecord?.title ?? "").trim(),
      description: String(req.body.description ?? existingRecord?.description ?? "").trim(),
      formType,
      department,
      academicStage: String(req.body.academicStage ?? existingRecord?.academicStage ?? "").trim(),
      sections,
      settings: {
        acceptResponses: req.body.settings?.acceptResponses ?? existingRecord?.settings?.acceptResponses ?? true,
        responseLimit: Number(req.body.settings?.responseLimit ?? existingRecord?.settings?.responseLimit ?? 0),
        startDate: req.body.settings?.startDate || existingRecord?.settings?.startDate || undefined,
        endDate: req.body.settings?.endDate || existingRecord?.settings?.endDate || undefined,
        password: String(req.body.settings?.password ?? existingRecord?.settings?.password ?? "").trim(),
        notifyByEmail: Boolean(req.body.settings?.notifyByEmail ?? existingRecord?.settings?.notifyByEmail ?? false),
        oneResponsePerUser: Boolean(req.body.settings?.oneResponsePerUser ?? existingRecord?.settings?.oneResponsePerUser ?? false),
        emailVerification: Boolean(req.body.settings?.emailVerification ?? existingRecord?.settings?.emailVerification ?? false),
        progressBar: Boolean(req.body.settings?.progressBar ?? existingRecord?.settings?.progressBar ?? false),
        passingMarks: Number(req.body.settings?.passingMarks ?? existingRecord?.settings?.passingMarks ?? req.body.passingMarks ?? existingRecord?.passingMarks ?? 0),
        configuredTotalMarks: Number(req.body.settings?.configuredTotalMarks ?? existingRecord?.settings?.configuredTotalMarks ?? 0),
        gradeScale: String(req.body.settings?.gradeScale ?? existingRecord?.settings?.gradeScale ?? "Percentage Based").trim(),
        dueDate: req.body.settings?.dueDate || existingRecord?.settings?.dueDate || undefined,
        submissionDeadline: req.body.settings?.submissionDeadline || existingRecord?.settings?.submissionDeadline || undefined,
        gradingMode: ["auto", "manual", "hybrid"].includes(req.body.settings?.gradingMode) ? req.body.settings.gradingMode : (existingRecord?.settings?.gradingMode || "auto"),
        negativeMarking: Number(req.body.settings?.negativeMarking ?? existingRecord?.settings?.negativeMarking ?? 0),
        lateSubmissionPenalty: Number(req.body.settings?.lateSubmissionPenalty ?? existingRecord?.settings?.lateSubmissionPenalty ?? 0),
        missingFilePenalty: Number(req.body.settings?.missingFilePenalty ?? existingRecord?.settings?.missingFilePenalty ?? 0),
        plagiarismPenalty: Number(req.body.settings?.plagiarismPenalty ?? existingRecord?.settings?.plagiarismPenalty ?? 0),
        shuffleQuestions: Boolean(req.body.settings?.shuffleQuestions ?? existingRecord?.settings?.shuffleQuestions ?? false),
        shuffleAnswers: Boolean(req.body.settings?.shuffleAnswers ?? existingRecord?.settings?.shuffleAnswers ?? false),
        timerMinutes: Number(req.body.settings?.timerMinutes ?? existingRecord?.settings?.timerMinutes ?? 0),
        autoSubmit: Boolean(req.body.settings?.autoSubmit ?? existingRecord?.settings?.autoSubmit ?? false),
        syncGrades: Boolean(req.body.settings?.syncGrades ?? existingRecord?.settings?.syncGrades ?? true),
        gradeSubject: String(req.body.settings?.gradeSubject ?? existingRecord?.settings?.gradeSubject ?? "Form Assessment").trim(),
        gradeSemester: Number(req.body.settings?.gradeSemester ?? existingRecord?.settings?.gradeSemester ?? 1),
        gradeCredits: Number(req.body.settings?.gradeCredits ?? existingRecord?.settings?.gradeCredits ?? 0),
        theme: String(req.body.settings?.theme ?? existingRecord?.settings?.theme ?? "default"),
        customColors: String(req.body.settings?.customColors ?? existingRecord?.settings?.customColors ?? ""),
        customFonts: String(req.body.settings?.customFonts ?? existingRecord?.settings?.customFonts ?? "")
      },
      status: req.body.status || existingRecord?.status || "draft",
      totalMarks: calculateTotalQuestionPoints(sections),
      passingMarks: Number(req.body.passingMarks ?? req.body.settings?.passingMarks ?? existingRecord?.passingMarks ?? 0),
      autoGrading: Boolean(req.body.autoGrading ?? existingRecord?.autoGrading ?? false),
      createdBy: existingRecord?.createdBy || req.user?.id
    }
  };
}

export async function listForms(req, res, next) {
  try {
    const query = {};

    if (departmentManagerRoles.includes(req.user?.role)) {
      const scope = await facultyScope(req);
      if (scope.error) return res.status(403).json({ message: scope.error });
      query.department = scope.department;
    } else if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Form access is limited to faculty and admins." });
    }

    const records = await Form.find(query).sort({ updatedAt: -1, createdAt: -1 });
    res.json(records.map((record) => formResponse(record)));
  } catch (error) {
    next(error);
  }
}

export async function getForm(req, res, next) {
  try {
    const record = await Form.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Form not found." });

    if (departmentManagerRoles.includes(req.user?.role)) {
      const scope = await facultyScope(req);
      if (scope.error || record.department !== scope.department) {
        return res.status(403).json({ message: "You can only access forms in your department." });
      }
    } else if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin or faculty access required." });
    }

    res.json(formDetailResponse(record));
  } catch (error) {
    next(error);
  }
}

export async function getAssignmentForm(req, res, next) {
  try {
    if (req.user?.role !== "student") return res.status(403).json({ message: "Student access required." });

    const student = await studentForUser(req);
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment || !studentCanSeeAssignment(assignment, student)) {
      return res.status(404).json({ message: "Assignment form not found." });
    }

    const formId = assignment.details?.formId;
    if (!formId) return res.status(404).json({ message: "This assignment does not have an attached form." });

    const record = await Form.findById(formId);
    if (!record || record.department !== assignment.department) {
      return res.status(404).json({ message: "Assignment form not found." });
    }

    const response = formDetailResponse(record);
    const existingResponse = (record.responses || []).find((item) => String(item.student || "") === String(student._id));
    res.json({
      ...response,
      studentSubmission: existingResponse
        ? { submitted: true, submittedAt: existingResponse.submittedAt, marks: existingResponse.marks }
        : { submitted: false }
    });
  } catch (error) {
    next(error);
  }
}

export async function createForm(req, res, next) {
  try {
    const result = await formPayload(req);
    if (result.error) return res.status(result.status || 400).json({ message: result.error });
    if (!result.payload.title) return res.status(400).json({ message: "Form title is required." });

    const record = await Form.create(result.payload);
    res.status(201).json(formResponse(record));
  } catch (error) {
    next(error);
  }
}

export async function updateForm(req, res, next) {
  try {
    const existing = await Form.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Form not found." });

    const result = await formPayload(req, existing);
    if (result.error) return res.status(result.status || 400).json({ message: result.error });
    if (!result.payload.title) return res.status(400).json({ message: "Form title is required." });

    const record = await Form.findByIdAndUpdate(req.params.id, result.payload, { returnDocument: "after", runValidators: true });
    res.json(formResponse(record));
  } catch (error) {
    next(error);
  }
}

export async function deleteForm(req, res, next) {
  try {
    const existing = await Form.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Form not found." });

    if (departmentManagerRoles.includes(req.user?.role)) {
      const scope = await facultyScope(req);
      if (scope.error) return res.status(403).json({ message: scope.error });
      if (existing.department !== scope.department) {
        return res.status(403).json({ message: "You can only delete forms in your department." });
      }
    } else if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin or faculty access required." });
    }

    await Form.findByIdAndDelete(req.params.id);
    res.json({ message: "Form deleted." });
  } catch (error) {
    next(error);
  }
}

export async function duplicateForm(req, res, next) {
  try {
    const existing = await Form.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Form not found." });

    if (departmentManagerRoles.includes(req.user?.role)) {
      const scope = await facultyScope(req);
      if (scope.error) return res.status(403).json({ message: scope.error });
      if (existing.department !== scope.department) {
        return res.status(403).json({ message: "You can only duplicate forms in your department." });
      }
    } else if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin or faculty access required." });
    }

    const copy = await Form.create({
      title: `${existing.title} (Copy)`,
      description: existing.description,
      formType: existing.formType,
      department: existing.department,
      academicStage: existing.academicStage,
      sections: existing.sections,
      settings: existing.settings,
      status: "draft",
      totalMarks: existing.totalMarks,
      passingMarks: existing.passingMarks,
      autoGrading: existing.autoGrading,
      createdBy: req.user?.id
    });
    res.status(201).json(formResponse(copy));
  } catch (error) {
    next(error);
  }
}

export async function updateFormStatus(req, res, next) {
  try {
    const existing = await Form.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Form not found." });

    if (departmentManagerRoles.includes(req.user?.role)) {
      const scope = await facultyScope(req);
      if (scope.error) return res.status(403).json({ message: scope.error });
      if (existing.department !== scope.department) {
        return res.status(403).json({ message: "You can only update forms in your department." });
      }
    } else if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin or faculty access required." });
    }

    const newStatus = req.body.status;
    if (!["draft", "published", "closed", "archived"].includes(newStatus)) {
      return res.status(400).json({ message: "Invalid status. Must be draft, published, closed, or archived." });
    }

    existing.status = newStatus;
    await existing.save();
    res.json(formResponse(existing));
  } catch (error) {
    next(error);
  }
}

export async function submitFormResponse(req, res, next) {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ message: "Form not found." });
    if (form.status !== "published") return res.status(400).json({ message: "This form is not accepting responses." });
    if (!form.settings.acceptResponses) return res.status(400).json({ message: "This form is not accepting responses." });
    const now = new Date();
    if (form.settings.startDate && now < new Date(form.settings.startDate)) {
      return res.status(400).json({ message: "This form is not open yet." });
    }
    if (form.settings.endDate && now > new Date(form.settings.endDate)) {
      return res.status(400).json({ message: "This form has closed." });
    }
    if (form.settings.submissionDeadline && now > new Date(form.settings.submissionDeadline)) {
      return res.status(400).json({ message: "The submission deadline has passed." });
    }

    if (form.settings.responseLimit > 0 && form.responses.length >= form.settings.responseLimit) {
      return res.status(400).json({ message: "Response limit reached for this form." });
    }

    const student = await studentForUser(req);
    const existingResponse = student ? (form.responses || []).find((response) => String(response.student || "") === String(student._id)) : null;
    if (student && existingResponse) {
      await syncAssignmentSubmissionFromForm(form, student, existingResponse);
      return res.status(409).json({ message: "You have already submitted this form." });
    }

    const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
    const shouldAutoGrade = ["assignment", "quiz"].includes(form.formType) && form.autoGrading && form.settings.gradingMode !== "manual";
    const marks = shouldAutoGrade ? calculateMarks(form, answers) : null;
    const response = {
      respondent: String(req.body.respondent || "").trim(),
      respondentEmail: String(req.body.respondentEmail || "").trim(),
      student: student?._id || null,
      studentId: student?.studentId || String(req.body.studentId || "").trim(),
      answers,
      marks,
      submittedAt: new Date()
    };

    form.responses.push(response);
    await form.save();
    const savedResponse = form.responses[form.responses.length - 1];
    await syncAssignmentSubmissionFromForm(form, student, savedResponse);

    if (student && marks !== null && form.settings.syncGrades) {
      const score = form.totalMarks > 0 ? Math.round((marks / form.totalMarks) * 100) : marks;
      await GradeRecord.findOneAndUpdate(
        { student: student._id, subject: form.settings.gradeSubject || form.title, semester: Number(form.settings.gradeSemester || 1) },
        {
          student: student._id,
          studentName: student.fullName,
          studentId: student.studentId,
          department: student.department,
          academicStage: student.academicStage,
          subject: form.settings.gradeSubject || form.title,
          semester: Number(form.settings.gradeSemester || 1),
          credits: Number(form.settings.gradeCredits || 0),
          score: Math.max(0, Math.min(100, score)),
          grade: gradeFromScore(score),
          remarks: `Synced from ${form.title}`
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      savedResponse.gradeSynced = true;
      await form.save();
    }

    res.status(201).json({ message: "Response submitted.", responseId: savedResponse._id, marks: savedResponse.marks, gradeSynced: savedResponse.gradeSynced });
  } catch (error) {
    next(error);
  }
}

export async function getFormResponses(req, res, next) {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ message: "Form not found." });

    if (departmentManagerRoles.includes(req.user?.role)) {
      const scope = await facultyScope(req);
      if (scope.error || form.department !== scope.department) {
        return res.status(403).json({ message: "You can only view responses for forms in your department." });
      }
    } else if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin or faculty access required." });
    }

    res.json({ responses: form.responses || [] });
  } catch (error) {
    next(error);
  }
}

export async function updateFormResponse(req, res, next) {
  try {
    const form = await Form.findById(req.params.id);
    if (!form) return res.status(404).json({ message: "Form not found." });

    if (departmentManagerRoles.includes(req.user?.role)) {
      const scope = await facultyScope(req);
      if (scope.error || form.department !== scope.department) {
        return res.status(403).json({ message: "You can only grade responses for forms in your department." });
      }
    } else if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Admin or faculty access required." });
    }

    const response = form.responses.id(req.params.responseId);
    if (!response) return res.status(404).json({ message: "Response not found." });

    if (req.body.marks !== undefined && req.body.marks !== "") response.marks = Number(req.body.marks);
    response.feedback = String(req.body.feedback ?? response.feedback ?? "").trim();

    if (response.student && response.marks !== null && form.settings.syncGrades) {
      const student = await Student.findById(response.student);
      if (student) {
        const score = form.totalMarks > 0 ? Math.round((Number(response.marks || 0) / form.totalMarks) * 100) : Number(response.marks || 0);
        await GradeRecord.findOneAndUpdate(
          { student: student._id, subject: form.settings.gradeSubject || form.title, semester: Number(form.settings.gradeSemester || 1) },
          {
            student: student._id,
            studentName: student.fullName,
            studentId: student.studentId,
            department: student.department,
            academicStage: student.academicStage,
            subject: form.settings.gradeSubject || form.title,
            semester: Number(form.settings.gradeSemester || 1),
            credits: Number(form.settings.gradeCredits || 0),
            score: Math.max(0, Math.min(100, score)),
            grade: gradeFromScore(score),
            remarks: response.feedback || `Synced from ${form.title}`
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        response.gradeSynced = true;
      }
    }

    await form.save();
    res.json({ response });
  } catch (error) {
    next(error);
  }
}
