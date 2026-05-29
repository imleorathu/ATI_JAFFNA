import fs from "fs/promises";
import mammoth from "mammoth";
import path from "path";
import { PDFParse } from "pdf-parse";
import yauzl from "yauzl";
import Assignment from "../models/Assignment.js";
import Contact from "../models/Contact.js";
import Faculty from "../models/Faculty.js";
import KnowledgeChunk from "../models/KnowledgeChunk.js";
import KnowledgeDocument from "../models/KnowledgeDocument.js";
import Student from "../models/Student.js";
import TimetableEntry from "../models/TimetableEntry.js";
import User from "../models/User.js";

const departmentBasedFacultyTypes = ["Teaching Staff", "Head of the department"];
const allowedTypes = new Set(["pdf", "docx", "pptx", "txt"]);
const stopWords = new Set(["the", "and", "for", "with", "that", "this", "what", "when", "where", "from", "are", "was", "were", "have", "has", "how", "give", "tell", "about", "into", "your", "you", "me", "my", "is", "to", "of", "in", "on", "a", "an"]);
const groqApiUrl = "https://api.groq.com/openai/v1/chat/completions";
const defaultGroqModel = "llama-3.3-70b-versatile";

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
        { uploadedBy: req.user.id, visibility: "private" }
      ];
    } else if (req.user?.role !== "admin") {
      query.department = scope.department;
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
    const department = req.user.role === "admin" ? String(req.body.department || "").trim() : scope.department;
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
    ...(department ? { department } : {}),
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
  if (lower.includes("assignment") || lower.includes("due")) {
    const assignments = await Assignment.find({ department: scope.department, status: { $ne: "draft" } }).sort({ dueDate: 1 }).limit(6);
    if (assignments.length) parts.push(`Assignments:\n${assignments.map((item) => `- ${item.title} (${item.subject}) due ${item.dueDate?.toISOString().slice(0, 10)}`).join("\n")}`);
  }
  if (lower.includes("announcement") || lower.includes("today")) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const messages = await Contact.find({ department: scope.department, type: "complaint", createdAt: { $gte: today } }).limit(5);
    if (messages.length) parts.push(`Today department messages:\n${messages.map((item) => `- ${item.subject}: ${item.message}`).join("\n")}`);
  }
  if (lower.includes("timetable") || lower.includes("schedule")) {
    const entries = await TimetableEntry.find({ department: scope.department }).limit(8);
    if (entries.length) parts.push(`Timetable:\n${entries.map((item) => `- ${item.day} ${item.startTime}-${item.endTime}: ${item.subject}`).join("\n")}`);
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
        "You are the ATI Jaffna AI Assistant.",
        "Answer students and staff clearly using markdown.",
        "Use the provided RAG context as the source of truth.",
        "Do not invent due dates, marks, rules, announcements, or timetable details.",
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
      messages: buildGroqMessages(question, chunks, liveContext, documentId),
      temperature: Number(process.env.GROQ_TEMPERATURE || 0.2),
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
      if (!scope.admin && document.department !== scope.department) return res.status(403).json({ message: "You can only chat with documents from your department." });
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
      console.error("Groq AI response failed:", error.message);
      res.write("Groq AI is unavailable right now, so I am answering from the local RAG context.\n\n");
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
