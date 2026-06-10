import fs from "fs/promises";
import mammoth from "mammoth";
import path from "path";
import { PDFParse } from "pdf-parse";
import yauzl from "yauzl";
import Assignment from "../models/Assignment.js";
import AttendanceRecord from "../models/AttendanceRecord.js";
import Contact from "../models/Contact.js";
import Course from "../models/Course.js";
import Event from "../models/Event.js";
import Faculty from "../models/Faculty.js";
import GradeRecord from "../models/GradeRecord.js";
import KnowledgeChunk from "../models/KnowledgeChunk.js";
import KnowledgeDocument from "../models/KnowledgeDocument.js";
import Notice from "../models/Notice.js";
import Student from "../models/Student.js";
import TimetableEntry from "../models/TimetableEntry.js";
import User from "../models/User.js";

const departmentBasedFacultyTypes = ["Teaching Staff", "Head of the department"];
const allowedTypes = new Set(["pdf", "docx", "pptx", "txt"]);
const stopWords = new Set(["the", "and", "for", "with", "that", "this", "what", "when", "where", "from", "are", "was", "were", "have", "has", "how", "give", "tell", "about", "into", "your", "you", "me", "my", "is", "to", "of", "in", "on", "a", "an"]);
const groqApiUrl = "https://api.groq.com/openai/v1/chat/completions";
const defaultGroqModel = "llama-3.3-70b-versatile";
const nvidiaApiUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
const defaultNvidiaModel = "google/gemma-4-31b-it";
const globalKnowledgeDepartment = "All Departments";

async function facultyScope(req) {
  const user = await User.findById(req.user.id).select("email name");
  if (!user) return { error: "User account not found." };
  const faculty = await Faculty.findOne({ email: String(user.email || "").trim().toLowerCase() });
  if (!faculty) return { error: "Faculty profile not found for this account." };
  if (!departmentBasedFacultyTypes.includes(faculty.staffType) || !faculty.department) {
    return { error: "This staff account is not assigned to a student department." };
  }
  return { user, faculty, department: faculty.department };
}

async function studentForUser(req) {
  const user = await User.findById(req.user.id).select("email studentProfile name role");
  if (!user) return null;
  const email = String(user.email || "").trim().toLowerCase();
  const studentId = String(user.studentProfile?.studentId || "").trim();
  const student = await Student.findOne({ $or: [{ email }, ...(studentId ? [{ studentId }] : [])] });
  return student ? { user, student, department: student.department } : null;
}

async function requesterScope(req) {
  if (req.user?.role === "student") return studentForUser(req);
  if (req.user?.role === "lecturer") return facultyScope(req);
  if (req.user?.role === "admin") {
    const user = await User.findById(req.user.id).select("name email role");
    return { user, department: String(req.query.department || req.body?.department || "").trim(), admin: true };
  }
  return null;
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token))
    .slice(0, 800);
}

function vectorize(text) {
  const counts = new Map();
  tokenize(text).forEach((token) => counts.set(token, (counts.get(token) || 0) + 1));
  return counts;
}

function cosine(a, b) {
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  a.forEach((value, key) => {
    aMag += value * value;
    dot += value * (b.get(key) || 0);
  });
  b.forEach((value) => {
    bMag += value * value;
  });
  return aMag && bMag ? dot / (Math.sqrt(aMag) * Math.sqrt(bMag)) : 0;
}

function storedVectorToMap(vector) {
  if (!vector) return new Map();
  if (vector instanceof Map) return vector;
  if (typeof vector.toObject === "function") return new Map(Object.entries(vector.toObject()));
  return new Map(Object.entries(vector));
}

function formatDate(value) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toISOString().slice(0, 10);
}

function thisWeekRange() {
  const now = new Date();
  const start = new Date(now);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

const gradePoints = {
  "A+": 4,
  A: 4,
  "A-": 3.7,
  "B+": 3.3,
  B: 3,
  "B-": 2.7,
  "C+": 2.3,
  C: 2,
  "C-": 1.7,
  "D+": 1.3,
  D: 1,
  F: 0
};

function calculateGpa(records) {
  let qualityPoints = 0;
  let credits = 0;

  records.forEach((record) => {
    const creditValue = Number(record.credits || 0);
    const point = gradePoints[record.grade] ?? 0;
    if (creditValue > 0) {
      qualityPoints += point * creditValue;
      credits += creditValue;
    }
  });

  return credits ? (qualityPoints / credits).toFixed(2) : "N/A";
}

function studentCanSeeAssignmentRecord(assignment, student) {
  if (!student) return true;
  if (assignment.student) return String(assignment.student) === String(student._id);
  return !assignment.academicStage || assignment.academicStage === student.academicStage;
}

function compactList(items, mapper) {
  return items.map(mapper).filter(Boolean).join("\n");
}

function chunkText(text, maxChars = 1300, overlap = 180) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks = [];
  for (let start = 0; start < clean.length; start += maxChars - overlap) {
    chunks.push(clean.slice(start, start + maxChars).trim());
  }
  return chunks.filter(Boolean);
}

