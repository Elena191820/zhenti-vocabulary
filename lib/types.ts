export type WordStatus = "new" | "learning" | "mastered";
export type PracticeMode = "word" | "context";
export type Rating = "fuzzy" | "known" | "mastered" | "wrong";

export interface Context {
  id: string;
  example: string;
  translation: string;
  source: string;
}

export interface PracticeRecord {
  id: string;
  mode: PracticeMode;
  rating: Rating;
  at: string;
}

export interface WordEntry {
  id: string;
  word: string;
  meaning: string;
  contexts: Context[];
  status: WordStatus;
  wordStreak: number;
  nextReviewPosition: number;
  fallbackDueAt: string;
  contextStreak: number;
  wordHistory: PracticeRecord[];
  contextHistory: PracticeRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  version: 2;
  globalPosition: number;
  words: WordEntry[];
}

export interface ImportRow {
  word: string;
  meaning: string;
  example: string;
  translation: string;
  source: string;
  line: number;
  error?: string;
}
