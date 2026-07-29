import { Bookmark, FileText, LoaderCircle, MessageSquare, Search, ShieldCheck, Users, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../../lib/api.js";
import ProfileAvatar from "./ProfileAvatar.jsx";

const links = [
  ["/alumni/feed", "News Feed", FileText],
  ["/alumni/connections", "Connections", Users],
  ["/alumni/chat", "Messages", MessageSquare],
  ["/alumni/saved", "Saved Items", Bookmark],
  ["/alumni/verification", "Verification", ShieldCheck],
];

export default function AlumniSocialNav() {
  const [requestCount, setRequestCount] = useState(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const load = () => apiFetch("/api/connections/request-count")
      .then((data) => setRequestCount(data.count || 0))
      .catch(() => {});
    load();
    const timer = window.setInterval(load, 30000);
    const refresh = () => load();
    window.addEventListener("alumni-connections-seen", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("alumni-connections-seen", refresh);
    };
  }, []);

  useEffect(() => {
    const closeSearch = (event) => {
      if (!searchRef.current?.contains(event.target)) setSearchOpen(false);
    };
    document.addEventListener("pointerdown", closeSearch);
    return () => document.removeEventListener("pointerdown", closeSearch);
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setResults([]);
      setSearching(false);
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiFetch(
          `/api/alumni-directory?q=${encodeURIComponent(trimmedQuery)}&limit=8`,
        );
        if (active) setResults(data.data || []);
      } catch (error) {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  return (
    <nav className="alumni-social-feature-nav" aria-label="Alumni Social Network features">
      <div className="alumni-social-links">
        {links.map(([to, label, Icon]) => (
          <NavLink key={to} to={to} className={({ isActive }) => isActive ? "active" : ""}>
            <Icon size={17} />
            <span>{label}</span>
            {label === "Connections" && requestCount > 0 && (
              <span className="alumni-social-count" aria-label={`${requestCount} new connection requests`}>
                {requestCount > 99 ? "99+" : requestCount}
              </span>
            )}
          </NavLink>
        ))}
      </div>
      <div className="alumni-nav-profile-search" ref={searchRef}>
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          placeholder="Search alumni by name"
          aria-label="Search alumni profiles by name"
          aria-expanded={searchOpen && Boolean(query.trim())}
        />
        {searching && <LoaderCircle className="alumni-search-spinner" size={17} aria-label="Searching" />}
        {!searching && query && (
          <button type="button" onClick={() => { setQuery(""); setResults([]); }} aria-label="Clear profile search">
            <X size={16} />
          </button>
        )}
        {searchOpen && query.trim() && (
          <div className="alumni-nav-search-results" role="listbox">
            {searching ? (
              <p>Searching alumni…</p>
            ) : results.length ? results.map((profile) => (
              <Link
                key={profile._id}
                to={`/alumni/directory/${profile._id}`}
                onClick={() => {
                  setQuery("");
                  setSearchOpen(false);
                }}
                role="option"
              >
                <ProfileAvatar name={profile.fullName} url={profile.profilePhotoUrl} size="sm" />
                <span>
                  <strong>{profile.fullName}</strong>
                  <small>{profile.jobTitle || profile.programme || profile.department || "Alumni"}</small>
                </span>
              </Link>
            )) : (
              <p>No alumni profiles found.</p>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
