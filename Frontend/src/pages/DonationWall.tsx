import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, Building2, FlaskConical, GraduationCap, Heart, Search, Trophy, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { donationsApi } from "../lib/donationsApi";

const currency = (value) => `LKR ${Number(value || 0).toLocaleString()}`;
const webImages = {
  scholarship: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
  library: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80",
  research: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80",
  sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80",
  building: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80"
};

const heroBirds = Array.from({ length: 34 }, (_, index) => index);

function campaignProgress(campaign) {
  const raised = Math.max(0, Number(campaign?.raisedAmount || 0));
  const target = Math.max(0, Number(campaign?.targetAmount || 0));
  const percent = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  const remaining = target > 0 ? Math.max(0, target - raised) : 0;
  return { raised, target, percent, remaining };
}

function dateLabel(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently" : date.toLocaleDateString();
}

function donorName(donation) {
  if (!donation || donation.isAnonymous) return "Anonymous Donor";
  return donation.fullName || "Anonymous Donor";
}

function timeAgo(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

function useAnimatedNumber(value) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const duration = 1200;
    const startedAt = performance.now();

    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(Number(value || 0) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return display;
}

function CounterCard({ label, value, prefix = "", icon: Icon }) {
  const animated = useAnimatedNumber(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="min-w-0 rounded-xl border border-white/25 bg-white/16 p-4 text-center text-white shadow-[0_20px_60px_rgba(2,6,23,0.3)] backdrop-blur-xl sm:p-5"
    >
      <Icon size={22} className="mx-auto text-blue-100" />
      <p className="mt-4 break-words text-xl font-black leading-tight sm:text-2xl">{prefix}{animated.toLocaleString()}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-blue-100/85">{label}</p>
    </motion.div>
  );
}

const successStories = [
  {
    title: "Scholarship Program 2026",
    image: webImages.scholarship,
    description: "Provided educational support for 50 students through tuition assistance and learning resources.",
    amount: 1250000,
    campaign: "Scholarship Fund"
  },
  {
    title: "Library Resource Upgrade",
    image: webImages.library,
    description: "Expanded access to books, digital learning material, and quiet study resources for ATI Jaffna students.",
    amount: 780000,
    campaign: "Library Development Fund"
  },
  {
    title: "Innovation Lab Support",
    image: webImages.research,
    description: "Helped practical coursework with updated equipment for research, experiments, and project work.",
    amount: 950000,
    campaign: "Research Fund"
  }
];

const impactStats = [
  ["Students Supported", 500, GraduationCap],
  ["Research Projects Funded", 25, FlaskConical],
  ["New Laboratories Built", 10, Building2],
  ["Scholarships Awarded", 100, Trophy]
];

export default function DonationWall() {
  const navigate = useNavigate();
  const [wall, setWall] = useState({ total: 0, donorCount: 0, donationCount: 0, campaigns: [], recent: [] });
  const [search, setSearch] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [sortMode, setSortMode] = useState("latest");
  const [selectedStory, setSelectedStory] = useState(null);

  const loadWall = () => {
    donationsApi.wall().then(setWall).catch(() => {});
  };

  useEffect(() => {
    loadWall();
    const interval = window.setInterval(loadWall, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const campaigns = wall.campaigns || [];
  const recent = wall.recent || [];
  const campaignNames = [...new Set(campaigns.map((item) => item.campaignName).filter(Boolean))];

  const filteredDonors = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...recent]
      .filter((donation) => {
        const donor = donorName(donation);
        const matchesSearch = !query || donor.toLowerCase().includes(query) || String(donation.purpose || "").toLowerCase().includes(query);
        const matchesCampaign = !campaignFilter || donation.campaignName === campaignFilter;
        return matchesSearch && matchesCampaign;
      })
      .sort((a, b) => {
        if (sortMode === "highest") return Number(b.amount || 0) - Number(a.amount || 0);
        return new Date(b.paidAt || b.createdAt || 0).getTime() - new Date(a.paidAt || a.createdAt || 0).getTime();
      });
  }, [campaignFilter, recent, search, sortMode]);

  return (
    <main className="min-h-screen bg-[color:var(--md-bg)]">
      <section className="donation-wall-hero relative isolate flex min-h-[100svh] items-center overflow-hidden px-4 py-24 text-white sm:px-6 sm:py-28 lg:px-8">
        <div className="donation-wall-hero-base absolute inset-0 z-0 bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700" />
        <div className="donation-wall-hero-shade absolute inset-0 z-10 bg-gradient-to-r from-slate-950/98 via-slate-950/82 to-blue-700/52" />
        <div className="donation-wall-hero-glow absolute inset-0 z-10 bg-[radial-gradient(circle_at_80%_18%,rgba(125,211,252,0.26),transparent_24rem),radial-gradient(circle_at_12%_86%,rgba(26,115,232,0.18),transparent_22rem)]" />
        <div className="donation-wall-birds" aria-hidden="true">
          {heroBirds.map((bird) => (
            <span key={bird} className="donation-wall-bird" />
          ))}
        </div>
        <div className="donation-wall-hero-fade pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-[color:var(--md-bg)] to-transparent" />
        <div className="relative z-20 mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-8 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="mx-auto max-w-4xl">
            <p className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-blue-100 shadow-[0_14px_44px_rgba(2,6,23,0.25)] backdrop-blur-md">
              <Heart size={15} />
              Donation
            </p>
            <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-black leading-[1.04] tracking-normal text-white drop-shadow-[0_18px_54px_rgba(0,0,0,0.45)] sm:text-5xl lg:text-7xl">Donation Wall</h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm font-semibold leading-7 text-blue-50/95 sm:text-base sm:leading-8">
              See how donors, alumni, and community partners support ATI Jaffna students, learning spaces, and future-focused campaigns.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => navigate("/donate")} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-blue-50 sm:w-auto">
                Donate Now
                <ArrowRight size={16} />
              </button>
              <a href="#campaign-progress" className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/16 sm:w-auto">
                View Campaigns
              </a>
            </div>
          </motion.div>
          <div className="grid w-full min-w-0 max-w-5xl gap-3 sm:grid-cols-3 sm:gap-4">
            <CounterCard label="Total Donations Raised" value={wall.total} prefix="LKR " icon={Heart} />
            <CounterCard label="Total Donors" value={wall.donorCount} icon={Users} />
            <CounterCard label="Active Campaigns" value={campaigns.length} icon={BookOpen} />
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="portal-page-label">Live Counter</p>
            <h2 className="portal-page-title">Real-time donation feed</h2>
            <p className="portal-page-subtitle">This feed refreshes automatically and keeps anonymous donors private.</p>
          </div>
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {recent.length === 0 && (
                <div className="rounded-xl border border-dashed border-[color:var(--md-border)] bg-[color:var(--md-card)] p-8 text-center text-sm font-bold text-[color:var(--md-text-secondary)]">
                  No live donations yet. New verified donations will appear here automatically.
                </div>
              )}
              {recent.slice(0, 8).map((donation) => (
                <motion.article
                  key={donation._id || `${donation.fullName}-${donation.createdAt}`}
                  layout
                  initial={{ opacity: 0, y: -12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12 }}
                  className="rounded-xl border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4 shadow-[var(--md-shadow)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-[color:var(--md-text-primary)]">{donorName(donation)} donated {currency(donation.amount)}</p>
                      <p className="text-sm text-[color:var(--md-text-secondary)]">{donation.campaignName || donation.purpose}</p>
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-[color:var(--md-primary)]">{timeAgo(donation.paidAt || donation.createdAt)}</span>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      <section className="page-section pt-0">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="portal-page-label">Recent Donors</p>
              <h2 className="portal-page-title">Community contributions</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:w-[48rem]">
              <label className="portal-search">
                <Search size={16} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search donor" />
              </label>
              <select className="portal-input" value={campaignFilter} onChange={(event) => setCampaignFilter(event.target.value)}>
                <option value="">All campaigns</option>
                {campaignNames.map((name) => <option key={name}>{name}</option>)}
              </select>
              <select className="portal-input" value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                <option value="latest">Sort by latest</option>
                <option value="highest">Sort by highest amount</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredDonors.length === 0 && (
              <div className="rounded-xl border border-dashed border-[color:var(--md-border)] bg-[color:var(--md-card)] p-8 text-center text-sm font-bold text-[color:var(--md-text-secondary)] md:col-span-2 xl:col-span-3">
                No donors match the current search and filter.
              </div>
            )}
            {filteredDonors.map((donation) => (
              <article key={donation._id || `${donation.fullName}-${donation.createdAt}`} className="rounded-xl border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-5 shadow-[var(--md-shadow)]">
                <p className="text-lg font-black text-[color:var(--md-text-primary)]">{donorName(donation)}</p>
                <p className="mt-2 text-2xl font-black text-[color:var(--md-primary)]">{currency(donation.amount)}</p>
                <p className="mt-2 text-sm font-bold text-[color:var(--md-text-secondary)]">{donation.campaignName || donation.purpose}</p>
                <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-[color:var(--md-text-secondary)]">{dateLabel(donation.paidAt || donation.createdAt)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="campaign-progress" className="page-section bg-clay-card/60">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="portal-page-label">Campaign Progress</p>
            <h2 className="portal-page-title">Active donation campaigns</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {campaigns.length === 0 && (
              <div className="rounded-xl border border-dashed border-[color:var(--md-border)] bg-[color:var(--md-card)] p-8 text-center text-sm font-bold text-[color:var(--md-text-secondary)] md:col-span-2 xl:col-span-3">
                No active admin-created campaigns are available yet.
              </div>
            )}
            {campaigns.map((campaign) => {
              const { raised, target, percent, remaining } = campaignProgress(campaign);
              const daysRemaining = campaign.endDate ? Math.max(0, Math.ceil((new Date(campaign.endDate).getTime() - Date.now()) / 86400000)) : null;
              return (
                <article key={campaign._id} className="overflow-hidden rounded-xl border border-[color:var(--md-border)] bg-[color:var(--md-card)] shadow-[var(--md-shadow)]">
                  {campaign.imageUrl ? (
                    <img src={campaign.imageUrl} alt="" className="h-44 w-full object-cover" />
                  ) : (
                    <div className="grid h-44 place-items-center bg-gradient-to-br from-blue-600 via-blue-800 to-slate-950 px-5 text-center text-sm font-black uppercase tracking-[0.16em] text-white">
                      {campaign.campaignName || "Donation Campaign"}
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-lg font-black text-[color:var(--md-text-primary)]">{campaign.campaignName}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[color:var(--md-text-secondary)]">{campaign.description || "Campaign details will be updated soon."}</p>
                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-[color:var(--md-hover)]">
                      <motion.div
                        initial={{ width: "0%" }}
                        whileInView={{ width: `${percent}%` }}
                        viewport={{ once: true, amount: 0.45 }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        className="h-full rounded-full bg-[color:var(--md-primary)]"
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <p><span className="block text-[color:var(--md-text-secondary)]">Raised</span><strong>{currency(raised)}</strong></p>
                      <p><span className="block text-[color:var(--md-text-secondary)]">Goal</span><strong>{target > 0 ? currency(target) : "Not set"}</strong></p>
                      <p><span className="block text-[color:var(--md-text-secondary)]">Complete</span><strong>{percent}%</strong></p>
                      <p><span className="block text-[color:var(--md-text-secondary)]">Remaining</span><strong>{target > 0 ? currency(remaining) : "-"}</strong></p>
                    </div>
                    <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[color:var(--md-text-secondary)]">{daysRemaining === null ? "Open campaign" : `${daysRemaining} days remaining`}</p>
                    <button type="button" onClick={() => navigate("/donate")} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--md-primary)] px-4 py-3 text-sm font-black text-white">
                      Donate Now
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="portal-page-label">Success Stories</p>
            <h2 className="portal-page-title">Real impact from giving</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {successStories.map((story) => (
              <article key={story.title} className="overflow-hidden rounded-xl border border-[color:var(--md-border)] bg-[color:var(--md-card)] shadow-[var(--md-shadow)]">
                <img src={story.image} alt="" className="h-44 w-full object-cover" />
                <div className="p-5">
                  <h3 className="text-lg font-black text-[color:var(--md-text-primary)]">{story.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-[color:var(--md-text-secondary)]">{story.description}</p>
                  <p className="mt-4 text-sm font-black text-[color:var(--md-primary)]">{currency(story.amount)} funded</p>
                  <button type="button" onClick={() => setSelectedStory(story)} className="mt-4 text-sm font-black text-[color:var(--md-primary)]">Read More</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section pt-0">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
          {impactStats.map(([label, value, Icon]) => (
            <ImpactCard key={label} label={label} value={value} icon={Icon} />
          ))}
        </div>
      </section>

      {selectedStory && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-[color:var(--md-card)] p-5 shadow-2xl">
            <div className="flex justify-end">
              <button type="button" onClick={() => setSelectedStory(null)} className="rounded-lg bg-[color:var(--md-hover)] p-2 text-[color:var(--md-text-primary)]">
                <X size={18} />
              </button>
            </div>
            <img src={selectedStory.image} alt="" className="mt-2 h-64 w-full rounded-xl object-cover" />
            <h2 className="mt-5 text-2xl font-black text-[color:var(--md-text-primary)]">{selectedStory.title}</h2>
            <p className="mt-3 leading-7 text-[color:var(--md-text-secondary)]">{selectedStory.description}</p>
            <p className="mt-5 font-black text-[color:var(--md-primary)]">{currency(selectedStory.amount)} funded through {selectedStory.campaign}</p>
          </motion.div>
        </div>
      )}
    </main>
  );
}

function ImpactCard({ label, value, icon: Icon }) {
  const animated = useAnimatedNumber(value);
  return (
    <motion.article initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-xl border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-5 text-center shadow-[var(--md-shadow)]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-[color:var(--md-primary)]">
        <Icon size={22} />
      </div>
      <p className="mt-4 text-3xl font-black text-[color:var(--md-text-primary)]">{animated.toLocaleString()}</p>
      <p className="mt-1 text-sm font-black text-[color:var(--md-text-secondary)]">{label}</p>
    </motion.article>
  );
}
