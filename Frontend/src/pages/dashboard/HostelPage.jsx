import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Bed, Users, Wifi, AlertTriangle, Clock, CheckCircle, XCircle, Utensils, Dumbbell, Calendar } from "lucide-react";
import GlassCard from "../../components/GlassCard";
import { hostelData } from "../../data";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const amenityIcons = {
  "Wi-Fi": Wifi,
  "Study Table": Bed,
  "Ceiling Fan": Clock,
  "Cupboard": Building2,
  "24/7 Water Supply": Clock,
  "Common Kitchen": Utensils
};

const visitorLog = [
  { name: "K. Sutharsan (Parent)", date: "2026-04-10", inTime: "10:30 AM", outTime: "02:00 PM" },
  { name: "P. Niroshan (Friend)", date: "2026-04-08", inTime: "04:00 PM", outTime: "06:30 PM" }
];

const roommateInfo = {
  name: "Yogarajah Niroshan",
  course: "HND in IT",
  year: 2,
  room: "H-204",
  joined: "2024-09"
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function HostelPage() {
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [newComplaint, setNewComplaint] = useState({ title: "", description: "" });
  const [complaints, setComplaints] = useState(hostelData.complaints);

  const handleRegisterComplaint = () => {
    if (!newComplaint.title.trim() || !newComplaint.description.trim()) return;
    setComplaints([
      ...complaints,
      {
        id: Date.now(),
        title: newComplaint.title,
        description: newComplaint.description,
        status: "pending",
        date: new Date().toISOString().split("T")[0],
        resolvedDate: ""
      }
    ]);
    setNewComplaint({ title: "", description: "" });
    setShowComplaintForm(false);
  };

  const feesPaid = hostelData.fees;

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
              <Building2 className="text-clay-accent" />
              Hostel Management
            </h1>
            <p className="text-clay-muted mt-1">{hostelData.block} &middot; Room {hostelData.roomNumber}</p>
          </motion.div>

          <motion.div variants={itemVariants} className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <GlassCard className="text-center">
              <p className="text-3xl font-black text-clay-accent">{hostelData.roomNumber}</p>
              <p className="text-clay-muted text-sm mt-1">Room Number</p>
            </GlassCard>
            <GlassCard className="text-center">
              <p className="text-3xl font-black text-blue-400">{hostelData.block}</p>
              <p className="text-clay-muted text-sm mt-1">Block</p>
            </GlassCard>
            <GlassCard className="text-center">
              <p className="text-3xl font-black text-green-400">1st Floor</p>
              <p className="text-clay-muted text-sm mt-1">Floor</p>
            </GlassCard>
            <GlassCard className="text-center">
              <p className="text-3xl font-black text-purple-400">Triple</p>
              <p className="text-clay-muted text-sm mt-1">Sharing Type</p>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants} className="grid lg:grid-cols-2 gap-6 mb-8">
            <GlassCard>
              <h2 className="text-lg font-bold text-clay-text flex items-center gap-2 mb-4">
                <Bed size={18} className="text-clay-accent" />
                Room Details
              </h2>
              <div className="space-y-3">
                {[
                  { label: "Room Number", value: hostelData.roomNumber },
                  { label: "Block", value: hostelData.block },
                  { label: "Floor", value: "1st Floor" },
                  { label: "Sharing Type", value: "Triple Sharing" },
                  { label: "Room Capacity", value: "3 Students" }
                ].map((d, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-clay-border/20 last:border-0">
                    <span className="text-clay-muted text-sm">{d.label}</span>
                    <span className="text-clay-text font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <h2 className="text-lg font-bold text-clay-text flex items-center gap-2 mb-4">
                <span className="text-clay-accent">&#9733;</span>
                Amenities
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {hostelData.amenities.map((amenity) => {
                  const Icon = amenityIcons[amenity] || Building2;
                  return (
                    <div key={amenity} className="flex items-center gap-3 p-3 rounded-lg border border-clay-border/30">
                      <Icon size={18} className="text-clay-accent shrink-0" />
                      <span className="text-sm text-clay-text">{amenity}</span>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants} className="grid lg:grid-cols-3 gap-6 mb-8">
            <GlassCard>
              <h2 className="text-lg font-bold text-clay-text flex items-center gap-2 mb-4">
                <Building2 size={18} className="text-clay-accent" />
                Fee Status
              </h2>
              <p className="text-4xl font-black text-green-400 mb-2">LKR {feesPaid.toLocaleString()}</p>
              <p className="text-sm text-clay-muted">Annual hostel fee &mdash; Paid in full</p>
              <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                <CheckCircle size={16} className="text-green-400 shrink-0" />
                <span className="text-sm text-green-400">No outstanding balance</span>
              </div>
            </GlassCard>

            <GlassCard className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-clay-text flex items-center gap-2">
                  <AlertTriangle size={18} className="text-clay-accent" />
                  Complaints
                </h2>
                <button
                  onClick={() => setShowComplaintForm(!showComplaintForm)}
                  className="px-4 py-2 text-sm bg-clay-accent/90 hover:bg-clay-accent text-[color:var(--md-text-primary)] rounded-lg transition-all font-medium"
                >
                  Register Complaint
                </button>
              </div>

              {showComplaintForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-4 p-4 rounded-lg border border-clay-border/30 space-y-3"
                >
                  <input
                    type="text"
                    placeholder="Complaint title"
                    value={newComplaint.title}
                    onChange={(e) => setNewComplaint({ ...newComplaint, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg clay-card text-clay-text placeholder-clay-muted/50 outline-none text-sm"
                  />
                  <textarea
                    placeholder="Describe the issue..."
                    value={newComplaint.description}
                    onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg clay-card text-clay-text placeholder-clay-muted/50 outline-none text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleRegisterComplaint}
                      className="px-4 py-2 text-sm bg-clay-accent text-[color:var(--md-text-primary)] rounded-lg font-medium"
                    >
                      Submit
                    </button>
                    <button
                      onClick={() => { setShowComplaintForm(false); setNewComplaint({ title: "", description: "" }); }}
                      className="px-4 py-2 text-sm clay-card text-clay-muted rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="space-y-3">
                {complaints.map((c) => (
                  <div key={c.id} className="p-3 rounded-lg border border-clay-border/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-clay-text font-medium text-sm">{c.title}</p>
                        <p className="text-xs text-clay-muted mt-0.5">{c.description}</p>
                        <p className="text-xs text-clay-muted mt-1 flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(c.date)}
                        </p>
                      </div>
                      <div>
                        {c.status === "resolved" ? (
                          <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                            <CheckCircle size={12} />
                            Resolved
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                            <Clock size={12} />
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                    {c.status === "resolved" && c.resolvedDate && (
                      <p className="text-xs text-green-400/70 mt-2">Resolved on {formatDate(c.resolvedDate)}</p>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div variants={itemVariants} className="grid lg:grid-cols-2 gap-6">
            <GlassCard>
              <h2 className="text-lg font-bold text-clay-text flex items-center gap-2 mb-4">
                <Users size={18} className="text-clay-accent" />
                Roommate Info
              </h2>
              <div className="flex items-center gap-4 p-4 rounded-lg border border-clay-border/30">
                <div className="w-14 h-14 rounded-full bg-clay-accent/10 flex items-center justify-center shrink-0">
                  <Users size={28} className="text-clay-accent" />
                </div>
                <div>
                  <p className="text-clay-text font-medium">{roommateInfo.name}</p>
                  <p className="text-sm text-clay-muted">{roommateInfo.course} &middot; Year {roommateInfo.year}</p>
                  <p className="text-xs text-clay-muted">Room {roommateInfo.room} &middot; Joined {roommateInfo.joined}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard>
              <h2 className="text-lg font-bold text-clay-text flex items-center gap-2 mb-4">
                <Clock size={18} className="text-clay-accent" />
                Visitor Entry Log
              </h2>
              <div className="space-y-3">
                {visitorLog.map((v, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-clay-border/30">
                    <div>
                      <p className="text-sm text-clay-text font-medium">{v.name}</p>
                      <p className="text-xs text-clay-muted">{formatDate(v.date)}</p>
                    </div>
                    <div className="text-right text-xs text-clay-muted">
                      <p>In: {v.inTime}</p>
                      <p>Out: {v.outTime}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
