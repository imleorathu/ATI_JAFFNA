import { useState } from "react";
import { motion } from "framer-motion";
import { Book, BookOpen, Search, QrCode, Clock, AlertTriangle, Download, Calendar } from "lucide-react";
import GlassCard from "../../components/GlassCard";
import { libraryData, subjects } from "../../data";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const ebookLinks = [
  { title: "Clean Code (eBook)", url: "#" },
  { title: "Database System Concepts (PDF)", url: "#" },
  { title: "Introduction to Algorithms (eBook)", url: "#" },
  { title: "JavaScript: The Good Parts (PDF)", url: "#" }
];

function getDaysRemaining(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showQr, setShowQr] = useState(false);

  const borrowed = libraryData.borrowed;
  const activeBorrowed = borrowed.filter(b => b.status === "active");
  const overdueBorrowed = borrowed.filter(b => b.status === "overdue");
  const fineAmount = libraryData.fines;
  const totalBooks = libraryData.totalBooks;

  const filteredSubjects = subjects.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isOverdue = (b) => b.status === "overdue" || getDaysRemaining(b.dueDate) < 0;

  return (
    <section className="page-section py-8">
      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-8">
            <h1 className="text-3xl font-black text-clay-text flex items-center gap-3">
              <BookOpen className="text-clay-accent" />
              Smart Library
            </h1>
            <p className="text-clay-muted mt-1">ATI Jaffna Central Library &mdash; {totalBooks.toLocaleString()} books in collection</p>
          </motion.div>

          <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <GlassCard className="text-center">
              <p className="text-3xl font-black text-clay-accent">{totalBooks.toLocaleString()}</p>
              <p className="text-clay-muted text-sm mt-1">Total Books</p>
            </GlassCard>
            <GlassCard className="text-center">
              <p className="text-3xl font-black text-blue-400">{activeBorrowed.length}</p>
              <p className="text-clay-muted text-sm mt-1">Borrowed</p>
            </GlassCard>
            <GlassCard className="text-center">
              <p className="text-3xl font-black text-orange-400">{borrowed.length}</p>
              <p className="text-clay-muted text-sm mt-1">Due</p>
            </GlassCard>
            <GlassCard className="text-center">
              <p className="text-3xl font-black text-red-400">LKR {fineAmount}</p>
              <p className="text-clay-muted text-sm mt-1">Fines</p>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-clay-muted" size={20} />
              <input
                type="text"
                placeholder="Search books, authors, subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl clay-card text-clay-text placeholder-clay-muted/50 outline-none focus:ring-2 focus:ring-clay-accent/50 transition-all"
              />
            </div>
            {searchQuery && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-clay-muted mb-2">Books matching &ldquo;{searchQuery}&rdquo; in subjects:</p>
                {filteredSubjects.length > 0 ? (
                  filteredSubjects.map(s => (
                    <GlassCard key={s.code} className="flex items-center gap-3 py-3">
                      <Book size={18} className="text-clay-accent shrink-0" />
                      <div>
                        <p className="text-clay-text font-medium">{s.name}</p>
                        <p className="text-xs text-clay-muted">{s.code} &middot; {s.lecturer}</p>
                      </div>
                    </GlassCard>
                  ))
                ) : (
                  <p className="text-clay-muted text-sm">No subjects found for &ldquo;{searchQuery}&rdquo;</p>
                )}
              </div>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className="grid lg:grid-cols-2 gap-6 mb-8">
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-clay-text flex items-center gap-2">
                  <Book size={18} className="text-clay-accent" />
                  Currently Borrowed
                </h2>
                <span className="text-xs text-clay-muted">{borrowed.length} books</span>
              </div>
              <div className="space-y-3">
                {borrowed.map((b) => {
                  const overdue = isOverdue(b);
                  const days = getDaysRemaining(b.dueDate);
                  return (
                    <div key={b.id} className={`p-3 rounded-lg border ${overdue ? "border-red-500/30 bg-red-500/5" : "border-clay-border/30"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-clay-text font-medium truncate">{b.title}</p>
                          <p className="text-sm text-clay-muted">{b.author}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-clay-muted">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              Borrowed: {formatDate(b.borrowDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              Due: {formatDate(b.dueDate)}
                            </span>
                          </div>
                        </div>
                        <div>
                          {overdue ? (
                            <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                              <AlertTriangle size={12} />
                              {Math.abs(days)}d overdue
                            </span>
                          ) : (
                            <span className="text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                              {days}d left
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-clay-text flex items-center gap-2">
                  <Clock size={18} className="text-clay-accent" />
                  Borrowing History
                </h2>
                <span className="text-xs text-clay-muted">Last 4 returns</span>
              </div>
              <div className="space-y-3">
                {libraryData.history.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-clay-border/30">
                    <div className="w-8 h-8 rounded-lg bg-clay-accent/10 flex items-center justify-center shrink-0">
                      <Book size={16} className="text-clay-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-clay-text font-medium text-sm truncate">{h.title}</p>
                      <p className="text-xs text-clay-muted">{h.author}</p>
                    </div>
                    <div className="text-right text-xs text-clay-muted shrink-0">
                      <p>{formatDate(h.borrowedDate)}</p>
                      <p className="text-green-400">&rarr; {formatDate(h.returnedDate)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants} className="grid lg:grid-cols-3 gap-6 mb-8">
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-clay-text flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-400" />
                  Fine Summary
                </h2>
              </div>
              <p className="text-4xl font-black text-red-400 mb-2">LKR {fineAmount}</p>
              <p className="text-sm text-clay-muted">Outstanding fines from overdue books</p>
              <div className="mt-4 space-y-2">
                {borrowed.filter(b => b.status === "overdue").map(b => (
                  <div key={b.id} className="flex justify-between text-sm">
                    <span className="text-clay-text truncate">{b.title}</span>
                    <span className="text-red-400 font-medium shrink-0">LKR 50</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-clay-text flex items-center gap-2">
                  <QrCode size={18} className="text-clay-accent" />
                  QR Borrow
                </h2>
              </div>
              <p className="text-sm text-clay-muted mb-4">Scan to borrow or return books instantly</p>
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => setShowQr(!showQr)}
                  className="w-full py-3 rounded-xl bg-clay-accent/90 hover:bg-clay-accent text-[color:var(--md-text-primary)] font-medium transition-all"
                >
                  {showQr ? "Hide QR Code" : "Generate QR Code"}
                </button>
                {showQr && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-48 h-48 rounded-xl clay-card flex items-center justify-center"
                  >
                    <div className="text-center">
                      <QrCode size={120} className="text-clay-accent mx-auto" />
                      <p className="text-xs text-clay-muted mt-2">Scan at library desk</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-clay-text flex items-center gap-2">
                  <Download size={18} className="text-clay-accent" />
                  E-Book Access
                </h2>
              </div>
              <p className="text-sm text-clay-muted mb-4">Digital resources available 24/7</p>
              <div className="space-y-2">
                {ebookLinks.map((ebook, i) => (
                  <a
                    key={i}
                    href={ebook.url}
                    className="flex items-center gap-3 p-3 rounded-lg border border-clay-border/30 hover:border-clay-accent/30 transition-all group"
                  >
                    <BookOpen size={16} className="text-clay-accent shrink-0" />
                    <span className="text-sm text-clay-text group-hover:text-clay-accent transition-colors truncate">
                      {ebook.title}
                    </span>
                    <Download size={14} className="text-clay-muted ml-auto shrink-0" />
                  </a>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
