import { BadgeCheck } from "lucide-react";
export default function VerifiedBadge({ status, compact=false }) { if(status!=="verified")return null; return <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-1 text-xs font-black text-sky-600" title="Verified ATI Jaffna alumni"><BadgeCheck size={compact?14:16}/>{compact?null:"Verified"}</span>; }
