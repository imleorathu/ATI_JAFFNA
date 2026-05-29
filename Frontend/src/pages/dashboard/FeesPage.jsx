import { useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet, CreditCard, Download, Clock, CheckCircle, AlertTriangle,
  TrendingDown, TrendingUp, Banknote, Receipt, Bell, Award
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import GlassCard from "../../components/GlassCard";
import { feeData } from "../../data";

const feeCategories = [
  { name: "Tuition", value: 85000, color: "var(--color-ocean)" },
  { name: "Library", value: 7500, color: "var(--color-mint)" },
  { name: "Lab", value: 15000, color: "#f59e0b" },
  { name: "Sports", value: 5000, color: "#8b5cf6" },
  { name: "Other", value: 12500, color: "#ef4444" },
];

const installments = [
  { month: "January", amount: 45000, status: "paid", dueDate: "2026-01-15", paidDate: "2026-01-14" },
  { month: "March", amount: 42500, status: "paid", dueDate: "2026-03-10", paidDate: "2026-03-08" },
  { month: "May", amount: 37500, status: "pending", dueDate: "2026-05-01", paidDate: null },
  { month: "July", amount: 40000, status: "upcoming", dueDate: "2026-07-01", paidDate: null },
  { month: "September", amount: 35000, status: "upcoming", dueDate: "2026-09-01", paidDate: null },
  { month: "November", amount: 30000, status: "upcoming", dueDate: "2026-11-01", paidDate: null },
];

const nextPaymentDate = "2026-05-01";

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const RADIUS = 64;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function FeesPage() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(feeData.due);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(true);

  const paidPercent = feeData.totalFee > 0
    ? Math.round((feeData.paid / feeData.totalFee) * 100)
    : 0;

  const handlePayment = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        setShowPaymentModal(false);
        setPaymentSuccess(false);
      }, 2000);
    }, 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8,Fee Receipt - ATI Jaffna");
    element.setAttribute("download", "fee_receipt.txt");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const paymentMethods = [
    { id: "card", label: "Credit / Debit Card", icon: CreditCard },
    { id: "bank", label: "Bank Transfer", icon: Banknote },
    { id: "wallet", label: "Digital Wallet", icon: Wallet },
  ];

  return (
    <section className="space-y-6">
      <div className="mx-auto max-w-7xl">
        {/* Toast */}
        {paymentSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed right-6 top-6 z-50 flex items-center gap-3 rounded-xl border border-emerald-500/20 px-5 py-3 shadow-2xl backdrop-blur-xl"
            style={{ background: "rgba(34,197,94,0.12)" }}
          >
            <CheckCircle className="text-[color:var(--md-success)]" size={22} />
            <div>
              <p className="text-sm font-bold text-[color:var(--md-text-primary)]">Payment Successful!</p>
              <p className="text-xs text-[color:var(--md-text-secondary)]">
                LKR {paymentAmount.toLocaleString()} paid via{" "}
                {paymentMethods.find((m) => m.id === paymentMethod)?.label}
              </p>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          className="mb-6 flex flex-col gap-4 border-b border-[color:var(--md-border)] pb-5 sm:flex-row sm:items-end sm:justify-between"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <p className="portal-page-label">Student</p>
            <h1 className="mt-2 text-2xl font-black text-[color:var(--md-text-primary)] sm:text-3xl">
              Fee Management
            </h1>
            <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">
              Track your payments, view installments, and manage fees
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-5 py-3">
              <Bell size={16} className="text-[color:var(--md-primary)]" />
              <span className="text-xs font-semibold text-[color:var(--md-text-secondary)]">Reminders</span>
              <button
                onClick={() => setReminderEnabled((p) => !p)}
                className={`relative h-5 w-9 rounded-full transition-all duration-300 ${
                  reminderEnabled ? "bg-emerald-500" : "bg-[color:var(--md-hover)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-300 ${
                    reminderEnabled ? "left-4" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </motion.div>
        </motion.div>

        {/* Progress Ring + Quick Stats */}
        <div className="mb-8 grid gap-6 lg:grid-cols-5">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="lg:col-span-2 flex items-center justify-center"
          >
            <GlassCard className="p-6 w-full">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
                <div className="relative flex items-center justify-center">
                  <svg width="160" height="160" className="-rotate-90">
                    <circle
                      cx="80" cy="80" r={RADIUS}
                      fill="none"
                      stroke="var(--md-border)"
                      strokeWidth="12"
                    />
                    <circle
                      cx="80" cy="80" r={RADIUS}
                      fill="none"
                      stroke="var(--color-mint)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={CIRCUMFERENCE}
                      strokeDashoffset={CIRCUMFERENCE * (1 - paidPercent / 100)}
                      style={{ transition: "stroke-dashoffset 1.2s ease" }}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-black tracking-tight" style={{ color: "var(--color-mint)" }}>
                      {paidPercent}%
                    </span>
                    <span className="text-xs font-semibold text-[color:var(--md-text-secondary)]">Paid</span>
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-sm font-semibold text-[color:var(--md-text-secondary)]">Total Balance</p>
                  <p className="text-3xl font-black text-[color:var(--md-text-primary)]">
                    LKR {feeData.totalFee.toLocaleString()}
                  </p>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp size={14} style={{ color: "var(--color-mint)" }} />
                      <span className="text-xs font-bold" style={{ color: "var(--color-mint)" }}>
                        LKR {feeData.paid.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingDown size={14} style={{ color: "#ef4444" }} />
                      <span className="text-xs font-bold" style={{ color: "#ef4444" }}>
                        LKR {feeData.due.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="lg:col-span-3 grid gap-4 grid-cols-2"
          >
            {[
              { label: "Total Fee", value: `LKR ${feeData.totalFee.toLocaleString()}`, color: "var(--md-text-primary)", icon: Wallet },
              { label: "Paid", value: `LKR ${feeData.paid.toLocaleString()}`, color: "var(--color-mint)", icon: CheckCircle },
              { label: "Due", value: `LKR ${feeData.due.toLocaleString()}`, color: "#ef4444", icon: AlertTriangle },
              { label: "Next Payment", value: nextPaymentDate, color: "#f59e0b", icon: Clock },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div key={stat.label} variants={fadeUp}>
                  <GlassCard className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--md-text-secondary)]">
                          {stat.label}
                        </p>
                        <p className="mt-1 text-lg font-black" style={{ color: stat.color }}>
                          {stat.value}
                        </p>
                      </div>
                      <Icon size={22} style={{ color: stat.color, opacity: 0.5 }} />
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div
          className="mb-8 flex flex-wrap gap-3"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <button
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, var(--color-ocean), #0754c9)",
              color: "#fff",
              boxShadow: "0 4px 18px rgba(13,110,253,0.35)",
            }}
          >
            <CreditCard size={18} />
            Pay Online
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all duration-200 border border-[color:var(--md-border)] text-[color:var(--md-text-primary)] hover:bg-[color:var(--md-hover)]"
          >
            <Download size={18} />
            Download Receipts
          </button>
        </motion.div>

        {/* Payment History + Breakdown */}
        <div className="mb-8 grid gap-6 lg:grid-cols-5">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="lg:col-span-3"
          >
            <GlassCard className="overflow-x-auto p-0">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[color:var(--md-border)]">
                <Receipt size={18} className="text-[color:var(--md-primary)]" />
                <h3 className="text-base font-black text-[color:var(--md-text-primary)]">Payment History</h3>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--md-border)]">
                    {["Date", "Description", "Amount", "Status", "Method"].map((h) => (
                      <th key={h} className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-[color:var(--md-text-secondary)]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {feeData.paymentHistory.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors border-b border-[color:var(--md-border)]"
                      onMouseEnter={(e) => e.currentTarget.style.background = "var(--md-hover)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td className="px-5 py-3.5 font-medium text-[color:var(--md-text-secondary)]">{row.date}</td>
                      <td className="px-5 py-3.5 text-[color:var(--md-text-secondary)]">{row.type}</td>
                      <td className="px-5 py-3.5 font-semibold text-[color:var(--md-text-primary)]">
                        LKR {row.amount.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold"
                          style={{
                            background: row.status === "paid"
                              ? "rgba(34,197,94,0.12)"
                              : "rgba(245,158,11,0.12)",
                            color: row.status === "paid" ? "var(--md-success)" : "var(--md-warning)",
                          }}
                        >
                          {row.status === "paid" ? <CheckCircle size={12} /> : <Clock size={12} />}
                          {row.status === "paid" ? "Paid" : "Pending"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[color:var(--md-text-secondary)]">
                        {row.method || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="lg:col-span-2"
          >
            <GlassCard className="p-5">
              <h3 className="mb-1 text-base font-black text-[color:var(--md-text-primary)]">
                Fee Breakdown
              </h3>
              <p className="mb-4 text-xs text-[color:var(--md-text-secondary)]">
                Category-wise fee distribution
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={feeCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {feeCategories.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke="var(--md-border)" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--md-card)",
                      border: "1px solid var(--md-border)",
                      borderRadius: 8,
                      color: "var(--md-text-primary)",
                      fontSize: 12,
                    }}
                    formatter={(value) => [`LKR ${value.toLocaleString()}`, "Amount"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-2">
                {feeCategories.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: cat.color }} />
                      <span className="text-xs font-medium text-[color:var(--md-text-secondary)]">{cat.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-[color:var(--md-text-primary)]">
                      LKR {cat.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Installment Plan + Scholarships */}
        <div className="mb-8 grid gap-6 lg:grid-cols-5">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="lg:col-span-3"
          >
            <GlassCard className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <Wallet size={18} className="text-[color:var(--md-primary)]" />
                <h3 className="text-base font-black text-[color:var(--md-text-primary)]">Installment Plan</h3>
              </div>
              <div className="space-y-0 divide-y divide-[color:var(--md-border)]">
                {installments.map((inst, i) => {
                  const statusStyle = inst.status === "paid"
                    ? { bg: "rgba(34,197,94,0.12)", color: "var(--md-success)", icon: CheckCircle }
                    : inst.status === "pending"
                    ? { bg: "rgba(245,158,11,0.12)", color: "var(--md-warning)", icon: Clock }
                    : { bg: "var(--md-hover)", color: "var(--md-text-secondary)", icon: Clock };
                  const StatusIcon = statusStyle.icon;
                  return (
                    <div key={i} className="flex items-center gap-4 py-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: statusStyle.bg }}
                      >
                        <StatusIcon size={16} style={{ color: statusStyle.color }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[color:var(--md-text-primary)]">{inst.month}</p>
                        <p className="text-xs text-[color:var(--md-text-secondary)]">
                          Due: {inst.dueDate}{inst.paidDate ? ` · Paid: ${inst.paidDate}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[color:var(--md-text-primary)]">
                          LKR {inst.amount.toLocaleString()}
                        </p>
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold capitalize"
                          style={{
                            background: statusStyle.bg,
                            color: statusStyle.color,
                          }}
                        >
                          {inst.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="lg:col-span-2 space-y-6"
          >
            <GlassCard className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <Award size={18} style={{ color: "#f59e0b" }} />
                <h3 className="text-base font-black text-[color:var(--md-text-primary)]">Scholarships</h3>
              </div>
              {feeData.scholarships.length === 0 ? (
                <p className="py-6 text-center text-sm text-[color:var(--md-text-secondary)]">
                  No scholarships awarded
                </p>
              ) : (
                <div className="space-y-3">
                  {feeData.scholarships.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-4"
                      style={{
                        background: "rgba(245,158,11,0.06)",
                        border: "1px solid rgba(245,158,11,0.15)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold" style={{ color: "#fbbf24" }}>{s.name}</p>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            background: "rgba(34,197,94,0.15)",
                            color: "var(--md-success)",
                          }}
                        >
                          {s.status}
                        </span>
                      </div>
                      <p className="text-xs text-[color:var(--md-text-secondary)]">{s.provider}</p>
                      <p className="mt-1 text-lg font-black" style={{ color: "#fbbf24" }}>
                        LKR {s.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp size={18} className="text-[color:var(--md-primary)]" />
                <h3 className="text-base font-black text-[color:var(--md-text-primary)]">Payment Summary</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[color:var(--md-text-secondary)]">Total Fee</span>
                  <span className="text-sm font-bold text-[color:var(--md-text-primary)]">
                    LKR {feeData.totalFee.toLocaleString()}
                  </span>
                </div>
                <div className="h-px w-full" style={{ background: "var(--md-border)" }} />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[color:var(--md-text-secondary)]">Total Paid</span>
                  <span className="text-sm font-bold" style={{ color: "var(--color-mint)" }}>
                    LKR {feeData.paid.toLocaleString()}
                  </span>
                </div>
                <div className="h-px w-full" style={{ background: "var(--md-border)" }} />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[color:var(--md-text-secondary)]">Remaining Due</span>
                  <span className="text-sm font-bold" style={{ color: "#ef4444" }}>
                    LKR {feeData.due.toLocaleString()}
                  </span>
                </div>
                <div className="h-px w-full" style={{ background: "var(--md-border)" }} />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[color:var(--md-text-secondary)]">Scholarships</span>
                  <span className="text-sm font-bold" style={{ color: "#fbbf24" }}>
                    LKR {feeData.scholarships.reduce((s, c) => s + c.amount, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Payment Gateway Modal */}
        {showPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => { if (!processing) setShowPaymentModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
              style={{
                background: "var(--md-card)",
                border: "1px solid var(--md-border)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--md-primary)]/10">
                    <CreditCard size={20} className="text-[color:var(--md-primary)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[color:var(--md-text-primary)]">Payment Gateway</h3>
                    <p className="text-xs text-[color:var(--md-text-secondary)]">Secure online payment</p>
                  </div>
                </div>
                {!processing && (
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--md-hover)] text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)] transition-colors"
                  >
                    &times;
                  </button>
                )}
              </div>

              {paymentSuccess ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center py-8"
                >
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 mb-4">
                    <CheckCircle size={40} className="text-[color:var(--md-success)]" />
                  </div>
                  <p className="text-xl font-black text-[color:var(--md-text-primary)]">Payment Successful!</p>
                  <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">
                    LKR {paymentAmount.toLocaleString()} has been processed
                  </p>
                </motion.div>
              ) : (
                <>
                  <div className="mb-5">
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[color:var(--md-text-secondary)]">
                      Amount
                    </label>
                    <div
                      className="flex items-center gap-2 rounded-xl px-4 py-3"
                      style={{
                        background: "var(--md-hover)",
                        border: "1px solid var(--md-border)",
                      }}
                    >
                      <span className="text-sm font-bold text-[color:var(--md-text-secondary)]">LKR</span>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        disabled={processing}
                        className="w-full bg-transparent text-lg font-black outline-none text-[color:var(--md-text-primary)]"
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[color:var(--md-text-secondary)]">
                      Payment Method
                    </label>
                    <div className="space-y-2">
                      {paymentMethods.map((pm) => {
                        const Icon = pm.icon;
                        return (
                          <label
                            key={pm.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-all ${
                              paymentMethod === pm.id
                                ? "bg-[#0d6efd]/10 border border-[#0d6efd]/30"
                                : "border border-[color:var(--md-border)] hover:bg-[color:var(--md-hover)]"
                            }`}
                          >
                            <input
                              type="radio"
                              name="paymentMethod"
                              value={pm.id}
                              checked={paymentMethod === pm.id}
                              onChange={() => setPaymentMethod(pm.id)}
                              disabled={processing}
                              className="appearance-none h-4 w-4 rounded-full border-2 border-[color:var(--md-text-secondary)] checked:border-[#0d6efd] checked:bg-[#0d6efd] transition-colors"
                            />
                            <Icon size={18} style={{ color: paymentMethod === pm.id ? "#0d6efd" : "var(--md-text-secondary)" }} />
                            <span className="text-sm font-semibold" style={{ color: paymentMethod === pm.id ? "var(--md-text-primary)" : "var(--md-text-secondary)" }}>
                              {pm.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    onClick={handlePayment}
                    disabled={processing}
                    className="w-full rounded-xl py-3.5 text-sm font-bold transition-all duration-200"
                    style={{
                      background: processing
                        ? "rgba(13,110,253,0.5)"
                        : "linear-gradient(135deg, #0d6efd, #0754c9)",
                      color: "#fff",
                      boxShadow: processing ? "none" : "0 4px 18px rgba(13,110,253,0.35)",
                    }}
                  >
                    {processing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      `Pay LKR ${paymentAmount.toLocaleString()}`
                    )}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  );
}