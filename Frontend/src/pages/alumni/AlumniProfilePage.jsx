import { useEffect, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  Camera,
  ChevronDown,
  Edit3,
  FileText,
  GraduationCap,
  MapPin,
  Save,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import GlassCard from "../../components/GlassCard.jsx";
import ProfileAvatar from "../../components/alumni/ProfileAvatar.jsx";
import VerifiedBadge from "../../components/alumni/VerifiedBadge.jsx";
import PostCard from "../../components/alumni/PostCard.jsx";
import ProfileConnectionsCard from "../../components/alumni/ProfileConnectionsCard.jsx";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useModal } from "../../contexts/ModalContext.jsx";
import { alumniPhotoUrl, apiFetch } from "../../lib/api.js";

const interestsList = [
  "Join alumni events",
  "Become a student mentor",
  "Share job opportunities",
  "Offer internships",
  "Support guest lectures",
  "Join networking programmes",
  "Participate in donation campaigns",
  "Receive institute news and updates",
];
const documentTypes = [
  "Graduation Certificate",
  "Transcript",
  "Student Record Book",
  "Course Completion Letter",
];
const fields = {
  personal: [
    ["fullName", "Full Name"],
    ["nameWithInitials", "Name with Initials"],
    ["identityNumber", "NIC Number or Passport Number"],
    ["dateOfBirth", "Date of Birth", "date"],
    ["gender", "Gender", "select"],
    ["mobileNumber", "Mobile Number", "tel"],
    ["email", "Email Address", "email"],
    ["currentAddress", "Current Address"],
    ["introduction", "Personal Introduction"],
  ],
  academic: [
    ["studentRegistrationNumber", "Student Registration Number"],
    ["department", "Department"],
    ["programme", "Course / Programme"],
    ["batch", "Batch"],
    ["admissionAcademicYear", "Admission Academic Year"],
    ["graduationYear", "Graduation Year"],
    ["finalStudyYear", "Final Study Year"],
  ],
  employment: [
    ["employmentStatus", "Current Employment Status", "employment"],
    ["companyName", "Company / Organisation Name"],
    ["jobTitle", "Job Title"],
    ["industry", "Industry"],
    ["currentCountry", "Current Country"],
    ["currentCity", "Current City"],
    ["portfolioUrl", "Portfolio Link", "url"],
    ["linkedInUrl", "LinkedIn Link", "url"],
    ["githubUrl", "GitHub Link", "url"],
    ["personalWebsite", "Personal Website", "url"],
  ],
};

async function prepareProfileImage(file, maxWidth, maxHeight) {
  if (!file) return null;
  if (!/^image\/(png|jpeg|webp)$/i.test(file.type))
    throw new Error("Choose a PNG, JPEG, or WebP image.");
  if (file.size <= 8 * 1024 * 1024) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.84),
  );
  if (!blob || blob.size > 25 * 1024 * 1024)
    throw new Error(
      "The image is still larger than 25 MB after optimization. Choose a smaller image.",
    );
  return new File(
    [blob],
    `${file.name.replace(/\.[^.]+$/, "") || "alumni-photo"}.webp`,
    { type: "image/webp" },
  );
}

