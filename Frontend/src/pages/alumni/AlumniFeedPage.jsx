import { useEffect, useState } from "react";
import { Bookmark, MessageSquare, RefreshCw, ShieldCheck, UserRound, Users } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { alumniPhotoUrl, apiFetch } from "../../lib/api.js";
import EmptyState from "../../components/alumni/EmptyState.jsx";
import PostCard from "../../components/alumni/PostCard.jsx";
import PostComposer from "../../components/alumni/PostComposer.jsx";
import AlumniSocialNav from "../../components/alumni/AlumniSocialNav.jsx";
import ProfileAvatar from "../../components/alumni/ProfileAvatar.jsx";
export default function AlumniFeedPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedPostId = searchParams.get("post");
  const [profile, setProfile] = useState(null),
    [posts, setPosts] = useState([]),
    [page, setPage] = useState(1),
    [pagination, setPagination] = useState(null),
    [savedPostIds, setSavedPostIds] = useState(new Set()),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = async (nextPage = 1, append = false) => {
    setLoading(true);
    setError("");
    try {
      const [data, me, selectedPost, savedItems] = await Promise.all([
        apiFetch(`/api/feed?page=${nextPage}&limit=10`),
        profile ? Promise.resolve(profile) : apiFetch("/api/alumni/me"),
        nextPage === 1 && selectedPostId
          ? apiFetch(`/api/posts/${selectedPostId}`)
          : Promise.resolve(null),
        apiFetch("/api/saved?type=post"),
      ]);
      setProfile(me);
      setSavedPostIds(new Set(savedItems.map((item) => String(item.itemId))));
      const pagePosts = selectedPost && !data.data.some((item) => item._id === selectedPost._id)
        ? [selectedPost, ...data.data]
        : data.data;
      setPosts((current) => (append ? [...current, ...pagePosts] : pagePosts));
      setPagination(data.pagination);
      setPage(nextPage);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [selectedPostId]);
  useEffect(() => {
    if (!selectedPostId || !posts.some((post) => post._id === selectedPostId)) return;
    window.setTimeout(() => document.getElementById(`post-${selectedPostId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }, [posts, selectedPostId]);
  const create = async (payload) => {
    await apiFetch("/api/posts", {
      method: "POST",
      body: payload,
    });
    await load();
  };
  const react = async (post, type) => {
    const data = await apiFetch(`/api/posts/${post._id}/reaction`, {
      method: "PUT",
      body: JSON.stringify({ type }),
    });
    setPosts((c) =>
      c.map((x) =>
        x._id === post._id ? { ...x, reactions: data.reactions } : x,
      ),
    );
  };
  const comment = async (post, payload, parentId) => {
    const body = payload instanceof FormData
      ? payload
      : JSON.stringify({ content: payload, ...(parentId ? { parentId } : {}) });
    if (payload instanceof FormData && parentId) payload.append("parentId", parentId);
    const comments = await apiFetch(`/api/posts/${post._id}/comments`, {
      method: "POST",
      body,
    });
    setPosts((c) =>
      c.map((x) => (x._id === post._id ? { ...x, comments } : x)),
    );
  };
  const reactComment = async (post, commentId, type, active = true) => {
    try {
      setError("");
      const reactions = await apiFetch(`/api/posts/${post._id}/comments/${commentId}/reaction`, {
        method: "PUT",
        body: JSON.stringify({ type, active }),
      });
      const updateReaction = (entry) => ({
        ...entry,
        ...(String(entry._id) === String(commentId) ? { reactions } : {}),
        ...(entry.replies?.length
          ? { replies: entry.replies.map(updateReaction) }
          : {}),
      });
      setPosts((current) => current.map((item) => item._id === post._id
        ? { ...item, comments: (item.comments || []).map(updateReaction) }
        : item));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };
  const deleteComment = async (post, commentId) => {
    try {
      setError("");
      await apiFetch(`/api/posts/${post._id}/comments/${commentId}`, { method: "DELETE" });
      setPosts((current) => current.map((item) => item._id === post._id
        ? { ...item, comments: item.comments.filter((entry) => entry._id !== commentId && String(entry.parentId || "") !== String(commentId)) }
        : item));
    } catch (err) {
      setError(err.message);
    }
  };
  const save = (post) =>
    apiFetch("/api/saved", {
      method: "POST",
      body: JSON.stringify({ itemType: "post", itemId: post._id }),
    });
  const toggleSave = async (post, isSaved) => {
    if (isSaved) {
      await apiFetch(`/api/saved/item/post/${post._id}`, { method: "DELETE" });
      setSavedPostIds((current) => {
        const next = new Set(current);
        next.delete(String(post._id));
        return next;
      });
    } else {
      await save(post);
      setSavedPostIds((current) => new Set([...current, String(post._id)]));
    }
  };
  const remove = async (post) => {
    await apiFetch(`/api/posts/${post._id}`, { method: "DELETE" });
    setPosts((c) => c.filter((x) => x._id !== post._id));
  };
  const report = (post) =>
    apiFetch("/api/reports", {
      method: "POST",
      body: JSON.stringify({
        targetType: "post",
        targetId: post._id,
        reason: "User reported content",
        explanation: "Submitted from the news feed",
      }),
    });
  const vote = async (post, optionId) => {
    const pollOptions = await apiFetch(`/api/posts/${post._id}/poll-vote`, {
      method: "PUT",
      body: JSON.stringify({ optionId }),
    });
    setPosts((current) =>
      current.map((item) =>
        item._id === post._id ? { ...item, pollOptions } : item,
      ),
    );
  };
  const share = async (post, content) => {
    try {
      setError("");
      await apiFetch(`/api/posts/${post._id}/share`, {
        method: "POST",
        body: JSON.stringify({ content, visibility: "verified_alumni" }),
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <section className="alumni-feed-shell">
      <div className="alumni-social-heading">
        <div>
          <p className="portal-page-label">Alumni Social Network</p>
          <h1 className="portal-page-title">News Feed</h1>
        </div>
        <button onClick={() => load()} className="portal-btn">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <AlumniSocialNav />
      {error && <div className="portal-alert-danger">{error}</div>}
      <div className="alumni-feed-grid">
      <aside className="alumni-feed-left">
        <div className="alumni-feed-profile-card">
          <div
            className="alumni-mini-cover"
            style={profile?.coverPhotoUrl ? { backgroundImage: `url("${alumniPhotoUrl(profile.coverPhotoUrl)}")` } : undefined}
            role="img"
            aria-label={`${profile?.fullName || "Alumni"} cover`}
          />
          <Link to="/alumni/profile" className="alumni-mini-avatar-link" aria-label="Open my alumni profile">
            <ProfileAvatar name={profile?.fullName} url={profile?.profilePhotoUrl} size="lg" />
          </Link>
          <h2>{profile?.fullName || "Alumni"}</h2>
          <p>{profile?.jobTitle || profile?.programme || "ATI Jaffna Alumni"}</p>
          <small>{profile?.department}</small>
          <Link to="/alumni/profile"><UserRound size={16}/>View my profile</Link>
        </div>
      </aside>
      <main className="alumni-feed-stream">
      <PostComposer
        verified={profile?.verificationStatus === "verified"}
        profile={profile}
        onCreated={create}
      />
      {posts.map((post) => (
        <PostCard
          key={post._id}
          post={post}
          currentUser={user}
          onReact={react}
          onComment={comment}
          onReactComment={reactComment}
          onDeleteComment={deleteComment}
          onSave={save}
          saved={savedPostIds.has(String(post._id))}
          onToggleSave={toggleSave}
          onDelete={remove}
          onReport={report}
          onVote={vote}
          onShare={share}
        />
      ))}
      {!loading && !posts.length && (
        <EmptyState
          title="Your feed is ready"
          message="Follow alumni or create the first community post."
        />
      )}
      {loading && <div className="py-8 text-center">Loading feed...</div>}
      {pagination?.hasNext && (
        <button
          onClick={() => load(page + 1, true)}
          className="portal-btn mx-auto"
        >
          Load more posts
        </button>
      )}
      </main>
      <aside className="alumni-feed-right">
        <div><h2>Alumni community</h2><p>Connect across batches, careers, and departments.</p><Link className="portal-btn-primary" to="/alumni/directory">Discover alumni</Link></div>
        <div><h2>Community chats</h2><p>Talk with all alumni or only members from your department.</p><Link className="portal-btn" to="/alumni/chat">Open Chat</Link></div>
        <div><h2>Posting guidelines</h2><ul><li>Share useful, respectful content.</li><li>Protect private information.</li><li>Report inappropriate posts.</li></ul></div>
      </aside>
      </div>
    </section>
  );
}
