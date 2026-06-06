import type { SubtitleItem } from "../types";

/** 时间戳格式化为 [HH:MM:SS] */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `[${h}:${m}:${s}]`;
}

/** 生成含时间戳的文件名 */
function generateFilename(ext: string): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  return `AI同传字幕_${date}_${time}.${ext}`;
}

/** 触发浏览器下载 */
function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 导出为 TXT 格式 */
export function exportAsTxt(items: SubtitleItem[]): void {
  const lines = items.map((item) => {
    const prefix = item.marked ? "⭐ " : "";
    const time = formatTime(item.timestamp);
    const src = item.sourceText;
    const tgt = item.translatedText || "(翻译中)";
    return `${prefix}${time} ${src}\n    → ${tgt}`;
  });
  const content = lines.join("\n\n");
  triggerDownload(content, generateFilename("txt"), "text/plain");
}

/** 导出为 Markdown 格式 */
export function exportAsMarkdown(items: SubtitleItem[]): void {
  const lines: string[] = [
    "# AI 同声传译字幕",
    "",
    "| 时间 | 原文 | 译文 |",
    "|------|------|------|",
  ];

  for (const item of items) {
    const time = formatTime(item.timestamp);
    const src = item.marked ? `**⭐ ${item.sourceText}**` : item.sourceText;
    const tgt = item.translatedText || "(翻译中)";
    lines.push(`| ${time} | ${src} | ${tgt} |`);
  }

  const content = lines.join("\n");
  triggerDownload(content, generateFilename("md"), "text/markdown");
}

/** 导出为 JSON 格式 */
export function exportAsJson(items: SubtitleItem[]): void {
  const content = JSON.stringify(items, null, 2);
  triggerDownload(content, generateFilename("json"), "application/json");
}

export type ExportFormat = "txt" | "md" | "json";