function decodeXml(text) {
  return String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function readZipText(filePath, matcher) {
  return new Promise((resolve, reject) => {
    const parts = [];
    yauzl.open(filePath, { lazyEntries: true }, (openError, zipfile) => {
      if (openError) return reject(openError);
      zipfile.readEntry();
      zipfile.on("entry", (entry) => {
        if (!matcher(entry.fileName)) {
          zipfile.readEntry();
          return;
        }
        zipfile.openReadStream(entry, (streamError, stream) => {
          if (streamError) return reject(streamError);
          const buffers = [];
          stream.on("data", (chunk) => buffers.push(chunk));
          stream.on("end", () => {
            parts.push(decodeXml(Buffer.concat(buffers).toString("utf8")));
            zipfile.readEntry();
          });
        });
      });
      zipfile.on("end", () => resolve(parts.join("\n")));
      zipfile.on("error", reject);
    });
  });
}

async function extractText(filePath, fileType) {
  if (fileType === "txt") return fs.readFile(filePath, "utf8");
  if (fileType === "pdf") {
    const parser = new PDFParse({ data: await fs.readFile(filePath) });
    const data = await parser.getText();
    await parser.destroy();
    return data.text || "";
  }
  if (fileType === "docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || "";
  }
  if (fileType === "pptx") {
    return readZipText(filePath, (name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name) || /^ppt\/notesSlides\/notesSlide\d+\.xml$/i.test(name));
  }
  return "";
}

function documentResponse(document) {
  return {
    _id: document._id,
    title: document.title,
    originalName: document.originalName,
    department: document.department,
    topicModule: document.topicModule,
    fileType: document.fileType,
    fileUrl: document.fileUrl,
    status: document.status,
    error: document.error,
    chunkCount: document.chunkCount,
    visibility: document.visibility || "department",
    uploadedBy: document.uploadedBy,
    uploadedByName: document.uploadedByName,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt
  };
}

async function indexDocument(document, filePath) {
  try {
    const text = await extractText(filePath, document.fileType);
    const chunks = chunkText(text);
    await KnowledgeChunk.deleteMany({ document: document._id });
    await KnowledgeChunk.insertMany(
      chunks.map((chunk, index) => ({
        document: document._id,
        department: document.department,
        topicModule: document.topicModule,
        chunkIndex: index,
        text: chunk,
        tokens: tokenize(chunk),
        vector: Object.fromEntries(vectorize(chunk)),
        visibility: document.visibility || "department",
        uploadedBy: document.uploadedBy
      }))
    );
    document.status = "indexed";
    document.error = "";
    document.chunkCount = chunks.length;
    await document.save();
  } catch (error) {
    document.status = "failed";
    document.error = error.message;
    await document.save();
  }
}

export async function listKnowledgeDocuments(req, res, next) {
  try {
    const scope = await requesterScope(req);
    if (!scope) return res.status(403).json({ message: "AI knowledge access requires login." });
    const query = {};
    if (req.user?.role === "student") {
      query.$or = [
        { department: scope.department, visibility: { $ne: "private" } },
        { department: globalKnowledgeDepartment, visibility: { $ne: "private" } },
        { uploadedBy: req.user.id, visibility: "private" }
      ];
    } else if (req.user?.role !== "admin") {
      query.department = { $in: [scope.department, globalKnowledgeDepartment] };
      query.visibility = { $ne: "private" };
    } else if (scope.department) {
      query.department = scope.department;
      query.visibility = { $ne: "private" };
    } else {
      query.visibility = { $ne: "private" };
    }
    const documents = await KnowledgeDocument.find(query).sort({ createdAt: -1 });
    res.json(documents.map(documentResponse));
  } catch (error) {
    next(error);
  }
}

export async function uploadKnowledgeDocument(req, res, next) {
  try {
    if (!["student", "lecturer", "admin"].includes(req.user?.role)) return res.status(403).json({ message: "Login required to upload knowledge files." });
    const scope = req.user.role === "lecturer" ? await facultyScope(req) : await requesterScope(req);
    if (scope?.error) return res.status(403).json({ message: scope.error });
    const department = req.user.role === "admin" ? (String(req.body.department || "").trim() || globalKnowledgeDepartment) : scope.department;
    const visibility = req.user.role === "student" ? "private" : "department";
    if (!department) return res.status(400).json({ message: "Department is required." });
    if (!req.file) return res.status(400).json({ message: "File is required." });

    const fileType = path.extname(req.file.originalname).slice(1).toLowerCase();
    if (!allowedTypes.has(fileType)) return res.status(400).json({ message: "Only PDF, DOCX, PPTX, and TXT files are supported." });

    const document = await KnowledgeDocument.create({
      title: String(req.body.title || req.file.originalname).trim(),
      originalName: req.file.originalname,
      department,
      topicModule: String(req.body.topicModule || "").trim(),
      fileType,
      fileUrl: `${req.protocol}://${req.get("host")}/uploads/knowledge/${req.file.filename}`,
      status: "indexing",
      visibility,
      uploadedBy: req.user.id,
      uploadedByName: scope.user?.name || scope.user?.email || "Staff"
    });

    await indexDocument(document, req.file.path);
    res.status(201).json(documentResponse(document));
  } catch (error) {
    next(error);
  }
}

export async function updateKnowledgeDocument(req, res, next) {
  try {
    const document = await KnowledgeDocument.findById(req.params.id);
    if (!document) return res.status(404).json({ message: "Knowledge file not found." });
    if (document.visibility === "private" && String(document.uploadedBy || "") !== String(req.user.id)) {
      return res.status(403).json({ message: "Private AI documents can only be updated by their owner." });
    }
    if (req.user?.role === "student") {
      if (String(document.uploadedBy || "") !== String(req.user.id)) {
        return res.status(403).json({ message: "You can only update files you uploaded." });
      }
    } else if (req.user?.role === "lecturer") {
      const scope = await facultyScope(req);
      if (scope.error) return res.status(403).json({ message: scope.error });
      if (document.visibility === "private") return res.status(403).json({ message: "Private AI documents can only be updated by their owner." });
      if (document.department !== scope.department) return res.status(403).json({ message: "You can only update files in your department." });
    } else if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Staff access required." });
    }
    document.title = String(req.body.title ?? document.title).trim();
    document.topicModule = String(req.body.topicModule ?? document.topicModule ?? "").trim();
    await document.save();
    await KnowledgeChunk.updateMany({ document: document._id }, { $set: { topicModule: document.topicModule } });
    res.json(documentResponse(document));
  } catch (error) {
    next(error);
  }
}

