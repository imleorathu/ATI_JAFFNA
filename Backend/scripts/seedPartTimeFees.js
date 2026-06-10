import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { getConfig } from "../lib/config.js";
import { connectMongo } from "../lib/mongo.js";
import FeeCategory from "../models/FeeCategory.js";
import FeeStructure from "../models/FeeStructure.js";
import Invoice from "../models/Invoice.js";
import Payment from "../models/Payment.js";
import Receipt from "../models/Receipt.js";
import Student from "../models/Student.js";
import StudentFee from "../models/StudentFee.js";
import User from "../models/User.js";

dotenv.config();

const categories = [
  ["Registration Fee", "REG"],
  ["Course Fee", "COURSE"],
  ["Examination Fee", "EXAM"],
  ["Library Fee", "LIB"],
  ["Certificate Fee", "CERT"]
];

async function upsertUser({ name, email, role, department, password = "Password@123" }) {
  const passwordHash = await bcrypt.hash(password, 10);
  return User.findOneAndUpdate(
    { email },
    {
      name,
      email,
      role,
      accountStatus: "approved",
      mustChangePassword: false,
      passwordHash,
      ...(role === "student"
        ? { studentProfile: { studentId: "PT-ICT-001", nic: "200012345678", department, studyMode: "Part-time", academicStage: "First year Part Time" } }
        : { staffProfile: { staffId: `${role}-001`, department, staffType: role === "finance_officer" ? "Finance Officer" : "Department Staff" } })
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function main() {
  await connectMongo(getConfig().mongoUri);

  const [admin, finance, deptStaff] = await Promise.all([
    upsertUser({ name: "Fees Admin", email: "fees.admin@atijaffna.edu.lk", role: "admin", department: "" }),
    upsertUser({ name: "Finance Officer", email: "finance@atijaffna.edu.lk", role: "finance_officer", department: "Information Technology" }),
    upsertUser({ name: "IT Department Staff", email: "it.staff@atijaffna.edu.lk", role: "department_staff", department: "Information Technology" })
  ]);

  const categoryDocs = {};
  for (const [name, code] of categories) {
    categoryDocs[code] = await FeeCategory.findOneAndUpdate(
      { code },
      { name, code, description: `${name} for part-time programmes`, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const student = await Student.findOneAndUpdate(
    { studentId: "PT-ICT-001" },
    {
      fullName: "Nivetha Rajan",
      email: "pt.student@atijaffna.edu.lk",
      phone: "0771234567",
      nic: "200012345678",
      studentId: "PT-ICT-001",
      department: "Information Technology",
      program: "HNDIT Part-Time",
      intake: "2026",
      academicYear: "2026/2027",
      academicStage: "First year Part Time",
      studyMode: "Part-time",
      paymentStatus: "partial"
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await upsertUser({ name: student.fullName, email: student.email, role: "student", department: student.department });

  const structure = await FeeStructure.findOneAndUpdate(
    { departmentId: "Information Technology", semesterName: "Semester 1", academicYear: "2026/2027", category: categoryDocs.COURSE._id },
    {
      name: "HNDIT Part-Time Semester 1 Course Fee",
      category: categoryDocs.COURSE._id,
      departmentId: "Information Technology",
      departmentName: "Information Technology",
      courseName: "HNDIT Part-Time",
      semesterName: "Semester 1",
      academicYear: "2026/2027",
      amount: 45000,
      dueDays: 30,
      lateFeeType: "fixed",
      lateFeeValue: 1500,
      isActive: true,
      amountHistory: [{ amount: 45000, changedBy: admin._id, reason: "Seed amount" }]
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const fee = await StudentFee.findOneAndUpdate(
    { student: student._id, feeStructure: structure._id },
    {
      student: student._id,
      studentId: student.studentId,
      studentName: student.fullName,
      departmentId: student.department,
      departmentName: student.department,
      semesterName: "Semester 1",
      academicYear: "2026/2027",
      feeStructure: structure._id,
      category: categoryDocs.COURSE._id,
      description: "Semester 1 part-time course fee",
      totalAmount: 45000,
      paidAmount: 20000,
      dueDate: new Date("2026-07-15"),
      status: "partial",
      installmentPlan: [
        { label: "Installment 1", amount: 20000, dueDate: new Date("2026-06-15"), status: "paid" },
        { label: "Installment 2", amount: 25000, dueDate: new Date("2026-07-15"), status: "pending" }
      ],
      createdBy: deptStaff._id,
      updatedBy: deptStaff._id
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const invoice = await Invoice.findOneAndUpdate(
    { invoiceNumber: "INV-2026-000001" },
    {
      invoiceNumber: "INV-2026-000001",
      student: student._id,
      studentId: student.studentId,
      studentName: student.fullName,
      departmentId: student.department,
      semesterName: "Semester 1",
      academicYear: "2026/2027",
      dueDate: fee.dueDate,
      subtotal: 45000,
      totalAmount: 45000,
      paidAmount: 20000,
      status: "partial",
      lines: [{ description: fee.description, amount: 45000, feeRecord: fee._id }],
      generatedBy: finance._id
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const payment = await Payment.findOneAndUpdate(
    { paymentNumber: "PAY-2026-000001" },
    {
      paymentNumber: "PAY-2026-000001",
      student: student._id,
      studentId: student.studentId,
      studentName: student.fullName,
      departmentId: student.department,
      feeRecord: fee._id,
      invoice: invoice._id,
      amount: 20000,
      method: "Cash",
      status: "validated",
      receivedBy: finance._id,
      transactionLogs: [{ status: "validated", message: "Seed payment" }]
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Receipt.findOneAndUpdate(
    { receiptNumber: "REC-2026-000001" },
    {
      receiptNumber: "REC-2026-000001",
      payment: payment._id,
      student: student._id,
      studentId: student.studentId,
      studentName: student.fullName,
      departmentId: student.department,
      amount: payment.amount,
      qrVerificationCode: "seed-receipt-verification-code"
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log("Part-time fee seed data ready.");
  console.log("Sample logins use password: Password@123");
  console.log("finance@atijaffna.edu.lk, it.staff@atijaffna.edu.lk, pt.student@atijaffna.edu.lk");
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
