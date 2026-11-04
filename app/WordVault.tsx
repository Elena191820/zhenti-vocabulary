"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isDue, scheduleWord } from "../lib/scheduler";
import { loadData, mergeRows, normalizeBackup, parseTsv, saveData } from "../lib/storage";
import type { AppData, Context, ImportRow, Rating, WordEntry } from "../lib/types";

type Page = "home" | "word" | "context" | "import" | "library" | "data";
const EMPTY: AppData = { version: 2, globalPosition: 0, words: [] };
const TSV_SAMPLE = `word\tmeaning\texample\ttranslation\tsource\nresilient\t有韧性的；能复原的\tA resilient system can adapt to unexpected pressure.\t一个有韧性的系统能够适应意外压力。\t2024 · Text 1`;

function formatDate(value: string) {
  if (value.startsWith("9999")) return "已移出";
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function replaceWord(sentence: string, word: string) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return sentence.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "________");
}

export default function WordVault() {
  const [data, setData] = useState<AppData>(EMPTY);
  const [page, setPage] = useState<Page>("home");
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => { loadData().then((value) => { setData(value); setReady(true); }); }, []);
  useEffect(() => { if (ready) saveData(data); }, [data, ready]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 2600); return () => clearTimeout(timer); }, [toast]);

  const stats = useMemo(() => ({
    total: data.words.length,
    due: data.words.filter((word) => isDue(word, data.globalPosition)).length,
    mastered: data.words.filter((word) => word.status === "mastered").length,
    today: data.words.flatMap((word) => [...word.wordHistory, ...word.contextHistory]).filter((item) => item.at.slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
  }), [data]);

  function updateWord(next: WordEntry) {
    setData((current) => ({ ...current, words: current.words.map((word) => word.id === next.id ? next : word) }));
  }

  if (!ready) return <div className="loading">正在打开你的词库…</div>;

  return (
    <div className="shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setPage("home")}><span className="brand-mark">真</span><span><b>真题词库</b><small>英语二 · 个人词库</small></span></button>
        <nav>
          <Nav active={page === "home"} icon="⌂" label="今日" onClick={() => setPage("home")} />
          <Nav active={page === "import"} icon="＋" label="导入" onClick={() => setPage("import")} />
          <Nav active={page === "library"} icon="▤" label="词库" onClick={() => setPage("library")} />
          <Nav active={page === "data"} icon="↥" label="数据" onClick={() => setPage("data")} />
        </nav>
        <div className="sidebar-foot"><span>{stats.total}</span> 个词，数据仅保存在此设备</div>
      </aside>

      <main>
        {page === "home" && <Home stats={stats} onPage={setPage} />}
        {page === "word" && <WordMode data={data} setData={setData} onBack={() => setPage("home")} />}
        {page === "context" && <ContextMode data={data} setData={setData} onBack={() => setPage("home")} />}
        {page === "import" && <ImportPage data={data} setData={setData} notify={setToast} />}
        {page === "library" && <Library data={data} updateWord={updateWord} setData={setData} notify={setToast} />}
        {page === "data" && <DataPage data={data} setData={setData} notify={setToast} />}
      </main>

      <nav className="mobile-nav">
        <Nav active={page === "home"} icon="⌂" label="今日" onClick={() => setPage("home")} />
        <Nav active={page === "import"} icon="＋" label="导入" onClick={() => setPage("import")} />
        <Nav active={page === "library"} icon="▤" label="词库" onClick={() => setPage("library")} />
        <Nav active={page === "data"} icon="↥" label="数据" onClick={() => setPage("data")} />
      </nav>
      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}

function Nav({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return <button className={active ? "nav-active" : ""} onClick={onClick}><span>{icon}</span>{label}</button>;
}

function Home({ stats, onPage }: { stats: { total: number; due: number; mastered: number; today: number }; onPage: (page: Page) => void }) {
  const today = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date());
  return <div className="page home-page">
    <header className="page-header"><div><p className="eyebrow">{today}</p><h1>今天，继续走进真题。</h1><p>先回顾到期词汇，再用原句检验真正的掌握。</p></div><button className="ghost" onClick={() => onPage("import")}>＋ 导入新词</button></header>
    <section className="stats-grid">
      <article><span className="stat-icon lavender">✓</span><div><small>今日已练</small><strong>{stats.today}</strong></div><em>张卡片</em></article>
      <article><span className="stat-icon peach">◷</span><div><small>当前到期</small><strong>{stats.due}</strong></div><em>优先复习</em></article>
      <article><span className="stat-icon mint">◇</span><div><small>总词汇量</small><strong>{stats.total}</strong></div><em>{stats.mastered} 个已熟记</em></article>
    </section>
    <section className="mode-grid">
      <button className="mode-card word-mode" onClick={() => onPage("word")}>
        <span className="mode-label">WORD MODE</span><div className="mode-art">Aa</div><div><h2>单词模式</h2><p>单词 → 原句 → 释义，三步建立稳固记忆。</p><b>{stats.due ? `${stats.due} 个单词已到期` : "开始学习新增单词"} <span>→</span></b></div>
      </button>
      <button className="mode-card context-mode" onClick={() => onPage("context")}>
        <span className="mode-label">CONTEXT MODE</span><div className="mode-art">“ ”</div><div><h2>语境模式</h2><p>在真题原句中填空，确认你能真正用语境唤起单词。</p><b>开始语境巩固 <span>→</span></b></div>
      </button>
    </section>
    <section className="tip"><span>✦</span><div><b>复习节奏由你的反馈决定</b><p>“模糊”会很快再出现；“认识”会逐步拉长间隔；只有你主动选择“熟记”，单词才会离开日常队列。</p></div></section>
  </div>;
}

function StudyHeader({ title, subtitle, progress, onBack }: { title: string; subtitle: string; progress: string; onBack: () => void }) {
  return <header className="study-head"><button className="back" onClick={onBack}>←</button><div><h1>{title}</h1><p>{subtitle}</p></div><span>{progress}</span></header>;
}

function WordMode({ data, setData, onBack }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; onBack: () => void }) {
  const [stage, setStage] = useState(1);
  const [contextIndex, setContextIndex] = useState(0);
  const due = data.words.filter((word) => isDue(word, data.globalPosition));
  const newWords = data.words.filter((word) => word.status === "new" && !due.includes(word));
  const candidates = due.length ? due : newWords;
  const word = candidates[0];
  const context = word?.contexts[contextIndex % Math.max(word.contexts.length, 1)];

  function rate(rating: "fuzzy" | "known" | "mastered") {
    if (!word) return;
    const nextPosition = data.globalPosition + 1;
    const updated = scheduleWord(word, rating, nextPosition);
    setData((current) => ({ ...current, globalPosition: nextPosition, words: current.words.map((item) => item.id === word.id ? updated : item) }));
    setStage(1); setContextIndex((value) => value + 1);
  }

  return <div className="page study-page">
    <StudyHeader title="单词模式" subtitle="点击卡片，逐层揭示答案" progress={word ? `${due.length} 个到期` : "本轮完成"} onBack={onBack} />
    {word ? <>
      <div className={`study-card stage-${stage}`} role="button" tabIndex={0} onClick={() => setStage((value) => Math.min(3, value + 1))} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setStage((value) => Math.min(3, value + 1)); }}>
        <div className="card-top"><span>{stage === 1 ? "先回忆词义" : stage === 2 ? "读一读真题原句" : "核对完整答案"}</span><em>{context?.source}</em></div>
        <div className="word-display"><h2>{word.word}</h2>{stage === 1 && <p className="phonetic">点击查看真题原句</p>}</div>
        {stage >= 2 && <div className="sentence"><p>{context?.example}</p>{stage === 2 && <small>再点一次，查看释义与翻译</small>}</div>}
        {stage >= 3 && <div className="answer"><strong>{word.meaning}</strong><p>{context?.translation}</p></div>}
        <div className="stage-dots"><i className="done" /><i className={stage >= 2 ? "done" : ""} /><i className={stage >= 3 ? "done" : ""} /></div>
      </div>
      {stage === 3 ? <div className="rating-row"><button className="rate fuzzy" onClick={() => rate("fuzzy")}><span>↺</span><b>模糊</b><small>很快再来</small></button><button className="rate known" onClick={() => rate("known")}><span>✓</span><b>认识</b><small>拉长间隔</small></button><button className="rate mastered" onClick={() => rate("mastered")}><span>✦</span><b>熟记</b><small>移出队列</small></button></div> : <p className="tap-hint">点击卡片继续</p>}
    </> : <Empty title="这一轮完成了" text="目前没有到期或新增单词。时间兜底会确保词库较小时，旧词也会在之后重新出现。" action="返回今日" onClick={onBack} />}
  </div>;
}

