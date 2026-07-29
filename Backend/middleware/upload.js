import multer from "multer";
import path from "path";

const extensionGroups = {
  assignment: new Set([
    "pdf",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "xls",
    "xlsx",
    "csv",
    "txt",
    "zip",
    "png",
    "jpg",
    "jpeg",
    "webp",
  ]),
  document: new Set(["pdf", "docx", "pptx", "txt"]),
  image: new Set(["png", "jpg", "jpeg", "webp"]),
  cmsImage: new Set(["png", "jpg", "jpeg", "webp", "gif"]),
  alumni: new Set(["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp"]),
  alumniPost: new Set([
    "pdf",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "png",
    "jpg",
    "jpeg",
    "webp",
    "gif",
    "mp4",
    "webm",
  ]),
  alumniComment: new Set(["png", "jpg", "jpeg", "webp", "gif"]),
  alumniChat: new Set(["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "png", "jpg", "jpeg", "webp", "mp4", "webm"]),
};

const mimeGroups = {
  assignment: [
    /^application\/pdf$/i,
    /^application\/msword$/i,
    /^application\/vnd\.openxmlformats-officedocument\./i,
    /^application\/vnd\.ms-/i,
    /^text\/(plain|csv)$/i,
    /^application\/zip$/i,
    /^image\/(png|jpe?g|webp)$/i,
  ],
  document: [
    /^application\/pdf$/i,
    /^application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|presentationml\.presentation)$/i,
    /^text\/plain$/i,
  ],
  image: [/^image\/(png|jpe?g|webp)$/i],
  cmsImage: [/^image\/(png|jpe?g|webp|gif)$/i],
  alumni: [
    /^application\/pdf$/i,
    /^application\/msword$/i,
    /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i,
    /^image\/(png|jpe?g|webp)$/i,
  ],
  alumniPost: [
    /^application\/pdf$/i,
    /^application\/msword$/i,
    /^application\/vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|presentationml\.presentation)$/i,
    /^application\/vnd\.ms-powerpoint$/i,
    /^image\/(png|jpe?g|webp|gif)$/i,
    /^video\/(mp4|webm)$/i,
  ],
  alumniComment: [/^image\/(png|jpe?g|webp|gif)$/i],
  alumniChat: [
    /^application\/pdf$/i,
    /^application\/msword$/i,
    /^application\/vnd\.openxmlformats-officedocument\./i,
    /^application\/vnd\.ms-/i,
    /^text\/plain$/i,
    /^image\/(png|jpe?g|webp)$/i,
    /^video\/(mp4|webm)$/i,
  ],
};

function safeUploadName(originalName = "upload") {
  const ext = path.extname(originalName).toLowerCase();
  const base =
    path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "upload";
  return `${base}${ext}`;
}

function createFileFilter(groupName) {
  return (_req, file, callback) => {
    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    const allowedExts = extensionGroups[groupName] || new Set();
    const allowedMimes = mimeGroups[groupName] || [];

    const invalidAlumniPhoto =
      groupName === "alumni" &&
      ["profilePhoto", "coverPhoto"].includes(file.fieldname) &&
      !/^image\/(png|jpe?g|webp)$/i.test(file.mimetype);
    if (
      !invalidAlumniPhoto &&
      allowedExts.has(ext) &&
      allowedMimes.some((pattern) => pattern.test(file.mimetype))
    ) {
      callback(null, true);
      return;
    }

    const error = new Error(
      `Unsupported file type. Allowed extensions: ${[...allowedExts].join(", ")}.`,
    );
    error.status = 400;
    error.code = "UPLOAD_FILE_TYPE";
    callback(error);
  };
}

function createDiskUpload({
  uploadDir,
  groupName,
  maxFileSize,
  filenamePrefix,
}) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => callback(null, uploadDir),
      filename: (req, file, callback) => {
        const prefix =
          typeof filenamePrefix === "function"
            ? filenamePrefix(req, file)
            : filenamePrefix;
        callback(
          null,
          `${prefix || Date.now()}-${safeUploadName(file.originalname)}`,
        );
      },
    }),
    limits: { fileSize: maxFileSize },
    fileFilter: createFileFilter(groupName),
  });
}

export { createDiskUpload, safeUploadName };
