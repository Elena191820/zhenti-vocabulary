import type { Rating, WordEntry } from "./types";

export const REVIEW_INTERVALS = [30, 80, 150, 300, 500] as const;
export const FUZZY_INTERVAL = 5;
export const FALLBACK_DELAYS_MS = [
  30 * 60 * 1000,
  12 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
  2 * 24 * 60 * 60 * 1000,
  4 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
] as const;

export function scheduleWord(
  word: WordEntry,
  rating: Extract<Rating, "fuzzy" | "known" | "mastered">,
  position: number,
  now = Date.now(),
): WordEntry {
  const record = {
    id: crypto.randomUUID(),
    mode: "word" as const,
    rating,
    at: new Date(now).toISOString(),
  };
  if (rating === "mastered") {
    return {
      ...word,
      status: "mastered",
      nextReviewPosition: Number.MAX_SAFE_INTEGER,
      fallbackDueAt: "9999-12-31T23:59:59.999Z",
      wordHistory: [...word.wordHistory, record],
      updatedAt: record.at,
    };
  }
  if (rating === "fuzzy") {
    return {
      ...word,
      status: "learning",
      wordStreak: 0,
      nextReviewPosition: position + FUZZY_INTERVAL,
      fallbackDueAt: new Date(now + FALLBACK_DELAYS_MS[0]).toISOString(),
      wordHistory: [...word.wordHistory, record],
      updatedAt: record.at,
    };
  }
  const streak = word.wordStreak + 1;
  const interval = REVIEW_INTERVALS[Math.min(streak - 1, REVIEW_INTERVALS.length - 1)];
  const fallback = FALLBACK_DELAYS_MS[Math.min(streak, FALLBACK_DELAYS_MS.length - 1)];
  return {
    ...word,
    status: "learning",
    wordStreak: streak,
    nextReviewPosition: position + interval,
    fallbackDueAt: new Date(now + fallback).toISOString(),
    wordHistory: [...word.wordHistory, record],
    updatedAt: record.at,
  };
}

export function isDue(word: WordEntry, position: number, now = Date.now()) {
  return (
    word.status !== "mastered" &&
    (word.nextReviewPosition <= position || new Date(word.fallbackDueAt).getTime() <= now)
  );
}
