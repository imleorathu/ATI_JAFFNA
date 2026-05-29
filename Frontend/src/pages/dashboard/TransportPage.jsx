import { useState } from "react";
import { motion } from "framer-motion";
import { Bus, MapPin, Clock, Route, Navigation, Bell, Users, CreditCard } from "lucide-react";
import GlassCard from "../../components/GlassCard";
import { transportData } from "../../data";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const stopCoordinates = [
  { x: 15, y: 50 },
  { x: 25, y: 40 },
  { x: 40, y: 45 },
  { x: 55, y: 35 },
  { x: 70, y: 50 },
  { x: 85, y: 40 }
];

const studentCapacity = { current: 28, max: 45 };

export default function TransportPage() {
  const [alertSubscribed, setAlertSubscribed] = useState(false);

  return (
    <section className="space-y-6">
      <div className="mx-auto max-w-7xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-8">
            <p className="portal-page-label">Student</p>
            <h1 className="mt-2 flex items-center gap-3 text-2xl font-black text-[color:var(--md-text-primary)] sm:text-3xl">
              <Bus className="text-[color:var(--md-primary)]" />
              Transport Tracking
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-[color:var(--md-text-secondary)]">
              <Route size={14} />
              {transportData.route} &middot; Bus {transportData.busNumber}
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="grid md:grid-cols-4 gap-4 mb-8">
            <GlassCard className="text-center">
              <p className="text-3xl font-black text-[color:var(--md-primary)]">{transportData.busNumber}</p>
              <p className="portal-page-subtitle">Bus Number</p>
            </GlassCard>
            <GlassCard className="text-center">
              <p className="text-3xl font-black text-blue-400">{transportData.stops.length}</p>
              <p className="portal-page-subtitle">Stops</p>
            </GlassCard>
            <GlassCard className="text-center">
              <p className="text-3xl font-black text-green-400">{studentCapacity.current}</p>
              <p className="portal-page-subtitle">Students Onboard</p>
            </GlassCard>
            <GlassCard className="text-center">
              <p className="text-3xl font-black text-purple-400">LKR {transportData.fee}</p>
              <p className="portal-page-subtitle">Monthly Fee</p>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants} className="grid lg:grid-cols-2 gap-6 mb-8">
            <GlassCard dark>
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-lg font-bold text-[color:var(--md-text-primary)]">
                  <Navigation size={18} className="text-[color:var(--md-primary)]" />
                  Live Tracking
                </h2>
                <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Live
                </span>
              </div>
              <div className="relative h-64 w-full overflow-hidden rounded-lg border border-[color:var(--md-border)] bg-[#0f172a]/80">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-400/10 to-transparent" />
                <div className="absolute inset-0 p-6">
                  <div className="relative w-full h-full">
                    <svg className="w-full h-full" viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet">
                      <polyline
                        points={stopCoordinates.map(s => `${s.x},${s.y}`).join(" ")}
                        fill="none"
                        stroke="rgba(25, 184, 144, 0.4)"
                        strokeWidth="2"
                        strokeDasharray="4 3"
                      />
                      {stopCoordinates.map((s, i) => (
                        <g key={i}>
                          <circle cx={s.x} cy={s.y} r="2.5" fill={i === 3 ? "#19b890" : "rgba(148, 163, 184, 0.6)"} />
                          <text x={s.x} y={s.y - 5} textAnchor="middle" fontSize="3" fill="rgba(148, 163, 184, 0.8)">
                            {transportData.stops[i]}
                          </text>
                        </g>
                      ))}
                      <g>
                        <circle cx={stopCoordinates[3].x} cy={stopCoordinates[3].y} r="5" fill="rgba(25, 184, 144, 0.2)" />
                        <circle cx={stopCoordinates[3].x} cy={stopCoordinates[3].y} r="3" fill="#19b890" />
                        <Bus x={stopCoordinates[3].x - 4} y={stopCoordinates[3].y - 4} size={8} fill="#19b890" />
                      </g>
                    </svg>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0f172a] to-transparent p-3">
                      <p className="flex items-center gap-2 text-sm font-medium text-[color:var(--md-text-primary)]">
                        <MapPin size={14} className="text-[color:var(--md-primary)]" />
                        Currently at: Thirunagar
                      </p>
                      <p className="text-xs text-[color:var(--md-text-secondary)]">Arriving at ATI Jaffna in ~5 mins</p>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard dark>
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-lg font-bold text-[color:var(--md-text-primary)]">
                  <Route size={18} className="text-[color:var(--md-primary)]" />
                  Route Details
                </h2>
                <span className="text-xs text-[color:var(--md-text-secondary)]">{transportData.stops.length} stops</span>
              </div>
              <div className="space-y-1 mb-4">
                {transportData.stops.map((stop, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full border-2 ${i === transportData.stops.length - 1 ? "border-green-400 bg-green-400/20" : "border-[color:var(--md-border)]"} ${i <= 3 ? "border-sky-300 bg-sky-300/20" : ""}`} />
                      {i < transportData.stops.length - 1 && <div className="h-6 w-0.5 bg-[color:var(--md-hover)]" />}
                    </div>
                    <div className={`flex-1 py-1.5 ${i <= 3 ? "text-[color:var(--md-text-primary)]" : "text-[color:var(--md-text-secondary)]"} ${i === 3 ? "font-medium text-[color:var(--md-primary)]" : ""}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{stop}</span>
                        {i === 3 && <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">Current</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[color:var(--md-border)] p-3">
                  <p className="flex items-center gap-1 text-xs text-[color:var(--md-text-secondary)]">
                    <Clock size={12} />
                    Morning
                  </p>
                  <p className="mt-1 text-sm font-medium text-[color:var(--md-text-primary)]">{transportData.timings.morning}</p>
                </div>
                <div className="rounded-lg border border-[color:var(--md-border)] p-3">
                  <p className="flex items-center gap-1 text-xs text-[color:var(--md-text-secondary)]">
                    <Clock size={12} />
                    Evening
                  </p>
                  <p className="mt-1 text-sm font-medium text-[color:var(--md-text-primary)]">{transportData.timings.evening}</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants} className="grid lg:grid-cols-3 gap-6">
            <GlassCard dark>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[color:var(--md-text-primary)]">
                <CreditCard size={18} className="text-[color:var(--md-primary)]" />
                Transport Fee
              </h2>
              <p className="text-4xl font-black text-purple-400 mb-2">LKR {transportData.fee}</p>
              <p className="text-sm text-[color:var(--md-text-secondary)]">Monthly transport fee</p>
              <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm text-green-400">Paid for May 2026</span>
              </div>
            </GlassCard>

            <GlassCard dark>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[color:var(--md-text-primary)]">
                <Bell size={18} className="text-[color:var(--md-primary)]" />
                Delay Alerts
              </h2>
              <p className="mb-4 text-sm text-[color:var(--md-text-secondary)]">Get notified about bus delays and schedule changes</p>
              <button
                onClick={() => setAlertSubscribed(!alertSubscribed)}
                className={`w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  alertSubscribed
                    ? "bg-green-500/10 text-green-400 border border-green-500/30"
                    : "bg-sky-500 text-slate-950 hover:bg-sky-400"
                }`}
              >
                <Bell size={18} />
                {alertSubscribed ? "Subscribed" : "Subscribe to Alerts"}
              </button>
              {alertSubscribed && (
                <p className="text-xs text-green-400/70 mt-2 text-center">You will receive delay notifications via SMS &amp; email</p>
              )}
            </GlassCard>

            <GlassCard dark>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[color:var(--md-text-primary)]">
                <Users size={18} className="text-[color:var(--md-primary)]" />
                Student Capacity
              </h2>
              <div className="flex items-end gap-2 mb-2">
                <p className="text-4xl font-black text-blue-400">{studentCapacity.current}</p>
                <p className="mb-1 text-sm text-[color:var(--md-text-secondary)]">/ {studentCapacity.max}</p>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[color:var(--md-hover)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(studentCapacity.current / studentCapacity.max) * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"
                />
              </div>
              <p className="mt-2 text-xs text-[color:var(--md-text-secondary)]">
                {studentCapacity.max - studentCapacity.current} seats available
              </p>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
