import Alumni from "../models/Alumni.js";
import AlumniChatMessage from "../models/AlumniChatMessage.js";
import AlumniConversation from "../models/AlumniConversation.js";
import AlumniRestriction from "../models/AlumniRestriction.js";
import AlumniConnection from "../models/AlumniConnection.js";
import AuditLog from "../models/AuditLog.js";
import AlumniReport from "../models/AlumniReport.js";
import AlumniRelation from "../models/AlumniRelation.js";
import AlumniChatAccessRequest from "../models/AlumniChatAccessRequest.js";
import AlumniNotification from "../models/AlumniNotification.js";
import User from "../models/User.js";
import fs from "fs/promises";
import { moderateChatImage, moderateChatText } from "../services/chatModerationService.js";
import {
  alumniConversationListFilter,
  hasAlumniConversationAccess,
} from "../services/alumniChatAccessService.js";

const clean = (value) => String(value || "").trim();
const id = (value) => String(value || "");
const removeFiles = async (files = []) =>
  Promise.all(files.filter(Boolean).map((file) => fs.unlink(file.path).catch(() => {})));
async function violationNotice({ conversation, current, category, req }) {
  const notice = await AlumniChatMessage.create({
    conversation: conversation._id,
    sender: current.user._id,
    messageType: "system_violation",
    violatedUser: current.user._id,
    content: `${current.user.name} has violated the Alumni Community Guidelines. The unsafe content was removed.`,
    moderation: { provider: "system", categories: category, moderatedAt: new Date() },
  });
  conversation.lastMessageAt = new Date();
  await conversation.save();
  const warningCount = await AlumniChatMessage.countDocuments({
    messageType: "system_violation",
    violatedUser: current.user._id,
  });
  if (warningCount >= 10) {
    await AlumniRestriction.findOneAndUpdate(
      { user: current.user._id, feature: "chat" },
      {
        blocked: true,
        reason: "Automatically suspended after 10 Community Guidelines warnings.",
        updatedBy: current.user._id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    notice.content += ` ${current.user.name}'s chat access has been automatically suspended after ${warningCount} Community Guidelines warnings.`;
    await notice.save();
  }
  await AuditLog.create({ actor: current.user._id, actorRole: current.user.role, action: "alumni_chat_community_guideline_violation", entityType: "AlumniChatMessage", entityId: notice._id, after: { conversation: conversation._id, category }, ipAddress: req.ip, userAgent: req.get("user-agent") });
  return notice.populate("sender violatedUser", "name alumniProfile");
}

async function scope(req, adminOnly = false) {
  if (adminOnly && req.user?.role !== "admin") return { error: "Admin access required." };
  const user = await User.findById(req.user?.id).select("name email role accountStatus alumniProfile");
  if (!user) return { error: "User not found." };
  if (user.role === "admin") return { user, admin: true };
  if (user.role !== "alumni" || user.accountStatus !== "approved")
    return { error: "Approved alumni access is required." };
  return { user, department: clean(user.alumniProfile?.department) };
}

async function restricted(userId, feature) {
  return AlumniRestriction.exists({ user: userId, feature, blocked: true });
}

async function canAccess(conversation, current) {
  if (!hasAlumniConversationAccess(conversation, current)) return false;
  if (current.admin) return true;
  if (conversation.type === "direct") {
    const otherId = conversation.members.find((item) => id(item?._id || item) !== id(current.user._id));
    if (await AlumniRelation.exists({
      type: "block",
      $or: [
        { actor: current.user._id, target: otherId },
        { actor: otherId, target: current.user._id },
      ],
    })) return false;
  }
  return true;
}

async function ensureCommunityConversations(current) {
  const conversations = [
    await AlumniConversation.findOneAndUpdate(
      { type: "global" },
      { $setOnInsert: { type: "global", name: "All Alumni", createdBy: current.user._id } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
  ];
  if (current.department) {
    conversations.push(
      await AlumniConversation.findOneAndUpdate(
        { type: "department", department: current.department },
        { $setOnInsert: { type: "department", department: current.department, name: `${current.department} Alumni`, createdBy: current.user._id } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    );
  }
  return conversations;
}

export async function listConversations(req, res, next) {
  try {
    const current = await scope(req);
    if (current.error) return res.status(403).json({ message: current.error });
    if (!current.admin) await ensureCommunityConversations(current);
    const query = alumniConversationListFilter(current);
    let items = await AlumniConversation.find(query)
      .populate("members", "name alumniProfile")
      .sort({ lastMessageAt: -1 })
      .lean();
    if (!current.admin) {
      items = items.filter((conversation) =>
        hasAlumniConversationAccess(conversation, current));
      const blockedIds = await AlumniRelation.find({
        type: "block",
        $or: [{ actor: current.user._id }, { target: current.user._id }],
      }).then((relations) => relations.map((relation) =>
        id(relation.actor) === id(current.user._id) ? id(relation.target) : id(relation.actor)));
      items = items.filter((conversation) =>
        conversation.type !== "direct" ||
        !conversation.members.some((member) => blockedIds.includes(id(member._id)) && id(member._id) !== id(current.user._id)));
      items = items.filter((conversation) => {
        const cleared = conversation.clearedFor?.find((entry) => id(entry.user) === id(current.user._id));
        return !cleared || new Date(conversation.lastMessageAt || 0) > new Date(cleared.clearedAt);
      });
      const pinPriority = { global: 0, department: 1 };
      items.sort((left, right) => {
        const priorityDifference =
          (pinPriority[left.type] ?? 2) - (pinPriority[right.type] ?? 2);
        if (priorityDifference) return priorityDifference;
        return new Date(right.lastMessageAt || right.createdAt || 0) -
          new Date(left.lastMessageAt || left.createdAt || 0);
      });
    }
    const withLastMessage = await Promise.all(items.map(async (conversation) => ({
      ...conversation,
      lastMessage: await AlumniChatMessage.findOne({ conversation: conversation._id })
        .populate("sender", "name")
        .sort({ createdAt: -1 })
        .lean(),
    })));
    res.json(withLastMessage);
  } catch (error) { next(error); }
}

export async function createConversation(req, res, next) {
  try {
    const current = await scope(req);
    if (current.error) return res.status(403).json({ message: current.error });
    if (await restricted(current.user._id, "chat"))
      return res.status(403).json({ message: "Your chat access has been blocked by an administrator." });
    const memberIds = [...new Set([id(current.user._id), ...(req.body.memberIds || []).map(id)])];
    const members = await User.find({ _id: { $in: memberIds }, role: "alumni", accountStatus: "approved" }).select("_id");
    if (members.length < 2) return res.status(400).json({ message: "Select at least one approved alumni member." });
    const type = members.length === 2 ? "direct" : "custom";
    if (type === "direct") {
      const other = members.find((item) => id(item._id) !== id(current.user._id));
      const connected = await AlumniConnection.exists({
        status: "accepted",
        $or: [
          { requester: current.user._id, recipient: other._id },
          { requester: other._id, recipient: current.user._id },
        ],
      });
      if (!connected)
        return res.status(403).json({ message: "Connect with this alumni member before starting a private chat. You may include one message with your connection request." });
      const existing = await AlumniConversation.findOne({ type: "direct", members: { $all: members.map((item) => item._id), $size: 2 } });
      if (existing) return res.json(existing);
    }
    const conversation = await AlumniConversation.create({
      type,
      name: type === "custom" ? clean(req.body.name) || "Alumni Group" : "",
      members: members.map((item) => item._id),
      createdBy: current.user._id,
    });
    res.status(201).json(conversation);
  } catch (error) { next(error); }
}

export async function listMessages(req, res, next) {
  try {
    const current = await scope(req);
    if (current.error) return res.status(403).json({ message: current.error });
    const conversation = await AlumniConversation.findById(req.params.id);
    if (!conversation || !(await canAccess(conversation, current)))
      return res.status(404).json({ message: "Conversation not found." });
    const blockedIds = current.admin ? [] : await AlumniRelation.find({ actor: current.user._id, type: "block" }).distinct("target");
    const clearedAt = current.admin
      ? null
      : conversation.clearedFor?.find((entry) => id(entry.user) === id(current.user._id))?.clearedAt;
    const messages = await AlumniChatMessage.find({
      conversation: conversation._id,
      ...(clearedAt ? { createdAt: { $gt: clearedAt } } : {}),
      ...(blockedIds.length ? { $or: [{ messageType: "system_violation" }, { sender: { $nin: blockedIds } }] } : {}),
    })
      .populate("sender violatedUser", "name alumniProfile")
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();
    res.json(messages);
  } catch (error) { next(error); }
}

export async function sendMessage(req, res, next) {
  const attachments = req.files?.attachments || [];
  const moderationFrame = req.files?.moderationFrame?.[0];
  try {
    const current = await scope(req);
    if (current.error) {
      await removeFiles([...attachments, moderationFrame]);
      return res.status(403).json({ message: current.error });
    }
    if (await restricted(current.user._id, "chat")) {
      await removeFiles([...attachments, moderationFrame]);
      return res.status(403).json({ message: "Your chat access has been blocked by an administrator." });
    }
    const conversation = await AlumniConversation.findById(req.params.id);
    if (!conversation || !(await canAccess(conversation, current))) {
      await removeFiles([...attachments, moderationFrame]);
      return res.status(404).json({ message: "Conversation not found." });
    }
    const content = clean(req.body.content);
    if (!content && !attachments.length) {
      await removeFiles([moderationFrame]);
      return res.status(400).json({ message: "Write a message or attach a file." });
    }
    const textResult = await moderateChatText(content);
    if (!textResult.safe) {
      await removeFiles([...attachments, moderationFrame]);
      return res.status(201).json(await violationNotice({ conversation, current, category: textResult.categories || "unsafe_text", req }));
    }
    const videoFiles = attachments.filter((file) => file.mimetype.startsWith("video/"));
    if (videoFiles.length > 1) {
      await removeFiles([...attachments, moderationFrame]);
      return res.status(422).json({ message: "Send one video at a time so it can be safety checked." });
    }
    if (videoFiles.length && !moderationFrame) {
      await removeFiles(attachments);
      return res.status(422).json({ message: "A video safety preview could not be generated. Try another video." });
    }
    const visualFiles = attachments.filter((file) => file.mimetype.startsWith("image/"));
    if (moderationFrame) visualFiles.push(moderationFrame);
    for (const file of visualFiles) {
      const result = await moderateChatImage(file.path, file.mimetype, textResult.sanitized);
      if (!result.safe) {
        await removeFiles([...attachments, moderationFrame]);
        return res.status(201).json(await violationNotice({ conversation, current, category: result.categories || `unsafe_${file === moderationFrame ? "video" : "image"}`, req }));
      }
    }
    await removeFiles([moderationFrame]);
    const storedAttachments = attachments.map((file) => ({
      url: `${req.protocol}://${req.get("host")}/uploads/alumni-chat/${file.filename}`,
      storedName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      mediaType: file.mimetype.startsWith("image/") ? "image" : file.mimetype.startsWith("video/") ? "video" : "file",
    }));
    const message = await AlumniChatMessage.create({
      conversation: conversation._id,
      sender: current.user._id,
      content: textResult.sanitized,
      attachments: storedAttachments,
      moderation: { provider: textResult.provider || "nvidia", categories: textResult.categories, moderatedAt: new Date() },
    });
    conversation.lastMessageAt = new Date();
    await conversation.save();
    res.status(201).json(await message.populate("sender", "name alumniProfile"));
  } catch (error) {
    await removeFiles([...attachments, moderationFrame]);
    next(error);
  }
}

export async function reportChatUser(req, res, next) {
  try {
    const current = await scope(req);
    if (current.error) return res.status(403).json({ message: current.error });
    const conversation = await AlumniConversation.findById(req.params.id);
    if (!conversation || !(await canAccess(conversation, current)))
      return res.status(404).json({ message: "Conversation not found." });
    const target = await User.findOne({ _id: req.params.userId, role: "alumni" }).select("_id name");
    if (!target || id(target._id) === id(current.user._id))
      return res.status(400).json({ message: "Invalid reported user." });
    const message = req.body.messageId
      ? await AlumniChatMessage.findOne({ _id: req.body.messageId, conversation: conversation._id }).lean()
      : null;
    if (req.body.messageId && !message)
      return res.status(404).json({ message: "Reported chat message not found." });
    if (message && id(message.sender) !== id(target._id))
      return res.status(400).json({ message: "The selected message was not sent by this user." });
    const report = await AlumniReport.create({
      reporter: current.user._id,
      targetType: message ? "chat_message" : "chat_user",
      targetId: message?._id || target._id,
      targetUser: target._id,
      reason: clean(req.body.reason) || "Chat community guidelines report",
      explanation: clean(req.body.explanation) || `Reported from conversation ${conversation.name || conversation.type}.`,
    });
    res.status(201).json({ report, message: `${target.name} was reported to administrators for review.` });
  } catch (error) { next(error); }
}

export async function myAccessRequest(req, res, next) {
  try {
    const current = await scope(req);
    if (current.error) return res.status(403).json({ message: current.error });
    const [isBlocked, request, warningCount] = await Promise.all([
      restricted(current.user._id, "chat"),
      AlumniChatAccessRequest.findOne({ user: current.user._id }).sort({ createdAt: -1 }).lean(),
      AlumniChatMessage.countDocuments({ messageType: "system_violation", violatedUser: current.user._id }),
    ]);
    res.json({ blocked: Boolean(isBlocked), request, warningCount });
  } catch (error) { next(error); }
}

export async function requestChatAccess(req, res, next) {
  try {
    const current = await scope(req);
    if (current.error) return res.status(403).json({ message: current.error });
    if (!(await restricted(current.user._id, "chat")))
      return res.status(400).json({ message: "Your chat access is already active." });
    const existing = await AlumniChatAccessRequest.findOne({ user: current.user._id, status: "pending" });
    if (existing) return res.status(409).json({ message: "Your chat access request is already waiting for admin review." });
    const message = clean(req.body.message);
    if (!message) return res.status(400).json({ message: "Write a short request for the administrator." });
    const request = await AlumniChatAccessRequest.create({ user: current.user._id, message });
    res.status(201).json({ request, message: "Your chat access request was sent to the administrator." });
  } catch (error) { next(error); }
}

export async function accessRequests(req, res, next) {
  try {
    const current = await scope(req, true);
    if (current.error) return res.status(403).json({ message: current.error });
    res.json(await AlumniChatAccessRequest.find({})
      .populate("user", "name email alumniProfile")
      .populate("reviewedBy", "name email")
      .sort({ status: 1, createdAt: -1 })
      .lean());
  } catch (error) { next(error); }
}

export async function reviewAccessRequest(req, res, next) {
  try {
    const current = await scope(req, true);
    if (current.error) return res.status(403).json({ message: current.error });
    const request = await AlumniChatAccessRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: "Chat access request not found." });
    if (request.status !== "pending")
      return res.status(409).json({ message: "This chat access request has already been reviewed." });
    const action = clean(req.body.action);
    if (!["approve", "reject"].includes(action))
      return res.status(400).json({ message: "Action must be approve or reject." });
    request.status = action === "approve" ? "approved" : "rejected";
    request.adminNote = clean(req.body.adminNote);
    request.reviewedBy = current.user._id;
    request.reviewedAt = new Date();
    await request.save();
    if (action === "approve") {
      await AlumniRestriction.findOneAndUpdate(
        { user: request.user, feature: "chat" },
        { blocked: false, reason: request.adminNote || "Chat access restored by administrator.", updatedBy: current.user._id },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
    await AlumniNotification.create({
      recipient: request.user,
      actor: current.user._id,
      type: "system",
      title: `Chat access request ${request.status}`,
      message: action === "approve"
        ? "Your chat access request was approved. You can send messages again."
        : `Your chat access request was rejected.${request.adminNote ? ` ${request.adminNote}` : ""}`,
      targetType: "chat_access_request",
      targetId: request._id,
    });
    await AuditLog.create({
      actor: current.user._id,
      actorRole: "admin",
      action: `alumni_chat_access_request_${request.status}`,
      entityType: "AlumniChatAccessRequest",
      entityId: request._id,
      after: { status: request.status, adminNote: request.adminNote },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.json({ request, message: `Chat access request ${request.status}.` });
  } catch (error) { next(error); }
}

export async function deleteMessage(req, res, next) {
  try {
    const current = await scope(req);
    if (current.error) return res.status(403).json({ message: current.error });
    const message = await AlumniChatMessage.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: "Message not found." });
    const conversation = await AlumniConversation.findById(message.conversation);
    if (!conversation || !(await canAccess(conversation, current)))
      return res.status(404).json({ message: "Message not found." });
    if (!current.admin && message.messageType === "system_violation")
      return res.status(403).json({ message: "Community Guidelines warnings can be removed only by an administrator." });
    if (!current.admin && id(message.sender) !== id(current.user._id))
      return res.status(403).json({ message: "You can delete only your messages." });
    await message.deleteOne();
    res.json({ message: "Message deleted." });
  } catch (error) { next(error); }
}

export async function deleteConversationForUser(req, res, next) {
  try {
    const current = await scope(req);
    if (current.error) return res.status(403).json({ message: current.error });
    const conversation = await AlumniConversation.findById(req.params.id);
    if (!conversation || !(await canAccess(conversation, current)))
      return res.status(404).json({ message: "Conversation not found." });
    if (["global", "department"].includes(conversation.type))
      return res.status(403).json({ message: "All Alumni and department chats cannot be deleted." });
    if (!conversation.members.some((member) => id(member) === id(current.user._id)))
      return res.status(403).json({ message: "You are not a participant in this conversation." });
    conversation.clearedFor = conversation.clearedFor.filter((entry) => id(entry.user) !== id(current.user._id));
    conversation.clearedFor.push({ user: current.user._id, clearedAt: new Date() });
    await conversation.save();
    res.json({ message: "Conversation deleted from your chat." });
  } catch (error) { next(error); }
}

export async function editMessage(req, res, next) {
  try {
    const current = await scope(req);
    if (current.error) return res.status(403).json({ message: current.error });
    if (await restricted(current.user._id, "chat"))
      return res.status(403).json({ message: "Your chat access has been blocked by an administrator." });
    const conversation = await AlumniConversation.findById(req.params.id);
    if (!conversation || !(await canAccess(conversation, current)))
      return res.status(404).json({ message: "Conversation not found." });
    const message = await AlumniChatMessage.findOne({ _id: req.params.messageId, conversation: conversation._id });
    if (!message) return res.status(404).json({ message: "Message not found." });
    if (message.messageType !== "user" || id(message.sender) !== id(current.user._id))
      return res.status(403).json({ message: "You can edit only your own messages." });
    if (Date.now() - message.createdAt.getTime() > 5 * 60 * 1000)
      return res.status(403).json({ message: "Messages can be edited only within five minutes." });
    const content = clean(req.body.content);
    if (!content) return res.status(400).json({ message: "Message text cannot be empty." });
    const moderation = await moderateChatText(content);
    if (!moderation.safe) {
      await violationNotice({ conversation, current, category: moderation.categories || "unsafe_text", req });
      return res.status(422).json({ message: "Your edit was not published because it violates the Community Guidelines." });
    }
    message.content = moderation.sanitized;
    message.editedAt = new Date();
    message.moderation = { provider: moderation.provider || "nvidia", categories: moderation.categories, moderatedAt: new Date() };
    await message.save();
    res.json(await message.populate("sender", "name alumniProfile"));
  } catch (error) { next(error); }
}

export async function reactToMessage(req, res, next) {
  try {
    const current = await scope(req);
    if (current.error) return res.status(403).json({ message: current.error });
    const conversation = await AlumniConversation.findById(req.params.id);
    if (!conversation || !(await canAccess(conversation, current)))
      return res.status(404).json({ message: "Conversation not found." });
    const message = await AlumniChatMessage.findOne({ _id: req.params.messageId, conversation: conversation._id });
    if (!message || message.messageType !== "user")
      return res.status(404).json({ message: "Message not found." });
    const emoji = clean(req.body.emoji);
    const allowed = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
    if (emoji && !allowed.includes(emoji))
      return res.status(400).json({ message: "Unsupported reaction." });
    message.reactions = message.reactions.filter((reaction) => id(reaction.user) !== id(current.user._id));
    if (emoji) message.reactions.push({ user: current.user._id, emoji, reactedAt: new Date() });
    await message.save();
    res.json(message);
  } catch (error) { next(error); }
}

export async function clearConversation(req, res, next) {
  try {
    const current = await scope(req, true);
    if (current.error) return res.status(403).json({ message: current.error });
    const result = await AlumniChatMessage.deleteMany({ conversation: req.params.id });
    res.json({ message: "Chat history deleted.", deletedCount: result.deletedCount });
  } catch (error) { next(error); }
}

export async function deleteConversationAdmin(req, res, next) {
  try {
    const current = await scope(req, true);
    if (current.error) return res.status(403).json({ message: current.error });
    const conversation = await AlumniConversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found." });
    const result = await AlumniChatMessage.deleteMany({ conversation: conversation._id });
    const preserved = ["global", "department"].includes(conversation.type);
    if (preserved) {
      conversation.lastMessageAt = conversation.createdAt;
      conversation.clearedFor = [];
      await conversation.save();
    } else {
      await conversation.deleteOne();
    }
    await AuditLog.create({
      actor: current.user._id,
      actorRole: "admin",
      action: preserved ? "alumni_community_chat_cleared" : "alumni_conversation_deleted",
      entityType: "AlumniConversation",
      entityId: conversation._id,
      before: { type: conversation.type, name: conversation.name, deletedMessages: result.deletedCount },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.json({
      message: preserved ? "Community chat history deleted." : "Full chat deleted.",
      conversationDeleted: !preserved,
      deletedCount: result.deletedCount,
    });
  } catch (error) { next(error); }
}

export async function restrictions(req, res, next) {
  try {
    const current = await scope(req, true);
    if (current.error) return res.status(403).json({ message: current.error });
    res.json(await AlumniRestriction.find({}).populate("user", "name email alumniProfile").sort({ updatedAt: -1 }).lean());
  } catch (error) { next(error); }
}

export async function setRestriction(req, res, next) {
  try {
    const current = await scope(req, true);
    if (current.error) return res.status(403).json({ message: current.error });
    const feature = req.body.feature;
    if (!["chat", "post"].includes(feature)) return res.status(400).json({ message: "Invalid restriction type." });
    const restriction = await AlumniRestriction.findOneAndUpdate(
      { user: req.params.userId, feature },
      { blocked: req.body.blocked !== false, reason: clean(req.body.reason), updatedBy: current.user._id },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    await AuditLog.create({ actor: current.user._id, actorRole: "admin", action: `alumni_${feature}_restriction_updated`, entityType: "User", entityId: req.params.userId, after: { blocked: restriction.blocked, reason: restriction.reason }, ipAddress: req.ip, userAgent: req.get("user-agent") });
    res.json(restriction);
  } catch (error) { next(error); }
}

export async function adminAlumni(req, res, next) {
  try {
    const current = await scope(req, true);
    if (current.error) return res.status(403).json({ message: current.error });
    res.json(await User.find({ role: "alumni", accountStatus: "approved" }).select("name email alumniProfile").sort({ name: 1 }).lean());
  } catch (error) { next(error); }
}
