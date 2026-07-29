import { Router } from "express";
import {
  activityLogs,
  createFeeCategory,
  createFeeStructure,
  createNotification,
  createStudentFee,
  dashboard,
  deleteFeeCategory,
  deleteFeeStructure,
  deleteStudentFee,
  downloadInvoice,
  downloadReceipt,
  feeSummary,
  generateInvoice,
  getStudentFee,
  listFeeCategories,
  listFeeStructures,
  listFeeStudents,
  listInvoices,
  listNotifications,
  listOutstanding,
  listPayments,
  listReceipts,
  listRefunds,
  listServiceRequests,
  listStudentFees,
  recordPayment,
  report,
  reviewRefund,
  reviewServiceRequest,
  submitRefund,
  createServiceRequest,
  updateFeeCategory,
  updateFeeStructure,
  updateStudentFee,
  verifyReceipt
} from "../controllers/partTimeFeesController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireFeeManagementAccess, requirePartTimeStudentFeeAccess } from "../middleware/feeAccess.js";

const router = Router();

router.get("/receipts/verify/:code", verifyReceipt);

router.use(requireAuth);
router.use(requirePartTimeStudentFeeAccess);

router.get("/dashboard", dashboard);
router.get("/students", requireFeeManagementAccess, listFeeStudents);

router.get("/student-fees", listStudentFees);
router.post("/student-fees", requireFeeManagementAccess, createStudentFee);
router.get("/student-fees/:id", getStudentFee);
router.put("/student-fees/:id", requireFeeManagementAccess, updateStudentFee);
router.delete("/student-fees/:id", requireFeeManagementAccess, deleteStudentFee);
router.get("/students/:studentId/summary", feeSummary);
router.get("/my-summary", feeSummary);

router.get("/fee-categories", listFeeCategories);
router.post("/fee-categories", createFeeCategory);
router.put("/fee-categories/:id", updateFeeCategory);
router.delete("/fee-categories/:id", deleteFeeCategory);

router.get("/fee-structures", listFeeStructures);
router.post("/fee-structures", requireFeeManagementAccess, createFeeStructure);
router.put("/fee-structures/:id", requireFeeManagementAccess, updateFeeStructure);
router.delete("/fee-structures/:id", requireFeeManagementAccess, deleteFeeStructure);

router.get("/invoices", listInvoices);
router.post("/invoices", requireFeeManagementAccess, generateInvoice);
router.get("/invoices/:id/download", downloadInvoice);

router.get("/payments", listPayments);
router.post("/payments", recordPayment);

router.get("/outstanding", listOutstanding);

router.get("/receipts", listReceipts);
router.get("/receipts/:id/download", downloadReceipt);

router.get("/refunds", listRefunds);
router.post("/refunds", submitRefund);
router.patch("/refunds/:id/review", reviewRefund);

router.get("/notifications", listNotifications);
router.post("/notifications", requireFeeManagementAccess, createNotification);

router.get("/service-requests", listServiceRequests);
router.post("/service-requests", createServiceRequest);
router.patch("/service-requests/:id/review", reviewServiceRequest);

router.get("/reports/:type", report);
router.get("/audit-logs", activityLogs);

export default router;
