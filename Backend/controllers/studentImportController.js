import bcrypt from "bcryptjs";
import XLSX from "xlsx";
import Student from "../models/Student.js";
import User from "../models/User.js";

const requiredColumns = [
  "Full Name",
  "Student ID",
  "NIC",
  "Email Address",
  "Phone Number",
  "Department / HND Programme",
  "HNDIT Student Group",
  "Study Mode",
  "Guardian Name",
  "Guardian Phone",
  "Password",
  "Confirm Password"
];

const defaultableColumns = ["Password", "Confirm Password", "HNDIT Student Group"];
const hnditDepartment = "Higher National Diploma in Information Technology - (HNDIT)";
const hnditAcademicStages = ["First year Full Time", "Second year Full Time", "First year Part Time", "Second year Part Time"];
const requiredImportColumns = requiredColumns.filter((column) => !defaultableColumns.includes(column));

const columnAliases = {
  "Full Name": [
    "Full Name",
    "Full name",
    "Name",
    "Student Name",
    "Student full name",
    "What is your full name?",
    "Full name of student",
    "Name with initials",
    "Student name with initials"
  ],
  "Student ID": [
    "Student ID",
    "Student Id",
    "Student Number",
    "Registration Number",
    "Registration No",
    "Reg No",
    "Index Number",
    "Index No",
    "ATI Number",
    "ATI Registration Number"
  ],
  NIC: ["NIC", "NIC Number", "NIC No", "National Identity Card", "National Identity Card Number", "Identity Card Number"],
  "Email Address": [
    "Email Address",
    "Email",
    "E-mail",
    "Email address",
    "Student Email",
    "Student Email Address",
    "What is your email address?"
  ],
  "Phone Number": [
    "Phone Number",
    "Phone",
    "Mobile Number",
    "Mobile No",
    "Contact Number",
    "Contact No",
    "Telephone Number",
    "Student Phone",
    "WhatsApp Number"
  ],
  "Department / HND Programme": [
    "Department / HND Programme",
    "Department",
    "HND Programme",
    "HND Program",
    "Programme",
    "Program",
    "Course",
    "Department / Programme",
    "Department / Program",
    "Selected HND Programme",
    "Select your HND Programme",
    "What is your HND Programme?",
    "What is your course?"
  ],
  "Study Mode": [
    "Study Mode",
    "Mode",
    "Student Type",
    "Full Time / Part Time",
    "Full-time / Part-time",
    "Full Time or Part Time",
    "Full-time or Part-time",
    "Full Time Part Time"
  ],
  "HNDIT Student Group": [
    "HNDIT Student Group",
    "Student Group",
    "Academic Stage",
    "Year Type",
    "Year and Study Type",
    "HNDIT Year"
  ],
  "Guardian Name": [
    "Guardian Name",
    "Parent Name",
    "Father Name",
    "Mother Name",
    "Parent / Guardian Name",
    "Name of Parent / Guardian",
    "Emergency Contact Name"
  ],
  "Guardian Phone": [
    "Guardian Phone",
    "Guardian Phone Number",
    "Parent Phone",
    "Parent Contact Number",
    "Parent / Guardian Contact Number",
    "Emergency Contact Number"
  ],
  Password: ["Password", "Default Password"],
  "Confirm Password": ["Confirm Password", "Confirm password", "Re-enter Password", "Confirm Default Password"]
};

