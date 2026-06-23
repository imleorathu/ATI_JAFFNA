import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, BadgeCheck, CreditCard, Download, Heart, Mail, ShieldCheck } from "lucide-react";
import { donationsApi } from "../lib/donationsApi";

const currency = (value) => `LKR ${Number(value || 0).toLocaleString()}`;
const GENERAL_DONATION = "General Donation";
const methods = ["Visa / MasterCard", "Apple Pay", "Google Pay", "Local Payment", "Bank Transfer"];

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-clay-muted">{label}</span>
      {children}
    </label>
  );
}

function inputClass() {
  return "w-full rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-3 py-3 text-sm font-bold text-[color:var(--md-text-primary)] outline-none transition focus:border-[color:var(--md-primary)]";
}

export default function DonationPage({ mode = "form" }) {
  const navigate = useNavigate();
  const { donationId } = useParams();
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    purpose: GENERAL_DONATION,
    amount: "",
    campaignId: "",
    isAnonymous: false,
    message: "",
    paymentMethod: "Visa / MasterCard"
  });
  const [receiptData, setReceiptData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    donationsApi.campaigns().then(setCampaigns).catch(() => setCampaigns([]));
  }, []);

  useEffect(() => {
    if ((mode === "payment" || mode === "thank-you") && donationId) {
      donationsApi.receipt(donationId).then(setReceiptData).catch((err) => setError(err.message));
    }
  }, [donationId, mode]);

  const selectedCampaign = useMemo(() => campaigns.find((campaign) => campaign._id === form.campaignId), [campaigns, form.campaignId]);
  const selectedCampaignProgress = useMemo(() => {
    const raised = Math.max(0, Number(selectedCampaign?.raisedAmount || 0));
    const target = Math.max(0, Number(selectedCampaign?.targetAmount || 0));
    const percent = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
    return { raised, target, percent };
  }, [selectedCampaign]);

  const updateDonationPurpose = (value) => {
    if (value === GENERAL_DONATION) {
      setForm((current) => ({ ...current, purpose: GENERAL_DONATION, campaignId: "" }));
      return;
    }

    const campaign = campaigns.find((item) => item._id === value);
    setForm((current) => ({
      ...current,
      purpose: campaign?.campaignName || GENERAL_DONATION,
      campaignId: campaign?._id || ""
    }));
  };

  const submitDonation = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await donationsApi.createSession(form);
      navigate(`/donate/payment/${session.donationId}`);
    } catch (err) {
      setError(err.message || "Unable to start donation.");
    } finally {
      setLoading(false);
    }
  };

  const completePayment = async () => {
    setLoading(true);
    setError("");
    try {
      await donationsApi.verifyPayment({
        donationId,
        paymentMethod: receiptData?.donation?.paymentMethod || form.paymentMethod,
        transactionId: `WEB-${Date.now()}`
      });
      navigate(`/donate/thank-you/${donationId}`, { replace: true });
    } catch (err) {
      setError(err.message || "Unable to verify payment.");
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = () => window.print();

  if (mode === "thank-you") {
    const receipt = receiptData?.receipt;
    return (
      <section className="page-section">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-6 text-center shadow-[var(--md-shadow)] sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <BadgeCheck size={34} />
            </div>
            <p className="mt-5 text-sm font-black uppercase tracking-[0.2em] text-[color:var(--md-primary)]">Thank You</p>
            <h1 className="mt-3 text-3xl font-black text-[color:var(--md-text-primary)]">Your donation was received</h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[color:var(--md-text-secondary)]">
              A receipt and donation certificate have been generated. Email delivery is queued by the portal.
            </p>

            {receipt && (
              <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-dashed border-[color:var(--md-border)] bg-[color:var(--md-hover)] p-5 text-left">
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Receipt No", receipt.receiptNumber],
                    ["Certificate No", receipt.certificateNumber],
                    ["Donor", receipt.donorName],
                    ["Purpose", receipt.purpose],
                    ["Amount", currency(receipt.amount)],
                    ["Transaction", receipt.transactionId]
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[color:var(--md-text-secondary)]">{label}</p>
                      <p className="mt-1 text-sm font-black text-[color:var(--md-text-primary)]">{value || "-"}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={printReceipt} className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--md-primary)] px-4 py-3 text-sm font-black text-white">
                <Download size={16} />
                Print Receipt
              </button>
              <button type="button" onClick={() => navigate("/")} className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--md-border)] px-4 py-3 text-sm font-black text-[color:var(--md-text-primary)]">
                Back Home
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (mode === "payment") {
    const donation = receiptData?.donation;
    return (
      <section className="page-section">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-2xl border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-6 shadow-[var(--md-shadow)] sm:p-8">
            <p className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[color:var(--md-primary)]">
              <CreditCard size={15} />
              Secure Payment Portal
            </p>
            <h1 className="mt-5 text-3xl font-black text-[color:var(--md-text-primary)]">Complete your donation</h1>
            <p className="mt-3 text-sm leading-7 text-[color:var(--md-text-secondary)]">
              This local portal simulates gateway verification and is ready to connect to PayHere, Stripe, or another live payment processor.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {methods.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, paymentMethod: method }))}
                  className={`rounded-lg border px-4 py-3 text-left text-sm font-black transition ${form.paymentMethod === method ? "border-[color:var(--md-primary)] bg-blue-500/10 text-[color:var(--md-primary)]" : "border-[color:var(--md-border)] bg-[color:var(--md-hover)] text-[color:var(--md-text-primary)]"}`}
                >
                  {method}
                </button>
              ))}
            </div>
            {error && <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
            <button type="button" onClick={completePayment} disabled={loading || !donation} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[color:var(--md-primary)] px-5 py-3 text-sm font-black text-white disabled:opacity-60">
              {loading ? "Verifying..." : "Pay Securely"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </div>

          <aside className="rounded-2xl border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-6 shadow-[var(--md-shadow)]">
            <h2 className="text-lg font-black text-[color:var(--md-text-primary)]">Donation Summary</h2>
            <div className="mt-5 space-y-3 text-sm">
              <p className="flex justify-between gap-4"><span className="text-[color:var(--md-text-secondary)]">Donation ID</span><strong>{donation?.donationId || donationId}</strong></p>
              <p className="flex justify-between gap-4"><span className="text-[color:var(--md-text-secondary)]">Purpose</span><strong>{donation?.purpose || "-"}</strong></p>
              <p className="flex justify-between gap-4"><span className="text-[color:var(--md-text-secondary)]">Amount</span><strong>{currency(donation?.amount)}</strong></p>
              <p className="flex justify-between gap-4"><span className="text-[color:var(--md-text-secondary)]">Status</span><strong className="capitalize">{donation?.paymentStatus || "pending"}</strong></p>
            </div>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[color:var(--md-primary)]">
            <Heart size={15} />
            Donate Here
          </p>
          <h1 className="mt-5 text-4xl font-black leading-tight text-[color:var(--md-text-primary)]">Support ATI Jaffna students and campus development</h1>
          <p className="mt-4 text-sm leading-7 text-[color:var(--md-text-secondary)]">
            Donate without creating an account. Your receipt and certificate are generated after payment confirmation.
          </p>
          <div className="mt-6 grid gap-3">
            {["Visa / MasterCard", "Apple Pay / Google Pay when available", "Local payment methods", "Receipt and certificate generation"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-lg border border-[color:var(--md-border)] bg-[color:var(--md-card)] px-4 py-3 text-sm font-bold text-[color:var(--md-text-primary)]">
                <ShieldCheck size={18} className="text-[color:var(--md-primary)]" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={submitDonation} className="rounded-2xl border border-[color:var(--md-border)] bg-[color:var(--md-card)] p-5 shadow-[var(--md-shadow)] sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full Name">
              <input className={inputClass()} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required />
            </Field>
            <Field label="Email Address">
              <input type="email" className={inputClass()} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </Field>
            <Field label="Phone Number (optional)">
              <input className={inputClass()} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            </Field>
            <Field label="Purpose of Donation">
              <select className={inputClass()} value={form.campaignId || GENERAL_DONATION} onChange={(event) => updateDonationPurpose(event.target.value)}>
                <option value={GENERAL_DONATION}>{GENERAL_DONATION}</option>
                {campaigns.map((campaign) => <option key={campaign._id} value={campaign._id}>{campaign.campaignName}</option>)}
              </select>
            </Field>
            <Field label="Donation Amount">
              <input type="number" min="1" className={inputClass()} value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required />
            </Field>
          </div>
          {selectedCampaign && (
            <div className="mt-4 rounded-lg bg-[color:var(--md-hover)] p-4">
              <p className="text-sm font-black text-[color:var(--md-text-primary)]">{selectedCampaign.campaignName}</p>
              <div className="mt-2 h-2 rounded-full bg-slate-200">
                <div className="h-2 rounded-full bg-[color:var(--md-primary)]" style={{ width: `${selectedCampaignProgress.percent}%` }} />
              </div>
              <p className="mt-2 text-xs font-bold text-[color:var(--md-text-secondary)]">{currency(selectedCampaignProgress.raised)} raised of {currency(selectedCampaignProgress.target)}</p>
            </div>
          )}
          <label className="mt-4 flex items-center gap-3 text-sm font-bold text-[color:var(--md-text-primary)]">
            <input type="checkbox" checked={form.isAnonymous} onChange={(event) => setForm({ ...form, isAnonymous: event.target.checked })} />
            Anonymous Donation
          </label>
          <Field label="Message / Comment (optional)">
            <textarea className={`${inputClass()} min-h-[96px]`} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
          </Field>
          {error && <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm font-bold text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--md-primary)] px-5 py-3 text-sm font-black text-white disabled:opacity-60">
            {loading ? "Opening payment..." : "Continue to Payment"}
            {!loading && <ArrowRight size={16} />}
          </button>
          <p className="mt-4 flex items-center gap-2 text-xs font-bold text-[color:var(--md-text-secondary)]">
            <Mail size={14} />
            Receipt will be sent to the email address above.
          </p>
        </form>
      </div>
    </section>
  );
}
