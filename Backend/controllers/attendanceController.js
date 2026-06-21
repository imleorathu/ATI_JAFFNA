import AttendanceRecord from "../models/AttendanceRecord.js";
import Student from "../models/Student.js";
import TimetableEntry from "../models/TimetableEntry.js";
import User from "../models/User.js";
import { getDepartmentScope } from "../middleware/departmentAccess.js";

const facultyScope = getDepartmentScope;
const departmentStaffRoles = ["lecturer", "department_staff"];
const campusLatitude = Number(process.env.ATI_CAMPUS_LAT || 9.651841);
const campusLongitude = Number(process.env.ATI_CAMPUS_LNG || 80.023445);
const allowedRadiusMeters = Number(process.env.ATTENDANCE_RADIUS_METERS || 500);

function todayParts(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayOfMonth = String(date.getDate()).padStart(2, "0");
  return {
    date: `${year}-${month}-${dayOfMonth}`,
    day: date.toLocaleDateString("en-US", { weekday: "long" })
  };
}

function parseSlotTime(value) {
  const [hourText = "0", minuteText = "0"] = String(value || "").trim().split(":");
  let hour = Number(hourText);
  const minute = Number(minuteText);
  if (hour > 0 && hour < 7) hour += 12;
  return hour * 60 + minute;
}

function isCurrentPeriod(timeSlot, now = new Date()) {
  const [start, end] = String(timeSlot || "").split(" - ");
  if (!start || !end) return false;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= parseSlotTime(start) && currentMinutes < parseSlotTime(end);
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function studentScope(req) {
  const user = await User.findById(req.user.id).select("name email studentProfile");
  if (!user) return { error: "User account not found." };

  const email = String(user.email || "").trim().toLowerCase();
  const studentId = String(user.studentProfile?.studentId || "").trim();
  const student = await Student.findOne({
    $or: [{ email }, ...(studentId ? [{ studentId }] : [])]
  });
  if (!student) return { error: "Student profile not found for this account." };

  const department = student.department || user.studentProfile?.department || user.studentProfile?.program;
  if (!department) return { error: "Student department is missing." };

  return { user, student, department };
}

async function currentEntryForStudent(department, academicStage = "", now = new Date()) {
  const { day } = todayParts(now);
  const entries = await TimetableEntry.find({
    department,
    day,
    $or: [{ academicStage: "" }, { academicStage: { $exists: false } }, ...(academicStage ? [{ academicStage }] : [])]
  }).sort({ time: 1 });
  return entries.find((entry) => entry.subject !== "Lunch Break" && isCurrentPeriod(entry.time, now)) || null;
}

function recordResponse(record) {
  return {
    id: record._id,
    studentName: record.studentName,
    studentId: record.studentId,
    department: record.department,
    academicStage: record.academicStage,
    subject: record.subject,
    lecturer: record.lecturer,
    room: record.room,
    date: record.date,
    day: record.day,
    time: record.time,
    status: record.status,
    method: record.method,
    markedAt: record.markedAt,
    latitude: record.latitude,
    longitude: record.longitude,
    accuracy: record.accuracy,
    distanceMeters: record.distanceMeters
  };
}

export async function getAttendanceSession(req, res, next) {
  try {
    if (req.user?.role !== "student") {
      return res.status(403).json({ message: "Only students can mark GPS attendance." });
    }

    const scope = await studentScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });

    const { date, day } = todayParts();
    const entry = await currentEntryForStudent(scope.department, scope.student.academicStage || scope.user.studentProfile?.academicStage || "");
    if (!entry) {
      return res.json({
        eligible: false,
        date,
        day,
        radiusMeters: allowedRadiusMeters,
        campus: { latitude: campusLatitude, longitude: campusLongitude },
        message: "No active class period for your department right now."
      });
    }

    const existing = await AttendanceRecord.findOne({
      student: scope.student._id,
      timetableEntry: entry._id,
      date
    });

    res.json({
      eligible: !existing,
      alreadyMarked: Boolean(existing),
      date,
      day,
      radiusMeters: allowedRadiusMeters,
      campus: { latitude: campusLatitude, longitude: campusLongitude },
      session: {
        id: entry._id,
        department: entry.department,
        academicStage: entry.academicStage || "",
        subject: entry.subject,
        lecturer: entry.lecturer,
        room: entry.room,
        time: entry.time
      },
      record: existing ? recordResponse(existing) : null
    });
  } catch (error) {
    next(error);
  }
}

export async function markGpsAttendance(req, res, next) {
  try {
    if (req.user?.role !== "student") {
      return res.status(403).json({ message: "Only students can mark GPS attendance." });
    }

    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);
    const accuracy = req.body.accuracy === undefined ? undefined : Number(req.body.accuracy);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: "GPS latitude and longitude are required." });
    }

    const scope = await studentScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });

    const { date, day } = todayParts();
    const entry = await currentEntryForStudent(scope.department, scope.student.academicStage || scope.user.studentProfile?.academicStage || "");
    if (!entry) {
      return res.status(409).json({ message: "Attendance can only be marked during your current timetable period." });
    }

    const distance = Math.round(distanceMeters(latitude, longitude, campusLatitude, campusLongitude));
    if (distance > allowedRadiusMeters) {
      return res.status(403).json({ message: `You are ${distance}m from campus. GPS attendance is allowed within ${allowedRadiusMeters}m only.` });
    }

    const existing = await AttendanceRecord.findOne({
      student: scope.student._id,
      timetableEntry: entry._id,
      date
    });
    if (existing) {
      return res.status(409).json({ message: "Attendance is already marked for this subject period." });
    }

    const record = await AttendanceRecord.create({
      student: scope.student._id,
      user: req.user.id,
      timetableEntry: entry._id,
      studentName: scope.student.fullName || scope.user.name,
      studentId: scope.student.studentId || scope.user.studentProfile?.studentId,
      department: scope.department,
      academicStage: entry.academicStage || "",
      subject: entry.subject,
      lecturer: entry.lecturer,
      room: entry.room,
      date,
      day,
      time: entry.time,
      latitude,
      longitude,
      accuracy,
      distanceMeters: distance
    });

    res.status(201).json({ record: recordResponse(record), message: "GPS attendance marked successfully." });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Attendance is already marked for this subject period." });
    }
    next(error);
  }
}

export async function listAttendanceRecords(req, res, next) {
  try {
    const query = {};

    if (req.query.date) query.date = String(req.query.date);
    if (req.query.subject) query.subject = String(req.query.subject);

    if (req.user?.role === "student") {
      const scope = await studentScope(req);
      if (scope.error) return res.status(403).json({ message: scope.error });
      query.student = scope.student._id;
    } else if (departmentStaffRoles.includes(req.user?.role)) {
      const scope = await facultyScope(req);
      if (scope.error) return res.status(403).json({ message: scope.error });
      query.department = scope.department;
    } else if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Attendance access is limited to students, faculty, and admins." });
    }

    const records = await AttendanceRecord.find(query).sort({ markedAt: -1 }).limit(500);
    res.json(records.map(recordResponse));
  } catch (error) {
    next(error);
  }
}
