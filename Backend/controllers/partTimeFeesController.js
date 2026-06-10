import crypto from "crypto";
import AuditLog from "../models/AuditLog.js";
import FeeCategory from "../models/FeeCategory.js";
import FeeServiceRequest from "../models/FeeServiceRequest.js";
import FeeStructure from "../models/FeeStructure.js";
import Invoice from "../models/Invoice.js";
import Notification from "../models/Notification.js";
import Payment from "../models/Payment.js";
import Receipt from "../models/Receipt.js";
import Refund from "../models/Refund.js";
import Student from "../models/Student.js";
import StudentFee from "../models/StudentFee.js";
import { assertDepartmentAccess, assertObjectId, assertStudentAccess, isAdmin, isDepartmentStaff, isFinance, isStudent, resolveFeeScope, scopeQuery } from "../middleware/feeAccess.js";
import { parsePagination } from "../middleware/pagination.js";
import logger from "../lib/logger.js";
import { syncStudentPaymentStatus } from "../services/paymentStatusService.js";

const allowedSortFields = new Set(["createdAt", "updatedAt", "dueDate", "paymentDate", "amount", "totalAmount", "paidAmount", "studentName", "status"]);

function pickSort(query, fallback = { createdAt: -1 }) {
  const field = String(query.sortBy || "").trim();
  if (!allowedSortFields.has(field)) return fallback;
  return { [field]: String(query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1 };
}

function regex(value) {
  return { $regex: String(value || "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
}

function dateOnly(value) {
  return value ? new Date(value) : null;
}

function studentFeeFilters(query) {
  const filters = {};
  if (query.semester) filters.semesterName = query.semester;
  if (query.academicYear) filters.academicYear = query.academicYear;
  if (query.status) filters.status = query.status;
  if (query.departmentId || query.department) filters.departmentId = query.departmentId || query.department;
  if (query.studentId) filters.studentId = regex(query.studentId);
  if (query.search) {
    filters.$or = [{ studentId: regex(query.search) }, { studentName: regex(query.search) }];
  }
  return filters;
}

async function audit(req, action, entityType, entityId, departmentId, before = null, after = null) {
  await AuditLog.create({
    actor: req.user?.id,
    actorRole: req.user?.role,
    action,
    entityType,
    entityId,
    departmentId,
    before,
    after,
    ipAddress: req.ip,
    userAgent: req.get("user-agent")
  }).catch(() => {});
}

async function sequence(prefix, Model, field) {
  const count = await Model.countDocuments();
  return `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(6, "0")}`;
}

function setFeeStatus(fee) {
  const outstanding = Math.max(0, (fee.totalAmount || 0) + (fee.lateFeeAmount || 0) - (fee.discountAmount || 0) - (fee.paidAmount || 0));
  if (outstanding <= 0) fee.status = "paid";
  else if ((fee.paidAmount || 0) > 0) fee.status = "partial";
  else if (fee.dueDate && new Date(fee.dueDate) < new Date()) fee.status = "overdue";
  else fee.status = "pending";
  return outstanding;
}

function calculateLateFee(fee) {
  if (!fee?.dueDate || new Date(fee.dueDate) >= new Date() || fee.status === "paid") return 0;
  return Number(fee.lateFeeAmount || 0);
}

async function findStudentForWrite(req, studentId) {
  const scope = await resolveFeeScope(req);
  if (scope.error) return { error: scope.error };
  if (!assertObjectId(studentId)) return { error: "Invalid student id.", status: 400 };

  const student = await Student.findById(studentId).lean();
  if (!student) return { error: "Student not found.", status: 404 };
  const departmentId = student.department || "";
  if (!assertDepartmentAccess({ ...req, feeScope: scope }, departmentId)) {
    return { error: "Forbidden", status: 403 };
  }
  return { scope, student, departmentId };
}

async function paginateModel(req, res, Model, baseFilters, populate = []) {
  const { page, limit, skip } = parsePagination(req);
  const { scope, query } = await scopeQuery(req, baseFilters);
  if (scope.error) return res.status(403).json({ message: scope.error });

  const cursor = Model.find(query).sort(pickSort(req.query));
  populate.forEach((item) => cursor.populate(item));
  const [data, total] = await Promise.all([
    cursor.skip(skip).limit(limit).lean({ virtuals: true }),
    Model.countDocuments(query)
  ]);

  res.json({
    data,
    scope: { mode: scope.mode, departmentId: scope.departmentId || null },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 }
  });
}

export async function listFeeStudents(req, res, next) {
  try {
    const { scope } = await scopeQuery(req, {});
    if (scope.error) return res.status(403).json({ message: scope.error });

    const filters = { studyMode: "Part-time" };
    if (scope.mode === "department") filters.department = scope.departmentId;
    if (scope.mode === "student") filters._id = scope.student._id;
    if (scope.mode === "all" && (req.query.departmentId || req.query.department)) filters.department = req.query.departmentId || req.query.department;
    if (req.query.search) {
      filters.$or = [{ studentId: regex(req.query.search) }, { fullName: regex(req.query.search) }, { email: regex(req.query.search) }];
    }

    const { page, limit, skip } = parsePagination(req);
    const [students, total] = await Promise.all([
      Student.find(filters).sort({ fullName: 1 }).skip(skip).limit(limit).lean(),
      Student.countDocuments(filters)
    ]);

    res.json({ data: students, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
}

export async function listStudentFees(req, res, next) {
  try {
    await paginateModel(req, res, StudentFee, studentFeeFilters(req.query), ["category", "feeStructure"]);
  } catch (error) {
    next(error);
  }
}

export async function getStudentFee(req, res, next) {
  try {
    const scope = await resolveFeeScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const fee = await StudentFee.findById(req.params.id).populate("category feeStructure").lean({ virtuals: true });
    if (!fee) return res.status(404).json({ message: "Fee record not found." });
    req.feeScope = scope;
    if (!assertDepartmentAccess(req, fee.departmentId) || !assertStudentAccess(req, fee.student)) return res.status(403).json({ message: "Forbidden" });
    res.json(fee);
  } catch (error) {
    next(error);
  }
}

export async function createStudentFee(req, res, next) {
  try {
    if (isStudent(req.user)) return res.status(403).json({ message: "Students cannot create fee records." });
    if (!req.body.student) {
      const scope = await resolveFeeScope(req);
      if (scope.error) return res.status(403).json({ message: scope.error });
      const departmentId = isDepartmentStaff(req.user) ? scope.departmentId : String(req.body.departmentId || req.body.department || "").trim();
      if (!departmentId) return res.status(400).json({ message: "Department is required to create semester fees." });
      req.feeScope = scope;
      if (!assertDepartmentAccess(req, departmentId)) return res.status(403).json({ message: "Forbidden" });

      const semesterName = String(req.body.semesterName || "").trim();
      const academicYear = String(req.body.academicYear || "").trim();
      const amount = Number(req.body.totalAmount || req.body.amount || 0);
      if (!semesterName || !academicYear || amount <= 0) {
        return res.status(400).json({ message: "Semester, academic year, and amount are required." });
      }

      const studentFilters = {
        department: departmentId,
        studyMode: "Part-time",
        ...(req.body.academicStage ? { academicStage: req.body.academicStage } : {}),
        ...(req.body.intake ? { intake: req.body.intake } : {}),
        ...(req.body.program ? { program: req.body.program } : {})
      };
      const students = await Student.find(studentFilters).lean();
      if (!students.length) return res.status(404).json({ message: "No part-time students found for this department and semester scope." });

      const dueDate = dateOnly(req.body.dueDate) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const results = await Promise.all(students.map(async (student) => {
        const fee = await StudentFee.findOneAndUpdate(
          {
            student: student._id,
            departmentId,
            semesterName,
            academicYear,
            ...(req.body.category ? { category: req.body.category } : { description: req.body.description || "Part-time semester fee" })
          },
          {
            $set: {
              student: student._id,
              studentId: student.studentId,
              studentName: student.fullName,
              departmentId,
              departmentName: departmentId,
              courseId: student.course,
              courseName: student.program,
              semesterName,
              academicYear,
              feeStructure: req.body.feeStructure || undefined,
              category: req.body.category || undefined,
              description: req.body.description || `${departmentId} ${semesterName} part-time fee`,
              totalAmount: amount,
              dueDate,
              installmentPlan: Array.isArray(req.body.installmentPlan) ? req.body.installmentPlan : [],
              notes: req.body.notes,
              updatedBy: req.user.id
            },
            $setOnInsert: { createdBy: req.user.id, paidAmount: 0, discountAmount: 0, lateFeeAmount: 0 }
          },
          { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );
        setFeeStatus(fee);
        await fee.save();
        return fee;
      }));
      await Promise.all(
        [...new Set(results.map((fee) => String(fee.student)))].map((studentId) =>
          syncStudentPaymentStatus(studentId, { source: "fee_record.department_semester_created" })
        )
      );

      await audit(req, "fee_record.department_semester_created", "StudentFee", results[0]?._id, departmentId, null, {
        departmentId,
        semesterName,
        academicYear,
        amount,
        affectedStudents: results.length
      });

      return res.status(201).json({
        message: `Semester fee applied to ${results.length} part-time student${results.length === 1 ? "" : "s"}.`,
        departmentId,
        semesterName,
        academicYear,
        affectedStudents: results.length,
        data: results
      });
    }

    const result = await findStudentForWrite(req, req.body.student);
    if (result.error) return res.status(result.status || 403).json({ message: result.error });
    const dueDate = dateOnly(req.body.dueDate) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const fee = await StudentFee.create({
      student: result.student._id,
      studentId: result.student.studentId,
      studentName: result.student.fullName,
      departmentId: result.departmentId,
      departmentName: result.departmentId,
      courseId: result.student.course,
      semesterName: req.body.semesterName,
      academicYear: req.body.academicYear,
      feeStructure: req.body.feeStructure || undefined,
      category: req.body.category || undefined,
      description: req.body.description,
      totalAmount: Number(req.body.totalAmount || req.body.amount || 0),
      dueDate,
      installmentPlan: Array.isArray(req.body.installmentPlan) ? req.body.installmentPlan : [],
      notes: req.body.notes,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });
    setFeeStatus(fee);
    await fee.save();
    await syncStudentPaymentStatus(fee.student, { source: "fee_record.created" });
    await audit(req, "fee_record.created", "StudentFee", fee._id, fee.departmentId, null, fee.toObject());
    res.status(201).json(fee);
  } catch (error) {
    next(error);
  }
}

export async function updateStudentFee(req, res, next) {
  try {
    if (isStudent(req.user)) return res.status(403).json({ message: "Students cannot update fee records." });
    const scope = await resolveFeeScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const fee = await StudentFee.findById(req.params.id);
    if (!fee) return res.status(404).json({ message: "Fee record not found." });
    req.feeScope = scope;
    if (!assertDepartmentAccess(req, fee.departmentId)) return res.status(403).json({ message: "Forbidden" });

    const before = fee.toObject();
    const allowed = ["semesterName", "academicYear", "feeStructure", "category", "description", "totalAmount", "discountAmount", "lateFeeAmount", "dueDate", "installmentPlan", "notes"];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) fee[key] = req.body[key];
    });
    fee.updatedBy = req.user.id;
    setFeeStatus(fee);
    await fee.save();
    await syncStudentPaymentStatus(fee.student, { source: "fee_record.updated" });
    await audit(req, "fee_record.updated", "StudentFee", fee._id, fee.departmentId, before, fee.toObject());
    res.json(fee);
  } catch (error) {
    next(error);
  }
}

export async function deleteStudentFee(req, res, next) {
  try {
    if (isStudent(req.user)) return res.status(403).json({ message: "Students cannot delete fee records." });
    const scope = await resolveFeeScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const fee = await StudentFee.findById(req.params.id);
    if (!fee) return res.status(404).json({ message: "Fee record not found." });
    req.feeScope = scope;
    if (!assertDepartmentAccess(req, fee.departmentId)) return res.status(403).json({ message: "Forbidden" });
    const studentId = fee.student;
    await fee.deleteOne();
    await syncStudentPaymentStatus(studentId, { source: "fee_record.deleted" });
    await audit(req, "fee_record.deleted", "StudentFee", fee._id, fee.departmentId, fee.toObject(), null);
    res.json({ message: "Fee record deleted." });
  } catch (error) {
    next(error);
  }
}

export async function feeSummary(req, res, next) {
  try {
    const { scope, query } = await scopeQuery(req, studentFeeFilters(req.query));
    if (scope.error) return res.status(403).json({ message: scope.error });
    if (req.params.studentId) query.student = req.params.studentId;
    if (isStudent(req.user) && String(query.student) !== String(scope.student._id)) return res.status(403).json({ message: "Forbidden" });

    const fees = await StudentFee.find(query).lean({ virtuals: true });
    const totalFees = fees.reduce((sum, fee) => sum + Number(fee.totalAmount || 0) + calculateLateFee(fee), 0);
    const paid = fees.reduce((sum, fee) => sum + Number(fee.paidAmount || 0), 0);
    const outstanding = Math.max(0, totalFees - paid - fees.reduce((sum, fee) => sum + Number(fee.discountAmount || 0), 0));
    res.json({
      totalFees,
      paid,
      outstanding,
      paidRecords: fees.filter((fee) => fee.status === "paid").length,
      unpaidRecords: fees.filter((fee) => fee.status !== "paid").length,
      fees
    });
  } catch (error) {
    next(error);
  }
}

export async function listFeeCategories(req, res, next) {
  try {
    const data = await FeeCategory.find({}).sort({ name: 1 }).lean();
    res.json({ data });
  } catch (error) {
    next(error);
  }
}

export async function createFeeCategory(req, res, next) {
  try {
    if (!isAdmin(req.user) && !isFinance(req.user)) return res.status(403).json({ message: "Admin or finance officer access required." });
    const category = await FeeCategory.create(req.body);
    await audit(req, "fee_category.created", "FeeCategory", category._id, "", null, category.toObject());
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
}

export async function updateFeeCategory(req, res, next) {
  try {
    if (!isAdmin(req.user) && !isFinance(req.user)) return res.status(403).json({ message: "Admin or finance officer access required." });
    const before = await FeeCategory.findById(req.params.id).lean();
    const category = await FeeCategory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ message: "Fee category not found." });
    await audit(req, "fee_category.updated", "FeeCategory", category._id, "", before, category.toObject());
    res.json(category);
  } catch (error) {
    next(error);
  }
}

export async function deleteFeeCategory(req, res, next) {
  try {
    if (!isAdmin(req.user) && !isFinance(req.user)) return res.status(403).json({ message: "Admin or finance officer access required." });
    const category = await FeeCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: "Fee category not found." });
    await audit(req, "fee_category.deleted", "FeeCategory", category._id, "", category.toObject(), null);
    res.json({ message: "Fee category deleted." });
  } catch (error) {
    next(error);
  }
}

