import type {
  ChatMapMessage,
  ExtractedTurnsMessage,
  JumpToTurnMessage,
  JumpToTurnResult
} from "./types";

export function isChatMapMessage(value: unknown): value is ChatMapMessage {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      typeof (value as { type: unknown }).type === "string" &&
      (value as { type: string }).type.startsWith("CHATMAP_")
  );
}

export async function requestTurnsFromActiveTab(options?: {
  harvest?: boolean;
  ensureFull?: boolean;
  tabId?: number;
}): Promise<ExtractedTurnsMessage | null> {
  const tabId = options?.tabId ?? (await getActiveTabId());
  if (!tabId) return null;

  const firstResponse = await requestTurns(tabId, options?.harvest ?? false, options?.ensureFull ?? false);
  if (firstResponse) return firstResponse;

  const injected = await injectContentScript(tabId);
  if (!injected) return null;

  await delay(150);
  return requestTurns(tabId, options?.harvest ?? false, options?.ensureFull ?? false);
}

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab.id;
}

async function requestTurns(
  tabId: number,
  harvest: boolean,
  ensureFull: boolean
): Promise<ExtractedTurnsMessage | null> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "CHATMAP_REQUEST_TURNS",
      harvest,
      ensureFull
    });
    return response?.type === "CHATMAP_TURNS_UPDATED" ? response : null;
  } catch {
    return null;
  }
}

async function injectContentScript(tabId: number): Promise<boolean> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content/index.js"]
    });
    return true;
  } catch {
    return false;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export async function jumpToTurnInActiveTab(
  message: JumpToTurnMessage,
  tabId?: number
): Promise<JumpToTurnResult> {
  const targetTabId = tabId ?? (await getActiveTabId());
  if (!targetTabId) return { ok: false, reason: "No active ChatGPT tab was found." };

  try {
    await chrome.tabs.update(targetTabId, { active: true });
    return await chrome.tabs.sendMessage(targetTabId, message);
  } catch {
    return {
      ok: false,
      reason: "ChatMap could not communicate with the ChatGPT page."
    };
  }
}

export async function setFloatingPanelInTab(enabled: boolean, tabId?: number): Promise<boolean> {
  const targetTabId = tabId ?? (await getActiveTabId());
  if (!targetTabId) return false;

  const send = async () => {
    await chrome.tabs.sendMessage(targetTabId, {
      type: "CHATMAP_SET_FLOATING_PANEL",
      enabled
    });
  };

  try {
    await send();
    return true;
  } catch {
    const injected = await injectContentScript(targetTabId);
    if (!injected) return false;
    await delay(150);
    try {
      await send();
      return true;
    } catch {
      return false;
    }
  }
}
