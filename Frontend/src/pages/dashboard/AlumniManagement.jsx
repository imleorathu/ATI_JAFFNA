import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  Search,
  UserRound,
  XCircle,
} from "lucide-react";
import GlassCard from "../../components/GlassCard.jsx";
import AppModal from "../../components/AppModal.jsx";
import { apiFetch, downloadAuthenticatedFile } from "../../lib/api.js";

const badge = {
  pending: "bg-amber-500/15 text-[color:var(--md-warning)]",
  approved: "bg-emerald-500/15 text-[color:var(--md-success)]",
  rejected: "bg-red-500/15 text-[color:var(--md-danger)]",
};
export default function AlumniManagement() {
  const [records, setRecords] = useState([]),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [academicYearFilter, setAcademicYearFilter] = useState("all"),
    [departmentFilter, setDepartmentFilter] = useState("all"),
    [selected, setSelected] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = () => {
    setLoading(true);
    apiFetch("/api/alumni")
      .then(setRecords)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);
  const academicYears = useMemo(
    () =>
      Array.from(
        new Set(records.map((r) => r.admissionAcademicYear).filter(Boolean)),
      ).sort(),
    [records],
  );
  const departments = useMemo(
    () =>
      Array.from(
        new Set(records.map((r) => r.department).filter(Boolean)),
      ).sort(),
    [records],
  );
  const filtered = useMemo(
    () =>
      records.filter(
        (r) =>
          (filter === "all" || r.accountStatus === filter) &&
          (academicYearFilter === "all" ||
            r.admissionAcademicYear === academicYearFilter) &&
          (departmentFilter === "all" || r.department === departmentFilter) &&
          (!search ||
            [
              r.fullName,
              r.email,
              r.studentRegistrationNumber,
              r.department,
              r.programme,
              r.admissionAcademicYear,
              r.batch,
              r.graduationYear,
            ].some((v) =>
              String(v || "")
                .toLowerCase()
                .includes(search.toLowerCase()),
            )),
      ),
    [records, search, filter, academicYearFilter, departmentFilter],
  );
  const grouped = useMemo(() => {
    const groups = new Map();
    filtered.forEach((record) => {
      const year = record.admissionAcademicYear || "Academic year not recorded";
      const department = record.department || "Department not recorded";
      const key = `${year}|||${department}`;
      if (!groups.has(key)) groups.set(key, { year, department, records: [] });
      groups.get(key).records.push(record);
    });
    return Array.from(groups.values()).sort(
      (a, b) =>
        a.year.localeCompare(b.year) ||
        a.department.localeCompare(b.department),
    );
  }, [filtered]);
  const update = async (record, accountStatus) => {
    try {
      const saved = await apiFetch(`/api/alumni/${record._id}/status`, {
        method: "PUT",
        body: JSON.stringify({ accountStatus }),
      });
      setRecords((c) => c.map((x) => (x._id === saved._id ? saved : x)));
      setSelected((c) => (c ? saved : null));
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <section className="space-y-6">
      <div
        className="pb-5"
        style={{ borderBottom: "1px solid var(--md-border)" }}
      >
        <p className="portal-page-label">Admin</p>
        <h1 className="portal-page-title">Alumni Management</h1>
        <p className="portal-page-subtitle">
          Review alumni evidence and approve or reject portal access.
        </p>
      </div>
      {error && <div className="portal-alert-danger">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Total", records.length],
          [
            "Pending",
            records.filter((x) => x.accountStatus === "pending").length,
          ],
          [
            "Approved",
            records.filter((x) => x.accountStatus === "approved").length,
          ],
        ].map(([l, v]) => (
          <GlassCard key={l} className="p-5">
            <p className="portal-stat-label">{l}</p>
            <p className="portal-stat-value">{v}</p>
          </GlassCard>
        ))}
      </div>
      <GlassCard className="p-5">
        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="portal-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, year, or department"
              className="w-full bg-transparent outline-none"
            />
          </label>
          <select
            className="portal-input"
            value={academicYearFilter}
            onChange={(e) => setAcademicYearFilter(e.target.value)}
          >
            <option value="all">All academic years</option>
            {academicYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            className="portal-input"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="all">All departments</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          <select
            className="portal-input"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--md-border)" }}>
                <th className="pb-3">Alumni</th>
                <th className="pb-3">Academic</th>
                <th className="pb-3">Employment</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center">
                    Loading...
                  </td>
                </tr>
              ) : grouped.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="py-10 text-center text-[color:var(--md-text-secondary)]"
                  >
                    No alumni records found.
                  </td>
                </tr>
              ) : (
                grouped.flatMap((group) => [
                  <tr key={`group-${group.year}-${group.department}`}>
                    <td
                      colSpan="5"
                      className="bg-[color:var(--md-hover)] px-3 py-2 font-black text-[color:var(--md-primary)]"
                    >
                      Academic Year: {group.year}{" "}
                      <span className="px-2 text-[color:var(--md-text-secondary)]">
                        •
                      </span>{" "}
                      Department: {group.department}{" "}
                      <span className="ml-2 text-xs text-[color:var(--md-text-secondary)]">
                        ({group.records.length})
                      </span>
                    </td>
                  </tr>,
                  ...group.records.map((r) => (
                    <tr
                      key={r._id}
                      className="border-b border-[color:var(--md-border)]"
                    >
                      <td className="py-3">
                        <b>{r.fullName}</b>
                        <p className="text-xs text-[color:var(--md-text-secondary)]">
                          {r.email}
                          <br />
                          {r.studentRegistrationNumber}
                        </p>
                      </td>
                      <td>
                        {r.programme}
                        <p className="text-xs text-[color:var(--md-text-secondary)]">
                          Admission: {r.admissionAcademicYear || "Not recorded"}{" "}
                          · {r.batch} · Graduated {r.graduationYear}
                        </p>
                      </td>
                      <td>
                        {r.employmentStatus}
                        <p className="text-xs text-[color:var(--md-text-secondary)]">
                          {r.jobTitle || ""}{" "}
                          {r.companyName ? `· ${r.companyName}` : ""}
                        </p>
                      </td>
                      <td>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${badge[r.accountStatus]}`}
                        >
                          {r.accountStatus}
                        </span>
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <button
                            className="portal-btn"
                            onClick={() => setSelected(r)}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            className="portal-btn"
                            title="Approve"
                            onClick={() => update(r, "approved")}
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            className="portal-btn-danger"
                            title="Reject"
                            onClick={() => update(r, "rejected")}
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )),
                ])
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
      <AppModal open={!!selected} onClose={() => setSelected(null)} size="lg">
        <div className="p-6">
          <h2 className="text-xl font-black">{selected?.fullName}</h2>
          <p className="portal-page-subtitle">
            {selected?.nameWithInitials} · {selected?.studentRegistrationNumber}
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {selected &&
              Object.entries({
                "NIC / Passport": selected.identityNumber,
                "Date of birth": new Date(
                  selected.dateOfBirth,
                ).toLocaleDateString(),
                Gender: selected.gender,
                Mobile: selected.mobileNumber,
                Address: selected.currentAddress,
                Department: selected.department,
                Programme: selected.programme,
                Batch: selected.batch,
                "Admission year": selected.admissionAcademicYear,
                "Graduation year": selected.graduationYear,
                "Final study year": selected.finalStudyYear,
                "Employment status": selected.employmentStatus,
                Company: selected.companyName,
                "Job title": selected.jobTitle,
                Industry: selected.industry,
              }).map(([k, v]) => (
                <div
                  key={k}
                  className="rounded-lg bg-[color:var(--md-hover)] p-3"
                >
                  <p className="text-xs font-bold text-[color:var(--md-text-secondary)]">
                    {k}
                  </p>
                  <p className="mt-1">{v || "Not provided"}</p>
                </div>
              ))}
          </div>
          <h3 className="alumni-form-title mt-5">Interests</h3>
          <p>{selected?.interests?.join(", ") || "None selected"}</p>
          <h3 className="alumni-form-title mt-5">Supporting Documents</h3>
          <div className="flex flex-wrap gap-2">
            {selected?.supportingDocuments?.length ? (
              selected.supportingDocuments.map((doc) => (
                <button
                  key={doc.storedName}
                  className="portal-btn"
                  onClick={() =>
                    downloadAuthenticatedFile(
                      `/api/alumni/${selected._id}/documents/${encodeURIComponent(doc.storedName)}`,
                      doc.originalName,
                    )
                  }
                >
                  <Download size={15} />
                  {doc.documentType}
                </button>
              ))
            ) : (
              <p>No documents uploaded.</p>
            )}
          </div>
          <div className="mt-6 flex gap-3">
            <button
              className="portal-btn-primary"
              onClick={() => update(selected, "approved")}
            >
              <CheckCircle2 size={16} />
              Approve
            </button>
            <button
              className="portal-btn-danger"
              onClick={() => update(selected, "rejected")}
            >
              <XCircle size={16} />
              Reject
            </button>
          </div>
        </div>
      </AppModal>
    </section>
  );
}
