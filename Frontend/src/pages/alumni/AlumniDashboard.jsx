import { useEffect, useState } from "react";
import { BriefcaseBusiness, GraduationCap, HeartHandshake, UserRound } from "lucide-react";
import GlassCard from "../../components/GlassCard.jsx";
import { apiFetch } from "../../lib/api.js";

export default function AlumniDashboard({ user }) {
  const [profile, setProfile] = useState(null); const [error, setError] = useState("");
  useEffect(()=>{ apiFetch("/api/alumni/me").then(setProfile).catch(err=>setError(err.message)); },[]);
  const cards = [["Programme",profile?.programme,GraduationCap],["Graduation Year",profile?.graduationYear,GraduationCap],["Employment",profile?.employmentStatus,BriefcaseBusiness],["Alumni Interests",profile?.interests?.length||0,HeartHandshake]];
  return <section className="space-y-6"><div className="pb-5" style={{borderBottom:"1px solid var(--md-border)"}}><p className="portal-page-label">Alumni Portal</p><h1 className="portal-page-title">Welcome back, {user?.name || "Alumni"}</h1><p className="portal-page-subtitle">Stay connected with ATI Jaffna and explore opportunities to support the community.</p></div>{error&&<div className="portal-alert-danger">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value,Icon])=><GlassCard key={label} className="p-5"><Icon size={23} className="text-[color:var(--md-primary)]"/><p className="portal-stat-label mt-4">{label}</p><p className="mt-2 font-black text-[color:var(--md-text-primary)]">{value||"Not provided"}</p></GlassCard>)}</div>
    <GlassCard className="p-6"><div className="flex items-center gap-3"><UserRound className="text-[color:var(--md-primary)]"/><div><h2 className="classroom-section-title">Alumni Profile</h2><p className="portal-page-subtitle">{profile?.studentRegistrationNumber} · {profile?.department}</p></div></div><div className="mt-5 grid gap-4 md:grid-cols-2"><p><b>Email:</b> {profile?.email}</p><p><b>Mobile:</b> {profile?.mobileNumber}</p><p><b>Batch:</b> {profile?.batch}</p><p><b>Current role:</b> {[profile?.jobTitle,profile?.companyName].filter(Boolean).join(" at ")||"Not provided"}</p></div></GlassCard>
  </section>;
}
