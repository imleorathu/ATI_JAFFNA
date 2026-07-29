import { Link } from "react-router-dom";
import { Check, Clock3, MapPin, MessageCircle, UserPlus } from "lucide-react";
import ProfileAvatar from "./ProfileAvatar.jsx";
import VerifiedBadge from "./VerifiedBadge.jsx";

export default function AlumniProfileCard({ profile, onConnect, onMessage, busy = false }) {
  const connected = profile.connectionStatus === "accepted";
  const requested = profile.connectionStatus === "pending" && profile.connectionDirection === "sent";
  const incoming = profile.connectionStatus === "pending" && profile.connectionDirection === "received";
  return <article className="rounded-xl border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-5">
    <div className="flex gap-3"><ProfileAvatar name={profile.fullName} url={profile.profilePhotoUrl}/><div className="min-w-0"><div className="flex items-center gap-2"><Link to={`/alumni/directory/${profile._id}`} className="truncate font-black text-[color:var(--md-text-primary)] hover:text-sky-500">{profile.fullName}</Link><VerifiedBadge status={profile.verificationStatus} compact/></div><p className="truncate text-sm text-[color:var(--md-text-secondary)]">{profile.jobTitle || profile.programme}{profile.companyName ? ` at ${profile.companyName}` : ""}</p></div></div>
    <p className="mt-3 text-sm text-[color:var(--md-text-secondary)]">{profile.department} · {profile.batch}</p>
    {(profile.currentCity || profile.currentCountry) && <p className="mt-2 flex items-center gap-1 text-xs text-[color:var(--md-text-secondary)]"><MapPin size={13}/>{[profile.currentCity,profile.currentCountry].filter(Boolean).join(", ")}</p>}
    <div className="mt-4 flex flex-wrap gap-2">
      <Link to={`/alumni/directory/${profile._id}`} className="portal-btn flex-1 justify-center">View Profile</Link>
      {connected && <button onClick={() => onMessage(profile)} className="portal-btn-primary"><MessageCircle size={15}/>Message</button>}
      {requested && <button disabled className="portal-btn"><Clock3 size={15}/>Requested</button>}
      {incoming && <Link to="/alumni/connections" className="portal-btn-primary"><UserPlus size={15}/>Review request</Link>}
      {!connected && !requested && !incoming && onConnect && profile.userId && <button disabled={busy} onClick={() => onConnect(profile)} className="portal-btn-primary"><UserPlus size={15}/>Connect</button>}
      {connected && <span className="portal-badge portal-badge-success"><Check size={13}/>Connected</span>}
    </div>
  </article>;
}
