export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Receipt {
  id: string;
  createdAt: number;
  storeName: string;
  date: string; // free text, ISO if the model can determine it
  items: ReceiptItem[];
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  note: string;
  status: "done" | "error";
  errorMessage?: string;
}

export interface AppSettings {
  apiKey: string;
  model: string;
}

/** Raw shape returned by the Gemini structured-output call. */
export interface GeminiReceiptResult {
  store_name: string;
  date: string;
  items: {
    name: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }[];
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  note?: string;
}
