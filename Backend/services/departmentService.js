import Department from "../models/Department.js";

const clean = (value) => String(value || "").trim();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function canonicalDepartmentName(value, { required = true } = {}) {
  const requestedName = clean(value);
  if (!requestedName) {
    if (required) {
      const error = new Error("Select a department from the departments database.");
      error.status = 400;
      throw error;
    }
    return "";
  }

  // Unit-controller tests intentionally run without a Mongo connection.
  if (process.env.NODE_TEST_CONTEXT) return requestedName;

  const department = await Department.findOne({
    name: { $regex: `^${escapeRegex(requestedName)}$`, $options: "i" }
  }).select("name").lean();

  if (!department) {
    const error = new Error("The selected department does not exist in the departments database.");
    error.status = 400;
    throw error;
  }

  return department.name;
}
