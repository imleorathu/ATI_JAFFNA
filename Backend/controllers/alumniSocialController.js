import AuditLog from "../models/AuditLog.js";
import Alumni from "../models/Alumni.js";
import AlumniConnection from "../models/AlumniConnection.js";
import AlumniChatMessage from "../models/AlumniChatMessage.js";
import AlumniNotification from "../models/AlumniNotification.js";
import AlumniPost from "../models/AlumniPost.js";
import AlumniPrivacy from "../models/AlumniPrivacy.js";
import AlumniRelation from "../models/AlumniRelation.js";
import AlumniReport from "../models/AlumniReport.js";
import AlumniSavedItem from "../models/AlumniSavedItem.js";
import AlumniVerification from "../models/AlumniVerification.js";
import AlumniRestriction from "../models/AlumniRestriction.js";
import User from "../models/User.js";
import path from "path";
import { parsePagination } from "../middleware/pagination.js";

const clean = (value) => String(value || "").trim();
const objectId = (value) => String(value || "");
const alumniRoles = ["alumni", "admin"];
const publicProfileFields =
  "fullName profilePhotoUrl coverPhotoUrl introduction department programme batch admissionAcademicYear graduationYear jobTitle companyName employmentStatus employmentHistory industry skills professionalQualifications higherEducationQualifications achievements currentCountry currentCity portfolioUrl linkedInUrl githubUrl personalWebsite mentorAvailable recruitmentAvailable businessOwner profileCompletion verificationStatus createdAt lastActiveAt";

async function currentAlumni(req, { verified = false } = {}) {
  if (!alumniRoles.includes(req.user?.role))
    return { error: "Alumni or admin access required." };
  if (req.user.role === "admin")
    return { admin: true, user: await User.findById(req.user.id) };
  const user = await User.findById(req.user.id).select(
    "name email role accountStatus alumniProfile",
  );
  const alumni = user?.alumniProfile?.alumniId
    ? await Alumni.findById(user.alumniProfile.alumniId)
    : null;
  if (!user || !alumni || user.accountStatus !== "approved")
    return { error: "Approved alumni access is required." };
  if (verified && alumni.verificationStatus !== "verified")
    return { error: "Verified alumni status is required." };
  await Alumni.updateOne({ _id: alumni._id }, { lastActiveAt: new Date() });
  return { user, alumni };
}

