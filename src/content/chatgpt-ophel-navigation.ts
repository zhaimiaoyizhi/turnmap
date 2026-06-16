import { hashText } from "../shared/hash.ts";
import { stableTurnIdAssigner } from "../shared/turn-id.ts";
import type { SourceAnchor, Turn, TurnNavigation } from "../shared/types";

const EMPTY_ASSISTANT_REPLY = "No assistant text captured";
const HIDDEN_PROMPT_LABEL = /^Prompt\s+(\d+)$/i;
const NATIVE_NAVIGATION_PREFIX = "chatgpt-native-user-query";

type OphelNavigationSeed = {
  index: number;
  text: string;
  messageId?: string;
  turnId?: string;
};

type NativeUserEntry = OphelNavigationSeed & {
  button?: HTMLElement;
  element?: HTMLElement;
};

export type OphelNavigationResolveResult =
  | {
      ok: true;
      source: "message-id" | "turn-shell" | "native-toc" | "visible-user";
      element: HTMLElement;
    }
  | {
      ok: false;
      reason:
        | "navigation-target-missing"
        | "native-toc-missing"
        | "native-toc-entry-missing"
        | "native-target-timeout";
      detail: string;
    };

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function preview(text: string): string {
  return normalizeText(text).slice(0, 120);
}

function isHiddenPromptLabel(text: string): boolean {
  return HIDDEN_PROMPT_LABEL.test(normalizeText(text));
}

export function resolveNativeTocText(
  button: { ariaLabel?: string; text?: string; title?: string },
  scopedTitles: string[],
  fallbackIndex: number
): string {
  const label = normalizeText(button.ariaLabel ?? "");
  if (label && !isHiddenPromptLabel(label)) return label;

  const title = normalizeText(button.title ?? "");
  if (title && !isHiddenPromptLabel(title)) return title;

  const text = normalizeText(button.text ?? "");
  if (text && !isHiddenPromptLabel(text)) return text;

  return normalizeText(scopedTitles[fallbackIndex] ?? "");
}