function ContextMode({ data, setData, onBack }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; onBack: () => void }) {
  const [includeLearning, setIncludeLearning] = useState(true);
  const [includeMastered, setIncludeMastered] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [cursor, setCursor] = useState(() => Math.floor(Math.random() * Math.max(data.words.length, 1)));
  const candidates = data.words.filter((word) => !completed.includes(word.id) && ((includeLearning && word.status === "learning") || (includeMastered && word.status === "mastered")) && word.contexts.length);
  const word = candidates[cursor % Math.max(candidates.length, 1)];
  const context = word?.contexts[0];

  function rate(rating: Extract<Rating, "fuzzy" | "wrong" | "known">) {
    if (!word) return;
    const now = new Date().toISOString();
    const streak = rating === "known" ? word.contextStreak + 1 : 0;
    const updated: WordEntry = { ...word, contextStreak: streak, updatedAt: now, contextHistory: [...word.contextHistory, { id: crypto.randomUUID(), mode: "context", rating, at: now }] };
    setData((current) => ({ ...current, words: current.words.map((item) => item.id === word.id ? updated : item) }));
    if (word.status === "mastered" || streak >= 3) setCompleted((items) => [...items, word.id]);
    setCursor((value) => value + 1);
    setRevealed(false);
  }

  return <div className="page study-page">
    <StudyHeader title="语境模式" subtitle="从真题原句中唤起单词" progress={`${completed.length} 已练`} onBack={onBack} />
    <div className="source-picker"><span>抽取范围</span><label><input type="checkbox" checked={includeLearning} onChange={(event) => { setIncludeLearning(event.target.checked); setCompleted([]); }} /> 认识词库</label><label><input type="checkbox" checked={includeMastered} onChange={(event) => { setIncludeMastered(event.target.checked); setCompleted([]); }} /> 熟记词库</label></div>
    {!includeLearning && !includeMastered ? <Empty title="请选择抽取范围" text="可选择认识词库、熟记词库，或同时选择。" /> : word ? <>
      <div className="context-card"><div className="card-top"><span>补全空缺单词</span><em>{context?.source}</em></div><p className="cloze">{replaceWord(context?.example ?? "", word.word)}</p><div className="meaning-hint"><small>中文提示</small><strong>{word.meaning}</strong></div>{revealed && <div className="context-answer"><small>答案</small><h2>{word.word}</h2><p>{context?.example}</p><p className="translation">{context?.translation}</p></div>}</div>
      {!revealed ? <button className="primary wide" onClick={() => setRevealed(true)}>查看答案</button> : <div className="context-ratings"><button onClick={() => rate("wrong")}>答错</button><button onClick={() => rate("fuzzy")}>模糊</button><button className="primary" onClick={() => rate("known")}>答对 · 连续 {word.contextStreak + 1}/3</button></div>}
    </> : <Empty title="本轮语境练习完成" text="认识词连续答对 3 次会完成巩固；熟记词的随机抽查不会改变熟记状态。刷新或下次进入即可开启新一轮。" action="返回今日" onClick={onBack} />}
  </div>;
}

