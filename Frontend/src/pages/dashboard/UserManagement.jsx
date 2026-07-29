import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, KeyRound, Mail, Pencil, Save, Search, ShieldCheck, Trash2, UserCog, X, XCircle } from "lucide-react";
import GlassCard from "../../components/GlassCard";
import { apiFetch, downloadCsv } from "../../lib/api";
import { useModal } from "../../contexts/ModalContext.jsx";

const roles = ["student", "alumni", "lecturer", "department_staff", "finance_officer", "admin"];
const statuses = ["pending", "approved", "rejected"];

const statusStyles = {
  pending: "bg-amber-500/15 text-[color:var(--md-warning)]",
  approved: "bg-emerald-500/15 text-[color:var(--md-success)]",
  rejected: "bg-red-500/15 text-[color:var(--md-danger)]"
};

const roleLabels = {
  student: "Student",
  alumni: "Alumni",
  lecturer: "Lecturer",
  department_staff: "Department Staff",
  finance_officer: "Finance Officer",
  admin: "Admin"
};

const fallbackDepartments = [
  "Higher National Diploma in Accountancy - (HNDA)",
  "Higher National Diploma in English",
  "Higher National Diploma in Engineering - Civil",
  "Higher National Diploma in Engineering - Electrical",
  "Higher National Diploma in Management - (HNDM)",
  "Higher National Diploma in Information Technology - (HNDIT)",
  "Higher National Diploma in Quantity Surveying"
];

function userDepartment(user) {
  return user.studentProfile?.department || user.studentProfile?.program || user.alumniProfile?.department || user.staffProfile?.department || user.facultyProfile?.department || user.adminProfile?.department || "";
}

