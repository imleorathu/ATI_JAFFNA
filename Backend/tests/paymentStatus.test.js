import assert from "node:assert/strict";
import test from "node:test";
import { calculateStudentPaymentStatus } from "../services/paymentStatusService.js";

test("full payment marks part-time student as paid", () => {
  const status = calculateStudentPaymentStatus("Part-time", [
    {
      totalAmount: 50000,
      paidAmount: 50000,
      lateFeeAmount: 0,
      discountAmount: 0
    }
  ]);

  assert.equal(status, "paid");
});

test("partial payment marks part-time student as partial", () => {
  const status = calculateStudentPaymentStatus("Part-time", [
    {
      totalAmount: 50000,
      paidAmount: 10000,
      lateFeeAmount: 0,
      discountAmount: 0
    }
  ]);

  assert.equal(status, "partial");
});

test("part-time student without payments remains pending", () => {
  const status = calculateStudentPaymentStatus("Part-time", [
    {
      totalAmount: 50000,
      paidAmount: 0,
      lateFeeAmount: 0,
      discountAmount: 0
    }
  ]);

  assert.equal(status, "pending");
});

test("multiple payments across fee records mark student as paid when totals are covered", () => {
  const status = calculateStudentPaymentStatus("Part-time", [
    {
      totalAmount: 20000,
      paidAmount: 20000,
      lateFeeAmount: 0,
      discountAmount: 0
    },
    {
      totalAmount: 30000,
      paidAmount: 30000,
      lateFeeAmount: 0,
      discountAmount: 0
    }
  ]);

  assert.equal(status, "paid");
});

test("refund recalculation can move paid student back to partial", () => {
  const status = calculateStudentPaymentStatus("Part-time", [
    {
      totalAmount: 50000,
      paidAmount: 35000,
      lateFeeAmount: 0,
      discountAmount: 0
    }
  ]);

  assert.equal(status, "partial");
});

test("full-time student payment status remains not required", () => {
  const status = calculateStudentPaymentStatus("Full-time", [
    {
      totalAmount: 50000,
      paidAmount: 50000,
      lateFeeAmount: 0,
      discountAmount: 0
    }
  ]);

  assert.equal(status, "not_required");
});