async function notify({
  recipient,
  actor,
  type,
  title,
  message,
  targetType,
  targetId,
  dedupeKey,
}) {
  if (!recipient || objectId(recipient) === objectId(actor)) return;
  await AlumniNotification.findOneAndUpdate(
    { recipient, dedupeKey: dedupeKey || `${type}:${actor}:${targetId || ""}` },
    {
      recipient,
      actor,
      type,
      title,
      message,
      targetType,
      targetId,
      readAt: null,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).catch(() => {});
}

async function blockedBetween(a, b) {
  return AlumniRelation.exists({
    type: "block",
    $or: [
      { actor: a, target: b },
      { actor: b, target: a },
    ],
  });
}

async function acceptedConnection(a, b) {
  return AlumniConnection.exists({
    status: "accepted",
    $or: [
      { requester: a, recipient: b },
      { requester: b, recipient: a },
    ],
  });
}

function pageResponse(data, page, limit, total) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

export async function listDirectory(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const { page, limit, skip } = parsePagination(req);
    const query = {
      accountStatus: "approved",
      verificationStatus: { $ne: "suspended" },
    };
    for (const key of [
      "department",
      "programme",
      "batch",
      "graduationYear",
      "companyName",
      "jobTitle",
      "industry",
      "currentCountry",
      "currentCity",
    ])
      if (req.query[key]) query[key] = clean(req.query[key]);
    for (const key of [
      "mentorAvailable",
      "recruitmentAvailable",
      "businessOwner",
    ])
      if (req.query[key] !== undefined)
        query[key] = String(req.query[key]) === "true";
    if (req.query.verified === "true") query.verificationStatus = "verified";
    if (req.query.q) query.$text = { $search: clean(req.query.q) };
    const hiddenUserIds = scope.admin
      ? []
      : await AlumniRelation.find({
          actor: scope.user._id,
          type: "block",
        }).distinct("target");
    if (!scope.admin)
      hiddenUserIds.push(
        ...(await AlumniPrivacy.find({ searchVisible: false }).distinct(
          "user",
        )),
      );
    const hiddenAlumniIds = scope.admin ? [] : [scope.alumni._id];
    if (hiddenUserIds.length) {
      hiddenAlumniIds.push(...await User.find({
        _id: { $in: hiddenUserIds },
      }).distinct("alumniProfile.alumniId"));
    }
    if (hiddenAlumniIds.length) {
      query._id = { $nin: hiddenAlumniIds };
    }
    const [data, total] = await Promise.all([
      Alumni.find(query)
        .select(publicProfileFields)
        .sort({ verificationStatus: -1, fullName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Alumni.countDocuments(query),
    ]);
    const users = await User.find({
      "alumniProfile.alumniId": { $in: data.map((item) => item._id) },
    })
      .select("_id alumniProfile.alumniId")
      .lean();
    const userByAlumni = new Map(
      users.map((item) => [objectId(item.alumniProfile.alumniId), item._id]),
    );
    const connectionByUser = new Map();
    if (!scope.admin) {
      const connections = await AlumniConnection.find({
        status: { $in: ["pending", "accepted"] },
        $or: [
          { requester: scope.user._id, recipient: { $in: users.map((item) => item._id) } },
          { recipient: scope.user._id, requester: { $in: users.map((item) => item._id) } },
        ],
      }).lean();
      for (const connection of connections) {
        const otherId = objectId(connection.requester) === objectId(scope.user._id)
          ? connection.recipient
          : connection.requester;
        connectionByUser.set(objectId(otherId), {
          connectionId: connection._id,
          connectionStatus: connection.status,
          connectionDirection:
            connection.status === "pending"
              ? objectId(connection.requester) === objectId(scope.user._id) ? "sent" : "received"
              : "connected",
        });
      }
    }
    res.json(
      pageResponse(
        data.map((item) => {
          const userId = userByAlumni.get(objectId(item._id));
          return { ...item, userId, ...(connectionByUser.get(objectId(userId)) || {}) };
        }),
        page,
        limit,
        total,
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function getPublicProfile(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const alumni = await Alumni.findById(req.params.id)
      .select(
        `${publicProfileFields} email mobileNumber studentRegistrationNumber currentAddress`,
      )
      .lean();
    if (!alumni || alumni.verificationStatus === "suspended")
      return res.status(404).json({ message: "Alumni profile not found." });
    const targetUser = await User.findOne({
      "alumniProfile.alumniId": alumni._id,
    })
      .select("_id")
      .lean();
    if (
      !scope.admin &&
      targetUser &&
      (await blockedBetween(scope.user._id, targetUser._id))
    )
      return res.status(404).json({ message: "Alumni profile not found." });
    const privacy = targetUser
      ? await AlumniPrivacy.findOne({ user: targetUser._id }).lean()
      : null;
    const connection =
      !scope.admin && targetUser
        ? await AlumniConnection.findOne({
            status: { $in: ["pending", "accepted"] },
            $or: [
              { requester: scope.user._id, recipient: targetUser._id },
              { requester: targetUser._id, recipient: scope.user._id },
            ],
          }).lean()
        : null;
    const connected = connection?.status === "accepted";
    const owner = objectId(targetUser?._id) === objectId(scope.user?._id);
    const canSee = (visibility) =>
      scope.admin ||
      owner ||
      visibility === "everyone" ||
      (visibility === "verified_users" &&
        scope.alumni?.verificationStatus === "verified") ||
      (visibility === "connections" && connected);
    if (!canSee(privacy?.profileVisibility || "verified_users"))
      return res.status(404).json({ message: "Alumni profile not found." });
    for (const field of Object.keys(alumni)) {
      if (
        ["_id", "fullName", "profilePhotoUrl", "verificationStatus"].includes(
          field,
        )
      )
        continue;
      const sensitive = [
        "email",
        "mobileNumber",
        "studentRegistrationNumber",
        "currentAddress",
      ].includes(field);
      const visibility =
        privacy?.fieldVisibility?.[field] ||
        (sensitive
          ? "administrators"
          : privacy?.profileVisibility || "verified_users");
      const allowed =
        scope.admin ||
        objectId(targetUser?._id) === objectId(scope.user?._id) ||
        visibility === "everyone" ||
        (visibility === "verified_users" &&
          scope.alumni?.verificationStatus === "verified") ||
        (visibility === "connections" && connected);
      if (!allowed) delete alumni[field];
    }
    const postQuery = await visiblePostQuery(scope);
    postQuery.author = targetUser?._id;
    if (!scope.admin) postQuery.hiddenBy = { $ne: scope.user._id };
    const posts = targetUser
      ? await AlumniPost.find(postQuery)
          .populate("author", "name alumniProfile")
          .populate("comments.author comments.replies.author", "name alumniProfile")
          .populate({
            path: "originalPost",
            populate: { path: "author", select: "name alumniProfile" },
          })
          .sort({ createdAt: -1 })
          .limit(30)
          .lean()
      : [];
    res.json({
      profile: { ...alumni, userId: targetUser?._id },
      posts,
      connected,
      owner,
      connectionId: connection?._id,
      connectionStatus: connection?.status || null,
      connectionDirection: connection
        ? connection.status === "accepted"
          ? "connected"
          : objectId(connection.requester) === objectId(scope.user._id)
            ? "sent"
            : "received"
        : null,
    });
  } catch (error) {
    next(error);
  }
}

export async function sendConnection(req, res, next) {
  try {
    const scope = await currentAlumni(req, { verified: true });
    if (scope.error) return res.status(403).json({ message: scope.error });
    const recipient = await User.findById(req.params.userId).select(
      "role accountStatus name alumniProfile",
    );
    if (
      !recipient ||
      recipient.role !== "alumni" ||
      recipient.accountStatus !== "approved"
    )
      return res.status(404).json({ message: "Alumni user not found." });
    if (objectId(recipient._id) === objectId(scope.user._id))
      return res
        .status(400)
        .json({ message: "You cannot connect with yourself." });
    if (await blockedBetween(scope.user._id, recipient._id))
      return res.status(403).json({ message: "Connection is unavailable." });
    const recipientPrivacy = await AlumniPrivacy.findOne({
      user: recipient._id,
    }).lean();
    if (
      recipientPrivacy?.connectionRequests === "nobody" ||
      (recipientPrivacy?.connectionRequests === "verified_users" &&
        scope.alumni.verificationStatus !== "verified")
    )
      return res.status(403).json({
        message: "This alumni member is not accepting connection requests.",
      });
    const activeConnection = await AlumniConnection.findOne({
      status: { $in: ["pending", "accepted"] },
      $or: [
        { requester: scope.user._id, recipient: recipient._id },
        { requester: recipient._id, recipient: scope.user._id },
      ],
    });
    if (activeConnection?.status === "accepted")
      return res.status(409).json({ message: "You are already connected." });
    const reverse =
      activeConnection &&
      objectId(activeConnection.requester) === objectId(recipient._id)
        ? activeConnection
        : null;
    if (reverse) {
      reverse.status = "accepted";
      await reverse.save();
      return res.json(reverse);
    }
    if (activeConnection)
      return res
        .status(409)
        .json({ message: "A connection request already exists." });
    const existing = await AlumniConnection.findOne({
      requester: scope.user._id,
      recipient: recipient._id,
    });
    const connection =
      existing ||
      new AlumniConnection({
        requester: scope.user._id,
        recipient: recipient._id,
      });
    connection.status = "pending";
    connection.requestMessage = clean(req.body.message).slice(0, 500);
    await connection.save();
    await notify({
      recipient: recipient._id,
      actor: scope.user._id,
      type: "connection_request",
      title: "New connection request",
      message: connection.requestMessage
        ? `${scope.user.name} sent you a connection request: ${connection.requestMessage}`
        : `${scope.user.name} sent you a connection request.`,
      targetType: "connection",
      targetId: connection._id,
    });
    res.status(201).json(connection);
  } catch (error) {
    next(error);
  }
}

export async function connectionAction(req, res, next) {
  try {
    const scope = await currentAlumni(req, { verified: true });
    if (scope.error) return res.status(403).json({ message: scope.error });
    const connection = await AlumniConnection.findById(req.params.id);
    if (!connection)
      return res.status(404).json({ message: "Connection request not found." });
    const action = clean(req.body.action);
    if (
      ["accept", "reject"].includes(action) &&
      objectId(connection.recipient) !== objectId(scope.user._id)
    )
      return res
        .status(403)
        .json({ message: "Only the recipient can review this request." });
    if (
      action === "cancel" &&
      objectId(connection.requester) !== objectId(scope.user._id)
    )
      return res
        .status(403)
        .json({ message: "Only the requester can cancel this request." });
    if (
      action === "remove" &&
      ![connection.requester, connection.recipient].some(
        (id) => objectId(id) === objectId(scope.user._id),
      )
    )
      return res.status(403).json({ message: "Not your connection." });
    if (action === "remove") {
      await connection.deleteOne();
      return res.json({ message: "Connection removed." });
    }
    const statusByAction = {
      accept: "accepted",
      reject: "rejected",
      cancel: "cancelled",
    };
    if (!statusByAction[action])
      return res.status(400).json({ message: "Invalid connection action." });
    connection.status = statusByAction[action];
    await connection.save();
    if (action === "accept")
      await notify({
        recipient: connection.requester,
        actor: scope.user._id,
        type: "connection_accepted",
        title: "Connection accepted",
        message: `${scope.user.name} accepted your connection request.`,
        targetType: "connection",
        targetId: connection._id,
      });
    res.json(connection);
  } catch (error) {
    next(error);
  }
}

export async function listConnections(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const mode = req.query.mode || "accepted";
    const query =
      mode === "received"
        ? { recipient: scope.user._id, status: "pending" }
        : mode === "sent"
          ? { requester: scope.user._id, status: "pending" }
          : {
              status: "accepted",
              $or: [
                { requester: scope.user._id },
                { recipient: scope.user._id },
              ],
            };
    const data = await AlumniConnection.find(query)
      .populate("requester recipient", "name email alumniProfile")
      .sort({ createdAt: -1 })
      .lean();
    if (mode === "received") {
      await AlumniConnection.updateMany(
        { recipient: scope.user._id, status: "pending", recipientSeenAt: null },
        { recipientSeenAt: new Date() },
      );
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function profileConnections(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const targetUser = await User.findOne({
      "alumniProfile.alumniId": req.params.alumniId,
      role: "alumni",
      accountStatus: "approved",
    }).select("_id");
    if (!targetUser)
      return res.status(404).json({ message: "Alumni profile not found." });
    if (!scope.admin && await blockedBetween(scope.user._id, targetUser._id))
      return res.status(404).json({ message: "Alumni profile not found." });
    const connections = await AlumniConnection.find({
      status: "accepted",
      $or: [{ requester: targetUser._id }, { recipient: targetUser._id }],
    })
      .populate("requester recipient", "name alumniProfile accountStatus")
      .sort({ updatedAt: -1 })
      .lean();
    const people = connections
      .map((connection) =>
        objectId(connection.requester?._id) === objectId(targetUser._id)
          ? connection.recipient
          : connection.requester,
      )
      .filter((person) =>
        person?.accountStatus === "approved" &&
        person?.alumniProfile?.alumniId,
      )
      .map((person) => ({
        userId: person._id,
        alumniId: person.alumniProfile.alumniId,
        fullName: person.name,
        profilePhotoUrl: person.alumniProfile.profilePhotoUrl || "",
        department: person.alumniProfile.department || "",
        programme: person.alumniProfile.programme || "",
      }));
    res.json({ count: people.length, data: people });
  } catch (error) {
    next(error);
  }
}

export async function connectionRequestCount(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const count = await AlumniConnection.countDocuments({
      recipient: scope.user._id,
      status: "pending",
      recipientSeenAt: null,
    });
    res.json({ count });
  } catch (error) {
    next(error);
  }
}

export async function relationAction(req, res, next) {
  try {
    const scope = await currentAlumni(req, { verified: true });
    if (scope.error) return res.status(403).json({ message: scope.error });
    const target = await User.findById(req.params.userId).select("role name");
    if (
      !target ||
      target.role !== "alumni" ||
      objectId(target._id) === objectId(scope.user._id)
    )
      return res.status(400).json({ message: "Invalid alumni account." });
    const type = req.baseUrl.includes("blocks") ? "block" : "follow";
    if (req.method === "DELETE") {
      await AlumniRelation.deleteOne({
        actor: scope.user._id,
        target: target._id,
        type,
      });
      return res.json({ message: `${type} removed.` });
    }
    await AlumniRelation.findOneAndUpdate(
      { actor: scope.user._id, target: target._id, type },
      { actor: scope.user._id, target: target._id, type },
      { upsert: true },
    );
    if (type === "block") {
      await AlumniConnection.deleteMany({
        $or: [
          { requester: scope.user._id, recipient: target._id },
          { requester: target._id, recipient: scope.user._id },
        ],
      });
    } else
      await notify({
        recipient: target._id,
        actor: scope.user._id,
        type: "new_follower",
        title: "New follower",
        message: `${scope.user.name} followed you.`,
        targetType: "profile",
        targetId: scope.alumni._id,
      });
    res.status(201).json({ type, target: target._id });
  } catch (error) {
    next(error);
  }
}

async function visiblePostQuery(scope) {
  if (scope.admin) return { moderationStatus: { $ne: "removed" } };
  const connections = await AlumniConnection.find({
    status: "accepted",
    $or: [{ requester: scope.user._id }, { recipient: scope.user._id }],
  }).lean();
  const connectionIds = connections.map((item) =>
    objectId(item.requester) === objectId(scope.user._id)
      ? item.recipient
      : item.requester,
  );
  const blocked = await AlumniRelation.find({
    type: "block",
    $or: [{ actor: scope.user._id }, { target: scope.user._id }],
  }).lean();
  const blockedIds = blocked.map((item) =>
    objectId(item.actor) === objectId(scope.user._id)
      ? item.target
      : item.actor,
  );
  const generalVisibility =
    scope.alumni.verificationStatus === "verified"
      ? ["everyone", "verified_alumni", "students_alumni"]
      : ["everyone", "students_alumni"];
  return {
    moderationStatus: "published",
    author: { $nin: blockedIds },
    $or: [
      { visibility: { $in: generalVisibility } },
      { author: scope.user._id },
      { visibility: "connections", author: { $in: connectionIds } },
    ],
  };
}

export async function feed(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const { page, limit, skip } = parsePagination(req);
    const query = await visiblePostQuery(scope);
    if (!scope.admin) query.hiddenBy = { $ne: scope.user._id };
    if (req.query.type) query.postType = clean(req.query.type);
    if (req.query.mine === "true" && !scope.admin) query.author = scope.user._id;
    const [data, total] = await Promise.all([
      AlumniPost.find(query)
        .populate("author", "name alumniProfile")
        .populate({
          path: "originalPost",
          populate: { path: "author", select: "name alumniProfile" },
        })
        .populate(
          "comments.author comments.replies.author",
          "name alumniProfile",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AlumniPost.countDocuments(query),
    ]);
    res.json(pageResponse(data, page, limit, total));
  } catch (error) {
    next(error);
  }
}

export async function getPost(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const query = await visiblePostQuery(scope);
    query._id = req.params.id;
    if (!scope.admin) query.hiddenBy = { $ne: scope.user._id };
    const post = await AlumniPost.findOne(query)
      .populate("author", "name alumniProfile")
      .populate({
        path: "originalPost",
        populate: { path: "author", select: "name alumniProfile" },
      })
      .populate("comments.author comments.replies.author", "name alumniProfile")
      .lean();
    if (!post) return res.status(404).json({ message: "This post is unavailable or you do not have permission to view it." });
    res.json(post);
  } catch (error) {
    next(error);
  }
}

export async function createPost(req, res, next) {
  try {
    const scope = await currentAlumni(req, { verified: true });
    if (scope.error) return res.status(403).json({ message: scope.error });
    if (await AlumniRestriction.exists({ user: scope.user._id, feature: "post", blocked: true }))
      return res.status(403).json({ message: "Your ability to create posts has been blocked by an administrator." });
    const content = clean(req.body.content);
    const parseJson = (value, fallback) => {
      if (typeof value !== "string") return value ?? fallback;
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    };
    const pollOptions = parseJson(req.body.pollOptions, [])
      .map((text) => ({ text: clean(text) }))
      .filter((item) => item.text);
    const taggedUsers = parseJson(req.body.taggedUsers, []);
    const structuredData = parseJson(req.body.structuredData, {});
    if (!content && !req.files?.length && pollOptions.length < 2)
      return res.status(400).json({
        message: "Add text, an attachment, or at least two poll options.",
      });
    if (req.body.postType === "poll" && pollOptions.length < 2)
      return res
        .status(400)
        .json({ message: "A poll requires at least two choices." });
    const media = (req.files || []).map((file) => ({
      url: `${req.protocol}://${req.get("host")}/uploads/alumni-posts/${file.filename}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    }));
    const post = await AlumniPost.create({
      author: scope.user._id,
      content,
      postType: req.body.postType || "text",
      visibility: req.body.visibility || "verified_alumni",
      media,
      pollOptions,
      pollClosesAt: req.body.pollClosesAt || undefined,
      pollMultipleAnswers: String(req.body.pollMultipleAnswers) === "true",
      taggedUsers,
      location: clean(req.body.location),
      feelingActivity: clean(req.body.feelingActivity),
      structuredData,
      backgroundColor: clean(req.body.backgroundColor),
      hashtags: [
        ...new Set(
          (content.match(/#[\w-]+/g) || []).map((tag) =>
            tag.slice(1).toLowerCase(),
          ),
        ),
      ],
      commentsEnabled: String(req.body.commentsEnabled) !== "false",
      sharingEnabled: String(req.body.sharingEnabled) !== "false",
      hideReactionCounts: String(req.body.hideReactionCounts) === "true",
    });
    res.status(201).json(await post.populate("author", "name alumniProfile"));
  } catch (error) {
    next(error);
  }
}
export async function votePoll(req, res, next) {
  try {
    const scope = await currentAlumni(req, { verified: true });
    if (scope.error) return res.status(403).json({ message: scope.error });
    const post = await AlumniPost.findById(req.params.id);
    if (!post || post.postType !== "poll")
      return res.status(404).json({ message: "Poll not found." });
    if (post.pollClosesAt && new Date(post.pollClosesAt) <= new Date())
      return res.status(400).json({ message: "This poll has closed." });
    const optionIds = Array.isArray(req.body.optionIds)
      ? req.body.optionIds
      : [req.body.optionId].filter(Boolean);
    if (!post.pollMultipleAnswers && optionIds.length > 1)
      return res.status(400).json({ message: "Select only one choice." });
    for (const option of post.pollOptions)
      option.voters = option.voters.filter(
        (id) => objectId(id) !== objectId(scope.user._id),
      );
    for (const id of optionIds) {
      const option = post.pollOptions.id(id);
      if (option) option.voters.push(scope.user._id);
    }
    await post.save();
    res.json(post.pollOptions);
  } catch (error) {
    next(error);
  }
}
export async function updatePost(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const post = await AlumniPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });
    if (!scope.admin && objectId(post.author) !== objectId(scope.user._id))
      return res
        .status(403)
        .json({ message: "You can edit only your own posts." });
    for (const key of ["content", "visibility", "commentsEnabled"])
      if (req.body[key] !== undefined) post[key] = req.body[key];
    post.edited = true;
    await post.save();
    res.json(post);
  } catch (error) {
    next(error);
  }
}
export async function deletePost(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const post = await AlumniPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });
    if (!scope.admin && objectId(post.author) !== objectId(scope.user._id))
      return res
        .status(403)
        .json({ message: "You can delete only your own posts." });
    await post.deleteOne();
    res.json({ message: "Post deleted." });
  } catch (error) {
    next(error);
  }
}
export async function reactPost(req, res, next) {
  try {
    const scope = await currentAlumni(req, { verified: true });
    if (scope.error) return res.status(403).json({ message: scope.error });
    const post = await AlumniPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found." });
    const type = clean(req.body.type);
    if (
      !["like", "haha", "celebrate", "support", "helpful", "interested"].includes(type)
    )
      return res.status(400).json({ message: "Invalid reaction." });
    post.reactions = post.reactions.filter(
      (item) => objectId(item.user) !== objectId(scope.user._id),
    );
    if (req.body.active !== false)
      post.reactions.push({ user: scope.user._id, type });
    await post.save();
    await notify({
      recipient: post.author,
      actor: scope.user._id,
      type: "post_reaction",
      title: "New post reaction",
      message: `${scope.user.name} reacted to your post.`,
      targetType: "post",
      targetId: post._id,
    });
    res.json({ reactions: post.reactions });
  } catch (error) {
    next(error);
  }
}
export async function addComment(req, res, next) {
  try {
    const scope = await currentAlumni(req, { verified: true });
    if (scope.error) return res.status(403).json({ message: scope.error });
    const post = await AlumniPost.findById(req.params.id);
    if (!post || !post.commentsEnabled)
      return res.status(400).json({ message: "Comments are unavailable." });
    const content = clean(req.body.content);
    const externalGifUrl = clean(req.body.gifUrl);
    const gifSource = clean(req.body.gifSource).toLowerCase();
    const allowedGifHosts = /^(https?:\/\/)(media\d*\.giphy\.com|i\.giphy\.com|media\.tenor\.com|c\.tenor\.com)\//i;
    if (externalGifUrl && (!["giphy", "tenor"].includes(gifSource) || !allowedGifHosts.test(externalGifUrl)))
      return res.status(400).json({ message: "Use a valid GIPHY or Tenor GIF URL." });
    const uploadedMedia = (req.files || [])
      .filter((file) => file.mimetype.startsWith("image/"))
      .map((file) => ({
        url: `${req.protocol}://${req.get("host")}/uploads/alumni-comments/${file.filename}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        source: "upload",
      }));
    const media = externalGifUrl
      ? [{ url: externalGifUrl, originalName: `${gifSource}.gif`, mimeType: "image/gif", size: 0, source: gifSource }]
      : uploadedMedia;
    if (!content && !media.length)
      return res.status(400).json({ message: "Write a comment or add an image/GIF." });
    let notificationRecipient = post.author;
    if (req.body.parentId) {
      let parent = post.comments.id(req.body.parentId);
      if (!parent) {
        for (const comment of post.comments) {
          const legacyReply = comment.replies?.id(req.body.parentId);
          if (legacyReply) {
            parent = legacyReply;
            break;
          }
        }
      }
      if (!parent)
        return res.status(404).json({ message: "Parent comment not found." });
      notificationRecipient = parent.author;
      post.comments.push({
        author: scope.user._id,
        content,
        parentId: parent._id,
        media,
      });
    } else post.comments.push({ author: scope.user._id, content, media });
    await post.save();
    await post.populate(
      "comments.author comments.replies.author",
      "name alumniProfile",
    );
    await notify({
      recipient: notificationRecipient,
      actor: scope.user._id,
      type: req.body.parentId ? "comment_reply" : "post_comment",
      title: req.body.parentId ? "New reply" : "New comment",
      message: req.body.parentId
        ? `${scope.user.name} replied to your comment.`
        : `${scope.user.name} commented on your post.`,
      targetType: "post",
      targetId: post._id,
    });
    if (content.includes("@")) {
      const candidates = await Alumni.find({ accountStatus: "approved" })
        .select("_id fullName")
        .lean();
      const mentionedIds = candidates
        .filter((item) =>
          content.toLowerCase().includes(`@${item.fullName}`.toLowerCase()),
        )
        .map((item) => item._id);
      const mentionedUsers = await User.find({
        "alumniProfile.alumniId": { $in: mentionedIds },
      })
        .select("_id")
        .lean();
      await Promise.all(
        mentionedUsers.map((user) =>
          notify({
            recipient: user._id,
            actor: scope.user._id,
            type: "mention",
            title: "You were mentioned",
            message: `${scope.user.name} mentioned you in a comment.`,
            targetType: "post",
            targetId: post._id,
            dedupeKey: `mention:${scope.user._id}:${post._id}:${user._id}:${Date.now()}`,
          }),
        ),
      );
    }
    res.status(201).json(post.comments);
  } catch (error) {
    next(error);
  }
}
export async function deleteComment(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const post = await AlumniPost.findById(req.params.postId);
    const comment = post?.comments.id(req.params.commentId);
    if (!comment)
      return res.status(404).json({ message: "Comment not found." });
    const ownsComment = objectId(comment.author) === objectId(scope.user._id);
    const ownsPost = objectId(post.author) === objectId(scope.user._id);
    if (!scope.admin && !ownsComment && !ownsPost)
      return res
        .status(403)
        .json({ message: "Only the comment author or post owner can delete this comment." });
    comment.deleteOne();
    await post.save();
    res.json({ message: "Comment deleted." });
  } catch (error) {
    next(error);
  }
}
export async function updateComment(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const post = await AlumniPost.findById(req.params.postId);
    const comment = post?.comments.id(req.params.commentId);
    if (!comment)
      return res.status(404).json({ message: "Comment not found." });
    if (objectId(comment.author) !== objectId(scope.user._id))
      return res
        .status(403)
        .json({ message: "You can edit only your own comment." });
    comment.content = clean(req.body.content);
    comment.edited = true;
    await post.save();
    res.json(comment);
  } catch (error) {
    next(error);
  }
}
export async function reactComment(req, res, next) {
  try {
    const scope = await currentAlumni(req, { verified: true });
    if (scope.error) return res.status(403).json({ message: scope.error });
    const post = await AlumniPost.findById(req.params.postId);
    let comment = post?.comments.id(req.params.commentId);
    if (!comment) {
      for (const parentComment of post?.comments || []) {
        comment = parentComment.replies?.id(req.params.commentId);
        if (comment) break;
      }
    }
    if (!comment)
      return res.status(404).json({ message: "Comment not found." });
    const type = clean(req.body.type);
    if (
      !["like", "haha", "celebrate", "support", "helpful", "interested"].includes(type)
    )
      return res.status(400).json({ message: "Invalid reaction." });
    comment.reactions = comment.reactions.filter(
      (item) => objectId(item.user) !== objectId(scope.user._id),
    );
    if (req.body.active !== false)
      comment.reactions.push({ user: scope.user._id, type });
    await post.save();
    res.json(comment.reactions);
  } catch (error) {
    next(error);
  }
}
export async function hidePost(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    await AlumniPost.updateOne(
      { _id: req.params.id },
      { $addToSet: { hiddenBy: scope.user._id } },
    );
    res.json({ message: "Post hidden from your feed." });
  } catch (error) {
    next(error);
  }
}
export async function sharePost(req, res, next) {
  try {
    const scope = await currentAlumni(req, { verified: true });
    if (scope.error) return res.status(403).json({ message: scope.error });
    const visibleQuery = await visiblePostQuery(scope);
    visibleQuery._id = req.params.id;
    const original = await AlumniPost.findOne(visibleQuery);
    if (!original || original.moderationStatus !== "published")
      return res.status(404).json({ message: "Post not found." });
    if (!original.sharingEnabled)
      return res
        .status(403)
        .json({ message: "Sharing is disabled for this post." });
    const shared = await AlumniPost.create({
      author: scope.user._id,
      content: clean(req.body.content),
      postType: "text",
      visibility: req.body.visibility || "verified_alumni",
      originalPost: original.originalPost || original._id,
      shareText: clean(req.body.content),
    });
    await AlumniPost.updateOne(
      { _id: original.originalPost || original._id },
      { $inc: { shareCount: 1 } },
    );
    await shared.populate("author", "name alumniProfile");
    await shared.populate({
      path: "originalPost",
      populate: { path: "author", select: "name alumniProfile" },
    });
    res.status(201).json(shared);
  } catch (error) {
    next(error);
  }
}

export async function saveItem(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const item = await AlumniSavedItem.findOneAndUpdate(
      {
        user: scope.user._id,
        itemType: req.body.itemType,
        itemId: req.body.itemId,
      },
      {
        user: scope.user._id,
        itemType: req.body.itemType,
        itemId: req.body.itemId,
        collection: req.body.collection || "Saved",
      },
      { upsert: true, new: true, runValidators: true },
    );
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
}
export async function listSaved(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const query = { user: scope.user._id };
    if (req.query.type) query.itemType = req.query.type;
    const items = await AlumniSavedItem.find(query).sort({ createdAt: -1 }).lean();
    const postIds = items.filter((item) => item.itemType === "post").map((item) => item.itemId);
    const postQuery = await visiblePostQuery(scope);
    postQuery._id = { $in: postIds };
    const posts = await AlumniPost.find(postQuery)
      .populate("author", "name alumniProfile")
      .select("author content postType media visibility reactions comments createdAt")
      .lean();
    const postById = new Map(posts.map((post) => [objectId(post._id), post]));
    res.json(items.map((item) => ({
      ...item,
      preview: item.itemType === "post" ? postById.get(objectId(item.itemId)) || null : null,
    })));
  } catch (error) {
    next(error);
  }
}
export async function removeSaved(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    await AlumniSavedItem.deleteOne({
      _id: req.params.id,
      user: scope.user._id,
    });
    res.json({ message: "Saved item removed." });
  } catch (error) {
    next(error);
  }
}