export async function listFeeStructures(req, res, next) {
  try {
    const filters = {};
    if (req.query.departmentId || req.query.department) filters.departmentId = req.query.departmentId || req.query.department;
    if (req.query.semester) filters.semesterName = req.query.semester;
    if (req.query.academicYear) filters.academicYear = req.query.academicYear;
    if (req.query.isActive !== undefined) filters.isActive = String(req.query.isActive) === "true";
    await paginateModel(req, res, FeeStructure, filters, ["category"]);
  } catch (error) {
    next(error);
  }
}

export async function createFeeStructure(req, res, next) {
  try {
    if (isStudent(req.user)) return res.status(403).json({ message: "Students cannot manage fee structures." });
    const scope = await resolveFeeScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const departmentId = isDepartmentStaff(req.user) ? scope.departmentId : req.body.departmentId;
    if (!departmentId) return res.status(400).json({ message: "departmentId is required." });
    req.feeScope = scope;
    if (!assertDepartmentAccess(req, departmentId)) return res.status(403).json({ message: "Forbidden" });
    const structure = await FeeStructure.create({
      ...req.body,
      departmentId,
      departmentName: req.body.departmentName || departmentId,
      amountHistory: [{ amount: Number(req.body.amount || 0), changedBy: req.user.id, reason: "Initial amount" }]
    });
    await audit(req, "fee_structure.created", "FeeStructure", structure._id, structure.departmentId, null, structure.toObject());
    res.status(201).json(structure);
  } catch (error) {
    next(error);
  }
}

