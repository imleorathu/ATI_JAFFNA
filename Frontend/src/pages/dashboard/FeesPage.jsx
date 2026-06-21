import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  Bell,
  CheckCircle,
  CreditCard,
  Download,
  FileText,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
  Wallet
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { feesApi, downloadFeeFile } from "../../lib/feesApi";
import { apiFetch, downloadCsv } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

const currency = (value) => `LKR ${Number(value || 0).toLocaleString()}`;
const today = new Date().toISOString().slice(0, 10);

const tabs = [
  ["records", "Fee Records"],
  ["structures", "Structures"],
  ["payments", "Payments"],
  ["invoices", "Invoices"],
  ["outstanding", "Outstanding"],
  ["receipts", "Receipts"],
  ["refunds", "Refunds"],
  ["notifications", "Notifications"],
  ["requests", "Requests"],
  ["reports", "Reports"]
];

function roleInfo(user) {
  const role = String(user?.role || "student").toLowerCase();
  const normalized = role === "lecturer" ? "department_staff" : role;
  return {
    role: normalized,
    isAdmin: normalized === "admin",
    isFinance: normalized === "finance_officer",
    isDepartmentStaff: normalized === "department_staff",
    isStudent: normalized === "student",
    departmentId: user?.department_id || user?.staffProfile?.department || user?.studentProfile?.department || ""
  };
}

function StatusPill({ status }) {
  const palette = {
    paid: "bg-emerald-500/10 text-emerald-600",
    validated: "bg-emerald-500/10 text-emerald-600",
    approved: "bg-emerald-500/10 text-emerald-600",
    partial: "bg-amber-500/10 text-amber-600",
    pending: "bg-amber-500/10 text-amber-600",
    requested: "bg-amber-500/10 text-amber-600",
    unpaid: "bg-rose-500/10 text-rose-600",
    overdue: "bg-rose-500/10 text-rose-600",
    rejected: "bg-rose-500/10 text-rose-600"
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${palette[status] || "bg-slate-500/10 text-slate-600"}`}>{status || "draft"}</span>;
}

function MetricCard({ label, value, icon: Icon, tone = "text-[color:var(--md-primary)]" }) {
  return (
    <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--md-text-secondary)]">{label}</p>
          <p className="mt-2 text-xl font-black text-[color:var(--md-text-primary)]">{value}</p>
        </div>
        <Icon className={tone} size={22} />
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[color:var(--md-text-secondary)]">{label}</span>
      {children}
    </label>
  );
}

function Input(props) {
  return <input {...props} className={`w-full rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2 text-sm text-[color:var(--md-text-primary)] outline-none focus:border-[color:var(--md-primary)] ${props.className || ""}`} />;
}

function Select(props) {
  return <select {...props} className={`w-full rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-2 text-sm text-[color:var(--md-text-primary)] outline-none focus:border-[color:var(--md-primary)] ${props.className || ""}`} />;
}

function PrimaryButton(props) {
  return (
    <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[color:var(--md-primary)] px-4 py-2 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${props.className || ""}`}>
      {props.children}
    </button>
  );
}

