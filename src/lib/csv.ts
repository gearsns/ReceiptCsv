import type { Receipt } from "../types";

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCsvCell).join(",");
}

const ITEM_HEADER = ["店舗", "日付", "商品名", "数量", "単価", "金額"];

export function receiptToCSV(receipt: Receipt): string {
  const lines: string[] = [toRow(ITEM_HEADER)];
  for (const item of receipt.items) {
    lines.push(
      toRow([
        receipt.storeName,
        receipt.date,
        item.name,
        item.quantity,
        item.unitPrice,
        item.amount
      ])
    );
  }
  lines.push("");
  if (receipt.subtotal !== null) lines.push(toRow(["", "", "小計", "", "", receipt.subtotal]));
  if (receipt.tax !== null) lines.push(toRow(["", "", "消費税", "", "", receipt.tax]));
  if (receipt.total !== null) lines.push(toRow(["", "", "合計", "", "", receipt.total]));
  return lines.join("\r\n");
}

export function receiptsToCombinedCSV(receipts: Receipt[]): string {
  const lines: string[] = [toRow(ITEM_HEADER)];
  for (const receipt of receipts) {
    for (const item of receipt.items) {
      lines.push(
        toRow([
          receipt.storeName,
          receipt.date,
          item.name,
          item.quantity,
          item.unitPrice,
          item.amount
        ])
      );
    }
  }
  return lines.join("\r\n");
}

/** Excel (including on iOS/Mac) needs a UTF-8 BOM to display Japanese text correctly. */
const UTF8_BOM = "\uFEFF";

function csvFileName(base: string): string {
  return `${base.replace(/[\\/:*?"<>|]/g, "_")}.csv`;
}

function csvFile(csv: string, filenameBase: string): { file: File; filename: string } {
  const filename = csvFileName(filenameBase);
  const blob = new Blob([UTF8_BOM + csv], { type: "text/csv;charset=utf-8" });
  return { file: new File([blob], filename, { type: "text/csv" }), filename };
}

/**
 * Saves the CSV straight to disk via a plain anchor download — no share sheet
 * in the way. In iOS Safari this drops the file into "ダウンロード" in the
 * Files app (or wherever the user has Safari configured to save downloads).
 */
export function downloadCsv(csv: string, filenameBase: string): void {
  const { file, filename } = csvFile(csv, filenameBase);
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Opens the native share sheet so the CSV can be saved to a specific app or
 * location (Files, Drive, AirDrop, Slack, etc). Returns true if the share
 * sheet was available and used, false if this browser doesn't support
 * sharing files — callers should fall back to downloadCsv() in that case.
 */
export async function shareCsv(csv: string, filenameBase: string): Promise<boolean> {
  const { file, filename } = csvFile(csv, filenameBase);

  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
    share?: (data: { files?: File[]; title?: string }) => Promise<void>;
  };

  if (!nav.canShare || !nav.share || !nav.canShare({ files: [file] })) {
    return false;
  }

    try {
      await nav.share({ files: [file], title: filename });
    return true;
  } catch (err) {
    // AbortError means the user cancelled the sheet on purpose — treat as handled.
    if (err instanceof DOMException && err.name === "AbortError") return true;
    return false;
    }
}
