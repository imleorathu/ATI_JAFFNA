import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import Alumni from "../models/Alumni.js";
import User from "../models/User.js";
import Student from "../models/Student.js";
import { canonicalDepartmentName } from "../services/departmentService.js";

const requiredFields = [
  "fullName",
  "nameWithInitials",
  "identityNumber",
  "dateOfBirth",
  "gender",
  "mobileNumber",
  "email",
  "currentAddress",
  "studentRegistrationNumber",
  "department",
  "programme",
  "batch",
  "admissionAcademicYear",
  "graduationYear",
  "finalStudyYear",
  "employmentStatus",
];
const allowedDocumentTypes = new Set([
  "Graduation Certificate",
  "Transcript",
  "Student Record Book",
  "Course Completion Letter",
]);
const clean = (value) => String(value || "").trim();
const normalizeEmail = (value) => clean(value).toLowerCase();
const profileFields = [
  "profilePhotoUrl",
  "coverPhotoUrl",
  "introduction",
  "department",
  "programme",
  "batch",
  "graduationYear",
  "jobTitle",
  "companyName",
  "employmentStatus",
  "skills",
  "professionalQualifications",
  "higherEducationQualifications",
  "achievements",
  "currentCountry",
  "currentCity",
  "portfolioUrl",
  "linkedInUrl",
  "githubUrl",
  "personalWebsite",
];
const profileCompletion = (profile) =>
  Math.round(
    (profileFields.filter((field) =>
      Array.isArray(profile[field])
        ? profile[field].length
        : clean(profile[field]),
    ).length /
      profileFields.length) *
      100,
  );

async function removeUploadedFiles(files = {}) {
  const allFiles = Object.values(files).flat();
  await Promise.all(
    allFiles.map((file) => fs.unlink(file.path).catch(() => {})),
  );
}

function parseList(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map(clean).filter(Boolean) : [];
  } catch {
    return [];
  }
}
function parseObjectList(value) {
  try {
    const parsed = Array.isArray(value) ? value : JSON.parse(value || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item === "object")
      : [];
  } catch {
    return [];
  }
}

export async function registerAlumni(req, res, next) {
  let createdAlumni;
  try {
    const missing = requiredFields.filter((field) => !clean(req.body[field]));
    if (missing.length) {
      await removeUploadedFiles(req.files);
      return res
        .status(400)
        .json({
          message: `Complete all required alumni fields: ${missing.join(", ")}.`,
        });
    }
    const password = String(req.body.password || "");
    if (password.length < 8) {
      await removeUploadedFiles(req.files);
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters." });
    }
    if (password !== String(req.body.confirmPassword || "")) {
      await removeUploadedFiles(req.files);
      return res
        .status(400)
        .json({ message: "Password and confirm password do not match." });
    }

    req.body.department = await canonicalDepartmentName(req.body.department);

    const email = normalizeEmail(req.body.email);
    const studentRegistrationNumber = clean(req.body.studentRegistrationNumber);
    const [existingUser, existingAlumni] = await Promise.all([
      User.findOne({
        $or: [
          { email },
          {
            "alumniProfile.studentRegistrationNumber":
              studentRegistrationNumber,
          },
        ],
      }).select("_id"),
      Alumni.findOne({
        $or: [{ email }, { studentRegistrationNumber }],
      }).select("_id"),
    ]);
    if (existingUser || existingAlumni) {
      await removeUploadedFiles(req.files);
      return res
        .status(409)
        .json({
          message:
            "An account already exists with this email or student registration number.",
        });
    }

    const documentTypes = parseList(req.body.documentTypes);
    const supportingFiles = req.files?.supportingDocuments || [];
    if (
      supportingFiles.length !== 1 ||
      documentTypes.length !== 1 ||
      !allowedDocumentTypes.has(documentTypes[0])
    ) {
      await removeUploadedFiles(req.files);
      return res
        .status(400)
        .json({
          message:
            "Upload exactly one supporting document and select its valid document type.",
        });
    }
    const supportingDocuments = supportingFiles.map((file, index) => ({
      documentType: documentTypes[index],
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
    }));
    const profilePhoto = req.files?.profilePhoto?.[0];
    const profilePhotoUrl = profilePhoto ? profilePhoto.filename : "";

    createdAlumni = await Alumni.create({
      ...Object.fromEntries(
        requiredFields.map((field) => [field, clean(req.body[field])]),
      ),
      email,
      studentRegistrationNumber,
      companyName: clean(req.body.companyName),
      jobTitle: clean(req.body.jobTitle),
      industry: clean(req.body.industry),
      interests: parseList(req.body.interests),
      profilePhotoUrl,
      supportingDocuments,
      accountStatus: "pending",
    });

    await User.create({
      name: createdAlumni.fullName,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "alumni",
      accountStatus: "pending",
      alumniProfile: {
        alumniId: createdAlumni._id,
        studentRegistrationNumber,
        department: createdAlumni.department,
        programme: createdAlumni.programme,
        graduationYear: createdAlumni.graduationYear,
        verificationStatus: createdAlumni.verificationStatus,
        profilePhotoUrl,
      },
    });

    res
      .status(201)
      .json({
        message:
          "Alumni registration submitted. An administrator must approve your account before you can sign in.",
      });
  } catch (error) {
    if (createdAlumni?._id)
      await Alumni.findByIdAndDelete(createdAlumni._id).catch(() => {});
    await removeUploadedFiles(req.files);
    next(error);
  }
}

