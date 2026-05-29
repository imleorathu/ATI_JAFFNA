import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight, Clock, Download, Edit3, MapPin, Plus, RefreshCw, Save, Trash2, User, X } from "lucide-react";
import GlassCard from "../../components/GlassCard.jsx";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { apiFetch, downloadCsv } from "../../lib/api.js";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const dayShort = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const departments = [
  "Higher National Diploma in Accountancy - (HNDA)",
  "Higher National Diploma in English",
  "Higher National Diploma in Engineering - Civil",
  "Higher National Diploma in Engineering - Electrical",
  "Higher National Diploma in Management - (HNDM)",
  "Higher National Diploma in Information Technology - (HNDIT)",
  "Higher National Diploma in Quantity Surveying"
];
const hnditDepartment = "Higher National Diploma in Information Technology - (HNDIT)";
const hnditAcademicStages = ["First year Full Time", "Second year Full Time", "First year Part Time", "Second year Part Time"];
const specialPeriods = ["Free Period", "Interval"];
const defaultTimeSlots = ["08:00 - 09:00","09:00 - 10:00","10:00 - 11:00","11:00 - 12:00","12:00 - 01:00","01:00 - 02:00","02:00 - 03:00"];
const timePattern = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s*-\s*(0?[1-9]|1[0-2]):[0-5][0-9]$/;
const emptyForm = { department: departments[0], academicStage: "", day: "Monday", time: "08:00 - 09:00", subject: "", lecturer: "", room: "" };

/* Subject color palette — uses CSS variables for theme safety */
const subjectPalette = [
  { bg: "rgba(26,115,232,.1)",  border: "rgba(26,115,232,.3)",  text: "#1a73e8" },
  { bg: "rgba(139,92,246,.1)", border: "rgba(139,92,246,.3)", text: "#7c3aed" },
  { bg: "rgba(25,184,144,.1)", border: "rgba(25,184,144,.3)", text: "#19b890" },
  { bg: "rgba(251,188,5,.1)",  border: "rgba(251,188,5,.3)",  text: "#f59e0b" },
  { bg: "rgba(13,202,240,.1)", border: "rgba(13,202,240,.3)", text: "#0dcaf0" },
];
const neutralPalette = { bg: "var(--md-hover)", border: "var(--md-border)", text: "var(--md-text-secondary)" };
const breakPalette   = { bg: "rgba(251,188,5,.06)", border: "rgba(251,188,5,.25)", text: "#f59e0b" };

function isNonClassPeriod(subject) { return ["Lunch Break", "Free Period", "Interval"].includes(subject); }
function getCurrentDayIndex() { const d = new Date().getDay(); return d >= 1 && d <= 5 ? d - 1 : 0; }
function getWeekDisplay() {
  const now = new Date(), s = new Date(now);
  s.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  const e = new Date(s); e.setDate(s.getDate() + 4);
  const fmt = (d) => `${d.getDate()} ${d.toLocaleString("default",{month:"short"})}`;
  return `${fmt(s)} – ${fmt(e)}, ${now.getFullYear()}`;
}
function parseSlotTime(v) { const [h="0",m="0"]=String(v||"").trim().split(":"); let hr=Number(h); if(hr>0&&hr<7)hr+=12; return hr*60+Number(m); }
function parseTimeRange(t) { const [s,e]=String(t||"").split(/\s*-\s*/); if(!s||!e) return{start:null,end:null}; return{start:parseSlotTime(s),end:parseSlotTime(e)}; }
function normalizeTimeRange(t) { const [s,e]=String(t||"").trim().split(/\s*-\s*/); const pad=(v)=>{const[h="",m=""]=String(v||"").split(":"); return`${h.padStart(2,"0")}:${m.padStart(2,"0")}`}; return`${pad(s)} - ${pad(e)}`; }
function isCurrentTimeSlot(t) { const now=new Date(),cur=now.getHours()*60+now.getMinutes(),{start,end}=parseTimeRange(t); if(start===null||end===null)return false; return cur>=start&&cur<end; }
function sortEntries(arr) { return [...arr].sort((a,b)=>{const d=days.indexOf(a.day)-days.indexOf(b.day); if(d!==0)return d; const{start:as}=parseTimeRange(a.time),{start:bs}=parseTimeRange(b.time); if(as===null&&bs===null)return 0; if(as===null)return 1; if(bs===null)return-1; return as-bs;}); }
function groupByDay(arr) { return days.map((day)=>({day,periods:sortEntries(arr.filter((e)=>e.day===day))})); }
function buildTimeSlots(arr) { return Array.from(new Set(arr.map((e)=>e.time).filter(Boolean))).sort((a,b)=>{const{start:as}=parseTimeRange(a),{start:bs}=parseTimeRange(b); if(as===null&&bs===null)return 0; if(as===null)return 1; if(bs===null)return-1; return as-bs;}); }
function findPeriodsForSlot(periods,slot) { const ex=periods.filter(p=>p.time===slot); if(ex.length)return ex; const{start:ss,end:se}=parseTimeRange(slot); return periods.filter(p=>{const{start,end}=parseTimeRange(p.time); return start!==null&&end!==null&&ss!==null&&se!==null&&start<=ss&&end>=se;}); }
function getStats(dayData) {
  if(!dayData) return{classes:0,hours:0,free:0};
  const classes=dayData.periods.filter(p=>!isNonClassPeriod(p.subject)&&p.subject).length;
  const hours=dayData.periods.reduce((acc,p)=>{if(isNonClassPeriod(p.subject)||!p.subject)return acc; const{start,end}=parseTimeRange(p.time); if(start===null||end===null)return acc+1; return acc+Math.max(0,(end-start)/60);},0);
  return{classes,hours:Number(hours.toFixed(1)),free:Math.max(0,6-classes)};
}
function colorForSubject(subject) {
  if(subject==="Lunch Break"||subject==="Free Period") return neutralPalette;
  if(subject==="Interval") return breakPalette;
  let seed=0; for(let i=0;i<String(subject||"").length;i++) seed+=subject.charCodeAt(i);
  return subjectPalette[seed%subjectPalette.length];
}