function ImportPage({ data, setData, notify }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; notify: (text: string) => void }) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const valid = rows.filter((row) => !row.error);
  const duplicateWords = valid.filter((row, index) => valid.findIndex((item) => item.word.toLowerCase() === row.word.toLowerCase()) !== index).length;
  function preview() { setRows(parseTsv(text)); }
  function commit() { setData((current) => mergeRows(current, valid)); notify(`已导入 ${valid.length} 条语境，原有进度已保留`); setText(""); setRows([]); }
  return <div className="page"><header className="page-header"><div><p className="eyebrow">批量导入</p><h1>把精读成果带进词库</h1><p>粘贴 TSV 文本。重复单词会合并语境，不会覆盖原有复习进度。</p></div></header>
    <section className="panel import-panel"><div className="panel-title"><div><h2>粘贴数据</h2><p>列顺序：word、meaning、example、translation、source；首行表头可选。</p></div><button className="text-btn" onClick={() => setText(TSV_SAMPLE)}>填入示例</button></div><textarea value={text} onChange={(event) => { setText(event.target.value); setRows([]); }} placeholder={TSV_SAMPLE} /><div className="import-actions"><span>{text ? `${text.split(/\r?\n/).filter(Boolean).length} 行待检查` : "等待粘贴"}</span><button className="primary" disabled={!text.trim()} onClick={preview}>检查并预览</button></div></section>
    {rows.length > 0 && <section className="panel preview"><div className="panel-title"><div><h2>导入预览</h2><p><b>{valid.length}</b> 条可导入 · <b>{rows.length - valid.length}</b> 条有误 · <b>{duplicateWords}</b> 个重复单词将合并</p></div><button className="primary" disabled={!valid.length} onClick={commit}>确认导入</button></div><div className="table-wrap"><table><thead><tr><th>状态</th><th>单词 / 释义</th><th>真题原句</th><th>来源</th></tr></thead><tbody>{rows.map((row) => <tr key={row.line} className={row.error ? "row-error" : ""}><td><span className={row.error ? "pill error" : "pill ok"}>{row.error || "可导入"}</span></td><td><b>{row.word || "—"}</b><small>{row.meaning}</small></td><td>{row.example || "—"}</td><td>{row.source || "—"}</td></tr>)}</tbody></table></div></section>}
  </div>;
}