function cssEscape(value: string): string {
  return globalThis.CSS?.escape ? globalThis.CSS.escape(value) : value.replace(/["\\]/g, "\\$&");
}

function navigationIdForSeed(seed: OphelNavigationSeed): string {
  if (seed.messageId) return `chatgpt-message:${seed.messageId}`;
  if (seed.turnId) return `chatgpt-turn:${seed.turnId}`;
  return `${NATIVE_NAVIGATION_PREFIX}:${seed.index}:${hashText(normalizeText(seed.text))}`;
}

export function createChatGptTurnNavigation(seed: OphelNavigationSeed): TurnNavigation {
  return {
    kind: "ophel_notSourceAnchor",
    site: "chatgpt",
    navigationId: navigationIdForSeed(seed),
    messageId: seed.messageId,
    turnId: seed.turnId,
    nativeTocIndex: seed.index,
    turnIndex: seed.index,
    textHash: hashText(normalizeText(seed.text)),
    userPreview: preview(seed.text)
  };
}

function sourceAnchorFromSeed(seed: OphelNavigationSeed): SourceAnchor {
  return {
    turnIndex: seed.index,
    userMessageId: seed.messageId,
    userHash: hashText(seed.text),
    assistantHash: hashText(EMPTY_ASSISTANT_REPLY),
    userPreview: preview(seed.text),
    assistantPreview: preview(EMPTY_ASSISTANT_REPLY)
  };
}

export function turnsFromOphelNavigationSeeds(seeds: OphelNavigationSeed[]): Turn[] {
  const assignTurnId = stableTurnIdAssigner();
  return seeds.map((seed, index) => {
    const normalizedSeed = { ...seed, index };
    const sourceAnchor = sourceAnchorFromSeed(normalizedSeed);
    return {
      id: assignTurnId(sourceAnchor),
      turnIndex: index,
      userText: normalizedSeed.text,
      assistantText: EMPTY_ASSISTANT_REPLY,
      sourceAnchor,
      navigation: createChatGptTurnNavigation(normalizedSeed),
      extractedAt: Date.now()
    };
  });
}

function navigationMatches(left?: TurnNavigation, right?: TurnNavigation): boolean {
  if (!left || !right) return false;
  if (left.navigationId && left.navigationId === right.navigationId) return true;
  if (left.messageId && right.messageId && left.messageId === right.messageId) return true;
  if (left.turnId && right.turnId && left.turnId === right.turnId) return true;
  return false;
}

export function visibleEntryMatchesNavigation(
  entry: Pick<NativeUserEntry, "index" | "text" | "messageId" | "turnId">,
  navigation: TurnNavigation
): boolean {
  if (navigation.messageId && entry.messageId === navigation.messageId) return true;
  if (navigation.turnId && entry.turnId === navigation.turnId) return true;

  const index = navigation.nativeTocIndex ?? navigation.turnIndex;
  if (typeof index !== "number" || entry.index !== index) return false;
  if (navigation.textHash && hashText(normalizeText(entry.text)) === navigation.textHash) return true;
  if (navigation.userPreview && normalizeText(entry.text).includes(normalizeText(navigation.userPreview))) return true;
  return false;
}

export function nativeTocActivatedEntryMatchesNavigation(
  entry: Pick<NativeUserEntry, "index" | "text" | "messageId" | "turnId">,
  navigation: TurnNavigation
): boolean {
  if (navigation.messageId && entry.messageId === navigation.messageId) return true;
  if (navigation.turnId && entry.turnId === navigation.turnId) return true;

  const entryText = normalizeText(entry.text);
  if (!entryText) return false;
  if (navigation.textHash && hashText(entryText) === navigation.textHash) return true;
  if (navigation.userPreview && entryText.includes(normalizeText(navigation.userPreview))) return true;
  return false;
}

function mergedNavigation(existing: Turn, nativeTurn: Turn, turnIndex: number): TurnNavigation | undefined {
  if (!nativeTurn.navigation && !existing.navigation) return undefined;
  if (!nativeTurn.navigation) {
    return {
      ...existing.navigation!,
      turnIndex
    };
  }

  return {
    ...nativeTurn.navigation,
    messageId: nativeTurn.navigation.messageId ?? existing.navigation?.messageId,
    turnId: nativeTurn.navigation.turnId ?? existing.navigation?.turnId,
    turnIndex
  };
}

function enrichTurnByNavigation(
  existing: Turn,
  nativeTurn: Turn,
  turnIndex: number,
  options: { updateUserText: boolean }
): Turn {
  const userText =
    options.updateUserText && nativeTurn.userText.length >= existing.userText.length
      ? nativeTurn.userText
      : existing.userText;
  return {
    ...existing,
    turnIndex,
    userText,
    navigation: mergedNavigation(existing, nativeTurn, turnIndex),
    sourceAnchor: {
      ...existing.sourceAnchor,
      turnIndex,
      userMessageId: existing.sourceAnchor.userMessageId ?? nativeTurn.sourceAnchor.userMessageId,
      userHash: hashText(userText),
      userPreview: preview(userText)
    }
  };
}

function reindexTurns(turns: Turn[]): Turn[] {
  return turns.map((turn, turnIndex) => ({
    ...turn,
    turnIndex,
    navigation: turn.navigation
      ? {
          ...turn.navigation,
          turnIndex,
          nativeTocIndex: turn.navigation.nativeTocIndex ?? turnIndex
        }
      : undefined,
    sourceAnchor: {
      ...turn.sourceAnchor,
      turnIndex
    }
  }));
}

export function mergeOphelNavigationTurns(existingTurns: Turn[], nativeTurns: Turn[]): Turn[] {
  if (nativeTurns.length === 0) return existingTurns;
  if (existingTurns.length === 0) return reindexTurns(nativeTurns);
  if (nativeTurns.length < existingTurns.length) return existingTurns;

  const usedExisting = new Set<number>();
  const merged = nativeTurns.map((nativeTurn, index) => {
    const sameIndex = existingTurns[index];
    if (sameIndex && navigationMatches(sameIndex.navigation, nativeTurn.navigation)) {
      usedExisting.add(index);
      return enrichTurnByNavigation(sameIndex, nativeTurn, index, { updateUserText: true });
    }

    const matchingIndex = existingTurns.findIndex(
      (candidate, candidateIndex) =>
        !usedExisting.has(candidateIndex) && navigationMatches(candidate.navigation, nativeTurn.navigation)
    );

    if (matchingIndex >= 0) {
      usedExisting.add(matchingIndex);
      return enrichTurnByNavigation(existingTurns[matchingIndex], nativeTurn, index, { updateUserText: true });
    }

    if (sameIndex) {
      usedExisting.add(index);
      return enrichTurnByNavigation(sameIndex, nativeTurn, index, { updateUserText: false });
    }

    return {
      ...nativeTurn,
      turnIndex: index,
      navigation: nativeTurn.navigation
        ? {
            ...nativeTurn.navigation,
            turnIndex: index,
            nativeTocIndex: nativeTurn.navigation.nativeTocIndex ?? index
          }
        : undefined,
      sourceAnchor: {
        ...nativeTurn.sourceAnchor,
        turnIndex: index
      }
    };
  });

  return reindexTurns(merged);
}

export function attachOphelNavigationToTurns(turns: Turn[]): Turn[] {
  return turns.map((turn) => {
    if (turn.navigation?.kind === "ophel_notSourceAnchor") return turn;
    return {
      ...turn,
      navigation: createChatGptTurnNavigation({
        index: turn.turnIndex,
        text: turn.userText,
        messageId: turn.sourceAnchor.userMessageId
      })
    };
  });
}

function readElementText(element: Element): string {
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll("script, style, button, svg, [aria-hidden='true']").forEach((child) => child.remove());
  return normalizeText(clone.textContent ?? "");
}

function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function closestUserRoot(element: HTMLElement): HTMLElement {
  return element.closest<HTMLElement>('[data-message-author-role="user"]') ?? element;
}

function getMessageId(element: HTMLElement): string | undefined {
  const holder =
    element.closest<HTMLElement>("[data-message-id]") ?? element.querySelector<HTMLElement>("[data-message-id]");
  return holder?.getAttribute("data-message-id")?.trim() || undefined;
}

function getTurnId(element: HTMLElement): string | undefined {
  const holder =
    element.closest<HTMLElement>("[data-turn-id], [data-turn-id-container]") ??
    element.closest<HTMLElement>("[data-testid^='conversation-turn']");
  return (
    holder?.getAttribute("data-turn-id") ??
    holder?.getAttribute("data-turn-id-container") ??
    holder?.getAttribute("data-testid") ??
    undefined
  );
}

function visibleUserEntries(doc: Document = document): NativeUserEntry[] {
  const seen = new Set<HTMLElement>();
  return Array.from(doc.querySelectorAll<HTMLElement>('[data-message-author-role="user"]'))
    .map(closestUserRoot)
    .filter((element) => {
      if (seen.has(element)) return false;
      seen.add(element);
      return isElementVisible(element);
    })
    .map((element, index) => ({
      index,
      text: readElementText(element),
      element,
      messageId: getMessageId(element),
      turnId: getTurnId(element)
    }))
    .filter((entry) => entry.text);
}

function nativeButtonIndex(button: HTMLElement, fallbackIndex: number): number {
  const match = HIDDEN_PROMPT_LABEL.exec(button.getAttribute("aria-label")?.trim() ?? "");
  if (!match?.[1]) return fallbackIndex;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed - 1) : fallbackIndex;
}

function isNativeTocButton(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement) || element.tagName.toLowerCase() !== "button") return false;
  const label = normalizeText(element.getAttribute("aria-label") ?? "");
  if (!label) return false;
  return HIDDEN_PROMPT_LABEL.test(label) || element.hasAttribute("data-toc-active");
}

