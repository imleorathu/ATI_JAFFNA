const id = (value) => String(value?._id || value || "");
const department = (value) => String(value || "").trim();

export function hasAlumniConversationAccess(conversation, current) {
  if (!conversation || !current?.user) return false;
  if (current.admin) return true;

  if (conversation.type === "global") return true;

  if (conversation.type === "department") {
    const userDepartment = department(current.department);
    return Boolean(userDepartment) &&
      department(conversation.department) === userDepartment;
  }

  if (!["direct", "custom"].includes(conversation.type)) return false;
  return (conversation.members || []).some(
    (member) => id(member) === id(current.user),
  );
}

export function alumniConversationListFilter(current) {
  if (current.admin) return {};
  return {
    $or: [
      { type: "global" },
      ...(department(current.department)
        ? [{ type: "department", department: department(current.department) }]
        : []),
      {
        type: { $in: ["direct", "custom"] },
        members: current.user._id,
      },
    ],
  };
}