export async function listAlumni(req, res, next) {
  try {
    res.json(await Alumni.find().sort({ createdAt: -1 }).lean());
  } catch (error) {
    next(error);
  }
}

export async function getMyAlumniProfile(req, res, next) {
  try {
    const user = req.user?.id
      ? await User.findById(req.user.id).select("alumniProfile accountStatus")
      : null;
    if (!user || user.accountStatus !== "approved")
      return res
        .status(403)
        .json({ message: "Your alumni account is not approved." });
    const alumni = await Alumni.findById(user.alumniProfile?.alumniId).lean();
    if (!alumni)
      return res.status(404).json({ message: "Alumni profile not found." });
    res.json(alumni);
  } catch (error) {
    next(error);
  }
}

export async function updateMyAlumniProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "alumni" || user.accountStatus !== "approved") {
      await removeUploadedFiles(req.files);
      return res
        .status(403)
        .json({ message: "Approved alumni access is required." });
    }
    const alumni = await Alumni.findById(user.alumniProfile?.alumniId);
    if (!alumni) {
      await removeUploadedFiles(req.files);
      return res.status(404).json({ message: "Alumni profile not found." });
    }

    const email = normalizeEmail(req.body.email ?? alumni.email);
    const studentRegistrationNumber = clean(
      req.body.studentRegistrationNumber ?? alumni.studentRegistrationNumber,
    );
    if (
      !clean(req.body.fullName ?? alumni.fullName) ||
      !email ||
      !studentRegistrationNumber
    ) {
      await removeUploadedFiles(req.files);
      return res
        .status(400)
        .json({
          message:
            "Full name, email, and student registration number are required.",
        });
    }
    const [emailConflict, registrationConflict] = await Promise.all([
      User.exists({ _id: { $ne: user._id }, email }),
      Alumni.exists({
        _id: { $ne: alumni._id },
        $or: [{ email }, { studentRegistrationNumber }],
      }),
    ]);
    if (emailConflict || registrationConflict) {
      await removeUploadedFiles(req.files);
      return res
        .status(409)
        .json({
          message:
            "Another account already uses this email or student registration number.",
        });
    }

    const editableFields = [
      "fullName",
      "nameWithInitials",
      "identityNumber",
      "dateOfBirth",
      "gender",
      "mobileNumber",
      "currentAddress",
      "studentRegistrationNumber",
      "department",
      "programme",
      "batch",
      "admissionAcademicYear",
      "graduationYear",
      "finalStudyYear",
      "employmentStatus",
      "companyName",
      "jobTitle",
      "industry",
      "introduction",
      "currentCountry",
      "currentCity",
      "portfolioUrl",
      "linkedInUrl",
      "githubUrl",
      "personalWebsite",
    ];
    editableFields.forEach((field) => {
      if (req.body[field] !== undefined)
        alumni[field] =
          clean(req.body[field]) || (field === "dateOfBirth" ? undefined : "");
    });
    alumni.email = email;
    if (req.body.interests !== undefined)
      alumni.interests = parseList(req.body.interests);
    for (const field of [
      "skills",
      "professionalQualifications",
      "higherEducationQualifications",
      "achievements",
    ])
      if (req.body[field] !== undefined)
        alumni[field] = parseList(req.body[field]);
    if (req.body.employmentHistory !== undefined)
      alumni.employmentHistory = parseObjectList(req.body.employmentHistory);
    for (const field of [
      "mentorAvailable",
      "recruitmentAvailable",
      "businessOwner",
    ])
      if (req.body[field] !== undefined)
        alumni[field] = String(req.body[field]) === "true";

    const newPhoto = req.files?.profilePhoto?.[0];
    const newCover = req.files?.coverPhoto?.[0];
    const newDocument = req.files?.supportingDocuments?.[0];
    const oldPhoto = alumni.profilePhotoUrl;
    const oldCover = alumni.coverPhotoUrl;
    const oldDocuments = alumni.supportingDocuments.map(
      (document) => document.storedName,
    );
    if (newPhoto) alumni.profilePhotoUrl = newPhoto.filename;
    if (newCover) alumni.coverPhotoUrl = newCover.filename;
    if (newDocument) {
      const [documentType] = parseList(req.body.documentTypes);
      if (!allowedDocumentTypes.has(documentType)) {
        await removeUploadedFiles(req.files);
        return res
          .status(400)
          .json({ message: "Select a valid supporting document type." });
      }
      alumni.supportingDocuments = [
        {
          documentType,
          originalName: newDocument.originalname,
          storedName: newDocument.filename,
          mimeType: newDocument.mimetype,
          size: newDocument.size,
        },
      ];
    }

    alumni.profileCompletion = profileCompletion(alumni);
    await alumni.save();
    user.name = alumni.fullName;
    user.email = alumni.email;
    user.alumniProfile = {
      alumniId: alumni._id,
      studentRegistrationNumber: alumni.studentRegistrationNumber,
      department: alumni.department,
      programme: alumni.programme,
      graduationYear: alumni.graduationYear,
      verificationStatus: alumni.verificationStatus,
      profilePhotoUrl: alumni.profilePhotoUrl,
    };
    await user.save();

    if (newPhoto && oldPhoto)
      await fs
        .unlink(path.resolve("private-uploads/alumni", oldPhoto))
        .catch(() => {});
    if (newCover && oldCover)
      await fs
        .unlink(path.resolve("private-uploads/alumni", oldCover))
        .catch(() => {});
    if (newDocument)
      await Promise.all(
        oldDocuments.map((name) =>
          fs
            .unlink(path.resolve("private-uploads/alumni", name))
            .catch(() => {}),
        ),
      );
    res.json({ alumni, message: "Alumni profile updated successfully." });
  } catch (error) {
    await removeUploadedFiles(req.files);
    next(error);
  }
}

