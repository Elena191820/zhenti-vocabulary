import type { AppData, Context, ImportRow, WordEntry } from "./types";

const DB_NAME = "zhenti-vocabulary";
const STORE = "app";
const KEY = "data";

const seedRows: ImportRow[] = [
  { word: "perspective", meaning: "观点；视角", example: "This perspective helps explain why consumers resist sudden changes.", translation: "这一视角有助于解释消费者为何抵触突然的变化。", source: "2023 · Text 2", line: 1 },
  { word: "sustainable", meaning: "可持续的", example: "A sustainable solution must work for both businesses and the public.", translation: "可持续的解决方案必须同时适用于企业和公众。", source: "2022 · Text 1", line: 2 },
  { word: "constraint", meaning: "限制；约束", example: "Time is not the only constraint on thoughtful decision-making.", translation: "时间并不是审慎决策的唯一限制因素。", source: "2021 · Text 3", line: 3 },
  { word: "perspective", meaning: "观点；视角", example: "From a historical perspective, the shift is less surprising.", translation: "从历史视角看，这一转变就没那么令人惊讶。", source: "2020 · Text 4", line: 4 },
];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadData(): Promise<AppData> {
  const db = await openDb();
  const data = await new Promise<AppData | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  if (data) return data;
  const initial = mergeRows({ version: 2, globalPosition: 0, words: [] }, seedRows);
  await saveData(initial);
  return initial;
}

export async function saveData(data: AppData) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(data, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export function parseTsv(text: string): ImportRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const first = lines[0].split("\t").map((cell) => cell.trim().toLowerCase());
  const expected = ["word", "meaning", "example", "translation", "source"];
  const hasHeader = expected.every((name) => first.includes(name));
  const indexes = hasHeader ? expected.map((name) => first.indexOf(name)) : [0, 1, 2, 3, 4];
  return lines.slice(hasHeader ? 1 : 0).map((line, index) => {
    const cells = line.split("\t").map((cell) => cell.trim());
    const [word, meaning, example, translation, source] = indexes.map((i) => cells[i] ?? "");
    const row: ImportRow = { word, meaning, example, translation, source, line: index + (hasHeader ? 2 : 1) };
    if (cells.length < 5) row.error = "字段不足 5 列";
    else if (!word || !meaning || !example || !translation || !source) row.error = "存在空字段";
    else if (!/^[A-Za-z][A-Za-z '-]*$/.test(word)) row.error = "单词格式异常";
    return row;
  });
}

export function mergeRows(data: AppData, rows: ImportRow[]): AppData {
  const now = new Date().toISOString();
  const words = data.words.map((word) => ({ ...word, contexts: [...word.contexts] }));
  for (const row of rows.filter((item) => !item.error)) {
    const key = row.word.trim().toLocaleLowerCase();
    const existing = words.find((item) => item.word.toLocaleLowerCase() === key);
    const context: Context = { id: crypto.randomUUID(), example: row.example, translation: row.translation, source: row.source };
    if (existing) {
      if (!existing.contexts.some((item) => item.example.toLocaleLowerCase() === row.example.toLocaleLowerCase() && item.source === row.source)) {
        existing.contexts.push(context);
      }
      if (!existing.meaning.includes(row.meaning)) existing.meaning = `${existing.meaning}；${row.meaning}`;
      existing.updatedAt = now;
    } else {
      const word: WordEntry = {
        id: crypto.randomUUID(), word: row.word.trim(), meaning: row.meaning, contexts: [context],
        status: "new", wordStreak: 0, nextReviewPosition: 0, fallbackDueAt: now,
        contextStreak: 0, wordHistory: [], contextHistory: [], createdAt: now, updatedAt: now,
      };
      words.push(word);
    }
  }
  return { ...data, words };
}

export function normalizeBackup(input: unknown): AppData {
  if (!input || typeof input !== "object") throw new Error("备份文件格式不正确");
  const value = input as Partial<AppData>;
  if (!Array.isArray(value.words)) throw new Error("备份中缺少词汇数据");
  return { version: 2, globalPosition: Number(value.globalPosition) || 0, words: value.words as WordEntry[] };
}
