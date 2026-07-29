import {
  Bookmark,
  BookmarkCheck,
  Download,
  FileText,
  Flag,
  ImagePlus,
  MapPin,
  MessageCircle,
  Pencil,
  Share2,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../lib/api.js";
import ProfileAvatar from "./ProfileAvatar.jsx";
import VerifiedBadge from "./VerifiedBadge.jsx";
import { useModal } from "../../contexts/ModalContext.jsx";

const reactions = [
  ["like", "👍 Like"],
  ["celebrate", "🎉 Celebrate"],
  ["support", "❤️ Support"],
  ["helpful", "💡 Helpful"],
  ["interested", "⭐ Interested"],
];
const animatedReactions = [
  { type: "like", emoji: "\u{1F44D}", label: "Like", color: "#1684ff" },
  { type: "haha", emoji: "\u{1F606}", label: "Haha", color: "#f59e0b" },
  {
    type: "celebrate",
    emoji: "\u{1F389}",
    label: "Celebrate",
    color: "#f59e0b",
  },
  {
    type: "support",
    emoji: "\u2764\uFE0F",
    label: "Support",
    color: "#ef4444",
  },
  { type: "helpful", emoji: "\u{1F4A1}", label: "Helpful", color: "#eab308" },
  {
    type: "interested",
    emoji: "\u2B50",
    label: "Interested",
    color: "#8b5cf6",
  },
];

function CommentComposer({
  placeholder,
  submitLabel = "Comment",
  onSubmit,
  onCancel,
}) {
  const [value, setValue] = useState("");
  const [image, setImage] = useState(null);
  const [gifUrl, setGifUrl] = useState("");
  const [showGifInput, setShowGifInput] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const mention = value.match(/(?:^|\s)@([^@\s]*)$/)?.[1] ?? null;
  useEffect(() => {
    if (mention === null) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      apiFetch(`/api/alumni-directory?q=${encodeURIComponent(mention)}&limit=6`)
        .then((result) => setSuggestions(result.data || []))
        .catch(() => setSuggestions([]));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [mention]);
  useEffect(() => {
    if (!image) {
      setImagePreview("");
      return undefined;
    }
    const url = URL.createObjectURL(image);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  const selectMention = (alumni) => {
    setValue((current) => current.replace(/@[^@\s]*$/, `@${alumni.fullName} `));
    setSuggestions([]);
  };
  return (
    <form
      className="relative mt-3 flex gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!value.trim() && !image && !gifUrl.trim()) return;
        setSubmitting(true);
        setSubmitError("");
        try {
          const payload = new FormData();
          payload.append("content", value.trim());
          if (image) payload.append("media", image);
          if (gifUrl.trim()) {
            payload.append("gifUrl", gifUrl.trim());
            payload.append("gifSource", /tenor/i.test(gifUrl) ? "tenor" : "giphy");
          }
          await onSubmit(payload);
          setValue("");
          setImage(null);
          setGifUrl("");
          setShowGifInput(false);
        } catch (error) {
          setSubmitError(error.message || "Unable to send comment.");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <div className="relative flex-1">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="portal-input w-full"
          placeholder={placeholder}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="portal-btn cursor-pointer px-2 py-1 text-xs">
            <ImagePlus size={14} />
            Photo/GIF
            <input
              hidden
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => setImage(event.target.files?.[0] || null)}
            />
          </label>
          <button type="button" className="portal-btn px-2 py-1 text-xs" onClick={() => setShowGifInput((current) => !current)}>
            GIF URL
          </button>
          {image && <small className="max-w-40 truncate">{image.name}</small>}
        </div>
        {showGifInput && (
          <input
            value={gifUrl}
            onChange={(event) => setGifUrl(event.target.value)}
            className="portal-input mt-2 w-full text-xs"
            placeholder="Paste a direct GIPHY or Tenor GIF image URL"
          />
        )}
        {(imagePreview || gifUrl.trim()) && (
          <div className="alumni-comment-preview">
            <img src={imagePreview || gifUrl.trim()} alt="Comment attachment preview" />
            <button
              type="button"
              title="Remove attachment"
              onClick={() => {
                setImage(null);
                setGifUrl("");
              }}
            >
              ×
            </button>
          </div>
        )}
        {submitError && <p className="mt-2 text-xs font-semibold text-red-500">{submitError}</p>}
        {suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 z-40 mb-1 max-h-56 w-full overflow-auto rounded-xl border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-1 shadow-2xl">
            {suggestions.map((alumni) => (
              <button
                type="button"
                key={alumni._id}
                onClick={() => selectMention(alumni)}
                className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-[color:var(--md-hover)]"
              >
                <ProfileAvatar
                  name={alumni.fullName}
                  url={alumni.profilePhotoUrl}
                />
                <span>
                  <b className="block">{alumni.fullName}</b>
                  <small className="text-[color:var(--md-text-secondary)]">
                    {alumni.department} · {alumni.programme}
                  </small>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {onCancel && (
        <button type="button" onClick={onCancel} className="portal-btn">
          Cancel
        </button>
      )}
      <button className="portal-btn" disabled={submitting || (!value.trim() && !image && !gifUrl.trim())}>
        <MessageCircle size={15} />
        {submitting ? "Sending..." : submitLabel}
      </button>
    </form>
  );
}

function CommentReactionPicker({ item, currentUserId, onReact }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const myReaction = item.reactions?.find(
    (reaction) => String(reaction.user?._id || reaction.user) === currentUserId,
  )?.type;
  const selected = animatedReactions.find((reaction) => reaction.type === myReaction);
  const choose = async (reaction) => {
    if (busy) return;
    setBusy(true);
    try {
      await onReact(reaction.type, myReaction !== reaction.type);
      setOpen(false);
    } catch {
      // The feed displays the API error while leaving the current reaction intact.
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="alumni-comment-reaction"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.92 }}
            className="alumni-comment-reaction-picker"
          >
            {animatedReactions.map((reaction) => (
              <motion.button
                type="button"
                key={reaction.type}
                whileHover={{ scale: 1.35, y: -3 }}
                title={reaction.label}
                disabled={busy}
                onClick={(event) => {
                  event.stopPropagation();
                  choose(reaction);
                }}
              >
                {reaction.emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        className={selected ? "selected" : ""}
        title={selected?.label || "React to comment"}
        disabled={busy}
        onClick={(event) => {
          event.stopPropagation();
          choose(selected || animatedReactions[0]);
        }}
      >
        <span>{selected?.emoji || <ThumbsUp size={14} strokeWidth={1.8} />}</span>
        {item.reactions?.length > 0 && <small>{item.reactions.length}</small>}
      </button>
    </div>
  );
}

function CommentThreadItem({
  item,
  allComments,
  depth,
  replyingTo,
  setReplyingTo,
  onReply,
  currentUser,
  postAuthorId,
  onReactComment,
  onDeleteComment,
}) {
  const flatChildren = allComments.filter(
    (comment) => String(comment.parentId || "") === String(item._id),
  );
  const children = [...(item.replies || []), ...flatChildren];
  const currentUserId = String(currentUser?.id || currentUser?._id || "");
  const canDelete = currentUserId === String(item.author?._id || item.author) ||
    currentUserId === String(postAuthorId || "");
  const commentAuthorPath = currentUserId === String(item.author?._id || item.author)
    ? "/alumni/profile"
    : item.author?.alumniProfile?.alumniId
      ? `/alumni/directory/${item.author.alumniProfile.alumniId}`
      : null;
  return (
    <div
      style={{ marginLeft: `${Math.min(depth, 6) * 12}px` }}
      className="alumni-comment-thread"
    >
      {commentAuthorPath ? (
        <Link to={commentAuthorPath} title={`View ${item.author?.name || "alumni"} profile`}>
          <ProfileAvatar name={item.author?.name} url={item.author?.alumniProfile?.profilePhotoUrl} />
        </Link>
      ) : (
        <ProfileAvatar name={item.author?.name} url={item.author?.alumniProfile?.profilePhotoUrl} />
      )}
      <div className="min-w-0 flex-1">
        <div className="relative w-fit max-w-full">
          <div className="alumni-comment-bubble">
            {commentAuthorPath ? (
              <Link to={commentAuthorPath} className="block w-fit font-bold hover:text-sky-500 hover:underline">
                {item.author?.name || "Alumni"}
              </Link>
            ) : <b>{item.author?.name || "Alumni"}</b>}
            {item.content && <p className="whitespace-pre-wrap">{item.content}</p>}
            <CommentReactionPicker
              item={item}
              currentUserId={currentUserId}
              onReact={(type, active) => onReactComment(item._id, type, active)}
            />
          </div>
          {item.media?.map((media) => (
            <a key={media.url} href={media.url} target="_blank" rel="noreferrer" className="alumni-comment-media-wrap">
              <img src={media.url} alt={media.originalName || "Comment attachment"} className="alumni-comment-media" />
            </a>
          ))}
        </div>
        <div className="alumni-comment-actions">
          <time>{new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time>
        <button type="button" onClick={() => setReplyingTo(item._id)} className="font-bold text-sky-500 hover:underline">Reply</button>
        {canDelete && (
          <button type="button" onClick={() => onDeleteComment(item._id)} className="font-bold text-red-500 hover:underline">Delete</button>
        )}
        </div>
      {replyingTo === item._id && (
        <CommentComposer
          placeholder={`Reply to ${item.author?.name || "alumni"}… Use @ to mention someone`}
          submitLabel="Reply"
          onCancel={() => setReplyingTo(null)}
          onSubmit={async (content) => {
            await onReply(content, item._id);
            setReplyingTo(null);
          }}
        />
      )}
      {children.length > 0 && (
        <div className="alumni-comment-children">
          {children.map((child) => (
            <CommentThreadItem
              key={child._id}
              item={child}
              allComments={allComments}
              depth={depth + 1}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              onReply={onReply}
              currentUser={currentUser}
              postAuthorId={postAuthorId}
              onReactComment={onReactComment}
              onDeleteComment={onDeleteComment}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

function ReactionPicker({ post, currentUser, onReact }) {
  const userId = String(currentUser?.id || currentUser?._id || "");
  const existing = post.reactions?.find(
    (item) => String(item.user?._id || item.user) === userId,
  )?.type;
  const [selected, setSelected] = useState(existing || "");
  const [open, setOpen] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const pressTimer = useRef(null);
  const longPressed = useRef(false);
  const chosen = animatedReactions.find((item) => item.type === selected);
  const choose = async (reaction) => {
    await onReact(post, reaction.type);
    setSelected(reaction.type);
    setOpen(false);
    setPulsing(true);
    window.setTimeout(() => setPulsing(false), 420);
  };
  const startLongPress = () => {
    longPressed.current = false;
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      setOpen(true);
    }, 420);
  };
  const stopLongPress = () => window.clearTimeout(pressTimer.current);
  const primaryClick = () => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    choose(chosen || animatedReactions[0]);
  };
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.82 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 440, damping: 25 }}
            className="absolute bottom-full left-0 z-30 mb-2 flex items-end gap-1 rounded-full border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-2 py-2 shadow-2xl"
            role="menu"
            aria-label="Choose a reaction"
          >
            {animatedReactions.map((reaction, index) => (
              <motion.button
                type="button"
                key={reaction.type}
                initial={{ opacity: 0, y: 18, scale: 0 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 16,
                  delay: index * 0.045,
                }}
                whileHover={{ scale: 1.45, y: -7 }}
                whileTap={{ scale: 0.82 }}
                onClick={() => choose(reaction)}
                className="group relative flex h-10 w-10 items-center justify-center rounded-full text-3xl"
                aria-label={reaction.label}
                role="menuitem"
              >
                <span className="pointer-events-none absolute -top-9 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-[10px] font-bold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
                  {reaction.label}
                </span>
                {reaction.emoji}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        type="button"
        animate={pulsing ? { scale: [1, 1.28, 0.9, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 0.4 }}
        onClick={primaryClick}
        onTouchStart={startLongPress}
        onTouchEnd={stopLongPress}
        onTouchCancel={stopLongPress}
        onContextMenu={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
        className="portal-btn min-w-28"
        style={chosen ? { color: chosen.color } : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="text-lg">{chosen?.emoji || "\u{1F44D}"}</span>
        <b>{chosen?.label || "Like"}</b>
        {post.hideReactionCounts ? null : (
          <span>({post.reactions?.length || 0})</span>
        )}
      </motion.button>
    </div>
  );
}

export default function PostCard({
  post,
  currentUser,
  onReact,
  onComment,
  onReactComment,
  onDeleteComment,
  onSave,
  onDelete,
  onReport,
  onVote,
  onShare,
  saved = false,
  onToggleSave,
  onEdit,
}) {
  const { requestText } = useModal();
  const [replyingTo, setReplyingTo] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const mine =
    String(post.author?._id) === String(currentUser?.id || currentUser?._id);
  const authorProfilePath = mine
    ? "/alumni/profile"
    : post.author?.alumniProfile?.alumniId
      ? `/alumni/directory/${post.author.alumniProfile.alumniId}`
      : null;
  const totalVotes =
    post.pollOptions?.reduce(
      (sum, item) => sum + (item.voters?.length || 0),
      0,
    ) || 0;
  const reshare = async () => {
    const caption = await requestText({
      title: "Share this post",
      message: "Add an optional caption. The original post will be attached to your reshare.",
      placeholder: "Say something about this post",
      confirmLabel: "Share now",
      tone: "info",
      allowEmpty: true,
    });
    if (caption === null) return;
    await onShare(post, caption);
  };
  return (
    <article id={`post-${post._id}`} className="alumni-facebook-post-card">
      <div className="p-5">
        <header className="flex items-start gap-3">
          {authorProfilePath ? (
            <Link
              to={authorProfilePath}
              className="h-fit rounded-full transition-transform hover:scale-105"
              title={`View ${post.author?.name || "alumni"} profile`}
            >
              <ProfileAvatar
                name={post.author?.name}
                url={post.author?.alumniProfile?.profilePhotoUrl}
              />
            </Link>
          ) : (
            <ProfileAvatar
              name={post.author?.name}
              url={post.author?.alumniProfile?.profilePhotoUrl}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {authorProfilePath ? (
                <Link
                  to={authorProfilePath}
                  className="font-bold hover:text-sky-500 hover:underline"
                >
                  {post.author?.name || "Alumni"}
                </Link>
              ) : (
                <b>{post.author?.name || "Alumni"}</b>
              )}
              <VerifiedBadge
                status={post.author?.alumniProfile?.verificationStatus}
                compact
              />
            </div>
            <p className="text-xs capitalize text-[color:var(--md-text-secondary)]">
              {new Date(post.createdAt).toLocaleString()}
              {post.edited ? " · Edited" : ""} ·{" "}
              {post.visibility.replaceAll("_", " ")}
            </p>
            {post.feelingActivity && (
              <p className="mt-1 text-sm">
                is feeling/doing <b>{post.feelingActivity}</b>
              </p>
            )}
          </div>
          <div className="alumni-post-header-actions">
            <button type="button" title={saved ? "Remove from saved posts" : "Save post"} onClick={() => onToggleSave ? onToggleSave(post, saved) : onSave(post)}>
              {saved ? <BookmarkCheck size={17}/> : <Bookmark size={17}/>}
            </button>
            {!mine && <button type="button" title="Report post" onClick={() => onReport(post)}><Flag size={17}/></button>}
          {mine && onEdit && (
            <button type="button" onClick={() => onEdit(post)} title="Edit post" aria-label="Edit post">
              <Pencil size={17} />
            </button>
          )}
          {mine && (
            <button
              type="button"
              onClick={() => onDelete(post)}
              className="alumni-post-delete-button"
              title="Delete post"
              aria-label="Delete post"
            >
              <Trash2 size={17} />
            </button>
          )}
          </div>
        </header>
        {post.location && (
          <p className="mt-3 flex items-center gap-1 text-sm text-[color:var(--md-text-secondary)]">
            <MapPin size={14} />
            {post.location}
          </p>
        )}
        <div
          style={
            post.backgroundColor
              ? { backgroundColor: post.backgroundColor, color: "white" }
              : undefined
          }
          className={
            post.backgroundColor
              ? "my-4 rounded-xl p-8 text-center text-xl font-bold"
              : ""
          }
        >
          <p
            className={`${post.backgroundColor ? "" : "my-4"} whitespace-pre-wrap leading-7`}
          >
            {post.content}
          </p>
        </div>
        {post.originalPost && (
          <div className="alumni-reshared-post">
            {post.originalPost.media?.length > 0 && (
              <div className={`alumni-reshared-media ${post.originalPost.media.length > 1 ? "multiple" : "single"}`}>
                {post.originalPost.media.map((item) => item.mimeType?.startsWith("image/") ? (
                  <img key={item.url} src={item.url} alt={item.originalName || "Shared post"} />
                ) : item.mimeType?.startsWith("video/") ? (
                  <video key={item.url} src={item.url} controls />
                ) : (
                  <a key={item.url} href={item.url} target="_blank" rel="noreferrer"><FileText size={18}/>{item.originalName}</a>
                ))}
              </div>
            )}
            <div className="alumni-reshared-details">
              <header>
                {post.originalPost.author?.alumniProfile?.alumniId ? (
                  <Link to={`/alumni/directory/${post.originalPost.author.alumniProfile.alumniId}`}>
                    <ProfileAvatar
                      name={post.originalPost.author?.name}
                      url={post.originalPost.author?.alumniProfile?.profilePhotoUrl}
                      size="sm"
                    />
                  </Link>
                ) : (
                  <ProfileAvatar
                    name={post.originalPost.author?.name}
                    url={post.originalPost.author?.alumniProfile?.profilePhotoUrl}
                    size="sm"
                  />
                )}
                <div>
                  {post.originalPost.author?.alumniProfile?.alumniId ? (
                    <Link to={`/alumni/directory/${post.originalPost.author.alumniProfile.alumniId}`} className="font-bold hover:text-sky-500 hover:underline">
                      {post.originalPost.author?.name || "Alumni"}
                    </Link>
                  ) : <b>{post.originalPost.author?.name || "Alumni"}</b>}
                  <small>{new Date(post.originalPost.createdAt).toLocaleString()}</small>
                </div>
              </header>
              {post.originalPost.content && <p>{post.originalPost.content}</p>}
            </div>
          </div>
        )}
        {post.structuredData && Object.keys(post.structuredData).length > 0 && (
          <div className="mb-4 grid gap-2 rounded-xl bg-[color:var(--md-hover)] p-4 sm:grid-cols-2">
            {Object.entries(post.structuredData)
              .filter(([, value]) => value)
              .map(([key, value]) => (
                <div key={key}>
                  <span className="text-xs font-bold uppercase text-[color:var(--md-text-secondary)]">
                    {key.replace(/([A-Z])/g, " $1")}
                  </span>
                  <p>{value}</p>
                </div>
              ))}
          </div>
        )}
        {post.hashtags?.length > 0 && (
          <p className="mb-3 text-sm font-bold text-sky-500">
            {post.hashtags.map((tag) => `#${tag}`).join(" ")}
          </p>
        )}
      </div>
      {post.media?.length > 0 && (
        <div
          className={`grid gap-1 ${post.media.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
        >
          {post.media.map((item) =>
            item.mimeType?.startsWith("image/") ? (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={item.url}
                  alt={item.originalName || "Post attachment"}
                  className="max-h-[520px] w-full object-cover"
                />
              </a>
            ) : item.mimeType?.startsWith("video/") ? (
              <video
                key={item.url}
                src={item.url}
                controls
                className="max-h-[520px] w-full bg-black"
              />
            ) : (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="m-3 flex items-center gap-3 rounded-xl border border-[color:var(--md-border)] p-4"
              >
                <FileText size={28} />
                <div className="min-w-0 flex-1">
                  <b className="block truncate">{item.originalName}</b>
                  <span className="text-xs">
                    {Math.ceil((item.size || 0) / 1024)} KB
                  </span>
                </div>
                <Download size={18} />
              </a>
            ),
          )}
        </div>
      )}
      {post.postType === "poll" && (
        <div className="mx-5 mb-4 space-y-2">
          {post.pollOptions?.map((option) => {
            const votes = option.voters?.length || 0;
            const percent = totalVotes
              ? Math.round((votes / totalVotes) * 100)
              : 0;
            return (
              <button
                key={option._id}
                onClick={() => onVote(post, option._id)}
                className="relative block w-full overflow-hidden rounded-lg border border-[color:var(--md-border)] p-3 text-left"
              >
                <span
                  className="absolute inset-y-0 left-0 bg-sky-500/15"
                  style={{ width: `${percent}%` }}
                />
                <span className="relative flex justify-between">
                  <b>{option.text}</b>
                  <span>
                    {votes} · {percent}%
                  </span>
                </span>
              </button>
            );
          })}
          <p className="text-xs text-[color:var(--md-text-secondary)]">
            {totalVotes} vote{totalVotes === 1 ? "" : "s"}
            {post.pollClosesAt
              ? ` · Closes ${new Date(post.pollClosesAt).toLocaleString()}`
              : ""}
          </p>
        </div>
      )}
      <div className="alumni-post-engagement-summary">
        <span>{post.reactions?.length ? "👍" : ""} {post.reactions?.length || 0} reactions</span>
        <span>{post.comments?.length || 0} comments&nbsp;&nbsp; {post.shareCount || 0} shares</span>
      </div>
      <div className="alumni-post-primary-actions">
        <ReactionPicker
          post={post}
          currentUser={currentUser}
          onReact={onReact}
        />
        {post.commentsEnabled && (
          <button
            type="button"
            onClick={() => setShowComments((current) => !current)}
            className={showComments ? "portal-btn-primary" : "portal-btn"}
            aria-expanded={showComments}
          >
            <MessageCircle size={15} />
            Comments ({post.comments?.length || 0})
          </button>
        )}
        {post.sharingEnabled && (
          <button
            type="button"
            onClick={reshare}
            className="portal-btn"
          >
            <Share2 size={15} />
            Reshare
          </button>
        )}
      </div>
      {post.commentsEnabled && showComments && (
        <div className="p-5 pt-3">
          <div className="space-y-2">
            {(post.comments || [])
              .filter((item) => !item.parentId)
              .slice(-5)
              .map((item) => (
                <CommentThreadItem
                  key={item._id}
                  item={item}
                  allComments={post.comments || []}
                  depth={0}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  onReply={(content, parentId) =>
                    onComment(post, content, parentId)
                  }
                  currentUser={currentUser}
                  postAuthorId={post.author?._id}
                  onReactComment={(commentId, type, active) => onReactComment(post, commentId, type, active)}
                  onDeleteComment={(commentId) => onDeleteComment(post, commentId)}
                />
              ))}
          </div>
          <CommentComposer
            placeholder="Write a comment… Type @ to mention alumni"
            onSubmit={(content) => onComment(post, content)}
          />
        </div>
      )}
    </article>
  );
}