export async function removeSavedItem(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const result = await AlumniSavedItem.deleteOne({
      user: scope.user._id,
      itemType: req.params.itemType,
      itemId: req.params.itemId,
    });
    res.json({
      message: result.deletedCount ? "Post unsaved." : "Item was not saved.",
      removed: result.deletedCount > 0,
    });
  } catch (error) {
    next(error);
  }
}
export async function notifications(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const { page, limit, skip } = parsePagination(req);
    const query = { recipient: scope.user._id };
    const [data, total] = await Promise.all([
      AlumniNotification.find(query)
        .populate("actor", "name alumniProfile")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AlumniNotification.countDocuments(query),
    ]);
    res.json(pageResponse(data, page, limit, total));
  } catch (error) {
    next(error);
  }
}
export async function notificationAction(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    if (req.body.all)
      await AlumniNotification.updateMany(
        { recipient: scope.user._id, readAt: null },
        { readAt: new Date() },
      );
    else if (req.method === "DELETE")
      await AlumniNotification.deleteOne({
        _id: req.params.id,
        recipient: scope.user._id,
      });
    else
      await AlumniNotification.updateOne(
        { _id: req.params.id, recipient: scope.user._id },
        { readAt: new Date() },
      );
    res.json({ message: "Notifications updated." });
  } catch (error) {
    next(error);
  }
}
export async function getPrivacy(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    res.json(
      await AlumniPrivacy.findOneAndUpdate(
        { user: scope.user._id },
        { $setOnInsert: { user: scope.user._id } },
        { upsert: true, new: true },
      ),
    );
  } catch (error) {
    next(error);
  }
}
export async function updatePrivacy(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const allowed = [
      "fieldVisibility",
      "profileVisibility",
      "connectionRequests",
      "followers",
      "messages",
      "mentions",
      "searchVisible",
      "onlineStatusVisible",
      "lastSeenVisible",
    ];
    const patch = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowed.includes(key)),
    );
    res.json(
      await AlumniPrivacy.findOneAndUpdate({ user: scope.user._id }, patch, {
        upsert: true,
        new: true,
        runValidators: true,
      }),
    );
  } catch (error) {
    next(error);
  }
}
export async function submitReport(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const report = await AlumniReport.create({
      reporter: scope.user._id,
      targetType: req.body.targetType,
      targetId: req.body.targetId,
      reason: clean(req.body.reason),
      explanation: clean(req.body.explanation),
    });
    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
}
export async function adminReports(req, res, next) {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    res.json(
      await AlumniReport.find(query)
        .populate("reporter", "name email")
        .populate("targetUser", "name email alumniProfile")
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
    );
  } catch (error) {
    next(error);
  }
}
export async function moderateReport(req, res, next) {
  try {
    const report = await AlumniReport.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found." });
    const nextStatus = clean(req.body.status) || report.status;
    if (!["open", "under_review", "resolved", "rejected"].includes(nextStatus))
      return res.status(400).json({ message: "Invalid report status." });
    report.status = nextStatus;
    report.resolution = clean(req.body.resolution);
    report.assignedModerator = req.user.id;
    if (["resolved", "rejected"].includes(report.status))
      report.resolvedAt = new Date();
    await report.save();
    if (req.body.removeContent && report.targetType === "post")
      await AlumniPost.updateOne(
        { _id: report.targetId },
        { moderationStatus: "removed" },
      );
    if (req.body.removeContent && report.targetType === "chat_message")
      await AlumniChatMessage.deleteOne({ _id: report.targetId });
    await AuditLog.create({
      actor: req.user.id,
      actorRole: req.user.role,
      action: "alumni_report_moderated",
      entityType: "AlumniReport",
      entityId: report._id,
      after: { status: report.status, resolution: report.resolution },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.json(report);
  } catch (error) {
    next(error);
  }
}

export async function submitVerification(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    if (scope.alumni.verificationStatus === "verified")
      return res
        .status(409)
        .json({ message: "Your alumni profile is already verified." });
    const files = req.files || [];
    const evidence = files.map((file) => ({
      documentType: req.body.documentType || "verification_evidence",
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
    }));
    const request = await AlumniVerification.create({
      alumni: scope.alumni._id,
      requestedBy: scope.user._id,
      methods: Array.isArray(req.body.methods)
        ? req.body.methods
        : [req.body.methods || "registration_number"],
      evidence,
      applicantNote: clean(req.body.applicantNote),
    });
    scope.alumni.verificationStatus = "pending";
    await scope.alumni.save();
    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
}
export async function myVerification(req, res, next) {
  try {
    const scope = await currentAlumni(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    res.json(
      await AlumniVerification.find({ alumni: scope.alumni._id })
        .sort({ createdAt: -1 })
        .lean(),
    );
  } catch (error) {
    next(error);
  }
}
export async function adminVerifications(req, res, next) {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;
    res.json(
      await AlumniVerification.find(query)
        .populate("alumni", publicProfileFields)
        .populate("requestedBy reviewedBy", "name email")
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),
    );
  } catch (error) {
    next(error);
  }
}
export async function downloadVerificationEvidence(req, res, next) {
  try {
    const request = await AlumniVerification.findById(req.params.id).lean();
    const evidence = request?.evidence?.find(
      (item) => item.storedName === req.params.fileName,
    );
    if (!evidence)
      return res
        .status(404)
        .json({ message: "Verification evidence not found." });
    res.download(
      path.resolve("private-uploads/alumni-verification", evidence.storedName),
      evidence.originalName,
    );
  } catch (error) {
    next(error);
  }
}
export async function reviewVerification(req, res, next) {
  try {
    const request = await AlumniVerification.findById(req.params.id);
    if (!request)
      return res
        .status(404)
        .json({ message: "Verification request not found." });
    const previousStatus = request.status;
    const status = clean(req.body.status);
    if (previousStatus === "verified" && status !== "verified")
      return res.status(409).json({ message: "A verified alumni record cannot be changed back to unverified." });
    if (
      ![
        "under_review",
        "additional_information_required",
        "verified",
        "unverified",
        "rejected",
        "suspended",
      ].includes(status)
    )
      return res.status(400).json({ message: "Invalid verification status." });
    request.status = status;
    request.adminReason = clean(req.body.reason);
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    await request.save();
    const alumni = await Alumni.findByIdAndUpdate(
      request.alumni,
      {
        verificationStatus: status,
        verifiedAt: status === "verified" ? new Date() : null,
      },
      { new: true },
    );
    const targetUser = await User.findOne({
      "alumniProfile.alumniId": request.alumni,
    });
    if (targetUser) {
      targetUser.alumniProfile.verificationStatus = status;
      await targetUser.save();
    }
    await notify({
      recipient: targetUser?._id,
      actor: req.user.id,
      type: "verification_update",
      title: "Alumni verification updated",
      message: `Your verification status is now ${status.replaceAll("_", " ")}.`,
      targetType: "verification",
      targetId: request._id,
      dedupeKey: `verification:${request._id}:${status}`,
    });
    await AuditLog.create({
      actor: req.user.id,
      actorRole: req.user.role,
      action: "alumni_verification_review",
      entityType: "AlumniVerification",
      entityId: request._id,
      before: { status: previousStatus },
      after: { status, reason: request.adminReason },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.json({ request, alumni });
  } catch (error) {
    next(error);
  }
}

export async function bulkReviewVerifications(req, res, next) {
  try {
    const ids = Array.isArray(req.body.ids) ? [...new Set(req.body.ids.map(objectId))] : [];
    const status = clean(req.body.status);
    if (!ids.length)
      return res.status(400).json({ message: "Select at least one verification request." });
    if (status !== "verified")
      return res.status(400).json({ message: "Bulk verification supports the verified action only." });
    const requests = await AlumniVerification.find({ _id: { $in: ids } });
    const reviewedAt = new Date();
    const reason = clean(req.body.reason);
    for (const request of requests) {
      const previousStatus = request.status;
      request.status = status;
      request.adminReason = reason;
      request.reviewedBy = req.user.id;
      request.reviewedAt = reviewedAt;
      await request.save();
      await Alumni.findByIdAndUpdate(request.alumni, {
        verificationStatus: status,
        verifiedAt: status === "verified" ? reviewedAt : null,
      });
      const targetUser = await User.findOne({ "alumniProfile.alumniId": request.alumni });
      if (targetUser) {
        targetUser.alumniProfile.verificationStatus = status;
        await targetUser.save();
      }
      await notify({
        recipient: targetUser?._id,
        actor: req.user.id,
        type: "verification_update",
        title: "Alumni verification updated",
        message: `Your verification status is now ${status}.`,
        targetType: "verification",
        targetId: request._id,
        dedupeKey: `verification:${request._id}:${status}:${reviewedAt.getTime()}`,
      });
      await AuditLog.create({
        actor: req.user.id,
        actorRole: req.user.role,
        action: "alumni_verification_bulk_review",
        entityType: "AlumniVerification",
        entityId: request._id,
        before: { status: previousStatus },
        after: { status, reason },
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    }
    res.json({ message: `${requests.length} alumni verification record(s) updated.`, updatedCount: requests.length });
  } catch (error) {
    next(error);
  }
}

export async function suggestions(req, res, next) {
  try {
    const scope = await currentAlumni(req, { verified: true });
    if (scope.error) return res.status(403).json({ message: scope.error });
    const excludedUsers = [
      scope.user._id,
      ...(await AlumniRelation.find({
        type: "block",
        $or: [{ actor: scope.user._id }, { target: scope.user._id }],
      }).then((items) => items.flatMap((item) => [item.actor, item.target]))),
    ];
    const excludedAlumni = await User.find({
      _id: { $in: excludedUsers },
    }).distinct("alumniProfile.alumniId");
    const candidates = await Alumni.find({
      _id: { $nin: excludedAlumni },
      accountStatus: "approved",
      verificationStatus: "verified",
      $or: [
        { department: scope.alumni.department },
        { programme: scope.alumni.programme },
        { batch: scope.alumni.batch },
        { companyName: scope.alumni.companyName },
        { currentCity: scope.alumni.currentCity },
      ],
    })
      .select(publicProfileFields)
      .limit(20)
      .lean();
    const scored = candidates
      .map((item) => ({
        ...item,
        matchScore:
          (item.department === scope.alumni.department ? 30 : 0) +
          (item.programme === scope.alumni.programme ? 25 : 0) +
          (item.batch === scope.alumni.batch ? 20 : 0) +
          (item.companyName && item.companyName === scope.alumni.companyName
            ? 15
            : 0) +
          (item.currentCity && item.currentCity === scope.alumni.currentCity
            ? 10
            : 0),
      }))
      .sort((a, b) => b.matchScore - a.matchScore);
    res.json(scored);
  } catch (error) {
    next(error);
  }
}
