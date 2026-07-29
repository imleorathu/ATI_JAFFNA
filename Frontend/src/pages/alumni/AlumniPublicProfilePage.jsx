import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  BriefcaseBusiness,
  GraduationCap,
  Link as LinkIcon,
  MapPin,
  Check,
  Clock3,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import GlassCard from "../../components/GlassCard.jsx";
import ProfileAvatar from "../../components/alumni/ProfileAvatar.jsx";
import VerifiedBadge from "../../components/alumni/VerifiedBadge.jsx";
import ProfileConnectionsCard from "../../components/alumni/ProfileConnectionsCard.jsx";
import PostCard from "../../components/alumni/PostCard.jsx";
import { alumniPhotoUrl, apiFetch } from "../../lib/api.js";
import { useModal } from "../../contexts/ModalContext.jsx";
import { useAuth } from "../../contexts/AuthContext.jsx";
export default function AlumniPublicProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { alert, confirm, requestText } = useModal();
  const [data, setData] = useState(null),
    [savedPostIds, setSavedPostIds] = useState(new Set()),
    [connectionCount, setConnectionCount] = useState(0),
    [error, setError] = useState("");
  useEffect(() => {
    Promise.all([
      apiFetch(`/api/alumni-directory/${id}`),
      apiFetch("/api/saved?type=post"),
    ])
      .then(([profileData, savedItems]) => {
        setData(profileData);
        setSavedPostIds(new Set(savedItems.map((item) => String(item.itemId))));
      })
      .catch((e) => setError(e.message));
  }, [id]);
  if (error) return <div className="portal-alert-danger">{error}</div>;
  if (!data) return <div className="py-16 text-center">Loading profile...</div>;
  const p = data.profile;
  const updatePost = (postId, change) =>
    setData((current) => ({
      ...current,
      posts: (current.posts || []).map((post) =>
        String(post._id) === String(postId) ? { ...post, ...change } : post,
      ),
    }));
  const reactToPost = async (post, type) => {
    const result = await apiFetch(`/api/posts/${post._id}/reaction`, { method: "PUT", body: JSON.stringify({ type }) });
    updatePost(post._id, { reactions: result.reactions });
  };
  const addComment = async (post, payload, parentId) => {
    const body = payload instanceof FormData ? payload : JSON.stringify({ content: payload, ...(parentId ? { parentId } : {}) });
    if (payload instanceof FormData && parentId) payload.append("parentId", parentId);
    const comments = await apiFetch(`/api/posts/${post._id}/comments`, { method: "POST", body });
    updatePost(post._id, { comments });
  };
  const reactComment = async (post, commentId, type, active = true) => {
    const reactions = await apiFetch(`/api/posts/${post._id}/comments/${commentId}/reaction`, {
      method: "PUT",
      body: JSON.stringify({ type, active }),
    });
    const update = (comment) => ({
      ...comment,
      ...(String(comment._id) === String(commentId) ? { reactions } : {}),
      ...(comment.replies?.length ? { replies: comment.replies.map(update) } : {}),
    });
    updatePost(post._id, { comments: (post.comments || []).map(update) });
  };
  const deleteComment = async (post, commentId) => {
    await apiFetch(`/api/posts/${post._id}/comments/${commentId}`, { method: "DELETE" });
    updatePost(post._id, {
      comments: (post.comments || []).filter((comment) =>
        String(comment._id) !== String(commentId) &&
        String(comment.parentId || "") !== String(commentId),
      ),
    });
  };
  const toggleSave = async (post, saved) => {
    if (saved) await apiFetch(`/api/saved/item/post/${post._id}`, { method: "DELETE" });
    else await apiFetch("/api/saved", { method: "POST", body: JSON.stringify({ itemType: "post", itemId: post._id }) });
    setSavedPostIds((current) => {
      const next = new Set(current);
      if (saved) next.delete(String(post._id)); else next.add(String(post._id));
      return next;
    });
  };
  const editPost = async (post) => {
    const content = await requestText({ title: "Edit post", message: "Update the caption or text.", defaultValue: post.content || "", confirmLabel: "Save post", allowEmpty: true });
    if (content === null) return;
    const updated = await apiFetch(`/api/posts/${post._id}`, { method: "PUT", body: JSON.stringify({ content }) });
    updatePost(post._id, updated);
  };
  const deletePost = async (post) => {
    if (!await confirm({ title: "Delete post?", message: "This post will be permanently deleted.", confirmLabel: "Delete post", tone: "danger" })) return;
    await apiFetch(`/api/posts/${post._id}`, { method: "DELETE" });
    setData((current) => ({ ...current, posts: current.posts.filter((item) => item._id !== post._id) }));
  };
  const reportPost = (post) => apiFetch("/api/reports", {
    method: "POST",
    body: JSON.stringify({ targetType: "post", targetId: post._id, reason: "User reported content", explanation: "Submitted from an alumni profile" }),
  });
  const vote = async (post, optionId) => {
    const pollOptions = await apiFetch(`/api/posts/${post._id}/poll-vote`, { method: "PUT", body: JSON.stringify({ optionId }) });
    updatePost(post._id, { pollOptions });
  };
  const share = async (post, content) => {
    await apiFetch(`/api/posts/${post._id}/share`, { method: "POST", body: JSON.stringify({ content, visibility: "verified_alumni" }) });
    const refreshed = await apiFetch(`/api/alumni-directory/${id}`);
    setData(refreshed);
  };
  const connect = async () => {
    const message = await requestText({ title: "Send connection request", message: "Add one introductory message (optional).", placeholder: "Write a short introduction", confirmLabel: "Send request", allowEmpty: true });
    if (message === null) return;
    try {
      const connection = await apiFetch(`/api/connections/${p.userId}`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      setData((current) => ({
        ...current,
        connected: connection.status === "accepted",
        connectionId: connection._id,
        connectionStatus: connection.status,
        connectionDirection: connection.status === "accepted" ? "connected" : "sent",
      }));
    } catch (e) { setError(e.message); }
  };
  const openMessage = async () => {
    try {
      const conversation = await apiFetch("/api/alumni-chat", {
        method: "POST",
        body: JSON.stringify({ memberIds: [p.userId] }),
      });
      navigate(`/alumni/chat?conversation=${conversation._id}`);
    } catch (e) {
      if (/connect with this alumni member before starting a private chat/i.test(e.message)) {
        setError("");
        await alert({ title: "Connection required", message: e.message, tone: "info", confirmLabel: "Okay" });
      } else setError(e.message);
    }
  };
  return (
    <section className="alumni-public-profile mx-auto space-y-5">
      <div className="alumni-facebook-profile-hero">
        <div
          className="alumni-profile-cover"
          style={
            p.coverPhotoUrl
              ? { backgroundImage: `url(${alumniPhotoUrl(p.coverPhotoUrl)})` }
              : undefined
          }
        />
        <div className="alumni-profile-summary">
          <div className="alumni-profile-avatar">
            <div className="alumni-profile-avatar-frame">
              <ProfileAvatar name={p.fullName} url={p.profilePhotoUrl} size="lg" />
            </div>
          </div>
          <div className="alumni-profile-identity">
            <div className="alumni-profile-name">
              <h1>{p.fullName}</h1>
                <VerifiedBadge status={p.verificationStatus} />
            </div>
            <b>{data.posts?.length || 0} post{data.posts?.length === 1 ? "" : "s"} <span aria-hidden="true">·</span> {connectionCount} connection{connectionCount === 1 ? "" : "s"}</b>
            <p>{p.jobTitle || p.programme || "Alumni member"}{p.companyName ? ` at ${p.companyName}` : ""}</p>
            <div className="alumni-profile-facts">
              {(p.currentCity || p.currentCountry) && <span><MapPin size={15}/>{[p.currentCity, p.currentCountry].filter(Boolean).join(", ")}</span>}
              {p.programme && <span><GraduationCap size={15}/>{p.programme}</span>}
              {p.companyName && <span><BriefcaseBusiness size={15}/>{p.companyName}</span>}
            </div>
          </div>
          <div className="alumni-profile-visitor-actions">
            {!data.owner && !data.connectionStatus && (
              <button onClick={connect} className="portal-btn-primary">
                <UserPlus size={16} />
                Connect
              </button>
            )}
            {data.connectionStatus === "pending" && data.connectionDirection === "sent" && (
              <button disabled className="portal-btn">
                <Clock3 size={16} />
                Requested
              </button>
            )}
            {data.connectionStatus === "pending" && data.connectionDirection === "received" && (
              <Link to="/alumni/connections" className="portal-btn-primary">
                <UserPlus size={16} />
                Review request
              </Link>
            )}
            {data.connected && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="portal-badge portal-badge-success"><Check size={14}/>Connected</span>
                <button onClick={openMessage} className="portal-btn-primary"><MessageCircle size={16}/>Message</button>
              </div>
            )}
          </div>
        </div>
        {p.introduction && <p className="alumni-profile-introduction">{p.introduction}</p>}
      </div>
      <ProfileConnectionsCard alumniId={p._id} onCountChange={setConnectionCount} />
      <div className="grid gap-5 md:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="alumni-form-title">
            <GraduationCap size={19} />
            Academic Background
          </h2>
          <p>{p.programme}</p>
          <p className="mt-2 text-sm text-[color:var(--md-text-secondary)]">
            {p.department} · Batch {p.batch} · Graduated {p.graduationYear}
          </p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="alumni-form-title">
            <BriefcaseBusiness size={19} />
            Professional Profile
          </h2>
          <p>{p.employmentStatus || "Not provided"}</p>
          <p className="mt-2 text-sm text-[color:var(--md-text-secondary)]">
            {p.industry || "Industry not provided"}
          </p>
          {(p.currentCity || p.currentCountry) && (
            <p className="mt-3 flex items-center gap-2">
              <MapPin size={15} />
              {[p.currentCity, p.currentCountry].filter(Boolean).join(", ")}
            </p>
          )}
        </GlassCard>
      </div>
      {p.employmentHistory?.length > 0 && (
        <GlassCard className="p-6">
          <h2 className="alumni-form-title">
            <BriefcaseBusiness size={19} />
            Employment History
          </h2>
          <div className="mt-4 space-y-4">
            {p.employmentHistory.map((job, index) => (
              <div
                key={`${job.company}-${index}`}
                className="rounded-lg bg-[color:var(--md-hover)] p-4"
              >
                <b>
                  {job.jobTitle || "Position"}
                  {job.company ? ` at ${job.company}` : ""}
                </b>
                <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">
                  {[job.startYear, job.endYear].filter(Boolean).join(" – ")}
                </p>
                {job.description && <p className="mt-2">{job.description}</p>}
              </div>
            ))}
          </div>
        </GlassCard>
      )}
      <GlassCard className="p-6">
        <h2 className="classroom-section-title">Skills and Achievements</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {p.skills?.map((item) => (
            <span key={item} className="portal-badge portal-badge-neutral">
              {item}
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {p.professionalQualifications?.map((item) => (
            <span key={item} className="portal-badge portal-badge-neutral">
              {item}
            </span>
          ))}
          {p.higherEducationQualifications?.map((item) => (
            <span key={item} className="portal-badge portal-badge-neutral">
              {item}
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {p.mentorAvailable && (
            <span className="portal-badge portal-badge-success">
              Available for mentoring
            </span>
          )}
          {p.recruitmentAvailable && (
            <span className="portal-badge portal-badge-success">
              Open to recruitment
            </span>
          )}
          {p.businessOwner && (
            <span className="portal-badge portal-badge-neutral">
              Business owner
            </span>
          )}
        </div>
        {p.achievements?.map((item) => (
          <p key={item} className="mt-3">
            🏆 {item}
          </p>
        ))}
        <div className="mt-5 flex flex-wrap gap-3">
          {[
            [p.portfolioUrl, "Portfolio"],
            [p.linkedInUrl, "LinkedIn"],
            [p.githubUrl, "GitHub"],
            [p.personalWebsite, "Website"],
          ]
            .filter(([url]) => url)
            .map(([url, label]) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="portal-btn"
              >
                <LinkIcon size={14} />
                {label}
              </a>
            ))}
        </div>
      </GlassCard>
      <GlassCard className="alumni-public-post-feed-section p-6">
        <h2 className="classroom-section-title">Posts and reshares</h2>
        <div className="alumni-public-post-feed">
          {(data.posts || []).map((post) => (
            <PostCard
              key={post._id}
              post={post}
              currentUser={user}
              onReact={reactToPost}
              onComment={addComment}
              onReactComment={reactComment}
              onDeleteComment={deleteComment}
              onSave={() => toggleSave(post, false)}
              saved={savedPostIds.has(String(post._id))}
              onToggleSave={toggleSave}
              onEdit={data.owner ? editPost : undefined}
              onDelete={deletePost}
              onReport={reportPost}
              onVote={vote}
              onShare={share}
            />
          ))}
          {!data.posts?.length && <p className="py-5 text-center text-[color:var(--md-text-secondary)]">No visible posts yet.</p>}
        </div>
        <div className="profile-post-legacy hidden">
          {(data.posts || []).map((post) => (
            <article key={post._id} className="profile-post-card">
              <header>
                <div>
                  <b>{post.originalPost ? "Reshared a post" : "Published a post"}</b>
                  <small>{new Date(post.createdAt).toLocaleString()}</small>
                </div>
              </header>
              {post.content && <p className="mt-3 whitespace-pre-wrap">{post.content}</p>}
              {post.media?.length > 0 && (
                <div className="profile-post-media">
                  {post.media.map((item) => item.mimeType?.startsWith("image/")
                    ? <img key={item.url} src={item.url} alt={item.originalName || "Post attachment"}/>
                    : <a key={item.url} href={item.url} target="_blank" rel="noreferrer"><LinkIcon size={18}/>{item.originalName}</a>)}
                </div>
              )}
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
                        : <a key={item.url} href={item.url} target="_blank" rel="noreferrer"><LinkIcon size={18}/>{item.originalName}</a>)}
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
          {!data.posts?.length && <p className="py-5 text-center text-[color:var(--md-text-secondary)]">No visible posts yet.</p>}
        </div>
      </GlassCard>
    </section>
  );
}