function EditField({ definition, form, setForm }) {
  const [name, label, type = "text"] = definition;
  const common = {
    value: form[name] || "",
    onChange: (event) =>
      setForm((current) => ({ ...current, [name]: event.target.value })),
    className: "portal-input mt-2 w-full",
  };
  return (
    <label className="text-sm font-bold text-[color:var(--md-text-primary)]">
      {label}
      {type === "select" ? (
        <select {...common}>
          <option value="">Select gender</option>
          {["Male", "Female", "Other", "Prefer not to say"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      ) : type === "employment" ? (
        <select {...common}>
          <option value="">Select status</option>
          {[
            "Employed",
            "Self-employed",
            "Seeking employment",
            "Studying",
            "Not currently employed",
            "Other",
            "Not provided",
          ].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          required={["fullName", "email", "studentRegistrationNumber"].includes(
            name,
          )}
          {...common}
        />
      )}
    </label>
  );
}

function CollapsibleSection({ title, icon: Icon, open, onToggle, children }) {
  return (
    <GlassCard className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="profile-accordion-heading"
        aria-expanded={open}
      >
        <span><Icon size={19} />{title}</span>
        <ChevronDown size={20} className={open ? "rotate-180" : ""} />
      </button>
      {open && <div className="border-t border-[color:var(--md-border)] p-6">{children}</div>}
    </GlassCard>
  );
}

function PhotoCropEditor({ task, onCancel, onApply }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const isProfile = task.kind === "profile";
  const width = isProfile ? 700 : 1200;
  const height = isProfile ? 700 : 450;
  const draw = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    const context = canvas.getContext("2d");
    const baseScale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const scale = baseScale * zoom;
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    context.clearRect(0, 0, width, height);
    context.drawImage(
      image,
      (width - drawWidth) / 2 + offset.x,
      (height - drawHeight) / 2 + offset.y,
      drawWidth,
      drawHeight,
    );
  };
  useEffect(draw, [zoom, offset, ready]);
  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setReady(true);
    };
    image.src = task.url;
  }, [task.url]);
  const finishCrop = async () => {
    const blob = await new Promise((resolve) =>
      canvasRef.current.toBlob(resolve, "image/webp", 0.9),
    );
    if (!blob) return;
    onApply(new File([blob], `${task.kind}-photo.webp`, { type: "image/webp" }));
  };
  return (
    <section className="alumni-photo-crop-editor">
      <header>
        <div><h3>Crop {isProfile ? "profile" : "cover"} photo</h3><p>Drag the photo to reposition it, then use zoom to frame it.</p></div>
        <button type="button" onClick={onCancel} aria-label="Cancel crop"><X size={20}/></button>
      </header>
      <div className={`alumni-crop-stage ${isProfile ? "profile" : "cover"}`}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = { x: event.clientX, y: event.clientY, offset };
          }}
          onPointerMove={(event) => {
            if (!dragRef.current) return;
            const ratio = width / event.currentTarget.getBoundingClientRect().width;
            const image = imageRef.current;
            const baseScale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * zoom;
            const maxX = Math.max(0, (image.naturalWidth * baseScale - width) / 2);
            const maxY = Math.max(0, (image.naturalHeight * baseScale - height) / 2);
            const nextX = dragRef.current.offset.x + (event.clientX - dragRef.current.x) * ratio;
            const nextY = dragRef.current.offset.y + (event.clientY - dragRef.current.y) * ratio;
            setOffset({
              x: Math.max(-maxX, Math.min(maxX, nextX)),
              y: Math.max(-maxY, Math.min(maxY, nextY)),
            });
          }}
          onPointerUp={() => { dragRef.current = null; }}
          onPointerCancel={() => { dragRef.current = null; }}
        />
      </div>
      <div className="alumni-crop-controls">
        <label>Zoom<input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => { setZoom(Number(event.target.value)); setOffset({ x: 0, y: 0 }); }}/></label>
        <button type="button" className="portal-btn" onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}>Reset</button>
        <button type="button" className="portal-btn-primary" disabled={!ready} onClick={finishCrop}>Apply crop</button>
      </div>
    </section>
  );
}

