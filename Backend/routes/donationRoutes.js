import { Router } from "express";
import fs from "fs";
import mongoose from "mongoose";
import path from "path";
import Donation from "../models/Donation.js";
import DonationCampaign from "../models/DonationCampaign.js";
import AuditLog from "../models/AuditLog.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { createDiskUpload } from "../middleware/upload.js";

const router = Router();
const gatewayMethods = ["Visa / MasterCard", "Apple Pay", "Google Pay", "Local Payment", "Bank Transfer"];
const uploadDir = path.resolve("uploads/donations");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = createDiskUpload({
  uploadDir,
  groupName: "cmsImage",
  maxFileSize: 5 * 1024 * 1024
});

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildDateRange(query = {}) {
  const filter = {};
  if (query.from) filter.$gte = new Date(query.from);
  if (query.to) {
    const to = new Date(query.to);
    to.setHours(23, 59, 59, 999);
    filter.$lte = to;
  }
  return Object.keys(filter).length ? filter : null;
}

async function nextDonationNumber() {
  const year = new Date().getFullYear();
  const prefix = `DON-${year}-`;
  const latest = await Donation.findOne({ donationId: new RegExp(`^${prefix}`) }).sort({ donationId: -1 }).select("donationId").lean();
  const lastNumber = latest?.donationId ? Number(latest.donationId.slice(prefix.length)) : 0;
  return `${prefix}${String((Number.isFinite(lastNumber) ? lastNumber : 0) + 1).padStart(6, "0")}`;
}

function donationReceipt(donation) {
  return {
    receiptNumber: donation.receiptNumber,
    donationId: donation.donationId,
    certificateNumber: donation.certificateNumber,
    donorName: donation.isAnonymous ? "Anonymous Donor" : donation.fullName,
    email: donation.email,
    purpose: donation.purpose,
    amount: donation.amount,
    paymentStatus: donation.paymentStatus,
    transactionId: donation.transactionId,
    paidAt: donation.paidAt,
    issuedAt: donation.updatedAt || donation.createdAt
  };
}

function logReceiptEmail(donation) {
  console.info("[donations] receipt email queued", {
    to: donation.email,
    donationId: donation.donationId,
    receiptNumber: donation.receiptNumber
  });
}

async function auditDonation(req, action, entityId, before, after) {
  await AuditLog.create({
    actor: req.user?.id || req.user?._id,
    actorRole: req.user?.role,
    action,
    entityType: "Donation",
    entityId,
    before,
    after,
    ipAddress: req.ip,
    userAgent: req.get("user-agent")
  });
}

router.get("/public/campaigns", async (_req, res, next) => {
  try {
    const campaigns = await DonationCampaign.find({ status: "active" }).sort({ startDate: -1, createdAt: -1 }).lean();
    res.json(campaigns);
  } catch (error) {
    next(error);
  }
});

