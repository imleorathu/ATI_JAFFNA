import {
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  ImagePlus,
  MapPin,
  Plus,
  Send,
  Smile,
  Tag,
  Trash2,
  Trophy,
  Vote,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api.js";
import ProfileAvatar from "./ProfileAvatar.jsx";
import VerifiedBadge from "./VerifiedBadge.jsx";

const types = [
  ["text", "General"],
  ["career_update", "Career update"],
  ["job_opportunity", "Job opportunity"],
  ["achievement", "Achievement"],
  ["event", "Event"],
  ["poll", "Poll"],
  ["question", "Question"],
  ["business_promotion", "Business"],
  ["mentorship_opportunity", "Mentorship"],
];
const activities = [
  "Happy 😊",
  "Excited 🤩",
  "Proud 🥹",
  "Grateful 🙏",
  "Motivated 💪🏻",
  "Loved ❤️",
  "Blessed 😇",
  "Celebrating 🎉",
  "Confident 😎",
  "Thoughtful 🤔",
  "Inspired ✨",
  "Started a new job 💼",
  "Received a promotion 🚀",
  "Completed a qualification 🎓",
  "Looking for opportunities 🔎",
  "Launching a business 🏢",
  "Offering mentorship 🤝",
];
const backgrounds = ["", "#0f172a", "#075985", "#6d28d9", "#be123c", "#166534"];

export default function PostComposer({ onCreated, verified, profile }) {
  const [content, setContent] = useState(""),
    [postType, setPostType] = useState("text"),
    [visibility, setVisibility] = useState("verified_alumni"),
    [files, setFiles] = useState([]),
    [pollOptions, setPollOptions] = useState(["", ""]),
    [pollClosesAt, setPollClosesAt] = useState(""),
    [multiple, setMultiple] = useState(false),
    [location, setLocation] = useState(""),
    [activity, setActivity] = useState(""),
    [backgroundColor, setBackgroundColor] = useState(""),
    [commentsEnabled, setCommentsEnabled] = useState(true),
    [sharingEnabled, setSharingEnabled] = useState(true),
    [hideReactionCounts, setHideReactionCounts] = useState(false),
    [details, setDetails] = useState({}),
    [query, setQuery] = useState(""),
    [matches, setMatches] = useState([]),
    [tags, setTags] = useState([]),
    [modalOpen, setModalOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url:
          file.type.startsWith("image/") || file.type.startsWith("video/")
            ? URL.createObjectURL(file)
            : null,
      })),
    [files],
  );
  useEffect(
    () => () =>
      previews.forEach((item) => item.url && URL.revokeObjectURL(item.url)),
    [previews],
  );
  useEffect(() => {
    if (query.trim().length < 2) {
      setMatches([]);
      return;
    }
    const id = setTimeout(() => {
      apiFetch(`/api/alumni-directory?q=${encodeURIComponent(query)}&limit=6`)
        .then((data) => setMatches(data.data || []))
        .catch(() => setMatches([]));
    }, 250);
    return () => clearTimeout(id);
  }, [query]);
  if (!verified)
    return (
      <div className="portal-alert-danger">
        Complete Alumni verification to create posts, react, comment, and
        connect.
      </div>
    );
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      body.append("content", content);
      body.append("postType", postType);
      body.append("visibility", visibility);
      body.append("commentsEnabled", commentsEnabled);
      body.append("sharingEnabled", sharingEnabled);
      body.append("hideReactionCounts", hideReactionCounts);
      body.append("location", location);
      body.append("feelingActivity", activity);
      body.append("backgroundColor", backgroundColor);
      body.append(
        "taggedUsers",
        JSON.stringify(tags.map((item) => item.userId)),
      );
      body.append("structuredData", JSON.stringify(details));
      if (postType === "poll") {
        body.append("pollOptions", JSON.stringify(pollOptions));
        body.append("pollClosesAt", pollClosesAt);
        body.append("pollMultipleAnswers", multiple);
      }
      files.forEach((file) => body.append("media", file));
      await onCreated(body);
      setContent("");
      setFiles([]);
      setTags([]);
      setQuery("");
      setDetails({});
      setPollOptions(["", ""]);
      setLocation("");
      setActivity("");
      setModalOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  const detailFields =
    postType === "job_opportunity"
      ? [
          ["jobTitle", "Job title"],
          ["company", "Company"],
          ["jobType", "Job type"],
          ["workplaceType", "Workplace type"],
          ["deadline", "Application deadline"],
          ["applicationLink", "Application link"],
        ]
      : postType === "event"
        ? [
            ["eventName", "Event name"],
            ["eventDate", "Date and time"],
            ["venue", "Venue / online link"],
            ["registrationLink", "Registration link"],
          ]
        : postType === "achievement"
          ? [
              ["title", "Achievement title"],
              ["organization", "Organization"],
              ["date", "Achievement date"],
            ]
          : postType === "career_update"
            ? [
                ["title", "Update title"],
                ["organization", "Company / organization"],
                ["date", "Effective date"],
              ]
            : [];
  return (
    <>
      <section className="alumni-create-post-trigger">
        <Link to="/alumni/profile" title="Open your profile">
          <ProfileAvatar name={profile?.fullName} url={profile?.profilePhotoUrl} />
        </Link>
        <button type="button" className="alumni-create-post-prompt" onClick={() => setModalOpen(true)}>
          What's on your mind, {profile?.fullName?.split(" ")[0] || "Alumni"}?
        </button>
        <button type="button" className="alumni-create-post-quick video" onClick={() => setModalOpen(true)} title="Add video"><Video size={24}/></button>
        <button type="button" className="alumni-create-post-quick photo" onClick={() => setModalOpen(true)} title="Add photo"><ImagePlus size={25}/></button>
        <button type="button" className="alumni-create-post-quick feeling" onClick={() => setModalOpen(true)} title="Add feeling"><Smile size={26}/></button>
      </section>
      {modalOpen && (
      <div className="alumni-create-post-backdrop" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) setModalOpen(false);
      }}>
      <form
      onSubmit={submit}
      className="alumni-create-post-modal"
    >
      <header className="alumni-create-post-modal-header">
        <h2>Create post</h2>
        <button type="button" onClick={() => setModalOpen(false)} disabled={saving} title="Close"><X size={25}/></button>
      </header>
      <div className="alumni-create-post-modal-body">
      <div className="flex gap-3">
        <Link
          to="/alumni/profile"
          className="h-fit rounded-full transition-transform hover:scale-105"
          title="Open and edit your alumni profile"
        >
          <ProfileAvatar
            name={profile?.fullName}
            url={profile?.profilePhotoUrl}
          />
        </Link>
        <div>
          <Link
            to="/alumni/profile"
            className="flex items-center gap-2 rounded font-black hover:text-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
            title="Open and edit your alumni profile"
          >
            {profile?.fullName || "Alumni"}
            <VerifiedBadge status="verified" compact />
          </Link>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="mt-1 rounded-md border border-[color:var(--md-border)] bg-transparent px-2 py-1 text-xs"
          >
            <option value="everyone">Everyone</option>
            <option value="verified_alumni">Verified alumni</option>
            <option value="students_alumni">Students and alumni</option>
            <option value="connections">Connections only</option>
            <option value="administrators">Administrators</option>
            <option value="only_me">Only me</option>
          </select>
        </div>
      </div>
      <textarea
        maxLength={10000}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={
          backgroundColor ? { backgroundColor, color: "white" } : undefined
        }
        className="alumni-create-post-textarea"
        placeholder={`What's on your mind, ${profile?.fullName?.split(" ")[0] || "Alumni"}?`}
      />
      <select value={postType} onChange={(event) => setPostType(event.target.value)} className="mt-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-sm font-bold">
        {types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      {detailFields.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {detailFields.map(([key, label]) => (
            <input
              key={key}
              type={
                key.includes("date") || key === "deadline"
                  ? "datetime-local"
                  : "text"
              }
              value={details[key] || ""}
              onChange={(e) =>
                setDetails((current) => ({ ...current, [key]: e.target.value }))
              }
              className="portal-input"
              placeholder={label}
            />
          ))}
        </div>
      )}
      {postType === "poll" && (
        <div className="mt-4 rounded-xl bg-[color:var(--md-hover)] p-4">
          <b>Poll choices</b>
          {pollOptions.map((option, index) => (
            <div key={index} className="mt-2 flex gap-2">
              <input
                value={option}
                onChange={(e) =>
                  setPollOptions((current) =>
                    current.map((item, i) =>
                      i === index ? e.target.value : item,
                    ),
                  )
                }
                className="portal-input flex-1"
                placeholder={`Choice ${index + 1}`}
              />
              {pollOptions.length > 2 && (
                <button
                  type="button"
                  onClick={() =>
                    setPollOptions((current) =>
                      current.filter((_, i) => i !== index),
                    )
                  }
                  className="portal-btn-danger"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPollOptions((current) => [...current, ""])}
            className="portal-btn mt-2"
          >
            <Plus size={14} />
            Add choice
          </button>
          <div className="mt-3 flex flex-wrap gap-4">
            <input
              type="datetime-local"
              value={pollClosesAt}
              onChange={(e) => setPollClosesAt(e.target.value)}
              className="portal-input"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={multiple}
                onChange={(e) => setMultiple(e.target.checked)}
              />
              Allow multiple answers
            </label>
          </div>
        </div>
      )}
      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {previews.map(({ file, url }, index) => (
            <div
              key={`${file.name}-${index}`}
              className="relative overflow-hidden rounded-lg border border-[color:var(--md-border)]"
            >
              {file.type.startsWith("image/") ? (
                <img
                  src={url}
                  className="h-36 w-full object-cover"
                  alt="Preview"
                />
              ) : file.type.startsWith("video/") ? (
                <video src={url} controls className="h-36 w-full" />
              ) : (
                <div className="flex h-36 flex-col items-center justify-center p-3 text-center">
                  <FileText />
                  <span className="mt-2 text-xs">{file.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() =>
                  setFiles((current) => current.filter((_, i) => i !== index))
                }
                className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              type="button"
              key={tag._id}
              onClick={() =>
                setTags((current) =>
                  current.filter((item) => item._id !== tag._id),
                )
              }
              className="portal-badge portal-badge-neutral"
            >
              @{tag.fullName} ×
            </button>
          ))}
        </div>
      )}
      <div className="alumni-create-post-tools">
      <b>Add to your post</b>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="portal-btn cursor-pointer">
          <ImagePlus size={16} />
          Photo/video/document
          <input
            hidden
            type="file"
            multiple
            accept="image/*,video/mp4,video/webm,.pdf,.doc,.docx,.ppt,.pptx"
            onChange={(e) =>
              setFiles((current) =>
                [...current, ...e.target.files].slice(0, 10),
              )
            }
          />
        </label>
        <label className="portal-search">
          <Tag size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent outline-none"
            placeholder="Tag alumni"
          />
        </label>
        {matches.length > 0 && (
          <div className="relative sm:col-start-2">
            <div className="absolute z-20 w-full rounded-lg border bg-[color:var(--md-card)] p-2 shadow-xl">
              {matches
                .filter((item) => !tags.some((tag) => tag._id === item._id))
                .map((item) => (
                  <button
                    type="button"
                    key={item._id}
                    onClick={() => {
                      setTags((c) => [...c, item]);
                      setQuery("");
                      setMatches([]);
                    }}
                    className="block w-full rounded p-2 text-left hover:bg-[color:var(--md-hover)]"
                  >
                    {item.fullName} · {item.department}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="portal-search">
          <Smile size={16} />
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            className="w-full bg-transparent outline-none"
          >
            <option value="">Feeling / activity</option>
            {activities.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="portal-search">
          <MapPin size={16} />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full bg-transparent outline-none"
            placeholder="Add location"
          />
        </label>
      </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs font-bold">Text background</span>
        {backgrounds.map((color) => (
          <button
            type="button"
            key={color || "none"}
            onClick={() => setBackgroundColor(color)}
            className={`h-6 w-6 rounded-full border-2 ${backgroundColor === color ? "border-sky-400" : "border-white/30"}`}
            style={{ background: color || "transparent" }}
            title={color || "None"}
          />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <label>
          <input
            type="checkbox"
            checked={commentsEnabled}
            onChange={(e) => setCommentsEnabled(e.target.checked)}
          />{" "}
          Allow comments
        </label>
        <label>
          <input
            type="checkbox"
            checked={sharingEnabled}
            onChange={(e) => setSharingEnabled(e.target.checked)}
          />{" "}
          Allow sharing
        </label>
        <label>
          <input
            type="checkbox"
            checked={hideReactionCounts}
            onChange={(e) => setHideReactionCounts(e.target.checked)}
          />{" "}
          Hide reaction counts
        </label>
      </div>
      {error && <p className="mt-3 text-sm font-semibold text-red-500">{error}</p>}
      <div className="alumni-create-post-submit">
        <button disabled={saving || (!content.trim() && !files.length && postType !== "poll")}>
          {saving ? "Posting..." : "Post"}
        </button>
      </div>
      </div>
    </form>
    </div>
    )}
    </>
  );
}