export async function updateFeeStructure(req, res, next) {
  try {
    if (isStudent(req.user)) return res.status(403).json({ message: "Students cannot manage fee structures." });
    const scope = await resolveFeeScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const structure = await FeeStructure.findById(req.params.id);
    if (!structure) return res.status(404).json({ message: "Fee structure not found." });
    req.feeScope = scope;
    if (!assertDepartmentAccess(req, structure.departmentId)) return res.status(403).json({ message: "Forbidden" });
    const before = structure.toObject();
    const previousAmount = Number(structure.amount || 0);
    Object.assign(structure, req.body);
    if (isDepartmentStaff(req.user)) structure.departmentId = scope.departmentId;
    if (req.body.amount !== undefined && Number(req.body.amount) !== previousAmount) {
      structure.amountHistory.push({ amount: Number(req.body.amount), changedBy: req.user.id, reason: req.body.reason || "Amount updated" });
    }
    await structure.save();
    await audit(req, "fee_structure.updated", "FeeStructure", structure._id, structure.departmentId, before, structure.toObject());
    res.json(structure);
  } catch (error) {
    next(error);
  }
}

export async function deleteFeeStructure(req, res, next) {
  try {
    if (isStudent(req.user)) return res.status(403).json({ message: "Students cannot manage fee structures." });
    const scope = await resolveFeeScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const structure = await FeeStructure.findById(req.params.id);
    if (!structure) return res.status(404).json({ message: "Fee structure not found." });
    req.feeScope = scope;
    if (!assertDepartmentAccess(req, structure.departmentId)) return res.status(403).json({ message: "Forbidden" });
    await structure.deleteOne();
    await audit(req, "fee_structure.deleted", "FeeStructure", structure._id, structure.departmentId, structure.toObject(), null);
    res.json({ message: "Fee structure deleted." });
  } catch (error) {
    next(error);
  }
}

