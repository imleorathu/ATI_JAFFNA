import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Calendar,
  Download,
  Edit3,
  Eye,
  GraduationCap,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  X
} from "lucide-react";
import GlassCard from "../../components/GlassCard";
import AppModal from "../../components/AppModal.jsx";
import { apiFetch, downloadCsv } from "../../lib/api";
import { useModal } from "../../contexts/ModalContext.jsx";

const fallbackDepartments = [
  "Higher National Diploma in Accountancy - (HNDA)",
  "Higher National Diploma in English",
  "Higher National Diploma in Engineering - Civil",
  "Higher National Diploma in Engineering - Electrical",
  "Higher National Diploma in Management - (HNDM)",
  "Higher National Diploma in Information Technology - (HNDIT)",
  "Higher National Diploma in Quantity Surveying"
];
const staffTypes = ["Teaching Staff", "Administrative Staff", "Head of the department", "Director"];
const teachingStaffTypes = ["Teaching Staff", "Head of the department"];

const inputClass =
  "w-full rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none transition placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400 focus:ring-2 focus:ring-sky-400/10";
const selectClass =
  "w-full rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/10";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  department: fallbackDepartments[0],
  staffType: "Teaching Staff",
  coursesAssigned: 0,
  joinDate: "",
  office: "",
  bio: "",
  password: "",
  confirmPassword: ""
};

function initials(name) {
  return String(name || "F")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function isDepartmentBased(staffType) {
  return teachingStaffTypes.includes(staffType);
}

function departmentLabel(member) {
  return isDepartmentBased(member?.staffType) ? member?.department || "Not assigned" : "Not assigned";
}

function directoryGroupLabel(member) {
  const department = departmentLabel(member);
  return department === "Not assigned" ? "Administration / Non-department Staff" : department;
}

function Field({ label, children }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--md-text-secondary)]">{label}</span>
      {children}
    </label>
  );
}