export async function updateAlumniStatus(req, res, next) {
  try {
    const accountStatus = clean(req.body.accountStatus).toLowerCase();
    if (!["approved", "rejected"].includes(accountStatus))
      return res
        .status(400)
        .json({ message: "Status must be approved or rejected." });
    const alumni = await Alumni.findById(req.params.id);
    if (!alumni)
      return res
        .status(404)
        .json({ message: "Alumni registration not found." });
    alumni.accountStatus = accountStatus;
    alumni.reviewedAt = new Date();
    alumni.reviewedBy = req.user.id;
    await alumni.save();
    await User.findOneAndUpdate(
      { role: "alumni", "alumniProfile.alumniId": alumni._id },
      { accountStatus },
    );
    res.json(alumni);
  } catch (error) {
    next(error);
  }
}

export async function downloadAlumniDocument(req, res, next) {
  try {
    const alumni = await Alumni.findById(req.params.id).lean();
    const document = alumni?.supportingDocuments?.find(
      (item) => item.storedName === req.params.fileName,
    );
    if (!document)
      return res.status(404).json({ message: "Document not found." });
    res.download(
      path.resolve("private-uploads/alumni", document.storedName),
      document.originalName,
    );
  } catch (error) {
    next(error);
  }
}

export async function serveAlumniPhoto(req, res, next) {
  try {
    const fileName = path.basename(String(req.params.fileName || ""));
    if (!fileName || fileName !== req.params.fileName)
      return res.status(400).json({ message: "Invalid photo name." });
    const owner = await Alumni.exists({
      $or: [{ profilePhotoUrl: fileName }, { coverPhotoUrl: fileName }],
    });
    if (!owner)
      return res.status(404).json({ message: "Alumni photo not found." });
    res.set("Cache-Control", "public, max-age=3600");
    res.sendFile(path.resolve("private-uploads/alumni", fileName));
  } catch (error) {
    next(error);
  }
}

