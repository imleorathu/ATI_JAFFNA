import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BriefcaseBusiness, FileText, GraduationCap, HeartHandshake, LockKeyhole, Mail, Phone, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import OrganizationBrand from "../components/OrganizationBrand.jsx";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const interests = ["Join alumni events", "Become a student mentor", "Share job opportunities", "Offer internships", "Support guest lectures", "Join networking programmes", "Participate in donation campaigns", "Receive institute news and updates"];
const documentTypes = ["Graduation Certificate", "Transcript", "Student Record Book", "Course Completion Letter"];
const initialForm = { fullName: "", nameWithInitials: "", identityNumber: "", dateOfBirth: "", gender: "", mobileNumber: "", email: "", currentAddress: "", studentRegistrationNumber: "", department: "", programme: "", batch: "", admissionAcademicYear: "", graduationYear: "", finalStudyYear: "", employmentStatus: "", companyName: "", jobTitle: "", industry: "", password: "", confirmPassword: "" };

function Input({ label, required = true, ...props }) {
  return <label className="register-field"><span>{label}</span><div className="register-input-wrap"><UserRound size={17} /><input required={required} className="register-control" {...props} /></div></label>;
}
function Select({ label, children, ...props }) {
  return <label className="register-field"><span>{label}</span><div className="register-input-wrap"><GraduationCap size={17} /><select required className="register-control" {...props}>{children}</select></div></label>;
}