export async function generateInvoice(req, res, next) {
  try {
    if (isStudent(req.user)) return res.status(403).json({ message: "Students cannot generate invoices." });
    const fee = await StudentFee.findById(req.body.feeRecord);
    if (!fee) return res.status(404).json({ message: "Fee record not found." });
    const scope = await resolveFeeScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    req.feeScope = scope;
    if (!assertDepartmentAccess(req, fee.departmentId)) return res.status(403).json({ message: "Forbidden" });
    const totalAmount = Math.max(0, Number(fee.totalAmount || 0) + Number(fee.lateFeeAmount || 0) - Number(fee.discountAmount || 0));
    const invoice = await Invoice.create({
      invoiceNumber: await sequence("INV", Invoice, "invoiceNumber"),
      student: fee.student,
      studentId: fee.studentId,
      studentName: fee.studentName,
      departmentId: fee.departmentId,
      semesterName: fee.semesterName,
      academicYear: fee.academicYear,
      dueDate: req.body.dueDate || fee.dueDate,
      subtotal: fee.totalAmount,
      lateFeeAmount: fee.lateFeeAmount,
      discountAmount: fee.discountAmount,
      totalAmount,
      paidAmount: fee.paidAmount,
      status: fee.status === "paid" ? "paid" : fee.paidAmount > 0 ? "partial" : "unpaid",
      lines: [{ description: fee.description || `${fee.semesterName} ${fee.academicYear} fees`, amount: fee.totalAmount, feeRecord: fee._id }],
      generatedBy: req.user.id
    });
    await audit(req, "invoice.generated", "Invoice", invoice._id, invoice.departmentId, null, invoice.toObject());
    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
}

export async function listInvoices(req, res, next) {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.departmentId || req.query.department) filters.departmentId = req.query.departmentId || req.query.department;
    await paginateModel(req, res, Invoice, filters);
  } catch (error) {
    next(error);
  }
}

