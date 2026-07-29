import { useEffect, useState } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import GlassCard from "../../components/GlassCard.jsx";
import EmptyState from "../../components/alumni/EmptyState.jsx";
import { apiFetch } from "../../lib/api.js";
export default function AlumniNotificationsPage() {
  const [items, setItems] = useState([]),
    [error, setError] = useState("");
  const load = () =>
    apiFetch("/api/alumni-notifications?limit=50")
      .then((data) => setItems(data.data))
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, []);
  const mark = async (id) => {
    await apiFetch(`/api/alumni-notifications/${id}`, {
      method: "PATCH",
      body: JSON.stringify({}),
    });
    load();
  };
  const all = async () => {
    await apiFetch("/api/alumni-notifications", {
      method: "PATCH",
      body: JSON.stringify({ all: true }),
    });
    load();
  };
  const remove = async (id) => {
    await apiFetch(`/api/alumni-notifications/${id}`, { method: "DELETE" });
    load();
  };
  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="portal-page-label">Alumni Portal</p>
          <h1 className="portal-page-title">Notifications</h1>
        </div>
        <button onClick={all} className="portal-btn">
          <CheckCheck size={16} />
          Mark all read
        </button>
      </div>
      {error && <div className="portal-alert-danger">{error}</div>}
      <GlassCard className="p-5">
        {items.length ? (
          items.map((item) => (
            <div
              key={item._id}
              className={`flex gap-3 border-b border-[color:var(--md-border)] p-4 last:border-0 ${item.readAt ? "opacity-65" : "bg-sky-500/5"}`}
            >
              <Bell size={19} className="mt-1 text-sky-500" />
              <button
                className="flex-1 text-left"
                onClick={() => mark(item._id)}
              >
                <b>{item.title}</b>
                <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">
                  {item.message}
                </p>
                <p className="mt-1 text-xs text-[color:var(--md-text-secondary)]">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </button>
              <button
                onClick={() => remove(item._id)}
                className="portal-btn-danger"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        ) : (
          <EmptyState title="You are all caught up" />
        )}
      </GlassCard>
    </section>
  );
}
