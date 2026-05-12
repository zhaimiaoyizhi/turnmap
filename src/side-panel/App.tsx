import { useCallback, useEffect, useMemo, useState } from "react";
import type { ExtractedTurnsMessage, Turn } from "../shared/types";
import { isChatMapMessage, requestTurnsFromActiveTab, setFloatingPanelInTab } from "../shared/messaging";
import { ChatMapCanvas } from "./graph/ChatMapCanvas";
import { saveTurnsToIndexedDb } from "./storage/turn-storage";

type AppProps = {
  mode?: "side-panel" | "full-page";
};

function sourceTabIdFromUrl(): number | undefined {
  const value = new URLSearchParams(window.location.search).get("sourceTabId");
  if (!value) return undefined;
  const tabId = Number(value);
  return Number.isFinite(tabId) ? tabId : undefined;
}

export function App({ mode = "side-panel" }: AppProps) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState("current");
  const [conversationTitle, setConversationTitle] = useState("Current conversation");
  const [status, setStatus] = useState("Waiting for ChatGPT conversation...");
  const [debugOpen, setDebugOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [floatingEnabled, setFloatingEnabled] = useState(false);
  const [lastMessage, setLastMessage] = useState<ExtractedTurnsMessage | null>(null);
  const [sourceTabId, setSourceTabId] = useState<number | undefined>(() =>
    mode === "full-page" ? sourceTabIdFromUrl() : undefined
  );

  const applyTurnsMessage = useCallback((message: ExtractedTurnsMessage) => {
    setLastMessage(message);
    setTurns(message.turns);
    setConversationId(message.conversationId);
    setConversationTitle(message.conversationTitle);
    void saveTurnsToIndexedDb(message.conversationId, message.conversationTitle, message.turns).catch(() => {
      setStatus("Turns loaded, but IndexedDB caching failed.");
    });
    const meta = message.harvestMeta;
    setStatus(
      meta
        ? `${message.turns.length} turns mapped via ${meta.source}${
            meta.source === "deep-scan" ? ` after ${meta.scannedSteps} steps` : ""
          }`
        : `${message.turns.length} loaded turns mapped`
    );
  }, []);

  const refreshTurns = useCallback(async () => {
    setStatus("Reading the full ChatGPT conversation...");
    const message = await requestTurnsFromActiveTab({ ensureFull: true, tabId: sourceTabId });
    if (message?.type === "CHATMAP_TURNS_UPDATED") {
      applyTurnsMessage(message);
    } else {
      setStatus("Open a ChatGPT conversation tab, then refresh ChatMap.");
    }
  }, [applyTurnsMessage, sourceTabId]);

  const deepScanTurns = useCallback(async () => {
    setStatus("Deep scanning loaded ChatGPT history...");
    const message = await requestTurnsFromActiveTab({ harvest: true, tabId: sourceTabId });
    if (message?.type === "CHATMAP_TURNS_UPDATED") {
      applyTurnsMessage(message);
    } else {
      setStatus("Deep scan could not reach the active ChatGPT tab.");
    }
  }, [applyTurnsMessage, sourceTabId]);

  const openFullPage = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) {
      setStatus("No active ChatGPT tab was found.");
      return;
    }
    setSourceTabId(tab.id);
    await chrome.tabs.create({
      url: chrome.runtime.getURL(`src/full-page/index.html?sourceTabId=${tab.id}`)
    });
    setViewMenuOpen(false);
  }, []);

  const toggleFloatingPanel = useCallback(async () => {
    const nextEnabled = !floatingEnabled;
    const ok = await setFloatingPanelInTab(nextEnabled, sourceTabId);
    if (ok) {
      setFloatingEnabled(nextEnabled);
      await chrome.storage.local.set({ "chatmap.floatingPanel.enabled": nextEnabled });
      setStatus(`Floating panel ${nextEnabled ? "enabled" : "disabled"}`);
      setViewMenuOpen(false);
    } else {
      setStatus("Could not reach the ChatGPT tab for floating panel.");
    }
  }, [floatingEnabled, sourceTabId]);

  const openSettingsPage = useCallback(async () => {
    await chrome.runtime.openOptionsPage();
  }, []);

  useEffect(() => {
    void chrome.storage.local.get("chatmap.floatingPanel.enabled").then((result) => {
      setFloatingEnabled(Boolean(result["chatmap.floatingPanel.enabled"]));
    });
  }, []);

  useEffect(() => {
    void refreshTurns();

    const listener = (message: unknown) => {
      if (!isChatMapMessage(message)) return;
      if (message.type === "CHATMAP_TURNS_UPDATED") {
        applyTurnsMessage(message as ExtractedTurnsMessage);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [applyTurnsMessage, refreshTurns]);

  const hasTurns = turns.length > 0;
  const subtitle = useMemo(
    () => (hasTurns ? "Click a node to jump back to ChatGPT." : "No complete turns found yet."),
    [hasTurns]
  );

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>ChatMap</h1>
          <p>{subtitle}</p>
        </div>
        <div className="app-actions">
          <button type="button" onClick={refreshTurns}>
            Refresh
          </button>
          <button type="button" onClick={deepScanTurns}>
            Deep Scan
          </button>
          <button type="button" onClick={openSettingsPage}>
            Settings
          </button>
          <button type="button" onClick={() => setDebugOpen((open) => !open)}>
            Debug
          </button>
          <div className="view-menu">
            <button type="button" onClick={() => setViewMenuOpen((open) => !open)}>
              View
            </button>
            {viewMenuOpen ? (
              <div className="view-menu__panel">
                <button type="button" disabled={mode === "side-panel"}>
                  Side Panel{mode === "side-panel" ? " · Current" : ""}
                </button>
                <button type="button" onClick={openFullPage} disabled={mode === "full-page"}>
                  Full Page{mode === "full-page" ? " · Current" : ""}
                </button>
                <button type="button" onClick={toggleFloatingPanel}>
                  {floatingEnabled ? "Hide Float" : "Show Float"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <section className="status-bar">{status}</section>
      {debugOpen ? (
        <section className="debug-panel">
          <span>Conversation: {conversationTitle}</span>
          <span>ID: {conversationId}</span>
          <span>Turns: {turns.length}</span>
          <span>Source: {lastMessage?.harvestMeta?.source ?? "unknown"}</span>
          <span>Steps: {lastMessage?.harvestMeta?.scannedSteps ?? 0}</span>
          <span>Scroll: {lastMessage?.harvestMeta?.scrollContainer ?? "n/a"}</span>
        </section>
      ) : null}

      <ChatMapCanvas
        conversationId={conversationId}
        conversationTitle={conversationTitle}
        turns={turns}
        sourceTabId={sourceTabId}
        onStatus={setStatus}
      />
    </main>
  );
}