function nativeTocEntries(doc: Document = document): NativeUserEntry[] {
  const buttons = Array.from(
    doc.querySelectorAll(".no-scrollbar button[aria-label], nav button[aria-label], aside button[aria-label], [role='navigation'] button[aria-label]")
  )
    .filter(isNativeTocButton)
    .map((button, fallbackIndex) => ({
      index: nativeButtonIndex(button, fallbackIndex),
      button
    }))
    .sort((left, right) => left.index - right.index);

  const scope =
    buttons[0]?.button.closest(".no-scrollbar")?.parentElement ??
    buttons[0]?.button.closest("nav, aside, [role='navigation']") ??
    buttons[0]?.button.parentElement;
  const scopedTitles = scope
    ? Array.from(scope.querySelectorAll<HTMLElement>("[title]"))
        .map((element) => normalizeText(element.getAttribute("title") ?? element.textContent ?? ""))
        .filter((text) => text && !isHiddenPromptLabel(text))
    : [];

  const visible = visibleUserEntries(doc);
  return buttons.map((entry, sortedIndex) => {
    const text = resolveNativeTocText(
      {
        ariaLabel: entry.button.getAttribute("aria-label") ?? "",
        text: entry.button.textContent ?? "",
        title: entry.button.getAttribute("title") ?? ""
      },
      scopedTitles,
      entry.index
    ) || resolveNativeTocText(
      {
        ariaLabel: entry.button.getAttribute("aria-label") ?? "",
        text: entry.button.textContent ?? "",
        title: entry.button.getAttribute("title") ?? ""
      },
      scopedTitles,
      sortedIndex
    );
    const visibleMatch = visible.find((candidate) => candidate.index === entry.index);
    return visibleMatch
      ? {
          ...entry,
          text: visibleMatch.text || text,
          element: visibleMatch.element,
          messageId: visibleMatch.messageId,
          turnId: visibleMatch.turnId
        }
      : {
          ...entry,
          text
        };
  });
}