export default function FacultyManagement() {
  const { confirm } = useModal();
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState(fallbackDepartments);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [sortBy, setSortBy] = useState("newest");
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadDepartments = async () => {
    try {
      const data = await apiFetch("/api/departments");
      const names = Array.isArray(data) ? data.map((department) => department.name).filter(Boolean) : [];
      if (names.length) setDepartments(names);
    } catch {
      setDepartments(fallbackDepartments);
    }
  };

  const loadFaculty = async () => {
    setLoading(true);
    setError("");
    try {
      setFaculty(await apiFetch("/api/faculty"));
    } catch (err) {
      setError(err?.message || "Unable to load faculty records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
    loadFaculty();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const items = faculty.filter((member) => {
      const matchesSearch =
        !query ||
        [member.fullName, member.email, member.phone, departmentLabel(member), member.staffType, member.office]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesDepartment =
        departmentFilter === "All Departments" ||
        (isDepartmentBased(member.staffType) && member.department === departmentFilter);
      const matchesType = typeFilter === "All Types" || member.staffType === typeFilter;
      return matchesSearch && matchesDepartment && matchesType;
    });

    return [...items].sort((a, b) => {
      if (sortBy === "name") return String(a.fullName).localeCompare(String(b.fullName));
      if (sortBy === "courses") return Number(b.coursesAssigned || 0) - Number(a.coursesAssigned || 0);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [departmentFilter, faculty, search, sortBy, typeFilter]);

  const stats = useMemo(
    () => ({
      total: faculty.length,
      teaching: faculty.filter((member) => teachingStaffTypes.includes(member.staffType)).length,
      admin: faculty.filter((member) => member.staffType === "Administrative Staff").length
    }),
    [faculty]
  );

  const departmentBreakdown = useMemo(
    () =>
      departments
        .map((department) => ({
          department,
          count: faculty.filter((member) => isDepartmentBased(member.staffType) && member.department === department).length
        }))
        .filter((item) => item.count > 0),
    [departments, faculty]
  );

  const groupedFaculty = useMemo(() => {
    const groups = filtered.reduce((acc, member) => {
      const group = directoryGroupLabel(member);
      if (!acc[group]) acc[group] = [];
      acc[group].push(member);
      return acc;
    }, {});

    return Object.entries(groups).sort(([a], [b]) => {
      if (a === "Administration / Non-department Staff") return 1;
      if (b === "Administration / Non-department Staff") return -1;
      return a.localeCompare(b);
    });
  }, [filtered]);

  const resetForm = () => {
    setForm({ ...initialForm, department: departments[0] || "" });
    setEditingId("");
    setShowForm(false);
  };

  const startEdit = (member) => {
    setForm({
      fullName: member.fullName || "",
      email: member.email || "",
      phone: member.phone || "",
      department: member.department || departments[0] || "",
      staffType: member.staffType || "Teaching Staff",
      coursesAssigned: member.coursesAssigned ?? 0,
      joinDate: member.joinDate ? String(member.joinDate).slice(0, 10) : "",
      office: member.office || "",
      bio: member.bio || "",
      password: "",
      confirmPassword: ""
    });
    setEditingId(member._id);
    setShowForm(true);
  };

  const saveFaculty = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if ((!editingId || form.password || form.confirmPassword) && form.password !== form.confirmPassword) {
        throw new Error("Password and confirm password do not match.");
      }

      const { password, confirmPassword, ...facultyFields } = form;
      const usesDepartment = isDepartmentBased(form.staffType);
      const payload = {
        ...facultyFields,
        department: usesDepartment ? form.department : "",
        coursesAssigned: Number(form.coursesAssigned || 0),
        joinDate: form.joinDate || undefined,
        ...(!editingId || password ? { password, confirmPassword } : {})
      };
      const saved = editingId
        ? await apiFetch(`/api/faculty/${editingId}`, { method: "PUT", body: JSON.stringify(payload) })
        : await apiFetch("/api/faculty", { method: "POST", body: JSON.stringify(payload) });

      setFaculty((current) => (editingId ? current.map((member) => (member._id === saved._id ? saved : member)) : [saved, ...current]));
      resetForm();
    } catch (err) {
      setError(err?.message || "Unable to save faculty member.");
    } finally {
      setSaving(false);
    }
  };

  const deleteFaculty = async (member) => {
    if (!await confirm({ title: "Delete faculty member?", message: `Delete ${member.fullName} and the linked login account?`, confirmLabel: "Delete faculty", tone: "danger" })) return;
    setError("");
    try {
      await apiFetch(`/api/faculty/${member._id}`, { method: "DELETE" });
      setFaculty((current) => current.filter((item) => item._id !== member._id));
      if (selectedFaculty?._id === member._id) setSelectedFaculty(null);
    } catch (err) {
      setError(err?.message || "Unable to delete faculty member.");
    }
  };

  const exportFaculty = () => {
    downloadCsv(
      "ati-faculty.csv",
      filtered.map((member) => ({
        name: member.fullName,
        email: member.email,
        phone: member.phone,
        department: departmentLabel(member),
        staffType: member.staffType,
        coursesAssigned: member.coursesAssigned,
        joinDate: member.joinDate ? String(member.joinDate).slice(0, 10) : "",
        office: member.office
      }))
    );
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-[color:var(--md-border)] pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--md-primary)]">Administration</p>
          <h1 className="portal-page-title">Faculty Management</h1>
          <p className="mt-1 max-w-2xl text-sm text-[color:var(--md-text-secondary)]">Maintain faculty accounts, programme assignments, contact details, and login access.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportFaculty}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 text-sm font-bold text-[color:var(--md-text-secondary)] transition hover:bg-[color:var(--md-hover)]"
          >
            <Download size={16} />
            Export
          </button>
          <button
            type="button"
            onClick={() => {
              setForm({ ...initialForm, department: departments[0] || "" });
              setEditingId("");
              setShowForm(true);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-500 px-3 text-sm font-black text-slate-950 transition hover:bg-sky-400"
          >
            <Plus size={16} />
            Add Staff
          </button>
        </div>
      </div>

      {error && <div className="portal-alert-danger">{error}</div>}

      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["Total Faculty", stats.total, GraduationCap, "text-[color:var(--md-text-primary)]"],
          ["Teaching Staff", stats.teaching, User, "text-[color:var(--md-success)]"],
          ["Admin Staff", stats.admin, Briefcase, "text-[color:var(--md-primary)]"]
        ].map(([label, value, Icon, color]) => (
          <GlassCard key={label} dark className="rounded-lg p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--md-text-secondary)]">{label}</p>
                <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--md-hover)]">
                <Icon className={color} size={20} />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {showForm && (
        <AppModal open={showForm} onClose={resetForm} size="lg" hideClose>
        <GlassCard className="m-0 rounded-lg p-5">
          <form onSubmit={saveFaculty} className="space-y-5">
            <div className="flex flex-col gap-3 border-b border-[color:var(--md-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="classroom-section-title">{editingId ? "Edit Faculty Member" : "Add Faculty Member"}</h2>
                <p className="portal-page-subtitle">{editingId ? "Update profile fields or set a new login password." : "Create a faculty profile with login access."}</p>
              </div>
              <button type="button" onClick={resetForm} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)] hover:text-[color:var(--md-text-primary)]" aria-label="Close form">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Field label="Full name">
                <input required value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} placeholder="Full name" className={inputClass} />
              </Field>
              <Field label="Email">
                <input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" className={inputClass} />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone number" className={inputClass} />
              </Field>
              <Field label="Staff type">
                <select value={form.staffType} onChange={(event) => setForm((current) => ({ ...current, staffType: event.target.value }))} className={selectClass}>
                  {staffTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </Field>
              {isDepartmentBased(form.staffType) && (
                <Field label="Department">
                  <select value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} className={selectClass}>
                    {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Join date">
                <input type="date" value={form.joinDate} onChange={(event) => setForm((current) => ({ ...current, joinDate: event.target.value }))} className={inputClass} />
              </Field>
              <Field label="Courses assigned">
                <input type="number" min="0" value={form.coursesAssigned} onChange={(event) => setForm((current) => ({ ...current, coursesAssigned: event.target.value }))} placeholder="0" className={inputClass} />
              </Field>
              <Field label="Office">
                <input value={form.office} onChange={(event) => setForm((current) => ({ ...current, office: event.target.value }))} placeholder="Office or room" className={inputClass} />
              </Field>
              <Field label={editingId ? "New password" : "Login password"}>
                <input required={!editingId} type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder={editingId ? "Optional" : "Login password"} autoComplete="new-password" className={inputClass} />
              </Field>
              <Field label="Confirm password">
                <input required={!editingId || Boolean(form.password)} type="password" value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} placeholder="Re-enter password" autoComplete="new-password" className={inputClass} />
              </Field>
              <label className="space-y-1.5 lg:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--md-text-secondary)]">Notes</span>
                <textarea value={form.bio} onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))} placeholder="Short profile notes" className={`${inputClass} min-h-24 resize-y`} />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-[color:var(--md-border)] pt-4">
              <button type="button" onClick={resetForm} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-4 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] transition hover:bg-[color:var(--md-hover)]">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-sky-400 disabled:opacity-60">
                {saving ? "Saving..." : editingId ? "Update Faculty" : "Create Faculty"}
              </button>
            </div>
          </form>
        </GlassCard>
        </AppModal>
      )}

      <GlassCard className="rounded-lg p-4">
        <div className="grid gap-3 xl:grid-cols-[1fr_220px_180px_160px] xl:items-center">
          <label className="flex h-10 items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3">
            <Search size={16} className="text-[color:var(--md-text-secondary)]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, department..." className="" style={{width:"100%"}} />
          </label>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className={selectClass}>
            <option>All Departments</option>
            {departments.map((department) => <option key={department}>{department}</option>)}
          </select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={selectClass}>
            <option>All Types</option>
            {staffTypes.map((type) => <option key={type}>{type}</option>)}
          </select>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className={selectClass}>
            <option value="newest">Newest</option>
            <option value="name">Name</option>
            <option value="courses">Courses</option>
          </select>
        </div>
      </GlassCard>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <GlassCard className="overflow-hidden rounded-lg p-0">
          <div className="flex items-center justify-between gap-3 border-b border-[color:var(--md-border)] px-5 py-4">
            <div>
              <h2 className="text-base font-black text-[color:var(--md-text-primary)]">Faculty Directory</h2>
              <p className="mt-1 text-xs font-semibold text-[color:var(--md-text-secondary)]">{filtered.length} visible records</p>
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-12 text-center text-sm font-semibold text-[color:var(--md-text-secondary)]">Loading faculty records...</div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <GraduationCap size={40} className="mx-auto text-[color:var(--md-text-secondary)]" />
              <p className="mt-3 font-bold text-[color:var(--md-text-primary)]">No faculty members found</p>
              <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">Adjust the filters or add a faculty member.</p>
            </div>
          ) : (
            <div className="divide-y divide-[color:var(--md-border)]">
              {groupedFaculty.map(([group, members]) => (
                <section key={group}>
                  <div className="flex flex-col gap-1 bg-[color:var(--md-hover)] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-black text-[color:var(--md-text-primary)]">{group}</h3>
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--md-text-secondary)]">{members.length} staff</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-[860px] w-full text-left">
                      <thead className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--md-text-secondary)]">
                        <tr>
                          <th className="px-5 py-3">Faculty</th>
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Courses</th>
                          <th className="px-4 py-3">Joined</th>
                          <th className="px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--md-border)]">
                        {members.map((member) => (
                          <tr key={member._id} className="transition hover:bg-[color:var(--md-hover)]">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-400/15 text-sm font-black text-[color:var(--md-primary)]">
                                  {initials(member.fullName)}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-[color:var(--md-text-primary)]">{member.fullName}</p>
                                  <p className="mt-1 truncate text-xs text-[color:var(--md-text-secondary)]">{member.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="max-w-[260px] px-4 py-4 text-sm font-semibold text-[color:var(--md-text-secondary)]">{departmentLabel(member)}</td>
                            <td className="px-4 py-4">
                              <span className="inline-flex rounded-lg bg-[color:var(--md-hover)] px-2.5 py-1 text-xs font-bold text-[color:var(--md-text-secondary)]">{member.staffType}</span>
                            </td>
                            <td className="px-4 py-4 text-sm font-bold text-[color:var(--md-text-secondary)]">{member.coursesAssigned || 0}</td>
                            <td className="px-4 py-4 text-sm text-[color:var(--md-text-secondary)]">{formatDate(member.joinDate)}</td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-1">
                                <button type="button" onClick={() => setSelectedFaculty(member)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--md-primary)] transition hover:bg-sky-500/10" aria-label={`View ${member.fullName}`}>
                                  <Eye size={16} />
                                </button>
                                <button type="button" onClick={() => startEdit(member)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--md-text-secondary)] transition hover:bg-[color:var(--md-hover)] hover:text-[color:var(--md-text-primary)]" aria-label={`Edit ${member.fullName}`}>
                                  <Edit3 size={16} />
                                </button>
                                <button type="button" onClick={() => deleteFaculty(member)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--md-danger)] transition hover:bg-red-500/10" aria-label={`Delete ${member.fullName}`}>
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard className="h-fit rounded-lg p-5">
          <h2 className="text-base font-black text-[color:var(--md-text-primary)]">Department Load</h2>
          <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">Faculty distribution by programme.</p>
          <div className="mt-5 space-y-4">
            {departmentBreakdown.length === 0 ? (
              <p className="text-sm text-[color:var(--md-text-secondary)]">No department data yet.</p>
            ) : (
              departmentBreakdown.map((item) => (
                <div key={item.department} className="space-y-2">
                  <div className="flex items-start justify-between gap-3 text-xs">
                    <span className="font-bold leading-5 text-[color:var(--md-text-secondary)]">{item.department}</span>
                    <span className="shrink-0 rounded-lg bg-[color:var(--md-hover)] px-2 py-0.5 font-black text-[color:var(--md-text-secondary)]">{item.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[color:var(--md-hover)]">
                    <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.max(8, (item.count / Math.max(1, stats.total)) * 100)}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {selectedFaculty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <GlassCard className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg p-0">
            <div className="flex items-start justify-between gap-4 border-b border-[color:var(--md-border)] px-6 py-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--md-primary)]">Faculty profile</p>
                <h2 className="mt-2 truncate text-2xl font-black text-[color:var(--md-text-primary)]">{selectedFaculty.fullName}</h2>
                <p className="portal-page-subtitle">{departmentLabel(selectedFaculty)}</p>
              </div>
              <button type="button" onClick={() => setSelectedFaculty(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)] hover:text-[color:var(--md-text-primary)]" aria-label="Close profile">
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Email", selectedFaculty.email, Mail],
                  ["Phone", selectedFaculty.phone || "No phone", Phone],
                  ["Department", departmentLabel(selectedFaculty), Briefcase],
                  ["Staff type", selectedFaculty.staffType, User],
                  ["Join date", formatDate(selectedFaculty.joinDate), Calendar],
                  ["Courses", selectedFaculty.coursesAssigned || 0, GraduationCap],
                  ["Office", selectedFaculty.office || "Not set", Briefcase]
                ].map(([label, value, Icon]) => (
                  <div key={label} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-3">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--md-text-secondary)]"><Icon size={14} />{label}</p>
                    <p className="mt-2 text-sm font-semibold text-[color:var(--md-text-primary)]">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-3">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[color:var(--md-text-secondary)]">Notes</p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--md-text-secondary)]">{selectedFaculty.bio || "No profile notes added."}</p>
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-[color:var(--md-border)] pt-4">
                <button type="button" onClick={() => startEdit(selectedFaculty)} className="rounded-lg bg-[color:var(--md-hover)] px-4 py-2 text-sm font-bold text-[color:var(--md-text-primary)] transition hover:bg-[color:var(--md-hover)]">Edit</button>
                <button type="button" onClick={() => deleteFaculty(selectedFaculty)} className="rounded-lg bg-red-500/15 px-4 py-2 text-sm font-bold text-[color:var(--md-danger)] transition hover:bg-red-500/25">Delete</button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </section>
  );
}