export default function AlumniProfilePage() {
  const { confirm, requestText } = useModal();
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({}),
    [interests, setInterests] = useState([]),
    [profilePhoto, setProfilePhoto] = useState(null),
    [coverPhoto, setCoverPhoto] = useState(null),
    [profilePreview, setProfilePreview] = useState(""),
    [coverPreview, setCoverPreview] = useState(""),
    [cropTask, setCropTask] = useState(null),
    [documentType, setDocumentType] = useState(""),
    [supportingDocument, setSupportingDocument] = useState(null),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [posts, setPosts] = useState([]),
    [connectionCount, setConnectionCount] = useState(0),
    [savedPostIds, setSavedPostIds] = useState(new Set()),
    [editingPostId, setEditingPostId] = useState(""),
    [editingPostContent, setEditingPostContent] = useState(""),
    [editingProfile, setEditingProfile] = useState(false),
    [openSections, setOpenSections] = useState({}),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  useEffect(() => {
    if (!profilePhoto) return setProfilePreview("");
    const url = URL.createObjectURL(profilePhoto);
    setProfilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [profilePhoto]);
  useEffect(() => {
    if (!coverPhoto) return setCoverPreview("");
    const url = URL.createObjectURL(coverPhoto);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverPhoto]);
  useEffect(() => {
    Promise.all([apiFetch("/api/alumni/me"), apiFetch("/api/feed?mine=true&limit=100"), apiFetch("/api/saved?type=post")])
      .then(([data, postData, savedItems]) => {
        setForm({
          ...data,
          dateOfBirth: data.dateOfBirth
            ? String(data.dateOfBirth).slice(0, 10)
            : "",
        });
        setInterests(data.interests || []);
        setDocumentType(data.supportingDocuments?.[0]?.documentType || "");
        setPosts(postData.data || []);
        setSavedPostIds(new Set(savedItems.map((item) => String(item.itemId))));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  const toggleSection = (key) =>
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  const startPostEdit = (post) => {
    setEditingPostId(post._id);
    setEditingPostContent(post.content || "");
  };
  const savePostEdit = async (post) => {
    try {
      const updated = await apiFetch(`/api/posts/${post._id}`, {
        method: "PUT",
        body: JSON.stringify({ content: editingPostContent }),
      });
      setPosts((current) => current.map((item) => item._id === post._id ? { ...item, ...updated } : item));
      setEditingPostId("");
      setStatus("Post updated successfully.");
    } catch (err) { setError(err.message); }
  };
  const deletePost = async (post) => {
    if (!await confirm({ title: "Delete post?", message: "This alumni post will be permanently deleted.", confirmLabel: "Delete post", tone: "danger" })) return;
    try {
      await apiFetch(`/api/posts/${post._id}`, { method: "DELETE" });
      setPosts((current) => current.filter((item) => item._id !== post._id));
      setStatus("Post deleted.");
    } catch (err) { setError(err.message); }
  };
  const editPost = async (post) => {
    const content = await requestText({
      title: "Edit post",
      message: "Update the caption or text for this post.",
      placeholder: "Post text",
      defaultValue: post.content || "",
      confirmLabel: "Save post",
      allowEmpty: true,
    });
    if (content === null) return;
    try {
      const updated = await apiFetch(`/api/posts/${post._id}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      });
      setPosts((items) => items.map((item) => item._id === post._id ? { ...item, ...updated } : item));
      setStatus("Post updated successfully.");
    } catch (err) { setError(err.message); }
  };
  const reactToPost = async (post, type) => {
    const data = await apiFetch(`/api/posts/${post._id}/reaction`, { method: "PUT", body: JSON.stringify({ type }) });
    setPosts((items) => items.map((item) => item._id === post._id ? { ...item, reactions: data.reactions } : item));
  };
  const addPostComment = async (post, payload, parentId) => {
    const body = payload instanceof FormData ? payload : JSON.stringify({ content: payload, ...(parentId ? { parentId } : {}) });
    if (payload instanceof FormData && parentId) payload.append("parentId", parentId);
    const comments = await apiFetch(`/api/posts/${post._id}/comments`, { method: "POST", body });
    setPosts((items) => items.map((item) => item._id === post._id ? { ...item, comments } : item));
  };
  const reactToComment = async (post, commentId, type, active = true) => {
    const reactions = await apiFetch(`/api/posts/${post._id}/comments/${commentId}/reaction`, {
      method: "PUT",
      body: JSON.stringify({ type, active }),
    });
    const update = (comment) => ({
      ...comment,
      ...(String(comment._id) === String(commentId) ? { reactions } : {}),
      ...(comment.replies?.length ? { replies: comment.replies.map(update) } : {}),
    });
    setPosts((items) => items.map((item) => item._id === post._id ? { ...item, comments: (item.comments || []).map(update) } : item));
  };
  const removePostComment = async (post, commentId) => {
    await apiFetch(`/api/posts/${post._id}/comments/${commentId}`, { method: "DELETE" });
    setPosts((items) => items.map((item) => item._id === post._id
      ? { ...item, comments: (item.comments || []).filter((comment) => String(comment._id) !== String(commentId) && String(comment.parentId || "") !== String(commentId)) }
      : item));
  };
  const toggleSavedPost = async (post, saved) => {
    if (saved) await apiFetch(`/api/saved/item/post/${post._id}`, { method: "DELETE" });
    else await apiFetch("/api/saved", { method: "POST", body: JSON.stringify({ itemType: "post", itemId: post._id }) });
    setSavedPostIds((current) => {
      const next = new Set(current);
      if (saved) next.delete(String(post._id)); else next.add(String(post._id));
      return next;
    });
  };
  const voteOnPost = async (post, optionId) => {
    const pollOptions = await apiFetch(`/api/posts/${post._id}/poll-vote`, { method: "PUT", body: JSON.stringify({ optionId }) });
    setPosts((items) => items.map((item) => item._id === post._id ? { ...item, pollOptions } : item));
  };
  const sharePost = async (post, content) => {
    await apiFetch(`/api/posts/${post._id}/share`, {
      method: "POST",
      body: JSON.stringify({ content, visibility: "verified_alumni" }),
    });
    const data = await apiFetch("/api/feed?mine=true&limit=100");
    setPosts(data.data || []);
  };
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const payload = new FormData();
      const arrayFields = [
        "skills",
        "professionalQualifications",
        "higherEducationQualifications",
        "achievements",
        "employmentHistory",
      ];
      Object.entries(form).forEach(([key, value]) => {
        if (
          ![
            "_id",
            "supportingDocuments",
            "interests",
            "createdAt",
            "updatedAt",
            "__v",
            "studentRecordSnapshot",
            ...arrayFields,
          ].includes(key) &&
          value !== null &&
          value !== undefined
        )
          payload.append(key, value);
      });
      arrayFields.forEach((key) =>
        payload.append(key, JSON.stringify(form[key] || [])),
      );
      payload.append("interests", JSON.stringify(interests));
      if (profilePhoto) payload.append("profilePhoto", profilePhoto);
      if (coverPhoto) payload.append("coverPhoto", coverPhoto);
      if (supportingDocument) {
        payload.append("documentTypes", JSON.stringify([documentType]));
        payload.append("supportingDocuments", supportingDocument);
      }
      const data = await apiFetch("/api/alumni/me", {
        method: "PUT",
        body: payload,
      });
      setForm({
        ...data.alumni,
        dateOfBirth: data.alumni.dateOfBirth
          ? String(data.alumni.dateOfBirth).slice(0, 10)
          : "",
      });
      setInterests(data.alumni.interests || []);
      setProfilePhoto(null);
      setCoverPhoto(null);
      setSupportingDocument(null);
      setStatus(data.message);
      setEditingProfile(false);
      updateUser({
        ...user,
        name: data.alumni.fullName,
        email: data.alumni.email,
        alumniProfile: {
          ...user.alumniProfile,
          studentRegistrationNumber: data.alumni.studentRegistrationNumber,
          department: data.alumni.department,
          programme: data.alumni.programme,
          graduationYear: data.alumni.graduationYear,
          verificationStatus: data.alumni.verificationStatus,
          profilePhotoUrl: data.alumni.profilePhotoUrl,
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  const selectPhoto = async (event, kind) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setError("");
    try {
      if (!/^image\/(png|jpeg|webp)$/i.test(file.type))
        throw new Error("Choose a PNG, JPEG, or WebP image.");
      const url = URL.createObjectURL(file);
      setCropTask({ kind, file, url });
      setEditingProfile(true);
      input.value = "";
    } catch (err) {
      setError(err.message);
      input.value = "";
    }
  };
  if (loading)
    return <div className="py-16 text-center">Loading alumni profile...</div>;
  return (
    <form onSubmit={submit} className="alumni-linkedin-profile space-y-6">
      {error && <div className="portal-alert-danger">{error}</div>}
      {status && <div className="portal-alert-success">{status}</div>}
      <section className="alumni-facebook-profile-hero">
        <div
          className="alumni-profile-cover"
          style={
            coverPreview || form.coverPhotoUrl
              ? {
                  backgroundImage: `url(${coverPreview || alumniPhotoUrl(form.coverPhotoUrl)})`,
                }
              : undefined
          }
        >
          <label className="alumni-cover-edit">
            <Camera size={18} />
            <span>Edit cover photo</span>
            <input
              hidden
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => selectPhoto(event, "cover")}
            />
          </label>
        </div>
        <div className="alumni-profile-summary">
          <div className="alumni-profile-avatar">
            <div className="alumni-profile-avatar-frame">
              <ProfileAvatar
                name={form.fullName}
                url={profilePreview || form.profilePhotoUrl}
                size="lg"
              />
              <label className="alumni-avatar-edit" title="Change profile photo">
                <Camera size={18} />
                <input
                  hidden
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => selectPhoto(event, "profile")}
                />
              </label>
            </div>
          </div>
          <div className="alumni-profile-identity">
            <div className="alumni-profile-name">
              <h1>{form.fullName || "Alumni"}</h1>
              <VerifiedBadge status={form.verificationStatus} />
            </div>
            <b>{posts.length} post{posts.length === 1 ? "" : "s"} <span aria-hidden="true">·</span> {connectionCount} connection{connectionCount === 1 ? "" : "s"}</b>
            <p>{form.jobTitle || form.programme || "Alumni member"}{form.companyName ? ` at ${form.companyName}` : ""}</p>
            <div className="alumni-profile-facts">
              {(form.currentCity || form.currentCountry) && <span><MapPin size={15}/>{[form.currentCity, form.currentCountry].filter(Boolean).join(", ")}</span>}
              {form.programme && <span><GraduationCap size={15}/>{form.programme}</span>}
              {form.companyName && <span><BriefcaseBusiness size={15}/>{form.companyName}</span>}
            </div>
          </div>
          <div className="alumni-profile-owner-actions">
            <button type="button" onClick={() => setEditingProfile(true)} className="portal-btn-primary"><Edit3 size={16}/>Edit profile</button>
            <button type="submit" disabled={saving} className="portal-btn"><Save size={16}/>{saving ? "Saving…" : "Save changes"}</button>
          </div>
        </div>
        {form.introduction && <p className="alumni-profile-introduction">{form.introduction}</p>}
      </section>
      <ProfileConnectionsCard alumniId={form._id} onCountChange={setConnectionCount} />
      <GlassCard className="alumni-profile-activity p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="portal-page-label">Activity</p>
            <h2 className="text-xl font-black">My Posts</h2>
          </div>
          <span className="portal-badge portal-badge-neutral">{posts.length} post{posts.length === 1 ? "" : "s"}</span>
        </div>
        <div className="alumni-profile-post-feed">
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              currentUser={user}
              onReact={reactToPost}
              onComment={addPostComment}
              onReactComment={reactToComment}
              onDeleteComment={removePostComment}
              onSave={() => toggleSavedPost(post, false)}
              saved={savedPostIds.has(String(post._id))}
              onToggleSave={toggleSavedPost}
              onEdit={editPost}
              onDelete={deletePost}
              onReport={() => {}}
              onVote={voteOnPost}
              onShare={sharePost}
            />
          ))}
        </div>
        <div className="profile-post-legacy hidden">
          {posts.map((post) => (
            <article key={post._id} className="profile-post-card">
              <header>
                <div><b className="capitalize">{post.postType.replaceAll("_", " ")}</b><small>{new Date(post.createdAt).toLocaleString()}{post.edited ? " · Edited" : ""}</small></div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => startPostEdit(post)} className="portal-btn"><Edit3 size={15}/>Edit</button>
                  <button type="button" onClick={() => deletePost(post)} className="portal-btn-danger"><Trash2 size={15}/>Delete</button>
                </div>
              </header>
              {editingPostId === post._id ? (
                <div className="mt-3">
                  <textarea value={editingPostContent} onChange={(event) => setEditingPostContent(event.target.value)} maxLength={10000} className="portal-input min-h-28 w-full"/>
                  <div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setEditingPostId("")} className="portal-btn">Cancel</button><button type="button" onClick={() => savePostEdit(post)} className="portal-btn-primary"><Save size={15}/>Save post</button></div>
                </div>
              ) : <p className="mt-3 whitespace-pre-wrap">{post.content || "(Media post)"}</p>}
              {post.originalPost && (
                <div className="alumni-reshared-post mt-3">
                  <header>
                    <ProfileAvatar name={post.originalPost.author?.name} url={post.originalPost.author?.alumniProfile?.profilePhotoUrl}/>
                    <div><b>{post.originalPost.author?.name || "Alumni"}</b><small>{new Date(post.originalPost.createdAt).toLocaleString()}</small></div>
                  </header>
                  {post.originalPost.content && <p>{post.originalPost.content}</p>}
                  {post.originalPost.media?.length > 0 && (
                    <div className="alumni-reshared-media">
                      {post.originalPost.media.map((item) => item.mimeType?.startsWith("image/")
                        ? <img key={item.url} src={item.url} alt={item.originalName || "Shared post"}/>
                        : <a key={item.url} href={item.url} target="_blank" rel="noreferrer"><FileText size={18}/>{item.originalName}</a>)}
                    </div>
                  )}
                </div>
              )}
              {post.media?.length > 0 && <div className="profile-post-media">{post.media.map((item) => item.mimeType?.startsWith("image/") ? <img key={item.url} src={item.url} alt={item.originalName || "Post attachment"}/> : <a key={item.url} href={item.url} target="_blank" rel="noreferrer"><FileText size={18}/>{item.originalName}</a>)}</div>}
              <footer>{post.reactions?.length || 0} reactions · {post.comments?.length || 0} comments · {post.visibility.replaceAll("_", " ")}</footer>
            </article>
          ))}
          {!posts.length && <p className="py-8 text-center text-[color:var(--md-text-secondary)]">You have not shared any posts yet.</p>}
        </div>
      </GlassCard>
      {editingProfile && (
      <section className="alumni-profile-editor-page" aria-labelledby="alumni-profile-editor-title">
          <header>
            <div>
              <p className="portal-page-label">Alumni profile</p>
              <h2 id="alumni-profile-editor-title">Edit profile</h2>
              <p>Update each part of your profile below, then save your changes.</p>
            </div>
            <button type="button" onClick={() => setEditingProfile(false)} aria-label="Close profile editor"><X size={22}/></button>
          </header>
          <div className="alumni-profile-editor-content">
      {cropTask && (
        <PhotoCropEditor
          task={cropTask}
          onCancel={() => {
            URL.revokeObjectURL(cropTask.url);
            setCropTask(null);
          }}
          onApply={(file) => {
            if (cropTask.kind === "profile") setProfilePhoto(file);
            else setCoverPhoto(file);
            URL.revokeObjectURL(cropTask.url);
            setCropTask(null);
          }}
        />
      )}
      {[
        ["Personal Information", UserRound, "personal"],
        ["Academic Information", GraduationCap, "academic"],
        ["Employment Information", BriefcaseBusiness, "employment"],
      ].map(([title, Icon, key]) => (
        <CollapsibleSection key={key} title={title} icon={Icon} open={!!openSections[key]} onToggle={() => toggleSection(key)}>
          <div className="grid gap-4 md:grid-cols-2">
            {fields[key].map((definition) => (
              <EditField
                key={definition[0]}
                definition={definition}
                form={form}
                setForm={setForm}
              />
            ))}
          </div>
        </CollapsibleSection>
      ))}
      <CollapsibleSection title="Profile and Cover Photos" icon={UserRound} open={!!openSections.photos} onToggle={() => toggleSection("photos")}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold">
            Profile photo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => selectPhoto(event, "profile")}
              className="portal-input mt-2 w-full"
            />
            <span className="mt-1 block text-xs font-normal text-[color:var(--md-text-secondary)]">
              PNG, JPEG or WebP · maximum 25 MB · large images are optimized
              automatically
            </span>
            {profilePhoto && (
              <span className="mt-1 block text-xs text-emerald-600">
                Ready: {profilePhoto.name} (
                {(profilePhoto.size / 1024 / 1024).toFixed(1)} MB)
              </span>
            )}
          </label>
          <label className="text-sm font-bold">
            Cover photo
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => selectPhoto(event, "cover")}
              className="portal-input mt-2 w-full"
            />
            <span className="mt-1 block text-xs font-normal text-[color:var(--md-text-secondary)]">
              PNG, JPEG or WebP · maximum 25 MB · large images are optimized
              automatically
            </span>
            {coverPhoto && (
              <span className="mt-1 block text-xs text-emerald-600">
                Ready: {coverPhoto.name} (
                {(coverPhoto.size / 1024 / 1024).toFixed(1)} MB)
              </span>
            )}
          </label>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Professional Details" icon={BriefcaseBusiness} open={!!openSections.professional} onToggle={() => toggleSection("professional")}>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["skills", "Skills"],
            ["professionalQualifications", "Professional Qualifications"],
            [
              "higherEducationQualifications",
              "Higher-Education Qualifications",
            ],
            ["achievements", "Achievements and Awards"],
          ].map(([key, label]) => (
            <label key={key} className="text-sm font-bold">
              {label}
              <textarea
                value={(form[key] || []).join(", ")}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [key]: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  }))
                }
                className="portal-input mt-2 min-h-20 w-full"
                placeholder="Separate entries with commas"
              />
            </label>
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ["mentorAvailable", "Available as a mentor"],
            ["recruitmentAvailable", "Open to recruitment"],
            ["businessOwner", "Business owner"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={!!form[key]}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    [key]: event.target.checked,
                  }))
                }
              />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-5 text-sm font-bold">
          Profile completion: {form.profileCompletion || 0}%
        </p>
      </CollapsibleSection>
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="alumni-form-title">
            <BriefcaseBusiness size={19} />
            Employment History
          </h2>
          <button
            type="button"
            className="portal-btn"
            onClick={() =>
              setForm((current) => ({
                ...current,
                employmentHistory: [
                  ...(current.employmentHistory || []),
                  {
                    company: "",
                    jobTitle: "",
                    startYear: "",
                    endYear: "",
                    description: "",
                  },
                ],
              }))
            }
          >
            Add Position
          </button>
        </div>
        <div className="space-y-4">
          {(form.employmentHistory || []).map((job, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg bg-[color:var(--md-hover)] p-4 md:grid-cols-2"
            >
              <input
                value={job.company || ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    employmentHistory: current.employmentHistory.map(
                      (item, i) =>
                        i === index
                          ? { ...item, company: event.target.value }
                          : item,
                    ),
                  }))
                }
                className="portal-input"
                placeholder="Company"
              />
              <input
                value={job.jobTitle || ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    employmentHistory: current.employmentHistory.map(
                      (item, i) =>
                        i === index
                          ? { ...item, jobTitle: event.target.value }
                          : item,
                    ),
                  }))
                }
                className="portal-input"
                placeholder="Job title"
              />
              <input
                value={job.startYear || ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    employmentHistory: current.employmentHistory.map(
                      (item, i) =>
                        i === index
                          ? { ...item, startYear: event.target.value }
                          : item,
                    ),
                  }))
                }
                className="portal-input"
                placeholder="Start year"
              />
              <input
                value={job.endYear || ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    employmentHistory: current.employmentHistory.map(
                      (item, i) =>
                        i === index
                          ? { ...item, endYear: event.target.value }
                          : item,
                    ),
                  }))
                }
                className="portal-input"
                placeholder="End year or Present"
              />
              <textarea
                value={job.description || ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    employmentHistory: current.employmentHistory.map(
                      (item, i) =>
                        i === index
                          ? { ...item, description: event.target.value }
                          : item,
                    ),
                  }))
                }
                className="portal-input md:col-span-2"
                placeholder="Role description"
              />
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    employmentHistory: current.employmentHistory.filter(
                      (_, i) => i !== index,
                    ),
                  }))
                }
                className="portal-btn-danger"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </GlassCard>
      <GlassCard className="p-6">
        <h2 className="alumni-form-title">
          <GraduationCap size={19} />
          Alumni Interests
        </h2>
        <div className="alumni-checkbox-grid">
          {interestsList.map((item) => (
            <label key={item}>
              <input
                type="checkbox"
                checked={interests.includes(item)}
                onChange={(event) =>
                  setInterests((current) =>
                    event.target.checked
                      ? [...current, item]
                      : current.filter((value) => value !== item),
                  )
                }
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </GlassCard>
      <GlassCard className="p-6">
        <h2 className="alumni-form-title">
          <FileText size={19} />
          Supporting Document
        </h2>
        <p className="alumni-section-help">
          Leave these fields unchanged to keep the current document, or select a
          type and file to replace it.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <select
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
            className="portal-input"
          >
            <option value="">Select document type</option>
            {documentTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
            onChange={(event) =>
              setSupportingDocument(event.target.files?.[0] || null)
            }
            className="portal-input"
          />
        </div>
      </GlassCard>
      <button type="submit" disabled={saving} className="portal-btn-primary">
        <Save size={17} />
        {saving ? "Saving..." : "Save All Changes"}
      </button>
          </div>
      </section>
      )}
    </form>
  );
}
