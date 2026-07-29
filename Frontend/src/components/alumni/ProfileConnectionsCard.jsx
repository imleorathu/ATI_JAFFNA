import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { alumniPhotoUrl, apiFetch } from "../../lib/api.js";

function ConnectionPhoto({ person }) {
  const [failed, setFailed] = useState(false);
  const source = alumniPhotoUrl(person.profilePhotoUrl);
  if (source && !failed) {
    return <img src={source} alt={`${person.fullName} profile`} onError={() => setFailed(true)} />;
  }
  return <span>{person.fullName?.charAt(0)?.toUpperCase() || "A"}</span>;
}

export default function ProfileConnectionsCard({ alumniId, onCountChange }) {
  const [people, setPeople] = useState([]);
  const [count, setCount] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!alumniId) return;
    setLoading(true);
    apiFetch(`/api/connections/profile/${alumniId}`)
      .then((result) => {
        setPeople(result.data || []);
        setCount(result.count || 0);
        onCountChange?.(result.count || 0);
      })
      .catch(() => {
        setPeople([]);
        setCount(0);
        onCountChange?.(0);
      })
      .finally(() => setLoading(false));
  }, [alumniId, onCountChange]);
  const visible = showAll ? people : people.slice(0, 9);
  return (
    <section className="alumni-profile-connections">
      <header>
        <div><h2>Connections</h2><p>{count} connection{count === 1 ? "" : "s"}</p></div>
        {people.length > 9 && (
          <button type="button" onClick={() => setShowAll((current) => !current)}>
            {showAll ? "Show preview" : "See all connections"}
          </button>
        )}
      </header>
      {loading ? <p className="alumni-connections-loading">Loading connections…</p> : visible.length ? (
        <div className={`alumni-profile-connection-grid ${showAll ? "show-all" : ""}`}>
          {visible.map((person) => (
            <Link key={person.userId} to={`/alumni/directory/${person.alumniId}`}>
              <ConnectionPhoto person={person} />
              <strong>{person.fullName}</strong>
              <small>{person.department || person.programme || "ATI Jaffna Alumni"}</small>
            </Link>
          ))}
        </div>
      ) : <p className="alumni-connections-loading">No connections to show yet.</p>}
    </section>
  );
}