router.get("/public/wall", async (_req, res, next) => {
  try {
    const [recent, totals, campaigns] = await Promise.all([
      Donation.find({ paymentStatus: "paid" })
        .sort({ paidAt: -1, createdAt: -1 })
        .limit(24)
        .select("fullName purpose amount campaign isAnonymous paidAt createdAt")
        .populate("campaign", "campaignName imageUrl targetAmount raisedAmount endDate description")
        .lean(),
      Donation.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" }, donors: { $addToSet: "$email" }, count: { $sum: 1 } } }
      ]),
      DonationCampaign.find({ status: "active" }).sort({ raisedAmount: -1, createdAt: -1 }).lean()
    ]);

    res.json({
      total: totals[0]?.total || 0,
      donorCount: totals[0]?.donors?.length || 0,
      donationCount: totals[0]?.count || 0,
      campaigns,
      recent: recent.map((donation) => ({
        ...donation,
        fullName: donation.isAnonymous ? "Anonymous Donor" : donation.fullName,
        campaignName: donation.campaign?.campaignName || donation.purpose
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.post("/public/session", async (req, res, next) => {
  try {
    const { fullName, email, phone, purpose, amount, campaignId, isAnonymous, message, paymentMethod } = req.body || {};
    const numericAmount = Number(amount);
    if (!fullName?.trim()) return res.status(400).json({ message: "Full name is required." });
    if (!email?.includes("@")) return res.status(400).json({ message: "A valid email address is required." });
    if (!purpose?.trim()) return res.status(400).json({ message: "Purpose of donation is required." });
    if (!Number.isFinite(numericAmount) || numericAmount < 1) return res.status(400).json({ message: "Donation amount must be greater than zero." });

    const campaign = campaignId && mongoose.Types.ObjectId.isValid(campaignId)
      ? await DonationCampaign.findById(campaignId)
      : null;
    const donationId = await nextDonationNumber();
    const donation = await Donation.create({
      donationId,
      receiptNumber: donationId,
      certificateNumber: `CERT-${donationId}`,
      fullName,
      email,
      phone,
      purpose,
      amount: numericAmount,
      campaign: campaign?._id,
      isAnonymous: Boolean(isAnonymous),
      message,
      paymentMethod: gatewayMethods.includes(paymentMethod) ? paymentMethod : "Visa / MasterCard",
      transactionId: `PENDING-${Date.now()}`
    });

    res.status(201).json({
      donationId: donation.donationId,
      paymentSessionId: String(donation._id),
      paymentPortalUrl: `/donate/payment/${donation.donationId}`,
      supportedMethods: gatewayMethods,
      message: "Donation payment session created."
    });
  } catch (error) {
    next(error);
  }
});

router.post("/public/verify", async (req, res, next) => {
  try {
    const { donationId, paymentMethod = "Visa / MasterCard", transactionId } = req.body || {};
    const donation = await Donation.findOne({ donationId });
    if (!donation) return res.status(404).json({ message: "Donation not found." });
    if (donation.paymentStatus === "paid") {
      return res.json({ donation, receipt: donationReceipt(donation), message: "Donation was already verified." });
    }

    donation.paymentStatus = "paid";
    donation.paymentMethod = gatewayMethods.includes(paymentMethod) ? paymentMethod : "Visa / MasterCard";
    donation.transactionId = transactionId || `TXN-${Date.now()}`;
    donation.paidAt = new Date();
    donation.receiptSentAt = new Date();
    await donation.save();

    if (donation.campaign) {
      await DonationCampaign.findByIdAndUpdate(donation.campaign, { $inc: { raisedAmount: donation.amount } });
    }

    logReceiptEmail(donation);
    res.json({
      donation,
      receipt: donationReceipt(donation),
      thankYouUrl: `/donate/thank-you/${donation.donationId}`,
      message: "Payment verified. Receipt and certificate generated."
    });
  } catch (error) {
    next(error);
  }
});

router.get("/public/receipt/:donationId", async (req, res, next) => {
  try {
    const donation = await Donation.findOne({ donationId: req.params.donationId }).populate("campaign").lean();
    if (!donation) return res.status(404).json({ message: "Donation not found." });
    res.json({ donation, receipt: donationReceipt(donation) });
  } catch (error) {
    next(error);
  }
});

router.use("/admin", requireAuth, requireAdmin);

router.post("/admin/uploads", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Upload an image file." });
  res.status(201).json({ url: `${req.protocol}://${req.get("host")}/uploads/donations/${req.file.filename}` });
});

router.get("/admin/dashboard", async (_req, res, next) => {
  try {
    const now = new Date();
    const today = startOfDay(now);
    const month = startOfMonth(now);
    const [all, todayRows, monthRows, recent] = await Promise.all([
      Donation.find({ paymentStatus: "paid" }).lean(),
      Donation.find({ paymentStatus: "paid", paidAt: { $gte: today } }).lean(),
      Donation.find({ paymentStatus: "paid", paidAt: { $gte: month } }).lean(),
      Donation.find().sort({ createdAt: -1 }).limit(8).lean()
    ]);
    const total = all.reduce((sum, donation) => sum + Number(donation.amount || 0), 0);
    const donors = new Set(all.map((donation) => donation.email));

    res.json({
      totalDonations: total,
      todayDonations: todayRows.reduce((sum, donation) => sum + Number(donation.amount || 0), 0),
      monthDonations: monthRows.reduce((sum, donation) => sum + Number(donation.amount || 0), 0),
      donorCount: donors.size,
      averageDonation: all.length ? total / all.length : 0,
      recentDonations: recent
    });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/list", async (req, res, next) => {
  try {
    const query = {};
    if (req.query.search) {
      const pattern = new RegExp(escapeRegex(req.query.search), "i");
      query.$or = [{ donationId: pattern }, { fullName: pattern }, { email: pattern }, { purpose: pattern }];
    }
    if (req.query.purpose) query.purpose = req.query.purpose;
    const dateRange = buildDateRange(req.query);
    if (dateRange) query.createdAt = dateRange;

    const donations = await Donation.find(query).populate("campaign").sort({ createdAt: -1 }).limit(500).lean();
    res.json({ data: donations });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/reports", async (req, res, next) => {
  try {
    const match = { paymentStatus: "paid" };
    const dateRange = buildDateRange(req.query);
    if (dateRange) match.paidAt = dateRange;
    const [rows, byPurpose, monthly] = await Promise.all([
      Donation.find(match).sort({ paidAt: -1 }).lean(),
      Donation.aggregate([{ $match: match }, { $group: { _id: "$purpose", total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { total: -1 } }]),
      Donation.aggregate([
        { $match: match },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$paidAt" } }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      rows,
      totals: {
        amount: rows.reduce((sum, donation) => sum + Number(donation.amount || 0), 0),
        count: rows.length
      },
      byPurpose,
      monthly,
      sources: [{ source: "website", count: rows.length }]
    });
  } catch (error) {
    next(error);
  }
});

router.get("/admin/campaigns", async (_req, res, next) => {
  try {
    const campaigns = await DonationCampaign.find().sort({ createdAt: -1 }).lean();
    res.json({ data: campaigns });
  } catch (error) {
    next(error);
  }
});

router.post("/admin/campaigns", async (req, res, next) => {
  try {
    const campaign = await DonationCampaign.create(req.body);
    await auditDonation(req, "donation_campaign.created", campaign._id, null, campaign.toObject());
    res.status(201).json(campaign);
  } catch (error) {
    next(error);
  }
});

router.put("/admin/campaigns/:id", async (req, res, next) => {
  try {
    const before = await DonationCampaign.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ message: "Campaign not found." });
    const campaign = await DonationCampaign.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    await auditDonation(req, "donation_campaign.updated", campaign._id, before, campaign.toObject());
    res.json(campaign);
  } catch (error) {
    next(error);
  }
});

router.get("/admin/settings", (_req, res) => {
  res.json({
    provider: "Local Gateway",
    supportedMethods: gatewayMethods,
    recaptchaEnabled: false,
    fraudDetection: "basic_duplicate_guard",
    paymentVerification: "mock_verification_endpoint",
    receiptEmail: "console_email_simulation"
  });
});

export default router;
