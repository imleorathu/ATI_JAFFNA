import AdminStaff from "../models/AdminStaff.js";
import DepartmentStaff from "../models/DepartmentStaff.js";
import Faculty from "../models/Faculty.js";
import User from "../models/User.js";

const departmentStaffTypes = ["Teaching Staff", "Head of the department"];
const adminStaffTypes = ["Administrative Staff", "Director"];

function staffFields(faculty) {
  return {
    faculty: faculty._id,
    fullName: faculty.fullName,
    email: String(faculty.email || "").trim().toLowerCase(),
    phone: faculty.phone,
    staffType: faculty.staffType,
    status: faculty.status,
    coursesAssigned: faculty.coursesAssigned,
    joinDate: faculty.joinDate,
    office: faculty.office,
    bio: faculty.bio
  };
}

function profileQuery(faculty) {
  const email = String(faculty.email || "").trim().toLowerCase();
  return {
    $or: [
      { faculty: faculty._id },
      ...(email ? [{ email }] : [])
    ]
  };
}

export async function syncStaffProfiles(faculty) {
  if (!faculty) return;

  const fields = staffFields(faculty);
  if (departmentStaffTypes.includes(faculty.staffType)) {
    if (!faculty.department) {
      throw new Error("Department is required for teaching staff.");
    }
    await DepartmentStaff.findOneAndUpdate(
      profileQuery(faculty),
      { ...fields, department: faculty.department },
      { upsert: true, returnDocument: "after", runValidators: true }
    );
    await AdminStaff.deleteOne({ faculty: faculty._id });
    return;
  }

  if (adminStaffTypes.includes(faculty.staffType)) {
    await AdminStaff.findOneAndUpdate(
      profileQuery(faculty),
      fields,
      { upsert: true, returnDocument: "after", runValidators: true }
    );
    await DepartmentStaff.deleteOne({ faculty: faculty._id });
    return;
  }

  await Promise.all([
    DepartmentStaff.deleteOne({ faculty: faculty._id }),
    AdminStaff.deleteOne({ faculty: faculty._id })
  ]);
}

export async function deleteStaffProfiles(faculty) {
  if (!faculty) return;
  const query = profileQuery(faculty);
  await Promise.all([
    DepartmentStaff.deleteMany(query),
    AdminStaff.deleteMany(query)
  ]);
}

export async function deleteStaffAccountBundle(staffRecord) {
  if (!staffRecord) return;

  const email = String(staffRecord.email || "").trim().toLowerCase();
  const facultyId = staffRecord._id || staffRecord.faculty;
  const profileQueryByIdentity = {
    $or: [
      ...(facultyId ? [{ faculty: facultyId }, { _id: facultyId }] : []),
      ...(email ? [{ email }] : [])
    ]
  };
  const facultyQueryByIdentity = {
    $or: [
      ...(facultyId ? [{ _id: facultyId }] : []),
      ...(email ? [{ email }] : [])
    ]
  };
  const userQueryByIdentity = {
    role: "lecturer",
    $or: [
      ...(email ? [{ email }] : []),
      ...(facultyId ? [{ "staffProfile.staffId": String(facultyId) }] : [])
    ]
  };

  await Promise.all([
    DepartmentStaff.deleteMany(profileQueryByIdentity),
    AdminStaff.deleteMany(profileQueryByIdentity),
    Faculty.deleteMany(facultyQueryByIdentity),
    User.deleteMany(userQueryByIdentity)
  ]);
}
