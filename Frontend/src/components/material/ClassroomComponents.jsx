import { motion } from "framer-motion";
import { Search, Upload, X } from "lucide-react";

export function DashboardCard({ title, value, detail, icon: Icon, children, className = "" }) {
  return (
    <motion.section whileHover={{ y: -2 }} transition={{ duration: 0.18 }} className={`classroom-card ${className}`}>
      {(title || Icon) && (
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="classroom-section-title">{title}</h2>}
            {detail && <p className="classroom-body mt-1 text-[color:var(--md-text-secondary)]">{detail}</p>}
          </div>
          {Icon && <span className="classroom-icon-tile"><Icon size={20} /></span>}
        </div>
      )}
      {value !== undefined && <p className="text-[2rem] font-medium leading-tight text-[color:var(--md-text-primary)]">{value}</p>}
      {children}
    </motion.section>
  );
}

export function AssignmentCard({ title, subject, dueDate, status }) {
  return (
    <DashboardCard className="p-4">
      <p className="text-sm font-medium text-[color:var(--md-text-primary)]">{title}</p>
      <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">{subject}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-[color:var(--md-text-secondary)]">{dueDate}</span>
        <span className="rounded-full bg-[color:var(--md-hover)] px-3 py-1 text-xs font-medium text-[color:var(--md-text-secondary)]">{status}</span>
      </div>
    </DashboardCard>
  );
}

export function AnnouncementCard({ title, body, date }) {
  return (
    <DashboardCard className="p-4">
      <p className="text-sm font-medium text-[color:var(--md-text-primary)]">{title}</p>
      <p className="mt-2 classroom-body text-[color:var(--md-text-secondary)]">{body}</p>
      {date && <p className="mt-3 text-xs text-[color:var(--md-text-secondary)]">{date}</p>}
    </DashboardCard>
  );
}

export function AIChatBubble({ sender = "assistant", children }) {
  const isUser = sender === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${isUser ? "bg-[color:var(--md-primary)] text-white" : "bg-[color:var(--md-hover)] text-[color:var(--md-text-primary)]"}`}>
        {children}
      </div>
    </div>
  );
}

export function FileUploader({ label = "Upload file", onFile, accept = ".pdf,.docx,.pptx,.txt" }) {
  return (
    <label className="classroom-upload">
      <Upload size={18} />
      <span>{label}</span>
      <input type="file" accept={accept} onChange={(event) => onFile?.(event.target.files?.[0])} className="hidden" />
    </label>
  );
}

export function GradeTable({ columns = [], rows = [] }) {
  return (
    <div className="classroom-table-wrap">
      <table className="classroom-table">
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index}>{columns.map((column) => <td key={column}>{row[column] ?? "-"}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NotificationDropdown({ items = [] }) {
  return (
    <div className="classroom-card w-80 p-2">
      {items.length ? items.map((item) => <AnnouncementCard key={item.id || item.title} {...item} />) : <p className="p-4 text-sm text-[color:var(--md-text-secondary)]">No notifications.</p>}
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder = "Search" }) {
  return (
    <div className="classroom-search">
      <Search size={18} />
      <input value={value} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function ModalComponent({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="classroom-modal-backdrop">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="classroom-modal">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="classroom-section-title">{title}</h2>
          <button type="button" onClick={onClose} className="classroom-icon-button"><X size={18} /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export function LoadingSkeleton() {
  return <div className="classroom-skeleton" />;
}
