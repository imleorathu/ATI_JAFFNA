import { useEffect, useState } from "react";
import { ArrowRight, Bookmark, FileText, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import EmptyState from "../../components/alumni/EmptyState.jsx";
import ProfileAvatar from "../../components/alumni/ProfileAvatar.jsx";
import AlumniSocialNav from "../../components/alumni/AlumniSocialNav.jsx";
import { apiFetch } from "../../lib/api.js";

export default function AlumniSavedPage() {
  const [items, setItems] = useState([]);
  const [type, setType] = useState("");
  const [error, setError] = useState("");
  const load = () => apiFetch(`/api/saved${type ? `?type=${type}` : ""}`).then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [type]);
  const remove = async (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    await apiFetch(`/api/saved/${item._id}`, { method: "DELETE" });
    setItems((current) => current.filter((entry) => entry._id !== item._id));
  };
  return <section className="space-y-5">
    <div><p className="portal-page-label">Your Library</p><h1 className="portal-page-title">Saved Posts</h1><p className="portal-page-subtitle">Open a preview to view that complete post in your News Feed.</p></div>
    <AlumniSocialNav />
    {error && <div className="portal-alert-danger">{error}</div>}
    <select value={type} onChange={(e) => setType(e.target.value)} className="portal-input"><option value="">All saved items</option><option value="post">Posts</option><option value="profile">Profiles</option><option value="announcement">Announcements</option></select>
    <div className="saved-post-grid">
      {items.length ? items.map((item) => item.itemType === "post" && item.preview ? <Link key={item._id} to={`/alumni/feed?post=${item.itemId}#post-${item.itemId}`} className="saved-post-preview">
        {item.preview.media?.[0]?.mimeType?.startsWith("image/") ? <img src={item.preview.media[0].url} alt="Saved post preview"/> : <div className="saved-post-placeholder"><FileText size={34}/></div>}
        <div className="saved-post-content">
          <header><ProfileAvatar name={item.preview.author?.name} url={item.preview.author?.alumniProfile?.profilePhotoUrl}/><span><b>{item.preview.author?.name || "Alumni"}</b><small>Saved {new Date(item.createdAt).toLocaleDateString()}</small></span></header>
          <p>{item.preview.content || `${item.preview.postType.replaceAll("_", " ")} post`}</p>
          <footer><span><Bookmark size={15}/>Saved post</span><span>View full post <ArrowRight size={15}/></span></footer>
        </div>
        <button onClick={(event) => remove(event, item)} className="saved-post-delete" title="Remove saved post"><Trash2 size={16}/></button>
      </Link> : <article key={item._id} className="saved-post-preview saved-generic-item"><Bookmark/><div><b className="capitalize">{item.itemType}</b><small>Saved {new Date(item.createdAt).toLocaleDateString()}</small></div><button onClick={(event) => remove(event, item)} className="saved-post-delete"><Trash2 size={16}/></button></article>) : <EmptyState title="No saved items" message="Click Save on a News Feed post to keep it here." />}
    </div>
  </section>;
}