function Library({ data, updateWord, setData, notify }: { data: AppData; updateWord: (word: WordEntry) => void; setData: React.Dispatch<React.SetStateAction<AppData>>; notify: (text: string) => void }) {
  const [query, setQuery] = useState(""); const [year, setYear] = useState("全部"); const [source, setSource] = useState("全部"); const [status, setStatus] = useState("全部"); const [editing, setEditing] = useState<WordEntry | null>(null);
  const years = Array.from(new Set(data.words.flatMap((word) => word.contexts.map((ctx) => ctx.source.match(/20\d{2}/)?.[0]).filter(Boolean) as string[]))).sort().reverse();
  const sources = Array.from(new Set(data.words.flatMap((word) => word.contexts.map((ctx) => ctx.source)))).sort();
  const filtered = data.words.filter((word) => (word.word.toLowerCase().includes(query.toLowerCase()) || word.meaning.includes(query)) && (year === "全部" || word.contexts.some((ctx) => ctx.source.includes(year))) && (source === "全部" || word.contexts.some((ctx) => ctx.source === source)) && (status === "全部" || word.status === status));
  function remove(word: WordEntry) { if (!confirm(`删除“${word.word}”及其全部学习记录？`)) return; setData((current) => ({ ...current, words: current.words.filter((item) => item.id !== word.id) })); notify("已删除单词"); }
  return <div className="page"><header className="page-header"><div><p className="eyebrow">词库管理</p><h1>全部词汇</h1><p>共 {data.words.length} 个单词，{data.words.reduce((sum, word) => sum + word.contexts.length, 0)} 条真题语境。</p></div></header>
    <section className="filters"><input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索单词或释义…" /><select value={year} onChange={(event) => setYear(event.target.value)}><option>全部</option>{years.map((item) => <option key={item}>{item}</option>)}</select><select value={source} onChange={(event) => setSource(event.target.value)}><option>全部</option>{sources.map((item) => <option key={item}>{item}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="全部">全部状态</option><option value="new">新增</option><option value="learning">认识词库</option><option value="mastered">熟记词库</option></select></section>
    <div className="word-list">{filtered.map((word) => <article key={word.id}><div className="word-main"><div><h2>{word.word}</h2><p>{word.meaning}</p></div><span className={`status ${word.status}`}>{word.status === "new" ? "新增" : word.status === "learning" ? `认识 · ${word.wordStreak}` : "熟记"}</span></div><div className="example-preview"><p>{word.contexts[0]?.example}</p><small>{word.contexts.length} 条语境 · {word.contexts.map((ctx) => ctx.source).join("、")}</small></div><div className="word-actions"><span>{word.status === "mastered" ? "已移出单词队列" : `下次：位置 ${word.nextReviewPosition} / ${formatDate(word.fallbackDueAt)}`}</span>{word.status === "mastered" && <button onClick={() => updateWord({ ...word, status: "learning", nextReviewPosition: data.globalPosition, fallbackDueAt: new Date().toISOString() })}>重新加入</button>}<button onClick={() => setEditing(structuredClone(word))}>编辑</button><button className="danger" onClick={() => remove(word)}>删除</button></div></article>)}{!filtered.length && <Empty title="没有找到匹配词汇" text="调整搜索词或筛选条件后再试。" />}</div>
    {editing && <EditModal word={editing} onCancel={() => setEditing(null)} onSave={(word) => { updateWord({ ...word, updatedAt: new Date().toISOString() }); setEditing(null); notify("修改已保存"); }} />}
  </div>;
}