const columnKeywordMatchers = {
  "Full Name": [["full", "name"], ["student", "name"], ["name", "initials"]],
  "Student ID": [["student", "id"], ["registration", "number"], ["registration", "no"], ["reg", "no"], ["index", "number"], ["index", "no"]],
  NIC: [["nic"], ["identity", "card"]],
  "Email Address": [["email"]],
  "Phone Number": [["phone"], ["mobile"], ["contact", "number"], ["telephone"], ["whatsapp"]],
  "Department / HND Programme": [["department"], ["hnd", "programme"], ["hnd", "program"], ["programme"], ["program"], ["course"]],
  "Study Mode": [["study", "mode"], ["student", "type"], ["full", "time", "part", "time"]],
  "HNDIT Student Group": [["hndit", "student", "group"], ["academic", "stage"], ["year", "study", "type"], ["year", "type"]],
  "Guardian Name": [["guardian", "name"], ["parent", "name"], ["father", "name"], ["mother", "name"], ["emergency", "name"]],
  "Guardian Phone": [["guardian", "phone"], ["guardian", "contact"], ["parent", "phone"], ["parent", "contact"], ["emergency", "contact"]],
  Password: [["password"]],
  "Confirm Password": [["confirm", "password"], ["reenter", "password"], ["re", "enter", "password"]]
};

