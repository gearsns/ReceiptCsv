import { createSignal, onMount, Show, For, type Component } from "solid-js";
import type { AppSettings } from "../types";
import { listAvailableModels, GeminiError, type GeminiModelOption } from "../lib/gemini";

interface Props {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
}

const SettingsPanel: Component<Props> = (props) => {
  const [apiKey, setApiKey] = createSignal(props.settings.apiKey);
  const [model, setModel] = createSignal(props.settings.model);
  const [showKey, setShowKey] = createSignal(false);

  const [models, setModels] = createSignal<GeminiModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = createSignal(false);
  const [modelsError, setModelsError] = createSignal<string | null>(null);
  const [manualEntry, setManualEntry] = createSignal(false);

  const fetchModels = async () => {
    if (!apiKey().trim()) {
      setModelsError("先にAPIキーを入力してください。");
      return;
    }
    setModelsLoading(true);
    setModelsError(null);
    try {
      const list = await listAvailableModels(apiKey());
      setModels(list);
      if (list.length === 0) {
        setModelsError("利用可能なモデルが見つかりませんでした。APIキーの権限を確認してください。");
      } else if (!list.some((m) => m.id === model())) {
        // Keep an existing valid selection; otherwise default to the first option.
        setModel(list[0].id);
      }
    } catch (err) {
      setModelsError(err instanceof GeminiError ? err.message : "モデル一覧の取得に失敗しました。");
    } finally {
      setModelsLoading(false);
    }
  };

  onMount(() => {
    if (props.settings.apiKey) void fetchModels();
  });

  const handleSave = () => {
    props.onSave({ apiKey: apiKey().trim(), model: model().trim() });
    props.onClose();
  };

  return (
    <div class="settings-overlay" role="dialog" aria-modal="true" aria-label="設定">
      <div class="app-header">
        <span class="wordmark">
          <span class="stamp-dot" />
          設定
        </span>
        <button class="icon-button" onClick={props.onClose} aria-label="閉じる">
          ✕
        </button>
      </div>

      <div class="settings-body">
        <div class="field">
          <label for="api-key">Gemini APIキー</label>
          <input
            id="api-key"
            type={showKey() ? "text" : "password"}
            autocomplete="off"
            autocapitalize="off"
            spellcheck={false}
            placeholder="AIza..."
            value={apiKey()}
            onInput={(e) => setApiKey(e.currentTarget.value)}
          />
          <button
            type="button"
            class="text-button"
            style={{ "align-self": "flex-start" }}
            onClick={() => setShowKey((v) => !v)}
          >
            {showKey() ? "キーを隠す" : "キーを表示"}
          </button>
          <p class="hint">
            Google AI Studio で発行したAPIキーを入力してください。キーは端末内（localStorage）にのみ保存され、
            レシート画像はこのキーを使って直接 Google の API に送信されます。
          </p>
        </div>

        <div class="field">
          <div class="field-row-header">
            <label for="model">モデル</label>
            <button type="button" class="text-button" onClick={() => void fetchModels()}>
              {modelsLoading() ? "取得中…" : "一覧を更新"}
            </button>
          </div>

          <Show
            when={!manualEntry() && models().length > 0}
            fallback={
          <input
            id="model"
            type="text"
            autocomplete="off"
            autocapitalize="off"
            spellcheck={false}
            placeholder="例: gemini-2.5-flash"
            value={model()}
            onInput={(e) => setModel(e.currentTarget.value)}
          />
            }
          >
            <select
              id="model"
              value={model()}
              onChange={(e) => setModel(e.currentTarget.value)}
            >
              <For each={models()}>
                {(m) => (
                  <option value={m.id}>
                    {m.displayName === m.id ? m.id : `${m.displayName} (${m.id})`}
                  </option>
                )}
              </For>
            </select>
          </Show>

          <button
            type="button"
            class="text-button"
            style={{ "align-self": "flex-start" }}
            onClick={() => setManualEntry((v) => !v)}
          >
            {manualEntry() ? "一覧から選ぶ" : "モデル名を直接入力する"}
          </button>

          <Show when={modelsError()}>
            <p class="hint error">{modelsError()}</p>
          </Show>
          <p class="hint">
            「一覧を更新」でAPIキーが使えるモデルをGoogle AI Studioから自動取得します。画像入力に対応しないモデル
            （埋め込み・音声・画像生成専用モデルなど）は一覧から除外しています。
          </p>
        </div>

        <button class="primary-button" onClick={handleSave}>
          保存する
        </button>
      </div>
    </div>
  );
};

export default SettingsPanel;
