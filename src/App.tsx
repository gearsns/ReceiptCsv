import { createSignal, onMount, createEffect, Show, For, type Component } from "solid-js";
import { createStore, produce } from "solid-js/store";
import type { AppSettings, GeminiReceiptResult, Receipt } from "./types";
import { loadSettings, saveSettings, loadReceipts, saveReceipts } from "./lib/storage";
import { analyzeReceiptImage, GeminiError } from "./lib/gemini";
import { receiptToCSV, receiptsToCombinedCSV, shareCsv, downloadCsv } from "./lib/csv";
import SettingsPanel from "./components/SettingsPanel";
import ReceiptCard from "./components/ReceiptCard";

function makeId(): string {
  if ("randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toReceipt(result: GeminiReceiptResult): Receipt {
  return {
    id: makeId(),
    createdAt: Date.now(),
    storeName: result.store_name ?? "",
    date: result.date ?? "",
    items: (result.items ?? []).map((item) => ({
      id: makeId(),
      name: item.name ?? "",
      quantity: item.quantity ?? 1,
      unitPrice: item.unit_price ?? 0,
      amount: item.amount ?? 0
    })),
    subtotal: result.subtotal ?? null,
    tax: result.tax ?? null,
    total: result.total ?? null,
    note: result.note ?? "",
    status: "done"
  };
}

const App: Component = () => {
  const [settings, setSettings] = createSignal<AppSettings>({ apiKey: "", model: "" });
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [receipts, setReceipts] = createStore<Receipt[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [loadError, setLoadError] = createSignal<string | null>(null);
  let fileInput: HTMLInputElement | undefined;
  let hydrated = false;

  onMount(() => {
    setSettings(loadSettings());
    setReceipts(loadReceipts());
    hydrated = true;
  });

  createEffect(() => {
    if (!hydrated) return;
    saveReceipts([...receipts]);
  });

  const handleFileChosen = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    const { apiKey, model } = settings();
    if (!apiKey.trim() || !model.trim()) {
      setLoadError("先に設定画面でAPIキーとモデル名を入力してください。");
      setSettingsOpen(true);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const result = await analyzeReceiptImage(file, apiKey, model);
      setReceipts(produce((list) => list.unshift(toReceipt(result))));
    } catch (err) {
      const message = err instanceof GeminiError ? err.message : "予期しないエラーが発生しました。";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  };

  const updateReceipt = (id: string, patch: Partial<Receipt>) => {
    setReceipts(
      (r) => r.id === id,
      (r) => ({ ...r, ...patch })
    );
  };

  const updateItem = (
    receiptId: string,
    itemId: string,
    patch: Partial<Receipt["items"][number]>
  ) => {
    setReceipts(
      (r) => r.id === receiptId,
      "items",
      (i) => i.id === itemId,
      (item) => ({ ...item, ...patch })
    );
  };

  const removeItem = (receiptId: string, itemId: string) => {
    setReceipts(
      (r) => r.id === receiptId,
      "items",
      (items) => items.filter((i) => i.id !== itemId)
    );
  };

  const addItem = (receiptId: string) => {
    setReceipts(
      (r) => r.id === receiptId,
      "items",
      produce((items) => {
        items.push({ id: makeId(), name: "", quantity: 1, unitPrice: 0, amount: 0 });
      })
    );
  };

  const deleteReceipt = (id: string) => {
    setReceipts((list) => list.filter((r) => r.id !== id));
  };

  const exportReceiptShare = async (receipt: Receipt) => {
    const csv = receiptToCSV(receipt);
    const label = receipt.storeName || receipt.date || "receipt";
    const shared = await shareCsv(csv, label);
    if (!shared) downloadCsv(csv, label);
  };

  const exportReceiptDownload = (receipt: Receipt) => {
    const csv = receiptToCSV(receipt);
    const label = receipt.storeName || receipt.date || "receipt";
    downloadCsv(csv, label);
  };

  const exportAllShare = async () => {
    const csv = receiptsToCombinedCSV([...receipts]);
    const label = `receipts-${new Date().toISOString().slice(0, 10)}`;
    const shared = await shareCsv(csv, label);
    if (!shared) downloadCsv(csv, label);
  };

  const exportAllDownload = () => {
    const csv = receiptsToCombinedCSV([...receipts]);
    downloadCsv(csv, `receipts-${new Date().toISOString().slice(0, 10)}`);
  };

  const handleSaveSettings = (next: AppSettings) => {
    setSettings(next);
    saveSettings(next);
  };

  return (
    <>
      <header class="app-header">
        <span class="wordmark">
          <span class="stamp-dot" />
          レシート → CSV
        </span>
        <button
          class="icon-button"
          onClick={() => setSettingsOpen(true)}
          aria-label="設定を開く"
        >
          ⚙
        </button>
      </header>

      <main>
        <section class="capture-card">
          <p>
            レシートを撮影するか、写真を選んでください。
            <br />
            Gemini APIが内容を読み取り、明細をCSV用に整えます。
          </p>
          <button
            class="primary-button"
            disabled={loading()}
            onClick={() => fileInput?.click()}
          >
            {loading() ? "解析中…" : "レシートを撮影 / 選択"}
          </button>
          <input
            ref={fileInput}
            class="visually-hidden-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChosen}
          />
        </section>

        <Show when={loading()}>
          <p class="status-banner loading">画像を解析しています…</p>
        </Show>
        <Show when={loadError()}>
          <p class="status-banner error">{loadError()}</p>
        </Show>

        <Show
          when={receipts.length > 0}
          fallback={<p class="empty-state">まだレシートがありません。撮影して最初の1枚を読み取りましょう。</p>}
        >
          <section class="receipt-list">
            <For each={receipts}>
              {(receipt) => (
                <ReceiptCard
                  receipt={receipt}
                  onUpdate={(patch) => updateReceipt(receipt.id, patch)}
                  onUpdateItem={(itemId, patch) => updateItem(receipt.id, itemId, patch)}
                  onRemoveItem={(itemId) => removeItem(receipt.id, itemId)}
                  onAddItem={() => addItem(receipt.id)}
                  onDelete={() => deleteReceipt(receipt.id)}
                  onExportShare={() => void exportReceiptShare(receipt)}
                  onExportDownload={() => exportReceiptDownload(receipt)}
                />
              )}
            </For>
          </section>

          <div class="export-all-bar">
            <p class="export-all-label">すべてのレシートをCSVで書き出す</p>
            <div class="export-all-buttons">
              <button class="primary-button" onClick={() => void exportAllShare()}>
                共有で保存
              </button>
              <button class="primary-button ghost" onClick={exportAllDownload}>
                ダウンロード
            </button>
            </div>
          </div>
        </Show>
      </main>

      <Show when={settingsOpen()}>
        <SettingsPanel
          settings={settings()}
          onSave={handleSaveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      </Show>
    </>
  );
};

export default App;