export default function UserManagement() {
  const { confirm } = useModal();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", department: "", password: "", confirmPassword: "" });
  const [departments, setDepartments] = useState(fallbackDepartments);

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      setUsers(await apiFetch("/api/users"));
    } catch (err) {
      setError(err?.message || "Unable to load user accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const records = await apiFetch("/api/departments");
        const names = Array.isArray(records) ? records.map((department) => department.name).filter(Boolean) : [];
        if (names.length) setDepartments(names);
      } catch {
        setDepartments(fallbackDepartments);
      }
    };

    loadDepartments();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [
        user.name,
        user.email,
        user.role,
        user.accountStatus,
        userDepartment(user),
        user.studentProfile?.program,
        user.studentProfile?.studentId
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [search, users]);

  const stats = useMemo(
    () => ({
      total: users.length,
      pending: users.filter((user) => (user.accountStatus || "approved") === "pending").length,
      approved: users.filter((user) => (user.accountStatus || "approved") === "approved").length,
      admins: users.filter((user) => user.role === "admin").length
    }),
    [users]
  );

  const updateUser = async (user, patch) => {
    setSavingId(user._id);
    setError("");
    setStatus("");
    try {
      const saved = await apiFetch(`/api/users/${user._id}`, {
        method: "PUT",
        body: JSON.stringify(patch)
      });
      setUsers((current) => current.map((item) => (item._id === saved._id ? saved : item)));
      return saved;
    } catch (err) {
      setError(err?.message || "Unable to update account.");
      return null;
    } finally {
      setSavingId("");
    }
  };

  const openEdit = (user) => {
    setError("");
    setStatus("");
    setEditingUser(user);
    setEditForm({ name: user.name || "", email: user.email || "", department: userDepartment(user), password: "", confirmPassword: "" });
  };

  const profilePatch = (user, department) => {
    if (user.role === "student") {
      return {
        studentProfile: {
          ...(user.studentProfile || {}),
          department,
          program: user.studentProfile?.program || department
        }
      };
    }

    if (user.role === "lecturer") {
      return {
        staffProfile: {
          ...(user.staffProfile || user.facultyProfile || {}),
          department
        }
      };
    }

    if (user.role === "alumni") {
      return {
        alumniProfile: {
          ...(user.alumniProfile || {}),
          department
        }
      };
    }

    if (user.role === "admin") {
      return {
        adminProfile: {
          ...(user.adminProfile || {}),
          department
        }
      };
    }

    return {};
  };

  const saveAccountDetails = async (event) => {
    event.preventDefault();
    if (!editingUser) return;
    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    const patch = {
      name: editForm.name,
      email: editForm.email,
      ...profilePatch(editingUser, editForm.department)
    };
    if (editForm.password) {
      patch.password = editForm.password;
      patch.confirmPassword = editForm.confirmPassword;
    }

    const saved = await updateUser(editingUser, patch);
    if (saved) {
      setEditingUser(null);
      setEditForm({ name: "", email: "", department: "", password: "", confirmPassword: "" });
      setStatus(`${saved.name || saved.email} updated successfully.`);
    }
  };

  const deleteUser = async (user) => {
    if (!await confirm({ title: "Delete login account?", message: `Delete the login account for ${user.name || user.email}?`, confirmLabel: "Delete account", tone: "danger" })) return;
    setSavingId(user._id);
    setError("");
    try {
      await apiFetch(`/api/users/${user._id}`, { method: "DELETE" });
      setUsers((current) => current.filter((item) => item._id !== user._id));
    } catch (err) {
      setError(err?.message || "Unable to delete account.");
    } finally {
      setSavingId("");
    }
  };

  const exportUsers = () => {
    downloadCsv(
      "ati-user-accounts.csv",
      filteredUsers.map((user) => ({
        name: user.name,
        email: user.email,
        role: roleLabels[user.role] || user.role,
        status: user.accountStatus || "approved",
        department: userDepartment(user),
        studentId: user.studentProfile?.studentId,
        registeredAt: user.createdAt
      }))
    );
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between" style={{borderBottom:"1px solid var(--md-border)"}}>
        <div>
          <p className="portal-page-label">Admin</p>
          <h1 className="portal-page-title">User Approvals</h1>
          <p className="portal-page-subtitle">Approve registrations and assign Student, Lecturer, or Admin roles.</p>
        </div>
        <button
          type="button"
          onClick={exportUsers}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] transition hover:bg-[color:var(--md-hover)]"
        >
          <ShieldCheck size={16} />
          Export
        </button>
      </div>

      {error && <div className="portal-alert-danger">{error}</div>}
      {status && <div className="portal-alert-success">{status}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Accounts", stats.total, UserCog, "text-[color:var(--md-text-primary)]"],
          ["Waiting Approval", stats.pending, Clock3, "text-[color:var(--md-warning)]"],
          ["Approved", stats.approved, CheckCircle2, "text-[color:var(--md-success)]"],
          ["Admins", stats.admins, ShieldCheck, "text-[color:var(--md-primary)]"]
        ].map(([label, value, Icon, color]) => (
          <GlassCard key={label} dark className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="portal-stat-label">{label}</p>
                <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
              </div>
              <Icon className={color} size={24} />
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="classroom-section-title">Registered Accounts</h2>
          <label className="portal-search">
            <Search size={16} className="text-[color:var(--md-text-secondary)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search accounts"
              className="w-full bg-transparent text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] sm:w-72"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="" style={{borderBottom:"1px solid var(--md-border)"}}>
                <th className="pb-3">Account</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Approval</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[color:var(--md-text-secondary)]">Loading accounts...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[color:var(--md-text-secondary)]">No accounts found.</td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const status = user.accountStatus || "approved";
                  return (
                    <tr key={user._id} className="border-b border-[color:var(--md-border)] last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-semibold" style={{color:"var(--md-text-primary)"}}>{user.name}</p>
                        <p className="mt-1 flex items-center gap-2 text-xs text-[color:var(--md-text-secondary)]">
                          <Mail size={13} />
                          {user.email}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-[color:var(--md-text-secondary)]">{userDepartment(user) || "Not assigned"}</p>
                        <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">{user.studentProfile?.studentId || user._id}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          value={user.role || "student"}
                          disabled={savingId === user._id || user.role === "alumni"}
                          onChange={(event) => updateUser(user, { role: event.target.value })}
                          className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2 text-sm font-bold text-[color:var(--md-text-primary)] outline-none focus:border-sky-400"
                        >
                          {roles.filter((role) => role !== "alumni" || user.role === "alumni").map((role) => (
                            <option key={role} value={role}>{roleLabels[role]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          value={status}
                          disabled={savingId === user._id}
                          onChange={(event) => updateUser(user, { accountStatus: event.target.value })}
                          className={`rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2 text-sm font-bold capitalize outline-none focus:border-sky-400 ${statusStyles[status] || statusStyles.pending}`}
                        >
                          {statuses.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            title="Edit email and password"
                            disabled={savingId === user._id}
                            onClick={() => openEdit(user)}
                            className="rounded-lg bg-sky-500/10 p-2 text-[color:var(--md-primary)] transition hover:bg-sky-500/20 disabled:opacity-50"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            title="Approve"
                            disabled={savingId === user._id}
                            onClick={() => updateUser(user, { accountStatus: "approved" })}
                            className="rounded-lg bg-emerald-500/10 p-2 text-[color:var(--md-success)] transition hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            type="button"
                            title="Reject"
                            disabled={savingId === user._id}
                            onClick={() => updateUser(user, { accountStatus: "rejected" })}
                            className="rounded-lg bg-amber-500/10 p-2 text-[color:var(--md-warning)] transition hover:bg-amber-500/20 disabled:opacity-50"
                          >
                            <XCircle size={16} />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            disabled={savingId === user._id}
                            onClick={() => deleteUser(user)}
                            className="rounded-lg bg-red-500/10 p-2 text-[color:var(--md-danger)] transition hover:bg-red-500/20 disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--md-bg)]/80 px-4 py-6 backdrop-blur-sm">
          <GlassCard className="w-full max-w-lg p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[color:var(--md-primary)]">Edit Account</p>
                <h2 className="mt-2 text-xl font-black text-[color:var(--md-text-primary)]">{roleLabels[editingUser.role] || "User"} credentials</h2>
                <p className="portal-page-subtitle">Update account details, department, and password.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg bg-[color:var(--md-hover)] p-2 text-[color:var(--md-text-secondary)] transition hover:bg-[color:var(--md-hover)]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveAccountDetails} className="space-y-4">
              <label className="block text-sm font-bold text-[color:var(--md-text-secondary)]">
                Name
                <input
                  value={editForm.name}
                  onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                  required
                  className="mt-2 w-full portal-input"
                />
              </label>

              <label className="block text-sm font-bold text-[color:var(--md-text-secondary)]">
                Gmail / email
                <span className="mt-2 flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 focus-within:border-sky-400">
                  <Mail size={16} className="text-[color:var(--md-text-secondary)]" />
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                    required
                    className="min-w-0 flex-1 bg-transparent text-sm text-[color:var(--md-text-primary)] outline-none"
                  />
                </span>
              </label>

              <label className="block text-sm font-bold text-[color:var(--md-text-secondary)]">
                Department
                <select
                  value={editForm.department}
                  onChange={(event) => setEditForm((current) => ({ ...current, department: event.target.value }))}
                  required={editingUser?.role !== "admin"}
                  className="mt-2 w-full portal-input"
                >
                  <option value="">{editingUser?.role === "admin" ? "Not assigned" : "Select department"}</option>
                  {departments.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-bold text-[color:var(--md-text-secondary)]">
                  New password
                  <span className="mt-2 flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 focus-within:border-sky-400">
                    <KeyRound size={16} className="text-[color:var(--md-text-secondary)]" />
                    <input
                      type="password"
                      value={editForm.password}
                      onChange={(event) => setEditForm((current) => ({ ...current, password: event.target.value }))}
                      minLength={8}
                      placeholder="Leave blank to keep"
                      className="min-w-0 flex-1 bg-transparent text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)]"
                    />
                  </span>
                </label>

                <label className="block text-sm font-bold text-[color:var(--md-text-secondary)]">
                  Confirm password
                  <input
                    type="password"
                    value={editForm.confirmPassword}
                    onChange={(event) => setEditForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                    minLength={editForm.password ? 8 : undefined}
                    placeholder="Confirm new password"
                    className="mt-2 w-full rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2.5 text-sm text-[color:var(--md-text-primary)] outline-none placeholder:text-[color:var(--md-text-secondary)] focus:border-sky-400"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-[color:var(--md-border)] pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-4 py-2 text-sm font-bold text-[color:var(--md-text-secondary)] transition hover:bg-[color:var(--md-hover)]"
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingId === editingUser._id}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-sky-400 disabled:opacity-60"
                >
                  <Save size={16} />
                  {savingId === editingUser._id ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </section>
  );
}
