import type { AppSettings, Receipt } from "../types";

const SETTINGS_KEY = "receipt-csv:settings";
const RECEIPTS_KEY = "receipt-csv:receipts";

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { apiKey: "", model: "" };
    const parsed = JSON.parse(raw);
    return { apiKey: parsed.apiKey ?? "", model: parsed.model ?? "" };
  } catch {
    return { apiKey: "", model: "" };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadReceipts(): Receipt[] {
  try {
    const raw = localStorage.getItem(RECEIPTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReceipts(receipts: Receipt[]): void {
  localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
}