export default function TimetablePage() {
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase();
  const canManage = ["admin","lecturer"].includes(role);
  const isFaculty = role === "lecturer";
  const [selectedDay, setSelectedDay] = useState(getCurrentDayIndex());
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [facultyScope, setFacultyScope] = useState(null);
  const [overviewGroupFilter, setOverviewGroupFilter] = useState("all");

  const overviewEntries = useMemo(() => entries.filter(e => overviewGroupFilter==="all"||(e.academicStage||"")===overviewGroupFilter), [entries,overviewGroupFilter]);
  const timetable = useMemo(() => groupByDay(entries), [entries]);
  const overviewTimetable = useMemo(() => groupByDay(overviewEntries), [overviewEntries]);
  const overviewTimeSlots = useMemo(() => buildTimeSlots(overviewEntries), [overviewEntries]);
  const currentDayData = timetable[selectedDay];
  const stats = getStats(currentDayData);

  const loadData = async () => {
    setLoading(true); setError(""); setStatus("");
    try {
      const [data, scopeData] = await Promise.all([
        apiFetch("/api/timetable"),
        isFaculty ? apiFetch("/api/students/my-department").catch(()=>null) : Promise.resolve(null)
      ]);
      setEntries(Array.isArray(data) ? sortEntries(data) : []);
      if(scopeData) setFacultyScope(scopeData);
    } catch(err) { setError(err?.message||"Unable to load timetable."); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadData(); }, []);

  const navigateDay = (dir) => setSelectedDay(c => dir==="prev" ? (c>0?c-1:days.length-1) : (c<days.length-1?c+1:0));
  const resetForm = () => { setForm({...emptyForm,department:facultyScope?.faculty?.department||emptyForm.department,day:days[selectedDay]}); setEditingId(""); setShowForm(false); };
  const startCreate = () => { setError(""); setStatus(""); setForm({...emptyForm,department:facultyScope?.faculty?.department||emptyForm.department,day:days[selectedDay]}); setEditingId(""); setShowForm(true); };
  const startEdit = (entry) => { setError(""); setStatus(""); setForm({department:entry.department||departments[0],academicStage:entry.academicStage||"",day:entry.day||days[selectedDay],time:entry.time||"08:00 - 09:00",subject:entry.subject||"",lecturer:entry.lecturer||"",room:entry.room||""}); setEditingId(entry._id); setShowForm(true); };

  const saveEntry = async (e) => {
    e.preventDefault(); setSaving(true); setError(""); setStatus("");
    if(!timePattern.test(form.time.trim())) { setError("Use a valid time range like 08:00 - 09:00."); setSaving(false); return; }
    const{start,end}=parseTimeRange(form.time);
    if(start===null||end===null||end<=start) { setError("End time must be after start time."); setSaving(false); return; }
    const payload={...form,time:normalizeTimeRange(form.time),academicStage:(isFaculty?facultyScope?.faculty?.department:form.department)===hnditDepartment?form.academicStage:"",department:isFaculty?undefined:form.department};
    try {
      const saved=editingId ? await apiFetch(`/api/timetable/${editingId}`,{method:"PUT",body:JSON.stringify(payload)}) : await apiFetch("/api/timetable",{method:"POST",body:JSON.stringify(payload)});
      setEntries(cur=>sortEntries(editingId?cur.map(i=>i._id===saved._id?saved:i):[saved,...cur]));
      setStatus(editingId?"Timetable period updated.":"Timetable period created."); resetForm();
    } catch(err) { setError(err?.message||"Unable to save timetable entry."); }
    finally { setSaving(false); }
  };

  const deleteEntry = async (entry) => {
    if(!window.confirm(`Delete ${entry.subject} from ${entry.day}?`)) return;
    setError(""); setStatus("");
    try { await apiFetch(`/api/timetable/${entry._id}`,{method:"DELETE"}); setEntries(cur=>cur.filter(i=>i._id!==entry._id)); setStatus("Timetable period deleted."); }
    catch(err) { setError(err?.message||"Unable to delete."); }
  };

  const exportTimetable = () => {
    if(!entries.length){setError("No periods to export."); return;}
    downloadCsv("ati-timetable.csv", entries.map(e=>({department:e.department,group:e.academicStage||"All groups",day:e.day,time:e.time,subject:e.subject,lecturer:e.lecturer,room:e.room})));
    setStatus("Timetable exported.");
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="portal-page-header">
        <div>
          <p className="portal-page-label">{canManage?"Faculty":"Student"}</p>
          <h1 className="portal-page-title" style={{display:"flex",alignItems:"center",gap:"0.6rem"}}>
            <Calendar size={26} style={{color:"var(--md-primary)"}} /> Class Timetable
          </h1>
          <p className="portal-page-subtitle" style={{display:"flex",alignItems:"center",gap:"0.4rem"}}>
            <Clock size={13} /> Week: {getWeekDisplay()}
          </p>
          {isFaculty && <p className="mt-1 text-sm font-semibold" style={{color:"var(--md-success)"}}>Managing: {facultyScope?.faculty?.department||"your department"}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={loadData} className="portal-btn"><RefreshCw size={15} className={loading?"animate-spin":""}/> Refresh</button>
          <button type="button" onClick={exportTimetable} disabled={!entries.length} className="portal-btn"><Download size={15}/> Export</button>
          {canManage && <button type="button" onClick={startCreate} className="portal-btn-primary"><Plus size={15}/> Add Period</button>}
        </div>
      </div>

      {error  && <div className="portal-alert-danger">{error}</div>}
      {status && <div className="portal-alert-success">{status}</div>}

      {/* Form */}
      {showForm && canManage && (
        <GlassCard className="p-5">
          <form onSubmit={saveEntry} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="classroom-section-title">{editingId?"Edit Period":"Add Period"}</h2>
              <button type="button" onClick={resetForm} className="portal-btn" style={{padding:"0.35rem"}}><X size={16}/></button>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              {!isFaculty ? (
                <select value={form.department} onChange={e=>setForm(c=>({...c,department:e.target.value,academicStage:e.target.value===hnditDepartment?c.academicStage:""}))} className="portal-input">
                  {departments.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              ) : (
                <div className="portal-input" style={{cursor:"default",color:"var(--md-text-secondary)"}}>{facultyScope?.faculty?.department||form.department||"Your department"}</div>
              )}
              <select value={form.day} onChange={e=>setForm(c=>({...c,day:e.target.value}))} className="portal-input">
                {days.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
              {((isFaculty?facultyScope?.faculty?.department:form.department)===hnditDepartment) && (
                <select value={form.academicStage} onChange={e=>setForm(c=>({...c,academicStage:e.target.value}))} className="portal-input">
                  <option value="">All HNDIT groups</option>
                  {hnditAcademicStages.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              )}
              <label className="space-y-1">
                <input required value={form.time} onChange={e=>setForm(c=>({...c,time:e.target.value}))} list="tt-slots" placeholder="08:00 - 09:00" className="portal-input"/>
                <datalist id="tt-slots">{defaultTimeSlots.map(s=><option key={s} value={s}/>)}</datalist>
                <span className="portal-card-label" style={{display:"block",marginTop:"0.25rem"}}>Format: 08:00 - 09:00</span>
              </label>
              <label className="space-y-1">
                <input required value={form.subject} onChange={e=>setForm(c=>({...c,subject:e.target.value}))} list="tt-subjects" placeholder="Subject" className="portal-input"/>
                <datalist id="tt-subjects">{specialPeriods.map(p=><option key={p} value={p}/>)}</datalist>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {specialPeriods.map(p=>(
                    <button key={p} type="button" onClick={()=>setForm(c=>({...c,subject:p,lecturer:"",room:""}))} className="portal-btn" style={{fontSize:"0.7rem",padding:"0.2rem 0.6rem"}}>{p}</button>
                  ))}
                </div>
              </label>
              <input value={form.lecturer} onChange={e=>setForm(c=>({...c,lecturer:e.target.value}))} placeholder="Lecturer" className="portal-input"/>
              <input value={form.room} onChange={e=>setForm(c=>({...c,room:e.target.value}))} placeholder="Room" className="portal-input"/>
            </div>
            <button type="submit" disabled={saving} className="portal-btn-primary"><Save size={15}/> {saving?"Saving…":editingId?"Update Period":"Create Period"}</button>
          </form>
        </GlassCard>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {label:"Classes Today",   value:stats.classes, Icon:Calendar, color:"var(--md-primary)"},
          {label:"Total Hours",     value:stats.hours,   Icon:Clock,    color:"var(--md-success)"},
          {label:"Free Periods",    value:stats.free,    Icon:MapPin,   color:"var(--md-warning)"}
        ].map(({label,value,Icon,color},i)=>(
          <motion.div key={label} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*0.08}}>
            <div className="portal-stat-card">
              <div><p className="portal-stat-label">{label}</p><p className="portal-stat-value" style={{color}}>{value}</p></div>
              <div className="portal-stat-icon" style={{background:`${color}18`,color}}><Icon size={22}/></div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Navigator */}
      <GlassCard className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="classroom-section-title">Weekly Navigator</h2>
            <p className="mt-1 portal-page-subtitle">
              {isFaculty ? `Staff manage only ${facultyScope?.faculty?.department||"their department"} timetable.` : canManage ? "Admins manage all departments." : "Your department timetable."}
            </p>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            <button onClick={()=>navigateDay("prev")} className="portal-btn" style={{padding:"0.4rem"}} aria-label="Previous day"><ChevronLeft size={18}/></button>
            <div className="flex gap-1.5">
              {days.map((day,i)=>(
                <button key={day} onClick={()=>setSelectedDay(i)}
                  className={selectedDay===i?"portal-btn-primary":"portal-btn"}
                  style={{padding:"0.4rem 0.75rem",fontSize:"0.8rem"}}
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{dayShort[i]}</span>
                </button>
              ))}
            </div>
            <button onClick={()=>navigateDay("next")} className="portal-btn" style={{padding:"0.4rem"}} aria-label="Next day"><ChevronRight size={18}/></button>
          </div>
        </div>
      </GlassCard>

      {/* Day schedule + Overview grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Day list */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <h2 className="classroom-section-title">{currentDayData?.day||days[selectedDay]} Schedule</h2>
            <p className="mt-1 portal-page-subtitle">{loading?"Loading…":`${stats.classes} classes scheduled.`}</p>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={selectedDay} initial={{opacity:0,x:18}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-18}} transition={{duration:0.22}} className="relative pl-7">
              <div className="absolute bottom-2 left-3 top-2 w-px" style={{background:`linear-gradient(to bottom, var(--md-primary), transparent)`}}/>
              {!loading && currentDayData?.periods.length===0 ? (
                <GlassCard className="p-5"><p className="text-sm" style={{color:"var(--md-text-secondary)"}}>No periods for this day.</p></GlassCard>
              ) : currentDayData?.periods.map((period,i)=>{
                const pal=colorForSubject(period.subject);
                const isLunch=isNonClassPeriod(period.subject);
                return (
                  <motion.div key={period._id||i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}} className="relative mb-4">
                    <div className="absolute left-0 top-5 h-2.5 w-2.5 -translate-x-[1.05rem] rounded-full ring-4" style={{background:isLunch?"var(--md-border)":"var(--md-primary)",ringColor:"var(--md-card)"}}/>
                    <div className="classroom-card p-4" style={{borderLeft:`4px solid ${pal.border}`,background:pal.bg}}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="mb-2 flex items-center gap-1.5 font-mono text-xs" style={{color:"var(--md-text-secondary)"}}><Clock size={12}/>{period.time}</p>
                          <h3 className="font-semibold" style={{color:isLunch?"var(--md-text-secondary)":pal.text,fontStyle:isLunch?"italic":"normal"}}>{period.subject||"Free Period"}</h3>
                          {period.academicStage&&!isLunch&&(
                            <span className="mt-1.5 portal-badge portal-badge-info" style={{display:"inline-flex"}}>{period.academicStage}</span>
                          )}
                        </div>
                        {canManage&&(
                          <div className="flex gap-1 shrink-0">
                            <button type="button" onClick={()=>startEdit(period)} className="portal-btn" style={{padding:"0.3rem"}}><Edit3 size={14}/></button>
                            <button type="button" onClick={()=>deleteEntry(period)} className="portal-btn-danger" style={{padding:"0.3rem"}}><Trash2 size={14}/></button>
                          </div>
                        )}
                      </div>
                      {!isLunch&&period.lecturer&&<p className="mt-2 flex items-center gap-1.5 text-sm" style={{color:"var(--md-text-secondary)"}}><User size={13} style={{color:"var(--md-primary)"}}/>{period.lecturer}</p>}
                      {!isLunch&&period.room&&<p className="mt-1 flex items-center gap-1.5 text-sm" style={{color:"var(--md-text-secondary)"}}><MapPin size={13} style={{color:"var(--md-primary)"}}/>{period.room}</p>}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Weekly grid */}
        <div className="hidden lg:col-span-3 lg:block">
          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="classroom-section-title">Weekly Overview</h2>
              <p className="mt-1 portal-page-subtitle">Full week by time slot and day.</p>
            </div>
            <label className="space-y-1">
              <span className="portal-card-label">Student group</span>
              <select value={overviewGroupFilter} onChange={e=>setOverviewGroupFilter(e.target.value)} className="portal-input" style={{width:"16rem"}}>
                <option value="all">All groups</option>
                <option value="">All-group periods only</option>
                {hnditAcademicStages.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <div className="portal-table-wrap">
            <table className="portal-table" style={{minWidth:520}}>
              <thead>
                <tr>
                  <th>Time</th>
                  {days.map((day,i)=>(
                    <th key={day} style={{textAlign:"center",color:selectedDay===i?"var(--md-primary)":"var(--md-text-secondary)"}}>{dayShort[i]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {overviewTimeSlots.map(slot=>{
                  const isCurrent=isCurrentTimeSlot(slot);
                  return(
                    <tr key={slot} style={{background:isCurrent?"rgba(26,115,232,.05)":"transparent"}}>
                      <td style={{fontFamily:"monospace",fontSize:"0.75rem",whiteSpace:"nowrap",color:isCurrent?"var(--md-primary)":"var(--md-text-secondary)",fontWeight:isCurrent?700:400}}>{slot}</td>
                      {overviewTimetable.map((dayData,ci)=>{
                        const periods=findPeriodsForSlot(dayData.periods,slot);
                        const isSelDay=ci===selectedDay;
                        if(!periods.length) return <td key={dayData.day} style={{textAlign:"center",background:isSelDay?"rgba(26,115,232,.03)":""}}><span style={{color:"var(--md-border)"}}>–</span></td>;
                        return(
                          <td key={dayData.day} style={{background:isSelDay?"rgba(26,115,232,.03)":""}}>
                            <div style={{display:"flex",flexDirection:"column",gap:"0.25rem"}}>
                              {periods.map(p=>{
                                const pal=colorForSubject(p.subject);
                                return(
                                  <div key={p._id||p.subject} style={{borderRadius:8,border:`1px solid ${pal.border}`,background:pal.bg,padding:"0.35rem 0.5rem",textAlign:"center"}}>
                                    <p style={{fontSize:"0.7rem",fontWeight:700,color:pal.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.subject}</p>
                                    {p.academicStage&&!isNonClassPeriod(p.subject)&&<p style={{fontSize:"0.65rem",fontWeight:700,color:"var(--md-primary)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.academicStage}</p>}
                                    {p.room&&!isNonClassPeriod(p.subject)&&<p style={{fontSize:"0.65rem",color:"var(--md-text-secondary)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.room}</p>}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
