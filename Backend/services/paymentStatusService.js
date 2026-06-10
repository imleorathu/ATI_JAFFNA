import mongoose from "mongoose";
import logger from "../lib/logger.js";
import Student from "../models/Student.js";
import StudentFee from "../models/StudentFee.js";

export function calculateStudentPaymentStatus(studyMode, fees = []) {
  if (studyMode === "Full-time") return "not_required";
  if (!fees.length) return "pending";

  const requiredFee = fees.reduce(
    (sum, fee) => sum + Number(fee.totalAmount || 0) + Number(fee.lateFeeAmount || 0) - Number(fee.discountAmount || 0),
    0
  );
  const totalPaid = fees.reduce((sum, fee) => sum + Number(fee.paidAmount || 0), 0);

  if (requiredFee > 0 && totalPaid >= requiredFee) return "paid";
  if (totalPaid > 0) return "partial";
  return "pending";
}

export async function syncStudentPaymentStatus(studentId, context = {}) {
  if (!studentId || !mongoose.Types.ObjectId.isValid(String(studentId))) return null;

  const [student, fees] = await Promise.all([
    Student.findById(studentId).select("studyMode paymentStatus studentId email").lean(),
    StudentFee.find({ student: studentId }).select("totalAmount lateFeeAmount discountAmount paidAmount status").lean()
  ]);
  if (!student) return null;

  const paymentStatus = calculateStudentPaymentStatus(student.studyMode, fees);
  const requiredFee = fees.reduce(
    (sum, fee) => sum + Number(fee.totalAmount || 0) + Number(fee.lateFeeAmount || 0) - Number(fee.discountAmount || 0),
    0
  );
  const totalPaid = fees.reduce((sum, fee) => sum + Number(fee.paidAmount || 0), 0);

  logger.info("Student payment status calculated", {
    studentId: String(studentId),
    studentNumber: student.studentId,
    email: student.email,
    previousStatus: student.paymentStatus,
    nextStatus: paymentStatus,
    requiredFee,
    totalPaid,
    feeCount: fees.length,
    source: context.source || "unknown"
  });

  if (student.paymentStatus !== paymentStatus) {
    await Student.findByIdAndUpdate(studentId, { $set: { paymentStatus } }, { runValidators: true });
  }
  return paymentStatus;
}

export async function syncStudentPaymentStatuses(studentIds, context = {}) {
  const uniqueIds = [...new Set(studentIds.map((id) => String(id || "")).filter(Boolean))];
  const results = await Promise.all(uniqueIds.map((studentId) => syncStudentPaymentStatus(studentId, context)));
  return new Map(uniqueIds.map((studentId, index) => [studentId, results[index]]));
}
