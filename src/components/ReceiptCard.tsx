import { For, type Component } from "solid-js";
import type { Receipt } from "../types";

interface Props {
  receipt: Receipt;
  onUpdate: (patch: Partial<Receipt>) => void;
  onUpdateItem: (itemId: string, patch: Partial<Receipt["items"][number]>) => void;
  onRemoveItem: (itemId: string) => void;
  onAddItem: () => void;
  onDelete: () => void;
  onExportShare: () => void;
  onExportDownload: () => void;
}

function fmt(n: number | null): string {
  return n === null ? "" : String(n);
}

function toNumber(raw: string): number {
  const n = Number(raw.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const ReceiptCard: Component<Props> = (props) => {
  return (
    <article class="receipt-card">
      <div class="receipt-head">
        <div style={{ flex: 1 }}>
          <input
            class="receipt-store-input"
            value={props.receipt.storeName}
            placeholder="店舗名"
            onInput={(e) => props.onUpdate({ storeName: e.currentTarget.value })}
          />
          <input
            class="receipt-date-input"
            value={props.receipt.date}
            placeholder="日付"
            onInput={(e) => props.onUpdate({ date: e.currentTarget.value })}
          />
        </div>
        <button class="receipt-delete" onClick={props.onDelete} aria-label="このレシートを削除">
          削除
        </button>
      </div>

      <hr class="rule" />

      <div class="item-header-row">
        <span>商品名</span>
        <span style={{ "text-align": "right" }}>数量</span>
        <span style={{ "text-align": "right" }}>金額</span>
        <span />
      </div>

      <For each={props.receipt.items}>
        {(item) => (
          <div class="item-row">
            <input
              value={item.name}
              placeholder="商品名"
              onInput={(e) => props.onUpdateItem(item.id, { name: e.currentTarget.value })}
            />
            <input
              class="qty-input"
              inputmode="decimal"
              value={fmt(item.quantity)}
              onInput={(e) =>
                props.onUpdateItem(item.id, { quantity: toNumber(e.currentTarget.value) })
              }
            />
            <input
              class="price-input"
              inputmode="decimal"
              value={fmt(item.amount)}
              onInput={(e) =>
                props.onUpdateItem(item.id, { amount: toNumber(e.currentTarget.value) })
              }
            />
            <button
              class="row-remove"
              onClick={() => props.onRemoveItem(item.id)}
              aria-label="この明細を削除"
            >
              ×
            </button>
          </div>
        )}
      </For>

      <button class="add-item-button" onClick={props.onAddItem}>
        + 明細を追加
      </button>

      <hr class="rule" />

      <div class="totals">
        <div class="totals-row">
          <span>小計</span>
          <input
            inputmode="decimal"
            value={fmt(props.receipt.subtotal)}
            placeholder="—"
            onInput={(e) => props.onUpdate({ subtotal: toNumber(e.currentTarget.value) })}
          />
        </div>
        <div class="totals-row">
          <span>消費税</span>
          <input
            inputmode="decimal"
            value={fmt(props.receipt.tax)}
            placeholder="—"
            onInput={(e) => props.onUpdate({ tax: toNumber(e.currentTarget.value) })}
          />
        </div>
        <div class="totals-row total">
          <span>合計</span>
          <input
            inputmode="decimal"
            value={fmt(props.receipt.total)}
            placeholder="—"
            onInput={(e) => props.onUpdate({ total: toNumber(e.currentTarget.value) })}
          />
        </div>
      </div>

      {props.receipt.note && <p class="receipt-note">メモ: {props.receipt.note}</p>}
      {props.receipt.status === "error" && (
        <p class="status-banner error" style={{ "margin-top": "10px" }}>
          {props.receipt.errorMessage}
        </p>
      )}

      <div class="receipt-actions">
        <button class="secondary-button" onClick={props.onExportShare}>
          共有で保存
        </button>
        <button class="secondary-button" onClick={props.onExportDownload}>
          ダウンロード
        </button>
      </div>
    </article>
  );
};

export default ReceiptCard;
