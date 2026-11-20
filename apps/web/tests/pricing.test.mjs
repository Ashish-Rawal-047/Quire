// Price calculator for the prototype (src/lib/demo/pricing.ts).
import assert from "node:assert/strict";
import { test } from "node:test";
import { describeSettings, itemPrice, quote, sheetsFor } from "../src/lib/demo/pricing.ts";

const prices = {
  perSide: { A4: { bw: 200, colour: 1000 }, A3: { bw: 400, colour: 2000 }, Legal: { bw: 300, colour: 1200 } },
  staplePerCopy: 200,
};
const s = (over = {}) => ({ colour: "bw", sides: "double", copies: 1, paper: "A4", staple: false, ...over });

test("price is per printed side, times copies", () => {
  assert.equal(itemPrice(12, s({ copies: 2 }), prices), 12 * 2 * 200);
  assert.equal(itemPrice(1, s({ colour: "colour" }), prices), 1000);
  assert.equal(itemPrice(4, s({ paper: "Legal", sides: "single" }), prices), 4 * 300);
  assert.equal(itemPrice(3, s({ paper: "A3", colour: "colour", copies: 2 }), prices), 3 * 2 * 2000);
});

test("double-sided halves the sheets, rounding up", () => {
  assert.equal(sheetsFor(12, { sides: "double", copies: 2 }), 12);
  assert.equal(sheetsFor(5, { sides: "double", copies: 1 }), 3);
  assert.equal(sheetsFor(5, { sides: "single", copies: 3 }), 15);
});

test("quote adds stapling only for multi-page files", () => {
  const q = quote(
    [
      { name: "Report.pdf", pages: 12, settings: s({ copies: 2, staple: true }) },
      { name: "Marksheet.png", pages: 1, settings: s({ colour: "colour", sides: "single", staple: true }) },
    ],
    prices,
  );
  assert.deepEqual(
    q.lines.map((l) => [l.label, l.paise]),
    [
      ["Report.pdf", 4800],
      ["Marksheet.png", 1000],
      ["Stapling", 400],
    ],
  );
  assert.equal(q.totalPaise, 6200);
  assert.equal(q.sheets, 12 + 1);
});

test("duplicate file names get distinct lines", () => {
  const q = quote(
    [
      { name: "a.pdf", pages: 1, settings: s() },
      { name: "a.pdf", pages: 1, settings: s() },
    ],
    prices,
  );
  assert.notEqual(q.lines[0].label, q.lines[1].label);
});

test("settings description is plain and singular-aware", () => {
  assert.equal(describeSettings(1, s({ sides: "double" })), "1 page · B&W · single-sided · A4 · 1 copy");
  assert.equal(describeSettings(12, s({ copies: 2, colour: "colour" })), "12 pages · Colour · double-sided · A4 · 2 copies");
});