const columnExcludedHeaderWords = {
  "Full Name": ["guardian", "parent", "father", "mother", "emergency"],
  "Phone Number": ["guardian", "parent", "father", "mother", "emergency"],
  "Email Address": ["guardian", "parent", "father", "mother", "emergency"]
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeHeader = (header) =>
  String(header || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();

const findColumnValue = (normalizedEntries, column) => {
  const aliases = columnAliases[column] || [column];
  const exactAlias = aliases.find((alias) => normalizedEntries.has(normalizeHeader(alias)));
  if (exactAlias) return normalizedEntries.get(normalizeHeader(exactAlias));

  const excludedWords = columnExcludedHeaderWords[column] || [];
  const isAllowedHeader = (header) => !excludedWords.some((word) => header.includes(word));
  const keywordMatch = (columnKeywordMatchers[column] || []).find((keywords) =>
    [...normalizedEntries.keys()].find((header) => isAllowedHeader(header) && keywords.every((keyword) => header.includes(keyword)))
  );

  if (keywordMatch) {
    const matchedHeader = [...normalizedEntries.keys()].find(
      (header) => isAllowedHeader(header) && keywordMatch.every((keyword) => header.includes(keyword))
    );
    return normalizedEntries.get(matchedHeader);
  }

  return "";
};

const canonicalizeRow = (row) => {
  const normalizedEntries = Object.entries(row).reduce((map, [key, rawValue]) => {
    map.set(normalizeHeader(key), rawValue);
    return map;
  }, new Map());

  return requiredColumns.reduce((canonicalRow, column) => {
    canonicalRow[column] = findColumnValue(normalizedEntries, column);
    return canonicalRow;
  }, {});
};

const value = (row, key) => String(row[key] ?? "").trim();

const normalizeStudyMode = (mode) => {
  const normalized = String(mode || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (normalized === "fulltime") return "Full-time";
  if (normalized === "parttime") return "Part-time";
  return "";
};

const normalizeAcademicStage = (stage) => {
  const normalized = String(stage || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  return hnditAcademicStages.find((item) => item.toLowerCase().replace(/[\s_-]+/g, "") === normalized) || "";
};

function parseCsvRecords(text) {
  const records = [];
  let record = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      record.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      record.push(current);
      if (record.some((value) => String(value).trim())) records.push(record);
      record = [];
      current = "";
    } else {
      current += char;
    }
  }

  record.push(current);
  if (record.some((value) => String(value).trim())) records.push(record);

  return records;
}

function readCsvRows(file) {
  const text = file.buffer.toString("utf8").replace(/^\uFEFF/, "");
  const records = parseCsvRecords(text);
  const headers = (records[0] || []).map((header) => header.trim());

  return records.slice(1).map((values) =>
    headers.reduce((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {})
  );
}

function readRows(file) {
  if (/\.csv$/i.test(file.originalname)) {
    return readCsvRows(file);
  }

  const workbook = XLSX.read(file.buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
}

export async function importStudents(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: "Upload an Excel or CSV file." });

    const rows = readRows(req.file).map(canonicalizeRow);
    if (!rows.length) return res.status(400).json({ message: "The uploaded file has no student rows." });

    const fileStudentIds = new Set();
    const fileEmails = new Set();
    const validatedRows = [];
    const invalidRows = [];

    const studentIds = rows.map((row) => value(row, "Student ID")).filter(Boolean);
    const emails = rows.map((row) => value(row, "Email Address").toLowerCase()).filter(Boolean);
    const existingStudents = await Student.find({ studentId: { $in: studentIds } }).select("studentId");
    const existingUsers = await User.find({
      $or: [
        { email: { $in: emails } },
        { "studentProfile.studentId": { $in: studentIds } }
      ]
    }).select("email studentProfile.studentId");
    const existingStudentIds = new Set([
      ...existingStudents.map((student) => student.studentId),
      ...existingUsers.map((user) => user.studentProfile?.studentId).filter(Boolean)
    ]);
    const existingEmails = new Set(existingUsers.map((user) => user.email));

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const errors = [];

      requiredImportColumns.forEach((column) => {
        if (!value(row, column)) errors.push(`${column} is required`);
      });

      const fullName = value(row, "Full Name");
      const studentId = value(row, "Student ID");
      const nic = value(row, "NIC");
      const email = value(row, "Email Address").toLowerCase();
      const phone = value(row, "Phone Number");
      const department = value(row, "Department / HND Programme");
      const academicStage = department === hnditDepartment ? normalizeAcademicStage(value(row, "HNDIT Student Group")) : "";
      const studyMode = academicStage ? academicStage.includes("Part Time") ? "Part-time" : "Full-time" : normalizeStudyMode(value(row, "Study Mode"));
      const guardianName = value(row, "Guardian Name");
      const guardianPhone = value(row, "Guardian Phone");
      const password = value(row, "Password") || studentId;
      const confirmPassword = value(row, "Confirm Password") || studentId;

      if (email && !emailPattern.test(email)) errors.push("Email Address is invalid");
      if (studentId && existingStudentIds.has(studentId)) errors.push("Student ID already exists");
      if (studentId && fileStudentIds.has(studentId)) errors.push("Duplicate Student ID in uploaded file");
      if (email && existingEmails.has(email)) errors.push("Email Address already exists");
      if (email && fileEmails.has(email)) errors.push("Duplicate Email Address in uploaded file");
      if (password && confirmPassword && password !== confirmPassword) errors.push("Password and Confirm Password do not match");
      if (studentId && password && password !== studentId) errors.push("Password must be the Student ID");
      if (!studyMode) errors.push("Study Mode must be Full Time or Part Time");
      if (department === hnditDepartment && !academicStage) errors.push("HNDIT Student Group is required for HNDIT students");

      if (studentId) fileStudentIds.add(studentId);
      if (email) fileEmails.add(email);

      const clean = {
        fullName,
        studentId,
        nic,
        email,
        phone,
        department,
        program: department,
        academicStage,
        studyMode,
        guardianName,
        guardianPhone,
        paymentStatus: studyMode === "Full-time" ? "not_required" : "pending"
      };

      if (errors.length) {
        invalidRows.push({ rowNumber, studentId, email, errors });
      } else {
        validatedRows.push(clean);
      }
    });

    const insertedStudents = [];
    for (const row of validatedRows) {
      const passwordHash = await bcrypt.hash(row.studentId, 10);
      const student = await Student.create(row);
      await User.create({
        name: row.fullName,
        email: row.email,
        passwordHash,
        role: "student",
        accountStatus: "approved",
        mustChangePassword: true,
        studentProfile: {
          studentId: row.studentId,
          nic: row.nic,
          department: row.department,
          program: row.program,
          academicStage: row.academicStage,
          studyMode: row.studyMode,
          phone: row.phone,
          guardianName: row.guardianName,
          guardianPhone: row.guardianPhone
        }
      });
      insertedStudents.push(student);
    }

    res.status(201).json({
      inserted: insertedStudents.length,
      invalid: invalidRows.length,
      invalidRows,
      students: insertedStudents
    });
  } catch (error) {
    next(error);
  }
}
