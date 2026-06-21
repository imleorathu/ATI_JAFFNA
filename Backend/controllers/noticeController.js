import Notice from "../models/Notice.js";

const audienceByRole = {
  student: ["all", "students"],
  lecturer: ["all", "lecturers"],
  faculty: ["all", "lecturers"],
  department_staff: ["all", "lecturers"],
  admin: ["all", "admins"],
  finance_officer: ["all"]
};

function visibleNoticeAudienceFilter(user) {
  const role = String(user?.role || "").toLowerCase();
  const allowedAudiences = audienceByRole[role] || ["all"];

  if (role === "admin") return {};

  return {
    $or: [
      { audience: { $in: allowedAudiences } },
      { audience: { $exists: false } },
      { audience: null },
      { audience: "" }
    ]
  };
}

async function listVisibleNotices(req, res, next) {
  try {
    const notices = await Notice.find(visibleNoticeAudienceFilter(req.user)).sort({ createdAt: -1 });
    res.json(notices);
  } catch (error) {
    next(error);
  }
}

async function getVisibleNotice(req, res, next) {
  try {
    const notice = await Notice.findOne({ _id: req.params.id, ...visibleNoticeAudienceFilter(req.user) });
    if (!notice) return res.status(404).json({ message: "Notice not found" });
    res.json(notice);
  } catch (error) {
    next(error);
  }
}

export { getVisibleNotice, listVisibleNotices, visibleNoticeAudienceFilter };
