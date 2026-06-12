import type { ExtractedTurnsMessage, Turn } from "../shared/types";
import { extractConversationApiTurns } from "./conversation-api-extractor";
import { loadReadingBehaviorSettings } from "../shared/reading-settings";
import { describeScrollElement, getChatScrollElement } from "./scroll-container";
import { smartHarvestByScrolling } from "./smart-scroll-harvest.ts";
import { extractStructuredTurns } from "./structured-extractor";
import { extractTurns, mergeTurns, normalizeTurnIndexes } from "./turn-extractor";

type TurnsListener = (turns: Turn[]) => void;

type HarvestMeta = NonNullable<ExtractedTurnsMessage["harvestMeta"]>;

let latestTurns: Turn[] = [];
let observer: MutationObserver | null = null;
let debounceTimer: number | null = null;
let lastHarvestMeta: HarvestMeta | undefined;

function isFullConversationSource(source: HarvestMeta["source"]): boolean {
  return (
    source === "conversation-api" ||
    source === "structured" ||
    source === "web-storage" ||
    source === "indexeddb"
  );
}

function emitTurns(listener: TurnsListener): void {
  void getNonDisruptiveTurns().then((turns) => {
    latestTurns = lastHarvestMeta && isFullConversationSource(lastHarvestMeta.source)
      ? turns
      : mergeTurns(latestTurns, turns);
    listener(latestTurns);
  });
}

export function getConversationTitle(): string {
  const title = document.title.replace(/\s*\|\s*ChatGPT\s*$/i, "").trim();
  return title || "Current conversation";
}

export function getConversationId(): string {
  const match = window.location.pathname.match(/\/c\/([^/?#]+)/);
  return match?.[1] ?? window.location.href;
}

function setSourceMeta(source: HarvestMeta["source"], turns: Turn[]): void {
  lastHarvestMeta = {
    attempted: source !== "dom",
    source,
    scrollContainer: "none",
    scrollHeight: 0,
    clientHeight: 0,
    scannedSteps: 0
  };

  if (source === "dom" && turns.length === 0) {
    lastHarvestMeta = undefined;
  }
}

async function getNonDisruptiveTurns(): Promise<Turn[]> {
  const conversationApiResult = await extractConversationApiTurns();
  if (conversationApiResult && conversationApiResult.turns.length > 0) {
    setSourceMeta(conversationApiResult.source, conversationApiResult.turns);
    return conversationApiResult.turns;
  }

  const structuredResult = await extractStructuredTurns();
  if (structuredResult && structuredResult.turns.length > 0) {
    setSourceMeta(structuredResult.source, structuredResult.turns);
    return structuredResult.turns;
  }

  const domTurns = normalizeTurnIndexes(extractTurns());
  setSourceMeta("dom", domTurns);
  return domTurns;
}

export async function harvestTurnsByScrolling(): Promise<Turn[]> {
  const scrollElement = getChatScrollElement();
  const originalTop = scrollElement.scrollTop;
  const settings = await loadReadingBehaviorSettings();
  const result = await (async () => {
    try {
      return await smartHarvestByScrolling({
        scrollElement,
        collectTurns: extractTurns,
        mergeTurns,
        normalizeTurns: normalizeTurnIndexes,
        maxDownSteps: 90,
        settings
      });
    } finally {
      scrollElement.scrollTo({ top: originalTop, behavior: "instant" });
    }
  })();

  latestTurns = result.turns;
  lastHarvestMeta = {
    attempted: true,
    source: "deep-scan",
    scrollContainer: describeScrollElement(scrollElement),
    scrollHeight: scrollElement.scrollHeight,
    clientHeight: scrollElement.clientHeight,
    scannedSteps: result.scannedSteps
  };
  return latestTurns;
}

export function getLatestTurns(): Turn[] {
  if (latestTurns.length === 0) {
    latestTurns = normalizeTurnIndexes(extractTurns());
  }
  return latestTurns;
}

export async function refreshLatestTurns(): Promise<Turn[]> {
  const turns = await getNonDisruptiveTurns();
  latestTurns = lastHarvestMeta && isFullConversationSource(lastHarvestMeta.source)
    ? turns
    : mergeTurns(latestTurns, turns);
  return latestTurns;
}

export async function refreshCompleteTurns(): Promise<Turn[]> {
  const turns = await refreshLatestTurns();
  if (lastHarvestMeta && isFullConversationSource(lastHarvestMeta.source)) {
    return turns;
  }

  return harvestTurnsByScrolling();
}

export function startChatGptObserver(listener: TurnsListener): void {
  if (observer) return;

  const schedule = () => {
    if (debounceTimer) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => emitTurns(listener), 350);
  };

  observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  emitTurns(listener);
}

export function toTurnsMessage(turns: Turn[]): ExtractedTurnsMessage {
  return {
    type: "TURNMAP_TURNS_UPDATED",
    turns,
    conversationTitle: getConversationTitle(),
    conversationId: getConversationId(),
    harvestMeta: lastHarvestMeta
  };
}