function SecondaryButton(props) {
  return (
    <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-lg border border-[color:var(--md-border)] px-4 py-2 text-sm font-bold text-[color:var(--md-text-primary)] transition hover:bg-[color:var(--md-hover)] disabled:cursor-not-allowed disabled:opacity-60 ${props.className || ""}`}>
      {props.children}
    </button>
  );
}

export default function FeesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const access = roleInfo(user);
  const [tab, setTab] = useState("records");
  const [filters, setFilters] = useState({
    search: "",
    departmentId: access.isDepartmentStaff ? access.departmentId : "",
    semester: "",
    status: ""
  });
  const [message, setMessage] = useState("");

  const queryParams = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
    [filters]
  );

  const dashboard = useQuery({ queryKey: ["fees-dashboard", queryParams], queryFn: () => feesApi.dashboard(queryParams) });
  const departments = useQuery({ queryKey: ["departments"], queryFn: () => apiFetch("/api/departments") });
  const records = useQuery({ queryKey: ["student-fees", queryParams], queryFn: () => feesApi.studentFees(queryParams) });
  const categories = useQuery({ queryKey: ["fee-categories"], queryFn: feesApi.categories });
  const structures = useQuery({ queryKey: ["fee-structures", queryParams], queryFn: () => feesApi.structures(queryParams), enabled: tab === "structures" });
  const payments = useQuery({ queryKey: ["fee-payments", queryParams], queryFn: () => feesApi.payments(queryParams), enabled: access.isStudent || tab === "payments" || tab === "refunds" });
  const invoices = useQuery({ queryKey: ["fee-invoices", queryParams], queryFn: () => feesApi.invoices(queryParams), enabled: access.isStudent || tab === "invoices" });
  const receipts = useQuery({ queryKey: ["fee-receipts", queryParams], queryFn: () => feesApi.receipts(queryParams), enabled: access.isStudent || tab === "receipts" });
  const outstanding = useQuery({ queryKey: ["fee-outstanding", queryParams], queryFn: () => feesApi.outstanding(queryParams), enabled: tab === "outstanding" });
  const refunds = useQuery({ queryKey: ["fee-refunds", queryParams], queryFn: () => feesApi.refunds(queryParams), enabled: access.isStudent || tab === "refunds" });
  const notifications = useQuery({ queryKey: ["fee-notifications", queryParams], queryFn: () => feesApi.notifications(queryParams), enabled: access.isStudent || tab === "notifications" });
  const serviceRequests = useQuery({ queryKey: ["fee-service-requests", queryParams], queryFn: () => feesApi.serviceRequests(queryParams), enabled: access.isStudent || tab === "requests" });

  const refreshAll = () => {
    queryClient.invalidateQueries();
    setMessage("Fee data refreshed.");
  };

  const createFee = useMutation({
    mutationFn: feesApi.createStudentFee,
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      setMessage(data?.message || "Department semester fee created.");
    },
    onError: (error) => setMessage(error.message)
  });
  const recordPayment = useMutation({
    mutationFn: feesApi.recordPayment,
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      window.dispatchEvent(new CustomEvent("ati-student-payment-updated", {
        detail: {
          studentId: data?.payment?.student,
          paymentStatus: data?.studentPaymentStatus
        }
      }));
      setMessage("Payment recorded and receipt generated.");
    },
    onError: (error) => setMessage(error.message)
  });
  const createStructure = useMutation({
    mutationFn: feesApi.createStructure,
    onSuccess: () => {
      queryClient.invalidateQueries();
      setMessage("Fee structure saved.");
    },
    onError: (error) => setMessage(error.message)
  });
  const generateInvoice = useMutation({
    mutationFn: feesApi.generateInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries();
      setMessage("Invoice generated.");
    },
    onError: (error) => setMessage(error.message)
  });
  const submitRefund = useMutation({
    mutationFn: feesApi.submitRefund,
    onSuccess: () => {
      queryClient.invalidateQueries();
      setMessage("Refund request submitted.");
    },
    onError: (error) => setMessage(error.message)
  });
  const reviewRefund = useMutation({
    mutationFn: ({ id, action }) => feesApi.reviewRefund(id, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setMessage("Refund workflow updated.");
    },
    onError: (error) => setMessage(error.message)
  });
  const notify = useMutation({
    mutationFn: feesApi.createNotification,
    onSuccess: () => {
      queryClient.invalidateQueries();
      setMessage("Notification queued.");
    },
    onError: (error) => setMessage(error.message)
  });
  const createServiceRequest = useMutation({
    mutationFn: feesApi.createServiceRequest,
    onSuccess: () => {
      queryClient.invalidateQueries();
      setMessage("Request submitted for admin review.");
    },
    onError: (error) => setMessage(error.message)
  });
  const reviewServiceRequest = useMutation({
    mutationFn: ({ id, status }) => feesApi.reviewServiceRequest(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setMessage("Student fee request updated.");
    },
    onError: (error) => setMessage(error.message)
  });

  const widgets = dashboard.data?.widgets || {};
  const chartColors = ["#0d6efd", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];
  const feeRows = records.data?.data || [];
  const departmentOptions = Array.isArray(departments.data) ? departments.data : departments.data?.data || [];

  const handleFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const firstFee = feeRows.find((fee) => fee.status !== "paid") || feeRows[0];
  const firstPayment = payments.data?.data?.[0];

  const canManageFees = access.isAdmin || access.isFinance || access.isDepartmentStaff;
  const canManageMoney = access.isAdmin || access.isFinance;

  if (access.isStudent) {
    return (
      <StudentFeesPortal
        dashboard={dashboard}
        feeRows={feeRows}
        payments={payments}
        invoices={invoices}
        receipts={receipts}
        refunds={refunds}
        notifications={notifications}
        serviceRequests={serviceRequests}
        recordPayment={recordPayment}
        createServiceRequest={createServiceRequest}
        message={message}
        setMessage={setMessage}
        refreshAll={refreshAll}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[color:var(--md-border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="portal-page-label">Part-Time Fees</p>
          <h1 className="mt-2 text-2xl font-black text-[color:var(--md-text-primary)] sm:text-3xl">Fees Management</h1>
          <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">
            Backend-enforced access: {access.isDepartmentStaff ? `department scope ${access.departmentId}` : access.isStudent ? "own student records only" : "institution-wide finance scope"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={refreshAll}><RefreshCw size={16} /> Refresh</SecondaryButton>
          <SecondaryButton onClick={() => downloadCsv("fee-records.csv", feeRows)}><Download size={16} /> CSV</SecondaryButton>
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-4 py-3 text-sm text-[color:var(--md-text-primary)]">
          <ShieldCheck size={16} className="text-[color:var(--md-primary)]" />
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Collected" value={currency(widgets.totalCollected)} icon={Banknote} tone="text-emerald-600" />
        <MetricCard label="Outstanding" value={currency(widgets.totalOutstanding)} icon={AlertTriangle} tone="text-rose-600" />
        <MetricCard label="Paid Students" value={widgets.paidStudents || 0} icon={CheckCircle} tone="text-emerald-600" />
        <MetricCard label="Unpaid Students" value={widgets.unpaidStudents || 0} icon={Wallet} tone="text-amber-600" />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4 xl:col-span-3">
          <h2 className="text-sm font-black text-[color:var(--md-text-primary)]">Monthly Revenue</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboard.data?.monthlyRevenue || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--md-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => currency(value)} />
                <Bar dataKey="amount" fill="#0d6efd" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4 xl:col-span-2">
          <h2 className="text-sm font-black text-[color:var(--md-text-primary)]">Department Revenue</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dashboard.data?.departmentRevenue || []} dataKey="amount" nameKey="department" innerRadius={55} outerRadius={88}>
                  {(dashboard.data?.departmentRevenue || []).map((entry, index) => <Cell key={entry.department} fill={chartColors[index % chartColors.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => currency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-[color:var(--md-border)] pb-2">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold ${tab === id ? "bg-[color:var(--md-primary)] text-white" : "text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4 md:grid-cols-4">
        <Field label="Search">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-[color:var(--md-text-secondary)]" size={16} />
            <Input value={filters.search} onChange={(event) => handleFilter("search", event.target.value)} placeholder="Student ID or name" className="pl-9" />
          </div>
        </Field>
        <Field label="Department">
          <Select value={filters.departmentId} disabled={access.isDepartmentStaff} onChange={(event) => handleFilter("departmentId", event.target.value)}>
            <option value="">{departments.isLoading ? "Loading departments..." : "All departments"}</option>
            {access.isDepartmentStaff && access.departmentId && <option value={access.departmentId}>{access.departmentId}</option>}
            {departmentOptions.map((department) => (
              <option key={department._id || department.name} value={department.name}>
                {department.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Semester">
          <Input value={filters.semester} onChange={(event) => handleFilter("semester", event.target.value)} placeholder="Semester 1" />
        </Field>
        <Field label="Payment Status">
          <Select value={filters.status} onChange={(event) => handleFilter("status", event.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </Select>
        </Field>
      </div>

      {tab === "records" && (
        <div className="grid gap-5 xl:grid-cols-3">
          <DataTable
            className="xl:col-span-2"
            title="Department Semester Fee Records"
            icon={Wallet}
            rows={feeRows}
            columns={[
              ["departmentId", "Department"],
              ["studentName", "Student"],
              ["semesterName", "Semester"],
              ["totalAmount", "Total", currency],
              ["paidAmount", "Paid", currency],
              ["status", "Status", (value) => <StatusPill status={value} />]
            ]}
          />
          {canManageFees && (
            <FormPanel title="Add Semester Fee By Department" icon={Plus} onSubmit={(payload) => createFee.mutate(payload)}>
              {access.isDepartmentStaff && <input type="hidden" name="departmentId" value={access.departmentId} />}
              <Field label="Department">
                <Select
                  name="departmentId"
                  required={!access.isDepartmentStaff}
                  defaultValue={access.departmentId || filters.departmentId}
                  disabled={access.isDepartmentStaff}
                >
                  <option value="">{departments.isLoading ? "Loading departments..." : "Select department"}</option>
                  {access.isDepartmentStaff && access.departmentId && <option value={access.departmentId}>{access.departmentId}</option>}
                  {departmentOptions.map((department) => (
                    <option key={department._id || department.name} value={department.name}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Semester"><Input name="semesterName" required defaultValue="Semester 1" /></Field>
              <Field label="Academic Year"><Input name="academicYear" required defaultValue="2026/2027" /></Field>
              <Field label="Student Group">
                <Select name="academicStage" defaultValue="">
                  <option value="">All part-time students</option>
                  <option value="First year Part Time">First year Part Time</option>
                  <option value="Second year Part Time">Second year Part Time</option>
                </Select>
              </Field>
              <Field label="Category">
                <Select name="category" defaultValue={categories.data?.data?.[0]?._id || ""}>
                  <option value="">Select category</option>
                  {(categories.data?.data || []).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
                </Select>
              </Field>
              <Field label="Amount"><Input name="totalAmount" type="number" min="0" required /></Field>
              <Field label="Due Date"><Input name="dueDate" type="date" defaultValue={today} required /></Field>
              <Field label="Description"><Input name="description" defaultValue="Department semester part-time fee" /></Field>
            </FormPanel>
          )}
        </div>
      )}

      {tab === "structures" && (
        <div className="grid gap-5 xl:grid-cols-3">
          <DataTable
            className="xl:col-span-2"
            title="Department / Semester Fee Structures"
            icon={FileText}
            rows={structures.data?.data || []}
            columns={[
              ["name", "Name"],
              ["departmentId", "Department"],
              ["semesterName", "Semester"],
              ["academicYear", "Year"],
              ["amount", "Amount", currency]
            ]}
          />
          {canManageFees && (
            <FormPanel title="Create Structure" icon={Plus} onSubmit={(payload) => createStructure.mutate(payload)}>
              <Field label="Name"><Input name="name" required defaultValue="Part-Time Course Fee" /></Field>
              {access.isDepartmentStaff && <input type="hidden" name="departmentId" value={access.departmentId} />}
              <Field label="Department">
                <Select name="departmentId" required={!access.isDepartmentStaff} defaultValue={access.departmentId || filters.departmentId} disabled={access.isDepartmentStaff}>
                  <option value="">{departments.isLoading ? "Loading departments..." : "Select department"}</option>
                  {access.isDepartmentStaff && access.departmentId && <option value={access.departmentId}>{access.departmentId}</option>}
                  {departmentOptions.map((department) => (
                    <option key={department._id || department.name} value={department.name}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Category">
                <Select name="category" required defaultValue={categories.data?.data?.[0]?._id || ""}>
                  <option value="">Select category</option>
                  {(categories.data?.data || []).map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
                </Select>
              </Field>
              <Field label="Semester"><Input name="semesterName" required defaultValue="Semester 1" /></Field>
              <Field label="Academic Year"><Input name="academicYear" required defaultValue="2026/2027" /></Field>
              <Field label="Amount"><Input name="amount" type="number" required /></Field>
              <Field label="Late Fee"><Input name="lateFeeValue" type="number" defaultValue="0" /></Field>
            </FormPanel>
          )}
        </div>
      )}

      {tab === "payments" && (
        <div className="grid gap-5 xl:grid-cols-3">
          <DataTable
            className="xl:col-span-2"
            title="Payment Transaction Logs"
            icon={CreditCard}
            rows={payments.data?.data || []}
            columns={[
              ["paymentNumber", "Payment No."],
              ["studentName", "Student"],
              ["amount", "Amount", currency],
              ["method", "Method"],
              ["status", "Status", (value) => <StatusPill status={value} />]
            ]}
          />
          {canManageMoney && (
            <FormPanel title="Record Payment" icon={Banknote} onSubmit={(payload) => recordPayment.mutate(payload)}>
              <Field label="Fee Record">
                <Select name="feeRecord" required defaultValue={firstFee?._id || ""}>
                  <option value="">Select fee record</option>
                  {feeRows.filter((fee) => fee.status !== "paid").map((fee) => <option key={fee._id} value={fee._id}>{fee.studentId} - {fee.semesterName} - {currency(fee.totalAmount - fee.paidAmount)}</option>)}
                </Select>
              </Field>
              <Field label="Amount"><Input name="amount" type="number" min="1" required /></Field>
              <Field label="Method">
                <Select name="method" required defaultValue="Cash">
                  <option>Cash</option>
                  <option>Card</option>
                  <option>Credit/Debit Card</option>
                  <option>Bank Transfer</option>
                  <option>Internet Banking</option>
                  <option>Mobile Wallet</option>
                  <option>UPI/QR Payment</option>
                  <option>Online Payment</option>
                  <option>PayHere</option>
                  <option>Stripe</option>
                  <option>PayPal</option>
                </Select>
              </Field>
              <Field label="Reference"><Input name="transactionReference" placeholder="Bank slip or transaction ID" /></Field>
            </FormPanel>
          )}
        </div>
      )}

      {tab === "invoices" && (
        <div className="grid gap-5 xl:grid-cols-3">
          <DataTable
            className="xl:col-span-2"
            title="Invoices"
            icon={FileText}
            rows={invoices.data?.data || []}
            columns={[
              ["invoiceNumber", "Invoice No."],
              ["studentName", "Student"],
              ["totalAmount", "Total", currency],
              ["dueDate", "Due", (value) => String(value || "").slice(0, 10)],
              ["status", "Status", (value) => <StatusPill status={value} />],
              ["_id", "PDF", (value, row) => <button className="text-sm font-bold text-[color:var(--md-primary)]" onClick={() => downloadFeeFile(`/invoices/${value}/download`, `${row.invoiceNumber}.pdf`)}>Download</button>]
            ]}
          />
          {canManageFees && (
            <FormPanel title="Generate Invoice" icon={Plus} onSubmit={(payload) => generateInvoice.mutate(payload)}>
              <Field label="Fee Record">
                <Select name="feeRecord" required defaultValue={firstFee?._id || ""}>
                  <option value="">Select fee record</option>
                  {feeRows.map((fee) => <option key={fee._id} value={fee._id}>{fee.studentId} - {fee.semesterName}</option>)}
                </Select>
              </Field>
              <Field label="Due Date"><Input name="dueDate" type="date" defaultValue={today} /></Field>
            </FormPanel>
          )}
        </div>
      )}

      {tab === "outstanding" && (
        <DataTable
          title="Outstanding Balances and Overdue Tracking"
          icon={AlertTriangle}
          rows={outstanding.data?.data || []}
          columns={[
            ["studentName", "Student"],
            ["departmentId", "Department"],
            ["dueDate", "Due", (value) => String(value || "").slice(0, 10)],
            ["totalAmount", "Total", currency],
            ["paidAmount", "Paid", currency],
            ["status", "Status", (value) => <StatusPill status={value} />]
          ]}
        />
      )}

      {tab === "receipts" && (
        <DataTable
          title="Receipts and Reprint History"
          icon={Receipt}
          rows={receipts.data?.data || []}
          columns={[
            ["receiptNumber", "Receipt No."],
            ["studentName", "Student"],
            ["amount", "Amount", currency],
            ["issuedAt", "Issued", (value) => String(value || "").slice(0, 10)],
            ["_id", "PDF", (value, row) => <button className="text-sm font-bold text-[color:var(--md-primary)]" onClick={() => downloadFeeFile(`/receipts/${value}/download`, `${row.receiptNumber}.pdf`)}>Download</button>]
          ]}
        />
      )}

      {tab === "refunds" && (
        <div className="grid gap-5 xl:grid-cols-3">
          <DataTable
            className="xl:col-span-2"
            title="Refund Workflow"
            icon={RefreshCw}
            rows={refunds.data?.data || []}
            columns={[
              ["refundNumber", "Refund No."],
              ["studentName", "Student"],
              ["amount", "Amount", currency],
              ["status", "Status", (value) => <StatusPill status={value} />],
              ["_id", "Action", (value, row) => canManageMoney && row.status === "requested" ? (
                <div className="flex gap-2">
                  <button className="text-xs font-bold text-emerald-600" onClick={() => reviewRefund.mutate({ id: value, action: "approved" })}>Approve</button>
                  <button className="text-xs font-bold text-rose-600" onClick={() => reviewRefund.mutate({ id: value, action: "rejected" })}>Reject</button>
                </div>
              ) : null]
            ]}
          />
          <FormPanel title="Submit Refund Request" icon={Plus} onSubmit={(payload) => submitRefund.mutate(payload)}>
            <Field label="Payment">
              <Select name="payment" required defaultValue={firstPayment?._id || ""}>
                <option value="">Select payment</option>
                {(payments.data?.data || []).map((payment) => <option key={payment._id} value={payment._id}>{payment.paymentNumber} - {currency(payment.amount)}</option>)}
              </Select>
            </Field>
            <Field label="Amount"><Input name="amount" type="number" min="1" required /></Field>
            <Field label="Reason"><Input name="reason" required placeholder="Duplicate payment, withdrawal, adjustment..." /></Field>
          </FormPanel>
        </div>
      )}

      {tab === "notifications" && (
        <div className="grid gap-5 xl:grid-cols-3">
          <DataTable
            className="xl:col-span-2"
            title="Fee Notifications"
            icon={Bell}
            rows={notifications.data?.data || []}
            columns={[
              ["type", "Type"],
              ["channel", "Channel"],
              ["title", "Title"],
              ["status", "Status", (value) => <StatusPill status={value} />]
            ]}
          />
          {canManageFees && (
            <FormPanel title="Queue Notification" icon={Bell} onSubmit={(payload) => notify.mutate(payload)}>
              <Field label="Department"><Input name="departmentId" defaultValue={access.departmentId} disabled={access.isDepartmentStaff} /></Field>
              <Field label="Type">
                <Select name="type" defaultValue="fee_due_reminder">
                  <option value="fee_due_reminder">Fee due reminder</option>
                  <option value="payment_confirmation">Payment confirmation</option>
                  <option value="refund_notification">Refund notification</option>
                  <option value="overdue_alert">Overdue alert</option>
                </Select>
              </Field>
              <Field label="Channel">
                <Select name="channel" defaultValue="in_app">
                  <option value="in_app">In app</option>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </Select>
              </Field>
              <Field label="Title"><Input name="title" required defaultValue="Fee reminder" /></Field>
              <Field label="Message"><Input name="message" required defaultValue="Please settle your outstanding part-time programme fees." /></Field>
            </FormPanel>
          )}
        </div>
      )}

      {tab === "requests" && (
        <DataTable
          title="Student Fee Requests"
          icon={FileText}
          rows={serviceRequests.data?.data || []}
          columns={[
            ["requestNumber", "Request No."],
            ["studentName", "Student"],
            ["type", "Type"],
            ["title", "Title"],
            ["status", "Status", (value) => <StatusPill status={value} />],
            ["_id", "Action", (value, row) => canManageMoney && ["requested"].includes(row.status) ? (
              <div className="flex gap-2">
                <button className="text-xs font-bold text-emerald-600" onClick={() => reviewServiceRequest.mutate({ id: value, status: "approved" })}>Approve</button>
                <button className="text-xs font-bold text-rose-600" onClick={() => reviewServiceRequest.mutate({ id: value, status: "rejected" })}>Reject</button>
              </div>
            ) : null]
          ]}
        />
      )}

      {tab === "reports" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ["daily-collection", "Daily Collection Report"],
            ["monthly-collection", "Monthly Collection Report"],
            ["semester-collection", "Semester Collection Report"],
            ["department-revenue", "Department Revenue Report"],
            ["outstanding-fee", "Outstanding Fee Report"],
            ["student-payment-history", "Student Payment History Report"],
            ["refund", "Refund Report"]
          ].map(([type, label]) => (
            <div key={type} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
              <FileText size={20} className="text-[color:var(--md-primary)]" />
              <h3 className="mt-3 text-sm font-black text-[color:var(--md-text-primary)]">{label}</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <SecondaryButton onClick={() => feesApi.report(type, { ...queryParams }).then((data) => downloadCsv(`${type}.csv`, data.rows || []))}>CSV</SecondaryButton>
                <SecondaryButton onClick={() => downloadFeeFile(`/reports/${type}?format=pdf`, `${type}.pdf`)}>PDF</SecondaryButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FormPanel({ title, icon: Icon, children, onSubmit }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    onSubmit(payload);
    event.currentTarget.reset();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon size={18} className="text-[color:var(--md-primary)]" />
        <h2 className="text-sm font-black text-[color:var(--md-text-primary)]">{title}</h2>
      </div>
      {children}
      <PrimaryButton type="submit" className="w-full"><Plus size={16} /> Save</PrimaryButton>
    </form>
  );
}

function DataTable({ title, icon: Icon, rows, columns, className = "" }) {
  return (
    <div className={`overflow-hidden rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] ${className}`}>
      <div className="flex items-center gap-2 border-b border-[color:var(--md-border)] px-4 py-3">
        <Icon size={18} className="text-[color:var(--md-primary)]" />
        <h2 className="text-sm font-black text-[color:var(--md-text-primary)]">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[color:var(--md-border)]">
              {columns.map(([, label]) => (
                <th key={label} className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wider text-[color:var(--md-text-secondary)]">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row) => (
              <tr key={row._id || row.id || JSON.stringify(row)} className="border-b border-[color:var(--md-border)] last:border-0 hover:bg-[color:var(--md-hover)]">
                {columns.map(([key, , render]) => (
                  <td key={key} className="whitespace-nowrap px-4 py-3 text-[color:var(--md-text-primary)]">
                    {render ? render(row[key], row) : row[key] || "-"}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-[color:var(--md-text-secondary)]">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentFeesPortal({ dashboard, feeRows, payments, invoices, receipts, refunds, notifications, serviceRequests, recordPayment, createServiceRequest, message, setMessage, refreshAll }) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Credit/Debit Card");
  const [paymentPortal, setPaymentPortal] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    method: "Credit/Debit Card",
    amount: "",
    cardNumber: "",
    cardHolder: "",
    expiry: "",
    cvv: "",
    bankName: "",
    bankReference: "",
    walletNumber: "",
    upiId: "",
    gatewayEmail: "",
    reference: ""
  });
  const widgets = dashboard.data?.widgets || {};
  const totalFees = feeRows.reduce((sum, fee) => sum + Number(fee.totalAmount || 0) + Number(fee.lateFeeAmount || 0), 0);
  const totalPaid = feeRows.reduce((sum, fee) => sum + Number(fee.paidAmount || 0), 0);
  const totalDue = Math.max(0, totalFees - totalPaid - feeRows.reduce((sum, fee) => sum + Number(fee.discountAmount || 0), 0));
  const progress = totalFees > 0 ? Math.min(100, Math.round((totalPaid / totalFees) * 100)) : 0;
  const overdueFees = feeRows.filter((fee) => fee.status === "overdue" || (fee.dueDate && new Date(fee.dueDate) < new Date() && fee.status !== "paid"));
  const upcomingFees = feeRows
    .filter((fee) => fee.status !== "paid" && fee.dueDate && new Date(fee.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const nextPaymentDate = upcomingFees[0]?.dueDate ? String(upcomingFees[0].dueDate).slice(0, 10) : "No scheduled due date";
  const semesterSummary = Object.values(feeRows.reduce((acc, fee) => {
    const key = `${fee.semesterName || "Semester"} ${fee.academicYear || ""}`.trim();
    acc[key] ||= { semester: key, total: 0, paid: 0, due: 0 };
    const due = Math.max(0, Number(fee.totalAmount || 0) + Number(fee.lateFeeAmount || 0) - Number(fee.discountAmount || 0) - Number(fee.paidAmount || 0));
    acc[key].total += Number(fee.totalAmount || 0);
    acc[key].paid += Number(fee.paidAmount || 0);
    acc[key].due += due;
    return acc;
  }, {}));
  const feeBreakdown = [
    ["Registration Fee", "Registration"],
    ["Course Fee", "Course"],
    ["Assessment Fee", "Assessment"],
    ["Library Fee", "Library"],
    ["Hostel Fee", "Hostel"],
    ["Certificate Fee", "Certificate"],
    ["Fine/Penalty Charges", "Fine"],
    ["Other Charges", "Other"]
  ].map(([label, match]) => ({
    label,
    amount: feeRows
      .filter((fee) => `${fee.description || ""} ${fee.category?.name || ""}`.toLowerCase().includes(match.toLowerCase()))
      .reduce((sum, fee) => sum + Number(fee.totalAmount || 0), 0)
  }));
  const paymentMethods = ["Credit/Debit Card", "Bank Transfer", "Internet Banking", "Mobile Wallet", "UPI/QR Payment", "PayHere", "Stripe", "PayPal"];
  const feeOutstanding = (fee) => Math.max(0, Number(fee.totalAmount || 0) + Number(fee.lateFeeAmount || 0) - Number(fee.discountAmount || 0) - Number(fee.paidAmount || 0));
  const clearanceItems = [
    ["No Due Certificate", totalDue <= 0 ? "eligible" : "pending"],
    ["Department Clearance", totalDue <= 0 ? "cleared" : "pending"],
    ["Graduation Clearance", totalDue <= 0 ? "cleared" : "pending"],
    ["Academic Eligibility", overdueFees.length ? "blocked" : "eligible"]
  ];

  const openPaymentPortal = (fee) => {
    const outstanding = feeOutstanding(fee);
    if (outstanding <= 0) {
      setMessage("This fee is already fully paid.");
      return;
    }

    setPaymentPortal({ fee, outstanding });
    setPaymentForm((current) => ({
      ...current,
      method: selectedPaymentMethod,
      amount: String(outstanding),
      reference: `STUDENT-${Date.now()}`
    }));
  };

  const submitDummyPayment = (event) => {
    event.preventDefault();
    if (!paymentPortal?.fee) return;

    const amount = Number(paymentForm.amount);
    if (!amount || amount <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }
    if (amount > paymentPortal.outstanding) {
      setMessage("Payment amount cannot be higher than the current balance.");
      return;
    }
    if (paymentForm.method === "Credit/Debit Card" && (!paymentForm.cardNumber || !paymentForm.cardHolder || !paymentForm.expiry || !paymentForm.cvv)) {
      setMessage("Enter the dummy card details to continue.");
      return;
    }

    const transactionReference = (paymentForm.reference || paymentForm.bankReference || paymentForm.upiId || paymentForm.gatewayEmail || "").trim() || `STUDENT-${Date.now()}`;
    recordPayment.mutate({
      feeRecord: paymentPortal.fee._id,
      amount,
      method: paymentForm.method,
      transactionReference
    }, {
      onSuccess: () => setPaymentPortal(null)
    });
  };

  const paymentFieldValue = (field) => paymentForm[field] || "";
  const updatePaymentField = (field, value) => setPaymentForm((current) => ({ ...current, [field]: value }));
  const gatewayMethods = ["PayHere", "Stripe", "PayPal"];
  const selfServiceRequestTypes = {
    "Upload bank deposit slip": "bank_slip_upload",
    "Request installment plan": "installment_plan",
    "Request fee extension": "fee_extension",
    "Download statement": "statement_download",
    "View fee policies": "fee_policy",
    "Request No Due Certificate": "no_due_certificate",
    "Request fee waiver": "fee_waiver",
    "Request scholarship review": "scholarship"
  };
  const selfService = (action) => {
    createServiceRequest.mutate({
      type: selfServiceRequestTypes[action] || "fee_policy",
      title: action,
      feeRecord: feeRows.find((fee) => fee.status !== "paid")?._id,
      amount: totalDue,
      note: `${action} submitted from student fee dashboard.`
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[color:var(--md-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="portal-page-label">Student Fees</p>
          <h1 className="mt-2 text-2xl font-black text-[color:var(--md-text-primary)] sm:text-3xl">Fee Dashboard</h1>
          <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">
            View department-assigned semester fees, make payments, and download receipts.
          </p>
        </div>
        <SecondaryButton onClick={refreshAll}><RefreshCw size={16} /> Refresh</SecondaryButton>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-4 py-3 text-sm text-[color:var(--md-text-primary)]">
          <ShieldCheck size={16} className="text-[color:var(--md-primary)]" />
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Current Balance Due" value={currency(totalDue || widgets.totalOutstanding)} icon={Wallet} tone="text-rose-600" />
        <MetricCard label="Total Fees Paid" value={currency(totalPaid || widgets.totalCollected)} icon={CheckCircle} tone="text-emerald-600" />
        <MetricCard label="Upcoming Payments" value={nextPaymentDate} icon={Bell} tone="text-amber-600" />
        <MetricCard label="Overdue Payments" value={overdueFees.length} icon={AlertTriangle} tone="text-rose-600" />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4 xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-[color:var(--md-text-primary)]">Payment Progress</h2>
              <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">Remaining balance updates after each confirmed payment.</p>
            </div>
            <span className="text-2xl font-black text-[color:var(--md-primary)]">{progress}%</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[color:var(--md-hover)]">
            <div className="h-full rounded-full bg-[color:var(--md-primary)]" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <span className="rounded-lg bg-[color:var(--md-hover)] px-3 py-2 text-sm">Total {currency(totalFees)}</span>
            <span className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">Paid {currency(totalPaid)}</span>
            <span className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-600">Due {currency(totalDue)}</span>
          </div>
        </div>

        <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
          <h2 className="text-sm font-black text-[color:var(--md-text-primary)]">Payment Method</h2>
          <Select className="mt-3" value={selectedPaymentMethod} onChange={(event) => setSelectedPaymentMethod(event.target.value)}>
            {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
          </Select>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[color:var(--md-text-secondary)]">
            {paymentMethods.slice(0, 6).map((method) => <span key={method} className="rounded-lg border border-[color:var(--md-border)] px-2 py-2">{method}</span>)}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <DataTable
            title="Semester-Wise Fee Summary"
            icon={FileText}
            rows={semesterSummary}
            columns={[
              ["semester", "Semester"],
              ["total", "Total", currency],
              ["paid", "Paid", currency],
              ["due", "Remaining", currency]
            ]}
          />

          <div className="overflow-hidden rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)]">
            <div className="flex items-center gap-2 border-b border-[color:var(--md-border)] px-4 py-3">
              <Wallet size={18} className="text-[color:var(--md-primary)]" />
              <h2 className="text-sm font-black text-[color:var(--md-text-primary)]">Assigned Department Fees</h2>
            </div>
            <div className="divide-y divide-[color:var(--md-border)]">
              {feeRows.length ? feeRows.map((fee) => {
                const outstanding = feeOutstanding(fee);
                return (
                  <div key={fee._id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black text-[color:var(--md-text-primary)]">{fee.semesterName} - {fee.academicYear}</h3>
                        <StatusPill status={fee.status} />
                      </div>
                      <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">{fee.description || "Department semester fee"}</p>
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                        <span>Total: <strong>{currency(fee.totalAmount)}</strong></span>
                        <span>Paid: <strong>{currency(fee.paidAmount)}</strong></span>
                        <span>Due: <strong>{currency(outstanding)}</strong></span>
                      </div>
                      {Array.isArray(fee.installmentPlan) && fee.installmentPlan.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {fee.installmentPlan.map((item, index) => (
                            <span key={`${fee._id}-${index}`} className="rounded-full bg-[color:var(--md-hover)] px-3 py-1 text-xs">
                              {item.label || `Installment ${index + 1}`}: {currency(item.amount)} due {String(item.dueDate || "").slice(0, 10) || "TBA"}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <PrimaryButton disabled={recordPayment.isPending || outstanding <= 0} onClick={() => openPaymentPortal(fee)}>
                      <CreditCard size={16} />
                      {outstanding > 0 ? `Pay ${currency(outstanding)}` : "Paid"}
                    </PrimaryButton>
                  </div>
                );
              }) : (
                <p className="px-4 py-8 text-center text-sm text-[color:var(--md-text-secondary)]">No fees assigned yet.</p>
              )}
            </div>
          </div>

          <DataTable
            title="Payment History & Analytics"
            icon={Banknote}
            rows={payments.data?.data || []}
            columns={[
              ["paymentNumber", "Payment No."],
              ["amount", "Amount", currency],
              ["method", "Method"],
              ["paymentDate", "Date", (value) => String(value || "").slice(0, 10)],
              ["status", "Status", (value) => <StatusPill status={value} />]
            ]}
          />

          <DataTable
            title="Invoice History"
            icon={FileText}
            rows={invoices.data?.data || []}
            columns={[
              ["invoiceNumber", "Invoice No."],
              ["totalAmount", "Amount", currency],
              ["dueDate", "Due", (value) => String(value || "").slice(0, 10)],
              ["status", "Status", (value) => <StatusPill status={value} />],
              ["_id", "PDF", (value, row) => <button className="text-sm font-bold text-[color:var(--md-primary)]" onClick={() => downloadFeeFile(`/invoices/${value}/download`, `${row.invoiceNumber}.pdf`)}>Download</button>]
            ]}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
            <div className="flex items-center gap-2">
              <Wallet size={18} className="text-[color:var(--md-primary)]" />
              <h2 className="text-sm font-black text-[color:var(--md-text-primary)]">Smart Fee Breakdown</h2>
            </div>
            <div className="mt-4 space-y-2">
              {feeBreakdown.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg bg-[color:var(--md-hover)] px-3 py-2 text-sm">
                  <span>{item.label}</span>
                  <strong>{currency(item.amount)}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
            <div className="flex items-center gap-2">
              <Receipt size={18} className="text-[color:var(--md-primary)]" />
              <h2 className="text-sm font-black text-[color:var(--md-text-primary)]">Receipt Center</h2>
            </div>
            <div className="mt-4 space-y-3">
              {(receipts.data?.data || []).length ? receipts.data.data.map((receipt) => (
                <div key={receipt._id} className="rounded-lg border border-[color:var(--md-border)] p-3">
                  <p className="text-sm font-bold text-[color:var(--md-text-primary)]">{receipt.receiptNumber}</p>
                  <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">{String(receipt.issuedAt || "").slice(0, 10)} - {currency(receipt.amount)}</p>
                  <SecondaryButton className="mt-3 w-full" onClick={() => downloadFeeFile(`/receipts/${receipt._id}/download`, `${receipt.receiptNumber}.pdf`)}>
                    <Download size={15} />
                    Download
                  </SecondaryButton>
                  <SecondaryButton className="mt-2 w-full" onClick={() => window.print()}>
                    Print Receipt
                  </SecondaryButton>
                </div>
              )) : (
                <p className="py-6 text-center text-sm text-[color:var(--md-text-secondary)]">Receipts will appear after payment.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-[color:var(--md-primary)]" />
              <h2 className="text-sm font-black text-[color:var(--md-text-primary)]">Smart Notifications</h2>
            </div>
            <div className="mt-4 space-y-2">
              {(notifications.data?.data || []).slice(0, 4).map((notice) => (
                <div key={notice._id} className="rounded-lg border border-[color:var(--md-border)] p-3">
                  <p className="text-sm font-bold text-[color:var(--md-text-primary)]">{notice.title}</p>
                  <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">{notice.message}</p>
                </div>
              ))}
              {!(notifications.data?.data || []).length && ["Payment due reminders", "Overdue alerts", "Successful payment notifications", "Email/SMS/WhatsApp notifications"].map((item) => (
                <p key={item} className="rounded-lg bg-[color:var(--md-hover)] px-3 py-2 text-sm text-[color:var(--md-text-secondary)]">{item}</p>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-[color:var(--md-primary)]" />
              <h2 className="text-sm font-black text-[color:var(--md-text-primary)]">Scholarships & Discounts</h2>
            </div>
            {["Scholarship tracking", "Merit discounts", "Financial aid records", "Fee waiver requests", "Discount approval status"].map((item) => (
              <div key={item} className="mt-2 flex items-center justify-between rounded-lg bg-[color:var(--md-hover)] px-3 py-2 text-sm">
                <span>{item}</span>
                <StatusPill status="pending" />
              </div>
            ))}
            <div className="mt-3 grid gap-2">
              <SecondaryButton onClick={() => selfService("Request scholarship review")}>Request scholarship review</SecondaryButton>
              <SecondaryButton onClick={() => selfService("Request fee waiver")}>Request fee waiver</SecondaryButton>
            </div>
          </div>

          <DataTable
            title="Refund Tracking"
            icon={RefreshCw}
            rows={refunds.data?.data || []}
            columns={[
              ["refundNumber", "Refund No."],
              ["amount", "Amount", currency],
              ["status", "Status", (value) => <StatusPill status={value} />]
            ]}
          />

          <DataTable
            title="Admin-Controlled Requests"
            icon={FileText}
            rows={serviceRequests.data?.data || []}
            columns={[
              ["requestNumber", "Request No."],
              ["title", "Request"],
              ["status", "Status", (value) => <StatusPill status={value} />]
            ]}
          />

          <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[color:var(--md-primary)]" />
              <h2 className="text-sm font-black text-[color:var(--md-text-primary)]">Fee Clearance</h2>
            </div>
            <div className="mt-4 space-y-2">
              {clearanceItems.map(([label, status]) => (
                <div key={label} className="flex items-center justify-between rounded-lg bg-[color:var(--md-hover)] px-3 py-2 text-sm">
                  <span>{label}</span>
                  <StatusPill status={status} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-[color:var(--md-primary)]" />
              <h2 className="text-sm font-black text-[color:var(--md-text-primary)]">Self-Service</h2>
            </div>
            <div className="mt-4 grid gap-2">
              {["Upload bank deposit slip", "Request installment plan", "Request fee extension", "Download statement", "View fee policies", "Request No Due Certificate"].map((action) => (
                <SecondaryButton key={action} disabled={createServiceRequest.isPending} onClick={() => selfService(action)}>{action}</SecondaryButton>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[color:var(--md-primary)]" />
              <h2 className="text-sm font-black text-[color:var(--md-text-primary)]">Access</h2>
            </div>
            <p className="mt-3 text-sm text-[color:var(--md-text-secondary)]">
              OTP verification, secure payment gateway routing, transaction audit logs, fraud checks, and role-based access control protect student fee payments.
            </p>
          </div>
        </div>
      </div>

      {paymentPortal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form onSubmit={submitDummyPayment} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[color:var(--md-border)] pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--md-text-secondary)]">Dummy Payment Portal</p>
                <h2 className="mt-1 text-xl font-black text-[color:var(--md-text-primary)]">{paymentPortal.fee.semesterName} Payment</h2>
                <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">Choose a payment method and confirm the test transaction.</p>
              </div>
              <button type="button" className="rounded-lg border border-[color:var(--md-border)] px-3 py-1 text-lg font-black text-[color:var(--md-text-primary)]" onClick={() => setPaymentPortal(null)}>
                x
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Payment Method">
                <Select value={paymentForm.method} onChange={(event) => {
                  updatePaymentField("method", event.target.value);
                  setSelectedPaymentMethod(event.target.value);
                }}>
                  {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                </Select>
              </Field>
              <Field label={`Amount due ${currency(paymentPortal.outstanding)}`}>
                <Input type="number" min="1" max={paymentPortal.outstanding} value={paymentFieldValue("amount")} onChange={(event) => updatePaymentField("amount", event.target.value)} />
              </Field>

              {paymentForm.method === "Credit/Debit Card" && (
                <>
                  <Field label="Card Number">
                    <Input inputMode="numeric" placeholder="4242 4242 4242 4242" value={paymentFieldValue("cardNumber")} onChange={(event) => updatePaymentField("cardNumber", event.target.value)} />
                  </Field>
                  <Field label="Card Holder">
                    <Input placeholder="Student name" value={paymentFieldValue("cardHolder")} onChange={(event) => updatePaymentField("cardHolder", event.target.value)} />
                  </Field>
                  <Field label="Expiry">
                    <Input placeholder="MM/YY" value={paymentFieldValue("expiry")} onChange={(event) => updatePaymentField("expiry", event.target.value)} />
                  </Field>
                  <Field label="CVV">
                    <Input inputMode="numeric" placeholder="123" value={paymentFieldValue("cvv")} onChange={(event) => updatePaymentField("cvv", event.target.value)} />
                  </Field>
                </>
              )}

              {(paymentForm.method === "Bank Transfer" || paymentForm.method === "Internet Banking") && (
                <>
                  <Field label="Bank">
                    <Input placeholder="Bank name" value={paymentFieldValue("bankName")} onChange={(event) => updatePaymentField("bankName", event.target.value)} />
                  </Field>
                  <Field label="Transfer Reference">
                    <Input placeholder="Bank transaction reference" value={paymentFieldValue("bankReference")} onChange={(event) => updatePaymentField("bankReference", event.target.value)} />
                  </Field>
                </>
              )}

              {paymentForm.method === "Mobile Wallet" && (
                <Field label="Wallet / Mobile Number">
                  <Input placeholder="+94 mobile number" value={paymentFieldValue("walletNumber")} onChange={(event) => updatePaymentField("walletNumber", event.target.value)} />
                </Field>
              )}

              {paymentForm.method === "UPI/QR Payment" && (
                <>
                  <div className="flex min-h-36 items-center justify-center rounded-lg border border-dashed border-[color:var(--md-border)] bg-[color:var(--md-hover)] text-center text-sm font-black text-[color:var(--md-text-secondary)]">
                    DEMO QR
                  </div>
                  <Field label="UPI / QR Reference">
                    <Input placeholder="upi-id or scan reference" value={paymentFieldValue("upiId")} onChange={(event) => updatePaymentField("upiId", event.target.value)} />
                  </Field>
                </>
              )}

              {gatewayMethods.includes(paymentForm.method) && (
                <Field label={`${paymentForm.method} Account`}>
                  <Input type="email" placeholder="student@example.com" value={paymentFieldValue("gatewayEmail")} onChange={(event) => updatePaymentField("gatewayEmail", event.target.value)} />
                </Field>
              )}

              <Field label="Payment Reference">
                <Input value={paymentFieldValue("reference")} onChange={(event) => updatePaymentField("reference", event.target.value)} />
              </Field>
            </div>

            <div className="mt-5 rounded-lg bg-[color:var(--md-hover)] p-4 text-sm text-[color:var(--md-text-secondary)]">
              <strong className="text-[color:var(--md-text-primary)]">Test mode:</strong> no real money is charged. Confirming this payment records it in the student history and creates a downloadable receipt.
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <SecondaryButton type="button" onClick={() => setPaymentPortal(null)}>Cancel</SecondaryButton>
              <PrimaryButton type="submit" disabled={recordPayment.isPending}>
                <CreditCard size={16} />
                {recordPayment.isPending ? "Processing..." : `Confirm ${currency(paymentForm.amount)}`}
              </PrimaryButton>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
