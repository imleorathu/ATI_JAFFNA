import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, CalendarDays, Download, Gift, Heart, Printer, RefreshCw, Save, Search, Settings, Users } from "lucide-react";
import { donationsApi } from "../../lib/donationsApi";
import { downloadCsv } from "../../lib/api";

const currency = (value) => `LKR ${Number(value || 0).toLocaleString()}`;
const chartColors = ["#1a73e8", "#19b890", "#fbbc05", "#ea4335", "#8b5cf6"];
const emptyCampaignForm = {
  campaignName: "",
  description: "",
  imageUrl: "",
  targetAmount: "",
  startDate: "",
  endDate: "",
  status: "active"
};
const campaignTemplates = [
  {
    label: "Scholarship Fund",
    campaignName: "Scholarship Fund",
    description: "Support deserving students with tuition assistance, books, and learning resources.",
    imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
    targetAmount: 1000000
  },
  {
    label: "Library Development",
    campaignName: "Library Development Fund",
    description: "Expand library resources, digital materials, and quiet study spaces for ATI Jaffna students.",
    imageUrl: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=80",
    targetAmount: 750000
  },
  {
    label: "Research Fund",
    campaignName: "Research Fund",
    description: "Fund student research, practical experiments, and innovation-focused project work.",
    imageUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80",
    targetAmount: 900000
  }
];
const targetPresets = [250000, 500000, 1000000, 2500000];

function MetricCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--md-text-secondary)]">{label}</p>
          <p className="mt-2 text-xl font-black text-[color:var(--md-text-primary)]">{value}</p>
        </div>
        <Icon className="text-[color:var(--md-primary)]" size={22} />
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const tone = status === "paid" ? "bg-emerald-500/10 text-emerald-600" : status === "failed" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-black capitalize ${tone}`}>{status || "pending"}</span>;
}

function useDonationData() {
  const [dashboard, setDashboard] = useState(null);
  const [list, setList] = useState([]);
  const [reports, setReports] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async (filters = {}) => {
    setLoading(true);
    setError("");
    try {
      const [dashboardData, listData, reportData, campaignData, settingsData] = await Promise.all([
        donationsApi.dashboard(),
        donationsApi.list(filters),
        donationsApi.reports(filters),
        donationsApi.adminCampaigns(),
        donationsApi.settings()
      ]);
      setDashboard(dashboardData);
      setList(listData.data || []);
      setReports(reportData);
      setCampaigns(campaignData.data || []);
      setSettings(settingsData);
    } catch (err) {
      setError(err.message || "Unable to load donations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { dashboard, list, reports, campaigns, settings, loading, error, load };
}

export default function DonationsPage({ mode = "dashboard" }) {
  const initialTab = ["dashboard", "list", "reports", "campaigns", "settings"].includes(mode) ? mode : "dashboard";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [filters, setFilters] = useState({ search: "", purpose: "", from: "", to: "" });
  const [campaignForm, setCampaignForm] = useState(emptyCampaignForm);
  const [editingCampaignId, setEditingCampaignId] = useState("");
  const [message, setMessage] = useState("");
  const [uploadingCampaignImage, setUploadingCampaignImage] = useState(false);
  const { dashboard, list, reports, campaigns, settings: donationSettings, loading, error, load } = useDonationData();

  const purposes = useMemo(() => [...new Set(list.map((donation) => donation.purpose).filter(Boolean))], [list]);
  const reportRows = reports?.rows || [];
  const donationTableRows = list.map((donation) => ({
    "Donation ID": donation.donationId,
    "Donor Name": donation.isAnonymous ? "Anonymous Donor" : donation.fullName,
    Email: donation.email,
    Purpose: donation.purpose,
    Amount: donation.amount,
    "Payment Status": donation.paymentStatus,
    Date: new Date(donation.createdAt).toLocaleString(),
    Receipt: donation.receiptNumber
  }));

  const refresh = () => load(filters);

  const exportCsv = () => downloadCsv("donations-report.csv", donationTableRows);
  const exportPdf = () => {
    window.print();
  };

  const saveCampaign = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      if (campaignForm.startDate && campaignForm.endDate && campaignForm.endDate < campaignForm.startDate) {
        setMessage("Campaign end date must be after the start date.");
        return;
      }
      const payload = {
        campaignName: campaignForm.campaignName,
        description: campaignForm.description,
        imageUrl: campaignForm.imageUrl,
        targetAmount: Number(campaignForm.targetAmount || 0),
        status: campaignForm.status
      };
      if (campaignForm.startDate) payload.startDate = campaignForm.startDate;
      if (campaignForm.endDate) payload.endDate = campaignForm.endDate;
      if (editingCampaignId) {
        await donationsApi.updateCampaign(editingCampaignId, payload);
      } else {
        await donationsApi.createCampaign(payload);
      }
      setCampaignForm(emptyCampaignForm);
      setEditingCampaignId("");
      setMessage(editingCampaignId ? "Campaign updated." : "Campaign created.");
      refresh();
    } catch (err) {
      setMessage(err.message || "Unable to save campaign.");
    }
  };

  const editCampaign = (campaign) => {
    setEditingCampaignId(campaign._id);
    setCampaignForm({
      campaignName: campaign.campaignName || "",
      description: campaign.description || "",
      imageUrl: campaign.imageUrl || "",
      targetAmount: campaign.targetAmount || "",
      startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().slice(0, 10) : "",
      endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().slice(0, 10) : "",
      status: campaign.status || "active"
    });
  };

  const resetCampaignForm = () => {
    setCampaignForm(emptyCampaignForm);
    setEditingCampaignId("");
    setMessage("");
  };

  const uploadCampaignImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage("");
    setUploadingCampaignImage(true);
    try {
      const result = await donationsApi.uploadCampaignImage(file);
      setCampaignForm((current) => ({ ...current, imageUrl: result.url || "" }));
      setMessage("Campaign image uploaded.");
    } catch (err) {
      setMessage(err.message || "Unable to upload campaign image.");
    } finally {
      setUploadingCampaignImage(false);
      event.target.value = "";
    }
  };

  const campaignPreviewProgress = Math.min(100, Math.round((Number(campaignForm.targetAmount || 0) ? 0 : 0)));

  const tabs = [
    ["dashboard", "Dashboard"],
    ["list", "Donation List"],
    ["reports", "Reports"],
    ["campaigns", "Campaigns"],
    ["settings", "Settings"]
  ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-[color:var(--md-border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="portal-page-label">Admin</p>
          <h1 className="portal-page-title">Donations</h1>
          <p className="portal-page-subtitle">Manage public donations, receipts, campaigns, reports, and payment verification records.</p>
        </div>
        <button type="button" onClick={refresh} className="portal-btn w-fit">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {(error || message) && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${error ? "border-red-500/20 bg-red-500/10 text-red-600" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"}`}>
          {error || message}
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-2">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`rounded-lg px-4 py-2 text-sm font-black transition ${
              activeTab === id
                ? "bg-[color:var(--md-primary)] text-white"
                : "text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)] hover:text-[color:var(--md-text-primary)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Total Donations" value={currency(dashboard?.totalDonations)} icon={Heart} />
            <MetricCard label="Today's Donations" value={currency(dashboard?.todayDonations)} icon={CalendarDays} />
            <MetricCard label="This Month" value={currency(dashboard?.monthDonations)} icon={BarChart3} />
            <MetricCard label="Number of Donors" value={dashboard?.donorCount || 0} icon={Users} />
            <MetricCard label="Average Donation" value={currency(dashboard?.averageDonation)} icon={Gift} />
          </div>
          <DonationTable rows={dashboard?.recentDonations || []} compact />
        </>
      )}

      {activeTab === "list" && (
        <>
          <FilterBar filters={filters} setFilters={setFilters} purposes={purposes} onApply={refresh} onCsv={exportCsv} onPdf={exportPdf} />
          <DonationTable rows={list} />
        </>
      )}

      {activeTab === "reports" && (
        <>
          <FilterBar filters={filters} setFilters={setFilters} purposes={purposes} onApply={refresh} onCsv={exportCsv} onPdf={exportPdf} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Report Total" value={currency(reports?.totals?.amount)} icon={BarChart3} />
            <MetricCard label="Donation Count" value={reports?.totals?.count || 0} icon={Gift} />
            <MetricCard label="Daily / Weekly" value="Use date filter" icon={CalendarDays} />
            <MetricCard label="Custom Range" value={filters.from || filters.to ? "Applied" : "All dates"} icon={Search} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Donation Trends">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={reports?.monthly || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#1a73e8" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Top Donation Purposes">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={reports?.byPurpose || []} dataKey="total" nameKey="_id" outerRadius={95}>
                    {(reports?.byPurpose || []).map((entry, index) => <Cell key={entry._id} fill={chartColors[index % chartColors.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <DonationTable rows={reportRows} compact />
        </>
      )}

      {activeTab === "campaigns" && (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <form onSubmit={saveCampaign} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="classroom-section-title">{editingCampaignId ? "Edit Campaign" : "Create Campaign"}</h2>
                <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">Use templates, image URLs, target presets, dates, and status controls.</p>
              </div>
              {editingCampaignId && (
                <button type="button" onClick={resetCampaignForm} className="portal-btn">
                  New Campaign
                </button>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {campaignTemplates.map((template) => (
                <button
                  key={template.label}
                  type="button"
                  onClick={() => setCampaignForm((current) => ({ ...current, ...template }))}
                  className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-3 py-2 text-xs font-black text-[color:var(--md-text-primary)]"
                >
                  {template.label}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-3">
              <input required className="portal-input" placeholder="Campaign name" value={campaignForm.campaignName} onChange={(event) => setCampaignForm({ ...campaignForm, campaignName: event.target.value })} />
              <textarea className="portal-input min-h-[90px]" placeholder="Description" value={campaignForm.description} onChange={(event) => setCampaignForm({ ...campaignForm, description: event.target.value })} />
              <input className="portal-input" placeholder="Campaign image URL" value={campaignForm.imageUrl} onChange={(event) => setCampaignForm({ ...campaignForm, imageUrl: event.target.value })} />
              <label className="block rounded-lg border border-dashed border-[color:var(--md-border)] bg-[color:var(--md-hover)] px-4 py-4 text-center text-sm font-bold text-[color:var(--md-text-secondary)] transition hover:border-[color:var(--md-primary)] hover:text-[color:var(--md-primary)]">
                <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" onChange={uploadCampaignImage} className="hidden" />
                {uploadingCampaignImage ? "Uploading campaign image..." : "Upload campaign image"}
              </label>
              <input required type="number" min="1" className="portal-input" placeholder="Target amount" value={campaignForm.targetAmount} onChange={(event) => setCampaignForm({ ...campaignForm, targetAmount: event.target.value })} />
              <div className="flex flex-wrap gap-2">
                {targetPresets.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setCampaignForm({ ...campaignForm, targetAmount: amount })}
                    className="rounded-full border border-[color:var(--md-border)] px-3 py-1.5 text-xs font-black text-[color:var(--md-text-secondary)] hover:bg-[color:var(--md-hover)]"
                  >
                    {currency(amount)}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input type="date" className="portal-input" value={campaignForm.startDate} onChange={(event) => setCampaignForm({ ...campaignForm, startDate: event.target.value })} />
                <input type="date" className="portal-input" value={campaignForm.endDate} onChange={(event) => setCampaignForm({ ...campaignForm, endDate: event.target.value })} />
              </div>
              <select className="portal-input" value={campaignForm.status} onChange={(event) => setCampaignForm({ ...campaignForm, status: event.target.value })}>
                {["active", "draft", "paused", "completed"].map((status) => <option key={status}>{status}</option>)}
              </select>
              <button type="submit" className="portal-btn-primary justify-center">
                <Save size={16} />
                {editingCampaignId ? "Update Campaign" : "Save Campaign"}
              </button>
            </div>
            <div className="mt-5 overflow-hidden rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-hover)]">
              {campaignForm.imageUrl ? (
                <img src={campaignForm.imageUrl} alt="" className="h-36 w-full object-cover" />
              ) : (
                <div className="flex h-36 items-center justify-center text-sm font-bold text-[color:var(--md-text-secondary)]">Campaign image preview</div>
              )}
              <div className="p-4">
                <p className="font-black text-[color:var(--md-text-primary)]">{campaignForm.campaignName || "Campaign title preview"}</p>
                <p className="mt-1 line-clamp-2 text-sm text-[color:var(--md-text-secondary)]">{campaignForm.description || "Campaign description preview."}</p>
                <div className="mt-3 h-2 rounded-full bg-[color:var(--md-card)]">
                  <div className="h-2 rounded-full bg-[color:var(--md-primary)]" style={{ width: `${campaignPreviewProgress}%` }} />
                </div>
                <p className="mt-2 text-xs font-bold text-[color:var(--md-text-secondary)]">Target: {campaignForm.targetAmount ? currency(campaignForm.targetAmount) : "Not set"}</p>
              </div>
            </div>
          </form>

          <div className="grid gap-4">
            {campaigns.map((campaign) => {
              const progress = Math.min(100, (Number(campaign.raisedAmount || 0) / Number(campaign.targetAmount || 1)) * 100);
              return (
                <article key={campaign._id} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-[color:var(--md-text-primary)]">{campaign.campaignName}</h3>
                      <p className="mt-1 text-sm text-[color:var(--md-text-secondary)]">{campaign.description || "No description."}</p>
                    </div>
                    <span className="portal-badge portal-badge-info capitalize">{campaign.status}</span>
                  </div>
                  <div className="mt-4 h-3 rounded-full bg-[color:var(--md-hover)]">
                    <div className="h-3 rounded-full bg-[color:var(--md-primary)]" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-2 text-sm font-bold text-[color:var(--md-text-secondary)]">{currency(campaign.raisedAmount)} raised of {currency(campaign.targetAmount)}</p>
                  <button type="button" onClick={() => editCampaign(campaign)} className="portal-btn mt-4">
                    Edit Campaign
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["Gateway Provider", donationSettings?.provider],
            ["Supported Methods", donationSettings?.supportedMethods?.join(", ")],
            ["reCAPTCHA", donationSettings?.recaptchaEnabled ? "Enabled" : "Ready to configure"],
            ["Fraud Detection", donationSettings?.fraudDetection],
            ["Payment Verification", donationSettings?.paymentVerification],
            ["Receipt Email", donationSettings?.receiptEmail]
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-5">
              <Settings className="text-[color:var(--md-primary)]" size={20} />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-[color:var(--md-text-secondary)]">{label}</p>
              <p className="mt-1 text-sm font-black text-[color:var(--md-text-primary)]">{value || "-"}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function FilterBar({ filters, setFilters, purposes, onApply, onCsv, onPdf }) {
  return (
    <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_0.8fr_0.7fr_0.7fr_auto]">
        <input className="portal-input" placeholder="Search donation ID, donor, email, purpose" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <select className="portal-input" value={filters.purpose} onChange={(event) => setFilters({ ...filters, purpose: event.target.value })}>
          <option value="">All purposes</option>
          {purposes.map((purpose) => <option key={purpose}>{purpose}</option>)}
        </select>
        <input type="date" className="portal-input" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
        <input type="date" className="portal-input" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
        <button type="button" onClick={onApply} className="portal-btn-primary justify-center">
          <Search size={16} />
          Apply
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onPdf} className="portal-btn"><Printer size={16} /> Print / PDF</button>
        <button type="button" onClick={onCsv} className="portal-btn"><Download size={16} /> Export Excel</button>
      </div>
    </div>
  );
}

function DonationTable({ rows = [], compact = false }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)]">
      <div className="overflow-x-auto">
        <table className="min-w-[960px] w-full text-left text-sm">
          <thead className="bg-[color:var(--md-hover)] text-xs uppercase tracking-[0.12em] text-[color:var(--md-text-secondary)]">
            <tr>
              {["Donation ID", "Donor Name", "Email", "Purpose", "Amount", "Payment Status", "Date", "Receipt"].map((heading) => (
                <th key={heading} className="px-4 py-3 font-black">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[color:var(--md-text-secondary)]">No donations found.</td></tr>
            ) : rows.map((donation) => (
              <tr key={donation._id || donation.donationId} className="border-t border-[color:var(--md-border)]">
                <td className="px-4 py-3 font-black text-[color:var(--md-text-primary)]">{donation.donationId}</td>
                <td className="px-4 py-3 text-[color:var(--md-text-primary)]">{donation.isAnonymous ? "Anonymous Donor" : donation.fullName}</td>
                <td className="px-4 py-3 text-[color:var(--md-text-secondary)]">{donation.email}</td>
                <td className="px-4 py-3 text-[color:var(--md-text-secondary)]">{donation.purpose}</td>
                <td className="px-4 py-3 font-black text-[color:var(--md-text-primary)]">{currency(donation.amount)}</td>
                <td className="px-4 py-3"><StatusPill status={donation.paymentStatus} /></td>
                <td className="px-4 py-3 text-[color:var(--md-text-secondary)]">{new Date(donation.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-[color:var(--md-primary)] font-black">{donation.receiptNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {compact && rows.length > 8 && <div className="bg-[color:var(--md-hover)] px-4 py-3 text-xs font-bold text-[color:var(--md-text-secondary)]">Showing latest records.</div>}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-5">
      <h2 className="classroom-section-title mb-4">{title}</h2>
      {children}
    </div>
  );
}