export async function downloadInvoice(req, res, next) {
  try {
    const scope = await resolveFeeScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const invoice = await Invoice.findById(req.params.id).lean();
    if (!invoice) return res.status(404).json({ message: "Invoice not found." });
    req.feeScope = scope;
    if (!assertDepartmentAccess(req, invoice.departmentId) || !assertStudentAccess(req, invoice.student)) return res.status(403).json({ message: "Forbidden" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.send(Buffer.from(`Invoice ${invoice.invoiceNumber}\nStudent: ${invoice.studentName}\nAmount: LKR ${invoice.totalAmount}\nStatus: ${invoice.status}`));
  } catch (error) {
    next(error);
  }
}

export async function recordPayment(req, res, next) {
  try {
    const fee = await StudentFee.findById(req.body.feeRecord);
    if (!fee) return res.status(404).json({ message: "Fee record not found." });
    const scope = await resolveFeeScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    req.feeScope = scope;

    if (isStudent(req.user)) {
      if (!assertStudentAccess(req, fee.student)) return res.status(403).json({ message: "Forbidden" });
    } else if (!isAdmin(req.user) && !isFinance(req.user)) {
      return res.status(403).json({ message: "Finance officer, admin, or owning student access required." });
    }

    const amount = Number(req.body.amount || 0);
    if (amount <= 0) return res.status(400).json({ message: "Payment amount must be greater than zero." });
    const outstanding = Math.max(0, (fee.totalAmount || 0) + (fee.lateFeeAmount || 0) - (fee.discountAmount || 0) - (fee.paidAmount || 0));
    if (amount > outstanding) return res.status(400).json({ message: "Payment amount cannot exceed the outstanding balance." });
    const method = req.body.method || (isStudent(req.user) ? "Online Payment" : "");
    if (isStudent(req.user) && !["Card", "Credit/Debit Card", "Bank Transfer", "Internet Banking", "Mobile Wallet", "UPI/QR Payment", "Online Payment", "PayHere", "Stripe", "PayPal"].includes(method)) {
      return res.status(400).json({ message: "Students can pay using supported online payment methods only." });
    }

    const payment = await Payment.create({
      paymentNumber: await sequence("PAY", Payment, "paymentNumber"),
      student: fee.student,
      studentId: fee.studentId,
      studentName: fee.studentName,
      departmentId: fee.departmentId,
      feeRecord: fee._id,
      invoice: req.body.invoice || undefined,
      amount,
      method,
      transactionReference: req.body.transactionReference || (isStudent(req.user) ? `ONLINE-${Date.now()}` : ""),
      status: "validated",
      receivedBy: req.user.id,
      transactionLogs: [{ status: "validated", message: "Payment recorded and validated.", metadata: { method, paidBy: req.user.role } }]
    });

    fee.paidAmount = Number(fee.paidAmount || 0) + amount;
    setFeeStatus(fee);
    await fee.save();
    const studentPaymentStatus = await syncStudentPaymentStatus(fee.student, { source: "payment.recorded", paymentId: payment._id });
    logger.info("Payment recorded and student status synchronized", {
      paymentId: String(payment._id),
      paymentNumber: payment.paymentNumber,
      feeRecord: String(fee._id),
      student: String(fee.student),
      amount,
      feePaidAmount: fee.paidAmount,
      feeStatus: fee.status,
      studentPaymentStatus
    });
    if (payment.invoice) {
      const invoice = await Invoice.findById(payment.invoice);
      if (invoice) {
        invoice.paidAmount = Number(invoice.paidAmount || 0) + amount;
        invoice.status = invoice.paidAmount >= invoice.totalAmount ? "paid" : "partial";
        await invoice.save();
      }
    }

    const receipt = await Receipt.create({
      receiptNumber: await sequence("REC", Receipt, "receiptNumber"),
      payment: payment._id,
      student: payment.student,
      studentId: payment.studentId,
      studentName: payment.studentName,
      departmentId: payment.departmentId,
      amount,
      qrVerificationCode: crypto.randomBytes(16).toString("hex")
    });
    await Notification.create({
      student: payment.student,
      departmentId: payment.departmentId,
      type: "payment_confirmation",
      channel: "in_app",
      title: "Payment confirmed",
      message: `Payment ${payment.paymentNumber} for LKR ${amount.toLocaleString()} has been recorded.`,
      status: "sent",
      sentAt: new Date()
    }).catch(() => {});
    await audit(req, "payment.recorded", "Payment", payment._id, payment.departmentId, null, payment.toObject());
    res.status(201).json({ payment, receipt, fee, studentPaymentStatus });
  } catch (error) {
    next(error);
  }
}

export async function listPayments(req, res, next) {
  try {
    const filters = {};
    if (req.query.method) filters.method = req.query.method;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.departmentId || req.query.department) filters.departmentId = req.query.departmentId || req.query.department;
    await paginateModel(req, res, Payment, filters);
  } catch (error) {
    next(error);
  }
}

export async function listReceipts(req, res, next) {
  try {
    await paginateModel(req, res, Receipt, {});
  } catch (error) {
    next(error);
  }
}

export async function downloadReceipt(req, res, next) {
  try {
    const scope = await resolveFeeScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const receipt = await Receipt.findById(req.params.id).lean();
    if (!receipt) return res.status(404).json({ message: "Receipt not found." });
    req.feeScope = scope;
    if (!assertDepartmentAccess(req, receipt.departmentId) || !assertStudentAccess(req, receipt.student)) return res.status(403).json({ message: "Forbidden" });
    if (!isStudent(req.user)) {
      await Receipt.findByIdAndUpdate(receipt._id, { $push: { reprintHistory: { printedBy: req.user.id, reason: req.query.reason || "Download" } } });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${receipt.receiptNumber}.pdf"`);
    res.send(Buffer.from(`Receipt ${receipt.receiptNumber}\nStudent: ${receipt.studentName}\nAmount: LKR ${receipt.amount}\nVerify: ${receipt.qrVerificationCode}`));
  } catch (error) {
    next(error);
  }
}

export async function verifyReceipt(req, res, next) {
  try {
    const receipt = await Receipt.findOne({ qrVerificationCode: req.params.code }).lean();
    if (!receipt) return res.status(404).json({ valid: false, message: "Receipt not found." });
    res.json({ valid: true, receipt: { receiptNumber: receipt.receiptNumber, studentName: receipt.studentName, amount: receipt.amount, issuedAt: receipt.issuedAt } });
  } catch (error) {
    next(error);
  }
}

export async function listOutstanding(req, res, next) {
  try {
    const filters = { ...studentFeeFilters(req.query), status: { $in: ["pending", "partial", "overdue"] } };
    await paginateModel(req, res, StudentFee, filters, ["category"]);
  } catch (error) {
    next(error);
  }
}

export async function submitRefund(req, res, next) {
  try {
    const scope = await resolveFeeScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const payment = await Payment.findById(req.body.payment);
    if (!payment) return res.status(404).json({ message: "Payment not found." });
    req.feeScope = scope;
    if (!assertDepartmentAccess(req, payment.departmentId) || !assertStudentAccess(req, payment.student)) return res.status(403).json({ message: "Forbidden" });
    const amount = Number(req.body.amount || 0);
    if (amount <= 0 || amount > payment.amount) return res.status(400).json({ message: "Refund amount must be within the payment amount." });
    const refund = await Refund.create({
      refundNumber: await sequence("REF", Refund, "refundNumber"),
      payment: payment._id,
      student: payment.student,
      studentId: payment.studentId,
      studentName: payment.studentName,
      departmentId: payment.departmentId,
      amount,
      reason: req.body.reason,
      requestedBy: req.user.id,
      auditTrail: [{ action: "requested", by: req.user.id, note: req.body.reason }]
    });
    await audit(req, "refund.requested", "Refund", refund._id, refund.departmentId, null, refund.toObject());
    res.status(201).json(refund);
  } catch (error) {
    next(error);
  }
}

export async function listRefunds(req, res, next) {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    await paginateModel(req, res, Refund, filters);
  } catch (error) {
    next(error);
  }
}

export async function reviewRefund(req, res, next) {
  try {
    if (!isAdmin(req.user) && !isFinance(req.user)) return res.status(403).json({ message: "Finance officer or admin access required." });
    const refund = await Refund.findById(req.params.id);
    if (!refund) return res.status(404).json({ message: "Refund not found." });
    const action = String(req.body.action || "").toLowerCase();
    if (!["approved", "rejected", "paid"].includes(action)) return res.status(400).json({ message: "Action must be approved, rejected, or paid." });
    const before = refund.toObject();
    refund.status = action;
    refund.reviewedBy = req.user.id;
    refund.reviewedAt = new Date();
    refund.reviewNote = req.body.note;
    refund.auditTrail.push({ action, by: req.user.id, note: req.body.note });
    await refund.save();

    let studentPaymentStatus = null;
    if (action === "paid" && before.status !== "paid") {
      const payment = await Payment.findById(refund.payment);
      if (payment) {
        const fee = payment.feeRecord ? await StudentFee.findById(payment.feeRecord) : null;
        if (fee) {
          fee.paidAmount = Math.max(0, Number(fee.paidAmount || 0) - Number(refund.amount || 0));
          setFeeStatus(fee);
          await fee.save();
        }

        if (Number(refund.amount || 0) >= Number(payment.amount || 0)) {
          payment.status = "refunded";
        }
        payment.transactionLogs.push({
          status: "refunded",
          message: `Refund ${refund.refundNumber} marked paid.`,
          metadata: { refund: refund._id, refundAmount: refund.amount }
        });
        await payment.save();

        studentPaymentStatus = await syncStudentPaymentStatus(payment.student, { source: "refund.paid", refundId: refund._id, paymentId: payment._id });
        logger.info("Refund paid and student status synchronized", {
          refundId: String(refund._id),
          refundNumber: refund.refundNumber,
          paymentId: String(payment._id),
          student: String(payment.student),
          refundAmount: refund.amount,
          paymentStatus: payment.status,
          feeRecord: fee?._id ? String(fee._id) : null,
          feePaidAmount: fee?.paidAmount,
          feeStatus: fee?.status,
          studentPaymentStatus
        });
      }
    }

    await audit(req, `refund.${action}`, "Refund", refund._id, refund.departmentId, before, refund.toObject());
    res.json({ refund, studentPaymentStatus });
  } catch (error) {
    next(error);
  }
}

export async function listNotifications(req, res, next) {
  try {
    const filters = {};
    if (req.query.type) filters.type = req.query.type;
    await paginateModel(req, res, Notification, filters);
  } catch (error) {
    next(error);
  }
}

export async function listServiceRequests(req, res, next) {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.type) filters.type = req.query.type;
    await paginateModel(req, res, FeeServiceRequest, filters);
  } catch (error) {
    next(error);
  }
}

