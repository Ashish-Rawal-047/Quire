// Run with: npm test  (Node's built-in test runner; TypeScript types are stripped by Node).
// Status wording rules for the design system's status table.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ORDER_STATUS, SIMULATED_NOTICE, statusCopy } from "../src/lib/status.ts";

const PHYSICAL_CLAIMS =
  /ready for (pickup|collection)|ready to collect|collect your|being printed|pages are printed|prints are ready|show (this|it|your pickup code) at the counter|\bcollected\b/i;
const AFTER_PRINTING = ["printing", "ready", "completed", "uncollected"];
const STATUSES = Object.keys(ORDER_STATUS);

test("simulated orders never claim paper exists or can be collected", () => {
  for (const status of STATUSES) {
    const c = statusCopy(status, "simulated");
    const words = `${c.shopLabel} ${c.customerLabel} ${c.customerHint}`;
    assert.doesNotMatch(words, PHYSICAL_CLAIMS, `${status}: ${words}`);
    if (AFTER_PRINTING.includes(status)) {
      assert.ok(c.customerHint.includes(SIMULATED_NOTICE), `${status} hint lacks the notice`);
      assert.match(c.shopLabel, /simulated/i, `${status} shop label`);
    }
  }
});

test("physical orders never mention simulation", () => {
  for (const status of STATUSES) {
    const c = statusCopy(status, "physical");
    assert.doesNotMatch(`${c.shopLabel} ${c.customerLabel} ${c.customerHint}`, /simulat/i);
  }
});

test("corrected retention and refund wording", () => {
  assert.equal(statusCopy("completed", "physical").customerHint, "Collected. Your files will be deleted within an hour.");
  assert.match(statusCopy("cancelled", "physical").customerHint, /will be refunded to your original payment method/);
  assert.doesNotMatch(statusCopy("printing", "physical").customerHint, /being printed/);
});