export function extractChatGptOphelNavigationTurns(doc: Document = document): Turn[] {
  const nativeEntries = nativeTocEntries(doc).filter((entry) => entry.text);
  if (nativeEntries.length > 0) {
    return turnsFromOphelNavigationSeeds(nativeEntries);
  }
  return turnsFromOphelNavigationSeeds(visibleUserEntries(doc));
}

function targetFromMessageId(messageId: string): HTMLElement | null {
  const escaped = cssEscape(messageId);
  const element = document.querySelector<HTMLElement>(`[data-message-id="${escaped}"]`);
  return element?.closest<HTMLElement>('[data-message-author-role="user"]') ?? element;
}

function targetFromTurnId(turnId: string): HTMLElement | null {
  const escaped = cssEscape(turnId);
  return document.querySelector<HTMLElement>(
    `[data-turn-id="${escaped}"], [data-turn-id-container="${escaped}"], [data-testid="${escaped}"]`
  );
}

function targetFromVisibleEntries(navigation: TurnNavigation, activatedNativeToc = false): HTMLElement | null {
  const entries = visibleUserEntries();
  const matches = activatedNativeToc ? nativeTocActivatedEntryMatchesNavigation : visibleEntryMatchesNavigation;
  return entries.find((entry) => matches(entry, navigation))?.element ?? null;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function waitForTarget(navigation: TurnNavigation, timeoutMs: number, activatedNativeToc = false): Promise<HTMLElement | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const target =
      (navigation.messageId ? targetFromMessageId(navigation.messageId) : null) ??
      (navigation.turnId ? targetFromTurnId(navigation.turnId) : null) ??
      targetFromVisibleEntries(navigation, activatedNativeToc);
    if (target) return target;
    await sleep(80);
  }
  return null;
}

export async function resolveChatGptOphelTarget(
  navigation: TurnNavigation,
  timeoutMs = 1400
): Promise<OphelNavigationResolveResult> {
  if (navigation.messageId) {
    const byMessage = targetFromMessageId(navigation.messageId);
    if (byMessage) return { ok: true, source: "message-id", element: byMessage };
  }

  if (navigation.turnId) {
    const shell = targetFromTurnId(navigation.turnId);
    if (shell) {
      shell.scrollIntoView({ block: "center", inline: "nearest" });
      const revived = await waitForTarget(navigation, Math.min(timeoutMs, 700));
      return { ok: true, source: "turn-shell", element: revived ?? shell };
    }
  }

  const visible = targetFromVisibleEntries(navigation);
  if (visible) return { ok: true, source: "visible-user", element: visible };

  const entries = nativeTocEntries();
  if (entries.length === 0) {
    return {
      ok: false,
      reason: "native-toc-missing",
      detail: "ChatGPT native prompt navigation is not present."
    };
  }

  const targetIndex = navigation.nativeTocIndex ?? navigation.turnIndex;
  const entry = typeof targetIndex === "number" ? entries.find((candidate) => candidate.index === targetIndex) : undefined;
  if (!entry?.button) {
    return {
      ok: false,
      reason: "native-toc-entry-missing",
      detail: "No ChatGPT native prompt navigation entry matches this turn navigation id."
    };
  }

  entry.button.click();
  const mounted = await waitForTarget(navigation, timeoutMs, true);
  if (!mounted) {
    return {
      ok: false,
      reason: "native-target-timeout",
      detail: "ChatGPT native prompt navigation did not mount the requested turn in time."
    };
  }

  return { ok: true, source: "native-toc", element: mounted };
}