export async function promoteStudentToAlumni(
  student,
  { graduationYear, reviewedBy },
) {
  const email = normalizeEmail(student.email);
  const registrationNumber = clean(student.studentId);
  if (!email || !registrationNumber)
    throw new Error(
      `${student.fullName} must have an email and Student ID before graduation.`,
    );
  const user = await User.findOne({
    role: "student",
    $or: [
      { email },
      ...(registrationNumber
        ? [{ "studentProfile.studentId": registrationNumber }]
        : []),
    ],
  });
  if (!user)
    throw new Error(
      `No linked student login account was found for ${student.fullName}.`,
    );

  let alumni = await Alumni.findOne({
    $or: [{ email }, { studentRegistrationNumber: registrationNumber }],
  });
  const createdNew = !alumni;
  const alumniValues = {
    fullName: student.fullName,
    nameWithInitials: student.fullName,
    identityNumber: student.nic || "",
    mobileNumber: student.phone || "",
    email,
    studentRegistrationNumber: registrationNumber,
    department: student.department,
    programme: student.program || student.department,
    batch: student.intake || student.academicYear || "Unspecified batch",
    admissionAcademicYear:
      student.academicYear || student.intake || "Not recorded",
    graduationYear,
    finalStudyYear: student.academicStage || "Not recorded",
    employmentStatus: "Not provided",
    profilePhotoUrl: user.studentProfile?.profilePhotoUrl || "",
    accountStatus: "approved",
    verificationStatus: "verified",
    verifiedAt: new Date(),
    reviewedAt: new Date(),
    reviewedBy,
    graduatedFromStudent: true,
    graduatedAt: new Date(),
    sourceStudentRecordId: student._id,
    studentRecordSnapshot: student.toObject ? student.toObject() : student,
  };

  try {
    if (alumni) {
      Object.assign(alumni, alumniValues);
      await alumni.save();
    } else {
      alumni = await Alumni.create(alumniValues);
    }
    user.role = "alumni";
    user.accountStatus = "approved";
    user.alumniProfile = {
      alumniId: alumni._id,
      studentRegistrationNumber: registrationNumber,
      department: alumni.department,
      programme: alumni.programme,
      graduationYear,
      verificationStatus: alumni.verificationStatus,
      profilePhotoUrl: alumni.profilePhotoUrl,
    };
    await user.save();
    await Student.findByIdAndDelete(student._id);
    return alumni;
  } catch (error) {
    if (createdNew && alumni?._id)
      await Alumni.findByIdAndDelete(alumni._id).catch(() => {});
    throw error;
  }
}

export async function graduateStudent(req, res, next) {
  try {
    const graduationYear = clean(req.body.graduationYear);
    if (!graduationYear)
      return res.status(400).json({ message: "Graduation year is required." });
    const student = await Student.findById(req.params.studentId);
    if (!student)
      return res.status(404).json({ message: "Student not found." });
    const alumni = await promoteStudentToAlumni(student, {
      graduationYear,
      reviewedBy: req.user.id,
    });
    res.json({
      alumni,
      message: `${student.fullName} is now an approved alumni member and can use the Alumni portal with the existing login.`,
    });
  } catch (error) {
    next(error);
  }
}

export async function graduateBatch(req, res, next) {
  try {
    const batch = clean(req.body.batch);
    const graduationYear = clean(req.body.graduationYear);
    if (!batch || !graduationYear)
      return res
        .status(400)
        .json({ message: "Batch and graduation year are required." });
    const students = await Student.find({ intake: batch }).sort({
      fullName: 1,
    });
    if (!students.length)
      return res
        .status(404)
        .json({ message: "No active students were found in this batch." });
    const promoted = [];
    const failed = [];
    for (const student of students) {
      try {
        const alumni = await promoteStudentToAlumni(student, {
          graduationYear,
          reviewedBy: req.user.id,
        });
        promoted.push({
          studentId: student.studentId,
          fullName: student.fullName,
          alumniId: alumni._id,
        });
      } catch (error) {
        failed.push({
          studentId: student.studentId,
          fullName: student.fullName,
          message: error.message,
        });
      }
    }
    res.status(failed.length ? 207 : 200).json({
      batch,
      graduationYear,
      promoted,
      failed,
      message: `${promoted.length} student(s) moved to Alumni.${failed.length ? ` ${failed.length} could not be moved.` : ""}`,
    });
  } catch (error) {
    next(error);
  }
}