function EditModal({ word, onCancel, onSave }: { word: WordEntry; onCancel: () => void; onSave: (word: WordEntry) => void }) {
  const [draft, setDraft] = useState(word);
  function updateContext(index: number, field: keyof Context, value: string) { setDraft((current) => ({ ...current, contexts: current.contexts.map((ctx, i) => i === index ? { ...ctx, [field]: value } : ctx) })); }
  return <div className="modal-backdrop"><div className="modal"><div className="panel-title"><div><h2>编辑单词</h2><p>修改内容不会清除学习记录。</p></div><button className="close" onClick={onCancel}>×</button></div><label>英文单词<input value={draft.word} onChange={(event) => setDraft({ ...draft, word: event.target.value })} /></label><label>中文释义<input value={draft.meaning} onChange={(event) => setDraft({ ...draft, meaning: event.target.value })} /></label><h3>真题语境</h3>{draft.contexts.map((ctx, index) => <div className="context-editor" key={ctx.id}><label>英文原句<textarea value={ctx.example} onChange={(event) => updateContext(index, "example", event.target.value)} /></label><label>中文翻译<textarea value={ctx.translation} onChange={(event) => updateContext(index, "translation", event.target.value)} /></label><label>来源<input value={ctx.source} onChange={(event) => updateContext(index, "source", event.target.value)} /></label>{draft.contexts.length > 1 && <button className="danger" onClick={() => setDraft({ ...draft, contexts: draft.contexts.filter((_, i) => i !== index) })}>移除此语境</button>}</div>)}<div className="modal-actions"><button onClick={onCancel}>取消</button><button className="primary" disabled={!draft.word.trim() || !draft.meaning.trim() || !draft.contexts.length} onClick={() => onSave(draft)}>保存修改</button></div></div></div>;
}

function DataPage({ data, setData, notify }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; notify: (text: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  function exportJson() { const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `真题词库备份-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); }
  async function restore(file?: File) { if (!file) return; try { const incoming = normalizeBackup(JSON.parse(await file.text())); if (!confirm(`恢复备份将使用文件中的 ${incoming.words.length} 个单词替换当前词库，继续吗？`)) return; setData(incoming); notify("备份恢复成功"); } catch (error) { alert(error instanceof Error ? error.message : "无法读取备份"); } if (fileRef.current) fileRef.current.value = ""; }
  return <div className="page"><header className="page-header"><div><p className="eyebrow">数据管理</p><h1>备份你的学习记录</h1><p>词库默认保存在当前浏览器。定期导出 JSON，可迁移到其他设备或避免误删。</p></div></header><div className="data-grid"><section className="panel data-card"><span>↓</span><h2>导出完整备份</h2><p>包含词汇、全部语境、两个模式的连续次数与练习历史。</p><button className="primary" onClick={exportJson}>导出 JSON</button></section><section className="panel data-card"><span>↑</span><h2>从备份恢复</h2><p>恢复前会先确认。请选择由本应用导出的 JSON 文件。</p><input ref={fileRef} type="file" accept="application/json,.json" onChange={(event) => restore(event.target.files?.[0])} /></section></div><section className="panel privacy"><b>本地保存说明</b><p>数据使用 IndexedDB 保存在此浏览器中，不会上传到服务器。清除浏览器站点数据可能导致丢失，请保留一份近期备份。</p></section></div>;
}

function Empty({ title, text, action, onClick }: { title: string; text: string; action?: string; onClick?: () => void }) { return <div className="empty"><span>✦</span><h2>{title}</h2><p>{text}</p>{action && <button className="primary" onClick={onClick}>{action}</button>}</div>; }
