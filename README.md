# 真题词库

供个人使用的考研英语二真题背词网页。支持 TSV 批量导入、三阶段单词卡片、独立语境练习、按卡片位置调度的间隔重复、IndexedDB 本地保存，以及 JSON 备份恢复。

## 本地启动

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

打开终端显示的本地地址即可。首次打开会自动加入 3 个演示单词（其中一个带两条真题语境）。

## 数据格式

TSV 每行需要 5 列，可带以下表头：

```text
word\tmeaning\texample\ttranslation\tsource
resilient\t有韧性的\tA resilient system can adapt.\t有韧性的系统能够适应。\t2024 · Text 1
```

重复导入同一个单词时，新的原句会合并到已有条目，记忆状态和练习历史保持不变。

## 检查与构建

```bash
npm test
```

此命令会完成生产构建，并检查导入去重、调度逻辑和页面输出。

## 部署

项目使用 React、TypeScript 和 Vite（vinext 构建层），输出为 Cloudflare Worker 兼容格式。最省维护的发布方式是连接 Cloudflare Pages/Workers：

1. 将项目推送到自己的 Git 仓库。
2. 在 Cloudflare 中导入仓库。
3. 构建命令填写 `npm run build`，按平台提示部署 Worker 输出。

也可在支持 Node/Worker 的静态网页平台使用同一构建命令。应用数据始终保存在访问者当前浏览器的 IndexedDB 中，发布不会上传个人词库。

## 调度配置

单词模式的卡片间隔统一放在 `lib/scheduler.ts`：

- `REVIEW_INTERVALS`：连续认识后的 30、80、150、300、500 张卡片间隔。
- `FUZZY_INTERVAL`：选择“模糊”后的高频间隔。
- `FALLBACK_DELAYS_MS`：跨会话时间兜底，避免小词库永远达不到卡片位置。