export async function createServiceRequest(req, res, next) {
  try {
    const scope = await resolveFeeScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    if (!isStudent(req.user)) return res.status(403).json({ message: "Only students can submit fee service requests." });

    const type = String(req.body.type || "").trim();
    const title = String(req.body.title || "").trim();
    if (!type || !title) return res.status(400).json({ message: "Request type and title are required." });

    let feeRecord = undefined;
    if (req.body.feeRecord) {
      const fee = await StudentFee.findById(req.body.feeRecord).lean();
      if (!fee) return res.status(404).json({ message: "Fee record not found." });
      req.feeScope = scope;
      if (!assertStudentAccess(req, fee.student)) return res.status(403).json({ message: "Forbidden" });
      feeRecord = fee._id;
    }

    const request = await FeeServiceRequest.create({
      requestNumber: await sequence("FSR", FeeServiceRequest, "requestNumber"),
      type,
      title,
      student: scope.student._id,
      studentId: scope.student.studentId,
      studentName: scope.student.fullName,
      departmentId: scope.departmentId,
      feeRecord,
      amount: Number(req.body.amount || 0) || undefined,
      note: req.body.note,
      attachmentUrl: req.body.attachmentUrl,
      requestedBy: req.user.id,
      history: [{ action: "requested", by: req.user.id, note: req.body.note }]
    });

    await Notification.create({
      student: scope.student._id,
      departmentId: scope.departmentId,
      type: "fee_due_reminder",
      channel: "in_app",
      title: "Fee service request submitted",
      message: `${title} has been submitted for admin review.`,
      status: "sent",
      sentAt: new Date()
    }).catch(() => {});
    await audit(req, "fee_service_request.created", "FeeServiceRequest", request._id, request.departmentId, null, request.toObject());
    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
}

export async function reviewServiceRequest(req, res, next) {
  try {
    if (!isAdmin(req.user) && !isFinance(req.user)) return res.status(403).json({ message: "Admin or finance officer access required." });
    const request = await FeeServiceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Fee service request not found." });

    const status = String(req.body.status || req.body.action || "").toLowerCase();
    if (!["approved", "rejected", "completed"].includes(status)) {
      return res.status(400).json({ message: "Status must be approved, rejected, or completed." });
    }

    const before = request.toObject();
    request.status = status;
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.reviewNote = req.body.note;
    request.history.push({ action: status, by: req.user.id, note: req.body.note });
    await request.save();

    await Notification.create({
      student: request.student,
      departmentId: request.departmentId,
      type: "refund_notification",
      channel: "in_app",
      title: `Fee request ${status}`,
      message: `${request.title} was ${status}.${req.body.note ? ` ${req.body.note}` : ""}`,
      status: "sent",
      sentAt: new Date()
    }).catch(() => {});
    await audit(req, `fee_service_request.${status}`, "FeeServiceRequest", request._id, request.departmentId, before, request.toObject());
    res.json(request);
  } catch (error) {
    next(error);
  }
}

export async function createNotification(req, res, next) {
  try {
    if (isStudent(req.user)) return res.status(403).json({ message: "Students cannot create notifications." });
    const scope = await resolveFeeScope(req);
    if (scope.error) return res.status(403).json({ message: scope.error });
    const departmentId = isDepartmentStaff(req.user) ? scope.departmentId : req.body.departmentId;
    req.feeScope = scope;
    if (departmentId && !assertDepartmentAccess(req, departmentId)) return res.status(403).json({ message: "Forbidden" });
    const notification = await Notification.create({ ...req.body, departmentId, status: req.body.status || "queued" });
    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
}

export async function dashboard(req, res, next) {
  try {
    const { scope, query } = await scopeQuery(req, studentFeeFilters(req.query));
    if (scope.error) return res.status(403).json({ message: scope.error });
    const fees = await StudentFee.find(query).lean();
    const payments = await Payment.find(scope.mode === "all" && !scope.departmentId ? {} : scope.mode === "student" ? { student: scope.student._id } : { departmentId: scope.departmentId }).lean();
    const refunds = await Refund.find(scope.mode === "all" && !scope.departmentId ? {} : scope.mode === "student" ? { student: scope.student._id } : { departmentId: scope.departmentId }).lean();

    const totalFees = fees.reduce((sum, fee) => sum + Number(fee.totalAmount || 0), 0);
    const totalCollected = payments.filter((p) => p.status !== "failed").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const totalOutstanding = fees.reduce((sum, fee) => sum + Math.max(0, Number(fee.totalAmount || 0) + Number(fee.lateFeeAmount || 0) - Number(fee.discountAmount || 0) - Number(fee.paidAmount || 0)), 0);
    const monthlyRevenue = payments.reduce((acc, payment) => {
      const key = new Date(payment.paymentDate || payment.createdAt).toISOString().slice(0, 7);
      acc[key] = (acc[key] || 0) + Number(payment.amount || 0);
      return acc;
    }, {});
    const departmentRevenue = payments.reduce((acc, payment) => {
      const key = payment.departmentId || "Unassigned";
      acc[key] = (acc[key] || 0) + Number(payment.amount || 0);
      return acc;
    }, {});

    res.json({
      scope: { mode: scope.mode, departmentId: scope.departmentId || null },
      widgets: {
        totalFees,
        totalCollected,
        totalOutstanding,
        paidStudents: new Set(fees.filter((fee) => fee.status === "paid").map((fee) => String(fee.student))).size,
        unpaidStudents: new Set(fees.filter((fee) => fee.status !== "paid").map((fee) => String(fee.student))).size,
        refundRequests: refunds.length
      },
      monthlyRevenue: Object.entries(monthlyRevenue).map(([month, amount]) => ({ month, amount })).sort((a, b) => a.month.localeCompare(b.month)),
      departmentRevenue: Object.entries(departmentRevenue).map(([department, amount]) => ({ department, amount })).sort((a, b) => b.amount - a.amount),
      collectionTrends: fees.map((fee) => ({ name: fee.studentName, paid: fee.paidAmount || 0, outstanding: Math.max(0, (fee.totalAmount || 0) - (fee.paidAmount || 0)) })).slice(0, 12)
    });
  } catch (error) {
    next(error);
  }
}

export async function report(req, res, next) {
  try {
    const type = req.params.type;
    const format = String(req.query.format || "json").toLowerCase();
    const { scope, query } = await scopeQuery(req, studentFeeFilters(req.query));
    if (scope.error) return res.status(403).json({ message: scope.error });
    const feeRows = await StudentFee.find(query).lean();
    const paymentQuery = scope.mode === "all" && !scope.departmentId ? {} : scope.mode === "student" ? { student: scope.student._id } : { departmentId: scope.departmentId };
    const paymentRows = await Payment.find(paymentQuery).lean();
    const rows = type.includes("collection")
      ? paymentRows.map((p) => ({ date: p.paymentDate, department: p.departmentId, studentId: p.studentId, student: p.studentName, amount: p.amount, method: p.method, status: p.status }))
      : type.includes("refund")
        ? await Refund.find(paymentQuery).lean()
        : feeRows.map((f) => ({ department: f.departmentId, studentId: f.studentId, student: f.studentName, semester: f.semesterName, academicYear: f.academicYear, total: f.totalAmount, paid: f.paidAmount, outstanding: Math.max(0, (f.totalAmount || 0) - (f.paidAmount || 0)), status: f.status }));

    if (format === "csv") {
      const header = Object.keys(rows[0] || { message: "No records" });
      const csv = [header.join(","), ...rows.map((row) => header.map((key) => `"${String(row[key] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${type}.csv"`);
      return res.send(csv);
    }

    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${type}.pdf"`);
      return res.send(Buffer.from(`${type}\n${JSON.stringify(rows, null, 2)}`));
    }

    res.json({ type, rows });
  } catch (error) {
    next(error);
  }
}

export async function activityLogs(req, res, next) {
  try {
    if (!isAdmin(req.user) && !isFinance(req.user)) return res.status(403).json({ message: "Admin or finance officer access required." });
    const filters = {};
    if (req.query.entityType) filters.entityType = req.query.entityType;
    if (req.query.departmentId) filters.departmentId = req.query.departmentId;
    const { page, limit, skip } = parsePagination(req);
    const [data, total] = await Promise.all([
      AuditLog.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filters)
    ]);
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    next(error);
  }
}