export async function deleteKnowledgeDocument(req, res, next) {
  try {
    const document = await KnowledgeDocument.findById(req.params.id);
    if (!document) return res.status(404).json({ message: "Knowledge file not found." });
    if (document.visibility === "private" && String(document.uploadedBy || "") !== String(req.user.id)) {
      return res.status(403).json({ message: "Private AI documents can only be deleted by their owner." });
    }
    if (req.user?.role === "student") {
      if (String(document.uploadedBy || "") !== String(req.user.id)) {
        return res.status(403).json({ message: "You can only delete files you uploaded." });
      }
    } else if (req.user?.role === "lecturer") {
      const scope = await facultyScope(req);
      if (scope.error) return res.status(403).json({ message: scope.error });
      if (document.visibility === "private") return res.status(403).json({ message: "Private AI documents can only be deleted by their owner." });
      if (document.department !== scope.department) return res.status(403).json({ message: "You can only delete files in your department." });
    } else if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Staff access required." });
    }
    await KnowledgeChunk.deleteMany({ document: document._id });
    await KnowledgeDocument.findByIdAndDelete(document._id);
    res.json({ message: "Knowledge file deleted." });
  } catch (error) {
    next(error);
  }
}

async function retrieveContext(question, department, limit = 5, documentId = "") {
  const queryVector = vectorize(question);
  const queryTokens = [...queryVector.keys()];
  const chunks = await KnowledgeChunk.find({
    ...(department ? { department: { $in: [department, globalKnowledgeDepartment] } } : {}),
    ...(documentId ? { document: documentId } : {}),
    ...(!documentId ? { visibility: { $ne: "private" } } : {}),
    ...(queryTokens.length ? { tokens: { $in: queryTokens } } : {})
  }).limit(80);
  return chunks
    .map((chunk) => ({ chunk, score: cosine(queryVector, storedVectorToMap(chunk.vector)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter((item) => item.score > 0.02)
    .map((item) => item.chunk);
}

async function livePortalContext(question, scope, documentId = "") {
  if (documentId) return [];
  if (!scope?.department) return [];
  const lower = question.toLowerCase();
  const parts = [];
  const student = scope.student || null;
  const academicStage = student?.academicStage || scope.user?.studentProfile?.academicStage || "";

  if (student) {
    parts.push([
      "Student profile:",
      `- Name: ${student.fullName}`,
      `- Student ID: ${student.studentId || "Not recorded"}`,
      `- Department: ${student.department || scope.department}`,
      `- Current study year: ${student.academicStage || "Not recorded"}`,
      `- Study mode: ${student.studyMode || "Not recorded"}`,
      `- Payment status: ${student.paymentStatus || "Not recorded"}`
    ].join("\n"));
  }

  const wantsAssignments = /\b(assignment|deadline|due|submission|rubric|coursework|this week|week)\b/.test(lower);
  if (wantsAssignments) {
    const { start, end } = thisWeekRange();
    const assignmentQuery = {
      department: scope.department,
      status: { $ne: "draft" },
      ...(lower.includes("week") || lower.includes("deadline") ? { dueDate: { $gte: start, $lt: end } } : {})
    };
    const assignments = await Assignment.find(assignmentQuery).sort({ dueDate: 1 }).limit(10);
    const visibleAssignments = assignments.filter((item) => studentCanSeeAssignmentRecord(item, student));
    if (visibleAssignments.length) {
      parts.push(`Assignments and deadlines:\n${compactList(visibleAssignments, (item) => {
        const submission = student ? item.submissions?.find((entry) => String(entry.student) === String(student._id)) : null;
        return `- ${item.title} (${item.subject}) due ${formatDate(item.dueDate)}; status ${item.status}; total marks ${item.totalMarks}; submission ${submission?.status || "not submitted"}`;
      })}`);
    } else {
      parts.push("Assignments and deadlines: No matching published assignment records were found for this department/student group.");
    }
  }

  const wantsTimetable = /\b(timetable|schedule|class|lecture|room|lab|where|location|navigation|next class)\b/.test(lower);
  if (wantsTimetable) {
    const entries = await TimetableEntry.find({
      department: scope.department,
      ...(academicStage ? { $or: [{ academicStage }, { academicStage: "" }] } : {})
    }).sort({ day: 1, time: 1 }).limit(14);
    if (entries.length) {
      parts.push(`Class timetable and locations:\n${compactList(entries, (item) => `- ${item.day} ${item.time}: ${item.subject}${item.lecturer ? ` with ${item.lecturer}` : ""}${item.room ? ` in ${item.room}` : ""}`)}`);
    }
  }

  const wantsExam = /\b(exam|test|paper|mock exam)\b/.test(lower);
  if (wantsExam) {
    parts.push("Exam timetable: This system does not currently have a dedicated exam timetable collection. Use uploaded exam schedules in the RAG knowledge base or add an exam timetable module for exact exam dates.");
  }

  const wantsGrades = /\b(gpa|cgpa|grade|marks|score|failing|performance|progress)\b/.test(lower);
  if (wantsGrades) {
    const gradeQuery = student ? { student: student._id } : { department: scope.department };
    const grades = await GradeRecord.find(gradeQuery).sort({ semester: 1, subject: 1 }).limit(student ? 50 : 20);
    if (grades.length) {
      parts.push(`Grades and GPA:\n- Calculated GPA from recorded grade rows: ${calculateGpa(grades)}\n${compactList(grades.slice(-12), (item) => `- Semester ${item.semester}: ${item.subject}, ${item.score}%, grade ${item.grade}, credits ${item.credits}${item.remarks ? `, remarks: ${item.remarks}` : ""}`)}`);
    } else {
      parts.push("Grades and GPA: No grade records were found for this student/department yet.");
    }
  }

  const wantsAttendance = /\b(attendance|present|absent|at risk|risk|warning)\b/.test(lower);
  if (wantsAttendance) {
    if (student) {
      const records = await AttendanceRecord.find({ student: student._id }).sort({ markedAt: -1 }).limit(30);
      const bySubject = records.reduce((acc, item) => {
        acc[item.subject] = (acc[item.subject] || 0) + 1;
        return acc;
      }, {});
      parts.push(`Attendance:\n- Present marks recorded: ${records.length}\n${Object.entries(bySubject).map(([subject, count]) => `- ${subject}: ${count} present mark(s)`).join("\n") || "- No attendance marks found yet."}\nNote: The database stores GPS present marks. A true attendance percentage needs total scheduled/held class counts.`);
    } else {
      const records = await AttendanceRecord.find({ department: scope.department }).sort({ markedAt: -1 }).limit(30);
      parts.push(`Recent department attendance marks:\n${records.length ? compactList(records, (item) => `- ${item.date}: ${item.studentName} marked ${item.subject} at ${item.time}`) : "- No recent attendance marks found."}`);
    }
  }

  const wantsFees = /\b(fee|fees|payment|pay|paid|pending)\b/.test(lower);
  if (wantsFees && student) {
    parts.push(`Fees/payment:\n- Study mode: ${student.studyMode || "Not recorded"}\n- Payment status: ${student.paymentStatus || "Not recorded"}\n- Full-time students are marked not_required by the current student model; part-time students can be pending, partial, or paid.`);
  }

  const wantsCourses = /\b(course|module|subject|syllabus|prerequisite|recommend|programme|program)\b/.test(lower);
  if (wantsCourses) {
    const courses = await Course.find({
      $or: [{ department: scope.department }, { title: new RegExp(scope.department.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }]
    }).limit(8);
    if (courses.length) {
      parts.push(`Course/programme information:\n${compactList(courses, (item) => `- ${item.title}; duration: ${item.duration}; fee: ${item.fee}; instructor: ${item.instructor || "Not recorded"}; progress: ${item.progress || 0}%`)}`);
    }
  }

  const wantsFaculty = /\b(faculty|lecturer|teacher|hod|head|office|contact)\b/.test(lower);
  if (wantsFaculty) {
    const faculty = await Faculty.find({ department: scope.department, status: { $ne: "Inactive" } }).sort({ staffType: 1, fullName: 1 }).limit(12);
    if (faculty.length) {
      parts.push(`Faculty information:\n${compactList(faculty, (item) => `- ${item.fullName}, ${item.staffType}${item.office ? `, office: ${item.office}` : ""}${item.email ? `, email: ${item.email}` : ""}`)}`);
    }
  }

  if (/\b(notice|announcement|news|today)\b/.test(lower)) {
    const audience = scope.admin ? "admins" : scope.faculty ? "lecturers" : "students";
    const notices = await Notice.find({
      audience: { $in: ["all", audience] }
    }).sort({ createdAt: -1 }).limit(6);
    if (notices.length) parts.push(`Recent notices:\n${compactList(notices, (item) => `- ${item.title}: ${item.body.slice(0, 220)}${item.body.length > 220 ? "..." : ""}`)}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const messages = await Contact.find({ department: scope.department, type: "complaint", createdAt: { $gte: today } }).limit(5);
    if (messages.length) parts.push(`Today department messages:\n${compactList(messages, (item) => `- ${item.subject}: ${item.message}`)}`);
  }

  if (/\b(calendar|event|upcoming|reminder)\b/.test(lower)) {
    const events = await Event.find({ date: { $gte: new Date() } }).sort({ date: 1 }).limit(6);
    if (events.length) parts.push(`Upcoming academic/campus events:\n${compactList(events, (item) => `- ${formatDate(item.date)}: ${item.title} - ${item.description.slice(0, 180)}${item.description.length > 180 ? "..." : ""}`)}`);
  }

  if (/\b(code|programming|javascript|react|node|mongo|mongodb|sql|debug|error|algorithm)\b/.test(lower)) {
    parts.push("Programming tutor mode: The user is asking for coding/programming help. You may answer using general programming knowledge, explain errors, suggest debugging steps, and relate examples to the ATI Jaffna stack when useful.");
  }

  if (/\b(career|internship|job|cv|resume|interview)\b/.test(lower)) {
    parts.push("Career assistant mode: The user is asking for career guidance, CV/resume support, interview preparation, or internship/job advice. Use general career guidance unless exact placement records are provided in context.");
  }

  if (!parts.length) {
    parts.push("Assistant capability context: ATI Buddy can answer from uploaded RAG documents, live assignments, class timetable, grades, attendance marks, fees/payment status, faculty records, notices, events, document summaries, programming help, and career guidance when relevant data exists.");
  }

  return parts;
}

function sentenceList(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 35);
}

function buildDocumentAnswer(question, chunks) {
  const text = chunks.map((chunk) => chunk.text).join(" ");
  const sentences = sentenceList(text);
  const lower = question.toLowerCase();

  if (!chunks.length) {
    return "I could not find readable text in the uploaded document. Try uploading a PDF, DOCX, PPTX, or TXT file with selectable text.";
  }

  if (lower.includes("summarize") || lower.includes("summary")) {
    const summary = sentences.slice(0, 6).join("\n\n");
    return `**Document summary**\n\n${summary || text.slice(0, 1200)}`;
  }

  if ((lower.includes("question") || lower.includes("quiz")) && /\b10\b|ten/i.test(lower)) {
    const base = sentences.slice(0, 10);
    const questions = base.map((sentence, index) => `${index + 1}. Explain this idea from the document: ${sentence.replace(/[.?!]$/, "")}?`);
    return `**10 questions from this document**\n\n${questions.join("\n")}`;
  }

  const context = chunks.map((chunk, index) => `Source ${index + 1}: ${chunk.text}`).join("\n\n");
  return `**Answer from your uploaded document**\n\n${context}\n\nI used the most relevant parts of your uploaded document for this answer.`;
}

function buildAnswer(question, chunks, liveContext, documentId = "") {
  if (documentId) return buildDocumentAnswer(question, chunks);
  const sources = chunks.map((chunk, index) => `Source ${index + 1}: ${chunk.text}`);
  const context = [...liveContext, ...sources].filter(Boolean);
  if (!context.length) {
    return `I could not find indexed material for that question yet.\n\nTry uploading lecture notes, assignment sheets, or course documents first, then ask again.`;
  }
  return `Based on the indexed ATI Jaffna materials:\n\n${context
    .map((item) => item.length > 700 ? `${item.slice(0, 700)}...` : item)
    .join("\n\n")}\n\n**Answer:** ${question}\n\nThe most relevant information is above. Use the cited source list to open the matching knowledge file or ask a more specific follow-up.`;
}

function buildGroqMessages(question, chunks, liveContext, documentId = "") {
  const chunkContext = chunks.map((chunk, index) => {
    const label = chunk.topicModule ? `${chunk.topicModule} chunk ${chunk.chunkIndex + 1}` : `knowledge chunk ${chunk.chunkIndex + 1}`;
    return `Source ${index + 1} (${label}):\n${chunk.text}`;
  });
  const context = [...liveContext, ...chunkContext]
    .filter(Boolean)
    .map((item) => item.length > 1800 ? `${item.slice(0, 1800)}...` : item)
    .join("\n\n---\n\n");

  const mode = documentId
    ? "The user selected one document. Answer only from the selected document context. If the context is insufficient, say that clearly."
    : "Use the retrieved department knowledge and live portal context. If the answer is not in the context, say what is missing and suggest what staff should upload.";

  return [
    {
      role: "system",
      content: [
        "You are ATI Buddy Pro, ATI Jaffna's personalized student copilot and ChatGPT-style university assistant.",
        "Answer students clearly using markdown, with a warm, practical, coaching tone.",
        "Personalize answers from the student's live portal context when it is supplied, including name, department, student group, attendance, timetable, assignments, grades, fees, notices, and uploaded documents.",
        "Use the provided RAG context as the source of truth.",
        "Do not invent due dates, marks, rules, announcements, or timetable details.",
        "For private student dashboard questions, use only the live portal context supplied here.",
        "You can help with academic summaries, attendance monitoring, GPA or CGPA explanations, degree progress, timetable questions, assignment deadlines, fee status, notices, study plans, risk detection, programming help, career preparation, and uploaded document learning when context supports it.",
        "For academic copilot questions, show clear scenarios using available marks, grades, attendance, deadlines, and timetable data. If required data is missing, explain exactly what is missing.",
        "For natural language portal actions such as course registration, add/drop, transcript requests, certificates, leave applications, re-evaluation, facility booking, library renewal, profile updates, or downloads, do not pretend the action was completed unless a real tool or context says it was completed. Instead, explain what can be checked now and guide the user to the correct portal/admin workflow.",
        "For programming tutor, career guidance, study plan, and document-learning requests, you may use general educational guidance when the context explicitly enables that mode.",
        "When exact university data is missing, say what data/module is missing instead of guessing.",
        "For summaries, produce a concise structured summary.",
        "For question generation, create numbered questions from the context.",
        mode
      ].join(" ")
    },
    {
      role: "user",
      content: `RAG context:\n${context || "No retrieved context was found."}\n\nQuestion:\n${question}`
    }
  ];
}

async function streamGroqAnswer({ question, chunks, liveContext, documentId, res }) {
  return streamAiMessages({
    messages: buildGroqMessages(question, chunks, liveContext, documentId),
    res,
    temperature: Number(process.env.GROQ_TEMPERATURE || 0.2)
  });
}

function aiProviderOrder() {
  const preferred = String(process.env.AI_PROVIDER || "").trim().toLowerCase();
  const providers = preferred === "groq" ? ["groq", "nvidia"] : ["nvidia", "groq"];
  return providers.filter((provider, index) => providers.indexOf(provider) === index);
}

async function streamAiMessages({ messages, res, temperature = 0.4 }) {
  let lastError = null;
  for (const provider of aiProviderOrder()) {
    try {
      const streamed = provider === "nvidia"
        ? await streamNvidiaMessages({ messages, res, temperature })
        : await streamGroqMessages({ messages, res, temperature });
      if (streamed) return true;
    } catch (error) {
      lastError = error;
      console.error(`${provider.toUpperCase()} AI response failed:`, error.message);
    }
  }
  if (lastError) throw lastError;
  return false;
}

async function streamNvidiaMessages({ messages, res, temperature = 0.4 }) {
  const apiKey = process.env.NVIDIA_API_KEY || process.env.NVAPI_KEY;
  if (!apiKey) return false;

  const response = await fetch(nvidiaApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.NVIDIA_MODEL || defaultNvidiaModel,
      messages,
      max_tokens: Number(process.env.NVIDIA_MAX_TOKENS || 16384),
      temperature: Number(process.env.NVIDIA_TEMPERATURE || temperature || 1),
      top_p: Number(process.env.NVIDIA_TOP_P || 0.95),
      stream: false,
      chat_template_kwargs: { enable_thinking: String(process.env.NVIDIA_ENABLE_THINKING || "true") !== "false" }
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `NVIDIA Gemma request failed with status ${response.status}.`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.delta?.content || "";
  if (!content) throw new Error("NVIDIA Gemma returned an empty response.");
  res.write(content);
  return true;
}

async function streamGroqMessages({ messages, res, temperature = 0.4 }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return false;

  const response = await fetch(groqApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || defaultGroqModel,
      messages,
      temperature,
      max_completion_tokens: Number(process.env.GROQ_MAX_COMPLETION_TOKENS || 1200),
      stream: true
    })
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Groq request failed with status ${response.status}.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const lines = event
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("data:"));

      for (const line of lines) {
        const data = line.replace(/^data:\s*/, "");
        if (!data || data === "[DONE]") continue;
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || "";
        if (content) res.write(content);
      }
    }
  }

  return true;
}

const publicChatLanguages = {
  en: "English",
  ta: "Tamil",
  si: "Sinhala"
};

function buildPublicChatMessages(question, language = "en") {
  const responseLanguage = publicChatLanguages[language] || publicChatLanguages.en;
  return [
    {
      role: "system",
      content: [
        "You are ATI Buddy, the friendly public website chatbot for ATI Jaffna.",
        "Use a warm, helpful, student-friendly tone. Sound like a kind campus guide, not a stiff support bot.",
        "Answer the user's question directly, clearly, and conversationally.",
        "You may answer general questions, study-help questions, course-exploration questions, campus guidance questions, login guidance, basic technology questions, and general educational questions.",
        "This is a public general question-answer chat, not a private RAG assistant.",
        "Do not claim to search documents, databases, uploaded files, or private portal data.",
        "Do not invent ATI Jaffna-specific dates, fees, rules, contacts, or announcements.",
        "When a question requires private or up-to-date portal information, explain that the user should log in or contact ATI Jaffna staff.",
        "Student login flow: the student clicks Login on the public website, signs in, and is sent back to the public website. After login, the navbar shows Student Portal; clicking Student Portal opens the student's private portal page. From inside the portal, University Website returns to the public website.",
        "For private records like attendance, grades, GPA, timetable, assignments, fees, and department messages, say that exact details are available only after login in Student Portal.",
        "If the user asks something outside ATI Jaffna, answer helpfully if it is safe and educational, but avoid pretending it is official ATI Jaffna information.",
        `Always answer only in ${responseLanguage}, even when the user's question is written in another language.`,
        "Use simple markdown when it helps readability."
      ].join(" ")
    },
    {
      role: "user",
      content: question
    }
  ];
}

function buildPublicFallbackAnswer(question, language = "en") {
  const lower = question.toLowerCase();
  if (language === "ta") return "தற்போது இணைய AI சேவை கிடைக்காததால் முழுமையான பதிலை வழங்க முடியவில்லை. சிறிது நேரம் கழித்து மீண்டும் முயற்சிக்கவும்.";
  if (language === "si") return "මාර්ගගත AI සේවාව දැනට නොමැති නිසා සම්පූර්ණ පිළිතුරක් ලබා දිය නොහැක. කරුණාකර සුළු මොහොතකින් නැවත උත්සාහ කරන්න.";
  if (/\b(hello|hi|hey)\b/.test(lower)) return "Hi! I am ATI Buddy. Ask me anything about ATI Jaffna, student login, courses, study help, or general questions. I will keep it simple and friendly.";
  if (lower.includes("login") || lower.includes("password") || lower.includes("student portal")) {
    return [
      "Sure. Here is the student login flow:",
      "",
      "1. Click **Login** on the public website.",
      "2. Enter your student email or Student ID and password.",
      "3. After login, you will return to the public website.",
      "4. The navbar will show **Student Portal**.",
      "5. Click **Student Portal** to open your private student page.",
      "",
      "Inside the portal, use **University Website** to come back to the public website."
    ].join("\n");
  }
  if (lower.includes("assignment") || lower.includes("grade") || lower.includes("attendance") || lower.includes("timetable")) {
    return "Those exact student details are private. Please log in first, then click **Student Portal** in the navbar to view attendance, grades, timetable, assignments, fees, and department messages.";
  }
  return "I can help with that. The online AI service is unavailable right now, so my answer may be limited. You can ask about ATI Jaffna, login, courses, study help, or general questions and try again shortly for a fuller reply.";
}

export async function publicChat(req, res, next) {
  try {
    const question = String(req.body.message || "").trim();
    const language = publicChatLanguages[req.body.language] ? req.body.language : "en";
    if (!question) return res.status(400).json({ message: "Question is required." });
    if (question.length > 2000) return res.status(400).json({ message: "Please keep your question under 2000 characters." });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    try {
      const streamed = await streamAiMessages({
        messages: buildPublicChatMessages(question, language),
        res
      });
      if (streamed) {
        res.end();
        return;
      }
    } catch (error) {
      console.error("Public AI response failed:", error.message);
    }

    const answer = buildPublicFallbackAnswer(question, language);
    for (const word of answer.split(/(\s+)/)) {
      res.write(word);
      await new Promise((resolve) => setTimeout(resolve, 8));
    }
    res.end();
  } catch (error) {
    next(error);
  }
}

export async function chatWithKnowledge(req, res, next) {
  try {
    const question = String(req.body.message || "").trim();
    const documentId = String(req.body.documentId || "").trim();
    if (!question) return res.status(400).json({ message: "Question is required." });
    const scope = await requesterScope(req);
    if (!scope || (!scope.department && !scope.admin)) return res.status(403).json({ message: "A department profile is required to use RAG chat." });

    if (documentId) {
      const document = await KnowledgeDocument.findById(documentId);
      if (!document) return res.status(404).json({ message: "Uploaded document not found. Please upload it again." });
      if (document.visibility === "private" && String(document.uploadedBy || "") !== String(req.user.id)) {
        return res.status(403).json({ message: "You can only chat with your own private AI document." });
      }
      if (!scope.admin && ![scope.department, globalKnowledgeDepartment].includes(document.department)) return res.status(403).json({ message: "You can only chat with documents from your department." });
    }

    const chunks = documentId
      ? await KnowledgeChunk.find({ document: documentId }).sort({ chunkIndex: 1 }).limit(30)
      : await retrieveContext(question, scope.department);
    const relevantChunks = documentId && !/(summarize|summary|\b10\b|ten|question|quiz)/i.test(question)
      ? await retrieveContext(question, scope.department, 6, documentId)
      : chunks;
    const liveContext = await livePortalContext(question, scope, documentId);
    const answer = buildAnswer(question, relevantChunks.length ? relevantChunks : chunks, liveContext, documentId);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    try {
      const streamed = await streamGroqAnswer({
        question,
        chunks: relevantChunks.length ? relevantChunks : chunks,
        liveContext,
        documentId,
        res
      });
      if (streamed) {
        res.end();
        return;
      }
    } catch (error) {
      console.error("AI response failed:", error.message);
      res.write("The online AI model is unavailable right now, so I am answering from the local RAG context.\n\n");
    }

    const words = answer.split(/(\s+)/);
    for (const word of words) {
      res.write(word);
      await new Promise((resolve) => setTimeout(resolve, 8));
    }
    res.end();
  } catch (error) {
    next(error);
  }
}