export default function AlumniRegister() {
  const [form, setForm] = useState(initialForm);
  const [departments, setDepartments] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [documentType, setDocumentType] = useState("");
  const [supportingDocument, setSupportingDocument] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const field = (name) => ({ value: form[name], onChange: (event) => setForm((current) => ({ ...current, [name]: event.target.value })) });

  useEffect(() => {
    fetch(`${API_BASE}/api/departments`)
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load departments.");
        return response.json();
      })
      .then((records) => setDepartments(Array.isArray(records) ? records.map((item) => item.name).filter(Boolean) : []))
      .catch(() => setError("Unable to load departments from the database. Please try again."));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    const submittedForm = event.currentTarget;
    setError(""); setSuccess("");
    if (form.password !== form.confirmPassword) return setError("Password and confirm password do not match.");
    setLoading(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      payload.append("interests", JSON.stringify(selectedInterests));
      if (profilePhoto) payload.append("profilePhoto", profilePhoto);
      if (!documentType || !supportingDocument) throw new Error("Select and upload one supporting document.");
      payload.append("documentTypes", JSON.stringify([documentType]));
      payload.append("supportingDocuments", supportingDocument);
      const response = await fetch(`${API_BASE}/api/alumni/register`, { method: "POST", body: payload });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to submit alumni registration.");
      setSuccess(data.message); setForm(initialForm); setSelectedInterests([]); setProfilePhoto(null); setDocumentType(""); setSupportingDocument(null);
      submittedForm.reset();
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return <section className="register-page-shell alumni-register-shell">
    <motion.div className="register-card alumni-register-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
      <aside className="register-brand-panel">
        <div><OrganizationBrand variant="login" /><p className="login-eyebrow"><Sparkles size={15} />ATI Jaffna Alumni Network</p><h1>Reconnect. Contribute. Grow.</h1><p className="login-brand-copy">Join the ATI Jaffna alumni community and stay connected with your institute and fellow graduates.</p></div>
        <div className="login-security-note"><ShieldCheck size={19} /><span>Your registration will be verified by an administrator.</span></div>
      </aside>
      <div className="register-form-panel">
        <div className="login-form-heading"><p>Alumni Registration</p><h2>Create your alumni account</h2><span>Complete the information below. Required fields are used to verify your ATI Jaffna alumni status.</span></div>
        <form onSubmit={submit} className="register-form alumni-register-form">
          <section><h3 className="alumni-form-title"><UserRound size={19}/>1. Personal Information</h3><div className="register-form-grid">
            <Input label="Full Name" {...field("fullName")} /><Input label="Name with Initials" {...field("nameWithInitials")} />
            <Input label="NIC Number or Passport Number" {...field("identityNumber")} /><Input label="Date of Birth" type="date" {...field("dateOfBirth")} />
            <Select label="Gender" {...field("gender")}><option value="">Select gender</option>{["Male","Female","Other","Prefer not to say"].map(x=><option key={x}>{x}</option>)}</Select>
            <label className="register-field"><span>Profile Photo</span><div className="register-input-wrap"><UserRound size={17}/><input className="register-control" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e)=>setProfilePhoto(e.target.files?.[0]||null)}/></div></label>
            <Input label="Mobile Number" type="tel" {...field("mobileNumber")} /><Input label="Email Address" type="email" {...field("email")} />
            <label className="register-field register-field-wide"><span>Current Address</span><div className="register-input-wrap"><Mail size={17}/><textarea required className="register-control alumni-textarea" {...field("currentAddress")}/></div></label>
          </div></section>
          <section><h3 className="alumni-form-title"><GraduationCap size={19}/>2. Academic Information</h3><div className="register-form-grid">
            <Input label="Student Registration Number" {...field("studentRegistrationNumber")} />
            <Select label="Department" disabled={!departments.length} {...field("department")}><option value="">{departments.length ? "Select department" : "Loading departments..."}</option>{departments.map(x=><option key={x} value={x}>{x}</option>)}</Select>
            <Input label="Course / Programme" {...field("programme")} /><Input label="Batch" placeholder="e.g. 2020 Batch" {...field("batch")} />
            <Input label="Admission Academic Year" placeholder="e.g. 2020/2021" {...field("admissionAcademicYear")} /><Input label="Graduation Year" placeholder="e.g. 2024" {...field("graduationYear")} />
            <Input label="Final Study Year" placeholder="e.g. Second Year" {...field("finalStudyYear")} />
          </div></section>
          <section><h3 className="alumni-form-title"><BriefcaseBusiness size={19}/>3. Employment Information</h3><div className="register-form-grid">
            <Select label="Current Employment Status" {...field("employmentStatus")}><option value="">Select status</option>{["Employed","Self-employed","Seeking employment","Studying","Not currently employed","Other"].map(x=><option key={x}>{x}</option>)}</Select>
            <Input label="Company / Organisation Name" required={false} {...field("companyName")} /><Input label="Job Title" required={false} {...field("jobTitle")} /><Input label="Industry" required={false} {...field("industry")} />
          </div></section>
          <section><h3 className="alumni-form-title"><HeartHandshake size={19}/>4. Alumni Interests</h3><div className="alumni-checkbox-grid">{interests.map(item=><label key={item}><input type="checkbox" checked={selectedInterests.includes(item)} onChange={(e)=>setSelectedInterests(current=>e.target.checked?[...current,item]:current.filter(x=>x!==item))}/><span>{item}</span></label>)}</div></section>
          <section><h3 className="alumni-form-title"><FileText size={19}/>5. Supporting Document</h3><p className="alumni-section-help">Select and upload exactly one of the following documents: Graduation Certificate, Transcript, Student Record Book, or Course Completion Letter.</p><div className="register-form-grid">
            <Select label="Document Type" value={documentType} onChange={(event)=>setDocumentType(event.target.value)}><option value="">Select one document type</option>{documentTypes.map(type=><option key={type} value={type}>{type}</option>)}</Select>
            <label className="register-field"><span>Upload Selected Document</span><div className="register-input-wrap"><FileText size={17}/><input required className="register-control" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp" onChange={(event)=>setSupportingDocument(event.target.files?.[0]||null)}/></div></label>
          </div></section>
          <section><h3 className="alumni-form-title"><LockKeyhole size={19}/>Login Credentials</h3><div className="register-form-grid"><Input label="Password" type="password" minLength={8} autoComplete="new-password" {...field("password")} /><Input label="Confirm Password" type="password" minLength={8} autoComplete="new-password" {...field("confirmPassword")} /></div></section>
          {error&&<div className="register-message register-message-error">{error}</div>}{success&&<div className="register-message register-message-success">{success}</div>}
          <button className="login-submit-button" disabled={loading}>{loading?"Submitting...":"Submit Alumni Registration"}</button>
          <div className="login-register-row"><p>Already registered?</p><Link to="/login">Sign in</Link></div>
        </form>
      </div>
    </motion.div>
  </section>;
}
