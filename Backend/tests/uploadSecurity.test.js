import assert from "node:assert/strict";
import test from "node:test";
import { safeUploadName } from "../middleware/upload.js";

test("safeUploadName strips unsafe filename characters and keeps extension", () => {
  assert.equal(safeUploadName("../../my assignment<script>.pdf"), "my-assignment-script.pdf");
});

test("safeUploadName falls back to upload when filename is empty after sanitization", () => {
  assert.equal(safeUploadName("????.txt"), "upload.txt");
});
