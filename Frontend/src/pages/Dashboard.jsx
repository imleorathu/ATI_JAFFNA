import { motion } from "framer-motion";
import { BarChart3, Bell, BookOpen, CalendarDays, FileUp, UserRound, WalletCards } from "lucide-react";
import GlassCard from "../components/GlassCard.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { adminItems, dashboardItems } from "../data.js";

const studentIcons = [UserRound, BookOpen, CalendarDays, Bell, BarChart3, FileUp, WalletCards];

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } }
};

export function StudentDashboard() {
  return (
    <section className="page-section">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Student" title="Student Dashboard" text="A focused space for course activity, notices, academic records, and payments." />
        <motion.div
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          {dashboardItems.map((item, index) => {
            const Icon = studentIcons[index];
            return (
              <motion.div key={item} variants={fadeUp}>
                <GlassCard>
                  <Icon className="text-clay-accent" size={28} />
                  <h3 className="mt-5 text-lg font-black text-clay-text">{item}</h3>
                  <p className="mt-2 text-sm text-clay-muted">Manage {item.toLowerCase()} information.</p>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

export function AdminDashboard() {
  return (
    <section className="page-section">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Admin" title="Admin Dashboard" text="Manage students, course content, events, notices, gallery items, and contact requests." />
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          {adminItems.map((item) => (
            <motion.div key={item} variants={fadeUp}>
              <GlassCard className="min-h-32">
                <p className="text-3xl font-black text-clay-accent">0</p>
                <h3 className="mt-3 text-lg font-black text-clay-text">{item}</h3>
                <p className="mt-1 text-sm text-clay-muted">Create, update, and review records.</p>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
