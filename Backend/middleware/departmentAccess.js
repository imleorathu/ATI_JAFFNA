import Faculty from "../models/Faculty.js";
import User from "../models/User.js";

export const departmentBasedStaffTypes = ["Teaching Staff", "Head of the department", "Department Staff"];
export const departmentScopedRoles = ["lecturer", "department_staff"];

export async function getDepartmentScope(req) {
  if (!departmentScopedRoles.includes(req.user?.role)) return null;

  const user = await User.findById(req.user.id).select("email staffProfile");
  if (!user) return { error: "User account not found." };

  const email = String(user.email || "").trim().toLowerCase();
  const faculty = await Faculty.findOne({ email });
  const staffType = faculty?.staffType || user.staffProfile?.staffType;
  const department = faculty?.department || user.staffProfile?.department || "";

  if (!faculty && !user.staffProfile) return { error: "Faculty profile not found for this account." };
  if (!departmentBasedStaffTypes.includes(staffType) || !department) {
    return { error: "This staff account is not assigned to a student department." };
  }

  return { user, faculty, department, department_id: department };
}

export function authorizeDepartmentAccess(getResourceDepartment) {
  return async (req, res, next) => {
    try {
      if (req.user?.role === "admin") return next();
      if (!departmentScopedRoles.includes(req.user?.role)) return res.status(403).json({ message: "Admin or faculty access required." });

      const scope = await getDepartmentScope(req);
      if (scope?.error) return res.status(403).json({ message: scope.error });

      const resourceDepartment = await getResourceDepartment(req);
      if (!resourceDepartment) return res.status(404).json({ message: "Resource not found." });
      if (resourceDepartment !== scope.department) {
        return res.status(403).json({ success: false, message: "Access Denied" });
      }

      req.departmentScope = scope;
      next();
    } catch (error) {
      next(error);
    }
  };
}
