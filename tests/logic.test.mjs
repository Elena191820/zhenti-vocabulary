import assert from "node:assert/strict";
import test from "node:test";
import { parseTsv, mergeRows } from "../lib/storage.ts";
import { REVIEW_INTERVALS, scheduleWord } from "../lib/scheduler.ts";

const base = { id:"w1", word:"shift", meaning:"转变", contexts:[], status:"learning", wordStreak:0, nextReviewPosition:0, fallbackDueAt:"2020-01-01T00:00:00.000Z", contextStreak:0, wordHistory:[], contextHistory:[], createdAt:"2020-01-01T00:00:00.000Z", updatedAt:"2020-01-01T00:00:00.000Z" };

test("parses TSV headers in any order and reports incomplete rows", () => {
  const rows = parseTsv("source\tword\ttranslation\tmeaning\texample\n2024 Text 1\tshift\t转变发生了。\t转变\tThe shift happened.\nbad\trow");
  assert.equal(rows[0].word, "shift");
  assert.equal(rows[0].source, "2024 Text 1");
  assert.equal(rows[1].error, "字段不足 5 列");
});

test("merges duplicate words without replacing progress", () => {
  const data = { version:2, globalPosition:88, words:[{ ...base, wordStreak:3 }] };
  const rows = parseTsv("word\tmeaning\texample\ttranslation\tsource\nshift\t变化\tA second shift followed.\t随后发生了第二次变化。\t2023 Text 2");
  const merged = mergeRows(data, rows);
  assert.equal(merged.words.length, 1);
  assert.equal(merged.words[0].wordStreak, 3);
  assert.equal(merged.words[0].contexts.length, 1);
});

test("uses configurable card intervals and resets streak on fuzzy", () => {
  const known = scheduleWord(base, "known", 10, 0);
  assert.equal(known.nextReviewPosition, 10 + REVIEW_INTERVALS[0]);
  assert.equal(known.wordStreak, 1);
  const fuzzy = scheduleWord({ ...known, wordStreak:4 }, "fuzzy", 20, 0);
  assert.equal(fuzzy.wordStreak, 0);
  assert.equal(fuzzy.nextReviewPosition, 25);
});
