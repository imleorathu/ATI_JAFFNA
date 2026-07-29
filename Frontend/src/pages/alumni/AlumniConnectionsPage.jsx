import { useEffect, useState } from "react";
import { Check, MessageCircle, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GlassCard from "../../components/GlassCard.jsx";
import EmptyState from "../../components/alumni/EmptyState.jsx";
import AlumniSocialNav from "../../components/alumni/AlumniSocialNav.jsx";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { apiFetch } from "../../lib/api.js";

export default function AlumniConnectionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("received");
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const load = () =>
    apiFetch(`/api/connections?mode=${mode}`)
      .then((data) => {
        setItems(data);
        if (mode === "received") {
          window.dispatchEvent(new Event("alumni-connections-seen"));
        }
      })
      .catch((err) => setError(err.message));
  useEffect(() => {
    void load();
  }, [mode]);
  const act = async (id, action) => {
    await apiFetch(`/api/connections/request/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ action }),
    });
    load();
  };
  const message = async (person) => {
    try {
      const conversation = await apiFetch("/api/alumni-chat", {
        method: "POST",
        body: JSON.stringify({ memberIds: [person._id] }),
      });
      navigate(`/alumni/chat?conversation=${conversation._id}`);
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <section className="space-y-5">
      <div>
        <p className="portal-page-label">Alumni Network</p>
        <h1 className="portal-page-title">Connections</h1>
      </div>
      <AlumniSocialNav />
      {error && <div className="portal-alert-danger">{error}</div>}
      <div className="flex flex-wrap gap-2">
        {[
          ["accepted", "My Connections"],
          ["received", "Received Requests"],
          ["sent", "Sent Requests"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={mode === value ? "portal-btn-primary" : "portal-btn"}
          >
            {label}
          </button>
        ))}
      </div>
      <GlassCard className="p-5">
        {items.length ? (
          items.map((item) => {
            const person =
              mode === "sent"
                ? item.recipient
                : mode === "received"
                  ? item.requester
                  : String(item.requester?._id) === String(user?.id)
                    ? item.recipient
                    : item.requester;
            return (
              <div
                key={item._id}
                className="flex items-center gap-3 border-b border-[color:var(--md-border)] py-4 last:border-0"
              >
                <Users size={20} />
                <div className="flex-1">
                  <b>{person?.name}</b>
                  <p className="text-xs text-[color:var(--md-text-secondary)]">
                    {person?.alumniProfile?.department}
                  </p>
                  {mode === "received" && item.requestMessage && (
                    <p className="mt-2 rounded-lg bg-[color:var(--md-hover)] p-2 text-sm">
                      “{item.requestMessage}”
                    </p>
                  )}
                </div>
                {mode === "received" && (
                  <>
                    <button
                      onClick={() => act(item._id, "accept")}
                      className="portal-btn-primary"
                    >
                      <Check size={15} />
                      Accept
                    </button>
                    <button
                      onClick={() => act(item._id, "reject")}
                      className="portal-btn-danger"
                    >
                      <X size={15} />
                    </button>
                  </>
                )}
                {mode === "sent" && (
                  <button
                    onClick={() => act(item._id, "cancel")}
                    className="portal-btn"
                  >
                    Cancel
                  </button>
                )}
                {mode === "accepted" && (
                  <>
                    <button onClick={() => message(person)} className="portal-btn-primary">
                      <MessageCircle size={15} />
                      Message
                    </button>
                    <button onClick={() => act(item._id, "remove")} className="portal-btn-danger">
                      Remove
                    </button>
                  </>
                )}
              </div>
            );
          })
        ) : (
          <EmptyState title="No connections here" />
        )}
      </GlassCard>
    </section>
  );
}
