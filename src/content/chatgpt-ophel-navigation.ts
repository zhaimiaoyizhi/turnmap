import { hashText } from "../shared/hash.ts";
import { stableTurnIdAssigner } from "../shared/turn-id.ts";
import type { SourceAnchor, Turn, TurnNavigation } from "../shared/types";

const EMPTY_ASSISTANT_REPLY = "No assistant text captured";
const HIDDEN_PROMPT_LABEL = /^Prompt\s+(\d+)$/i;
const NATIVE_NAVIGATION_PREFIX = "chatgpt-native-user-query";
const CHATGPT_TURN_SHELL_SELECTOR = "section[data-turn], [data-testid^='conversation-turn']";
const CACHE_WAIT_STEP_MS = 80;

type OphelNavigationSeed = {
  index: number;
  text: string;
  messageId?: string;
  turnId?: string;
};

type NativeUserEntry = OphelNavigationSeed & {
  button?: HTMLElement;
  element?: HTMLElement;
  shell?: HTMLElement;
};

type AttributeReader = {
  getAttribute(name: string): string | null;
};

type RuntimeCacheEntry = {
  navigationId: string;
  textHash: string;
  userPreview: string;
  nativeTocIndex?: number;
  turnIndex?: number;
  messageId?: string;
  turnId?: string;
  button?: HTMLElement;
  element?: HTMLElement;
  shell?: HTMLElement;
  lastSeenAt: number;
};

export type ChatGptOphelRuntimeCacheSnapshot = Omit<
  RuntimeCacheEntry,
  "button" | "element" | "shell" | "lastSeenAt"
>;

const runtimeNavigationCache = new Map<string, RuntimeCacheEntry>();

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

export function rememberChatGptOphelTarget(seed: NativeUserEntry): TurnNavigation {
  const normalizedSeed = {
    ...seed,
    text: normalizeText(seed.text)
  };
  const navigation = createChatGptTurnNavigation(normalizedSeed);
  const entry: RuntimeCacheEntry = {
    navigationId: navigation.navigationId,
    textHash: navigation.textHash ?? hashText(normalizedSeed.text),
    userPreview: navigation.userPreview ?? preview(normalizedSeed.text),
    nativeTocIndex: navigation.nativeTocIndex,
    turnIndex: navigation.turnIndex,
    messageId: navigation.messageId,
    turnId: navigation.turnId,
    button: seed.button,
    element: seed.element,
    shell: seed.shell,
    lastSeenAt: Date.now()
  };

  const previous = runtimeNavigationCache.get(entry.navigationId);
  runtimeNavigationCache.set(entry.navigationId, {
    ...previous,
    ...entry,
    button: entry.button ?? previous?.button,
    element: entry.element ?? previous?.element,
    shell: entry.shell ?? previous?.shell
  });

  return navigation;
}

export function clearChatGptOphelRuntimeCache(): void {
  runtimeNavigationCache.clear();
}

export function getChatGptOphelRuntimeCacheSnapshot(): ChatGptOphelRuntimeCacheSnapshot[] {
  return Array.from(runtimeNavigationCache.values())
    .sort((left, right) => (left.nativeTocIndex ?? left.turnIndex ?? 0) - (right.nativeTocIndex ?? right.turnIndex ?? 0))
    .map(({ button: _button, element: _element, shell: _shell, lastSeenAt: _lastSeenAt, ...entry }) => entry);
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

export function getChatGptTurnShellSortIndex(element: AttributeReader): number {
  const explicitDataTurn = element.getAttribute("data-turn");
  if (explicitDataTurn) {
    const parsed = Number.parseInt(explicitDataTurn, 10);
    if (Number.isFinite(parsed)) return parsed;
  }

  const testId = element.getAttribute("data-testid") ?? "";
  const testIdMatch = /conversation-turn-(\d+)/i.exec(testId);
  if (testIdMatch?.[1]) return Number.parseInt(testIdMatch[1], 10);

  const turnId = element.getAttribute("data-turn-id") ?? element.getAttribute("data-turn-id-container") ?? "";
  const turnIdMatch = /(\d+)$/.exec(turnId);
  if (turnIdMatch?.[1]) return Number.parseInt(turnIdMatch[1], 10);

  return Number.MAX_SAFE_INTEGER;
}

export function getAllChatGptTurnShellsSorted(doc: Document = document): HTMLElement[] {
  const candidates = Array.from(doc.querySelectorAll<HTMLElement>(CHATGPT_TURN_SHELL_SELECTOR));
  const order = new Map<HTMLElement, number>();
  candidates.forEach((candidate, index) => order.set(candidate, index));

  return candidates
    .filter((candidate) => !candidate.querySelector(CHATGPT_TURN_SHELL_SELECTOR))
    .sort((left, right) => {
      const leftIndex = getChatGptTurnShellSortIndex(left);
      const rightIndex = getChatGptTurnShellSortIndex(right);
      if (leftIndex !== rightIndex) return leftIndex - rightIndex;
      return (order.get(left) ?? 0) - (order.get(right) ?? 0);
    });
}

function shellForElement(element: HTMLElement): HTMLElement | undefined {
  return element.closest<HTMLElement>(CHATGPT_TURN_SHELL_SELECTOR) ?? undefined;
}

function isMountedMessageTarget(element: HTMLElement): boolean {
  return Boolean(
    element.matches('[data-message-author-role="user"], [data-message-id]') ||
      element.querySelector('[data-message-author-role="user"], [data-message-id]')
  );
}

function turnShellEntries(doc: Document = document): NativeUserEntry[] {
  return getAllChatGptTurnShellsSorted(doc)
    .map((shell, index) => {
      const userRoot = shell.querySelector<HTMLElement>('[data-message-author-role="user"]');
      const text = userRoot ? readElementText(userRoot) : "";
      return {
        index,
        text,
        element: userRoot ?? undefined,
        shell,
        messageId: userRoot ? getMessageId(userRoot) : undefined,
        turnId: getTurnId(shell)
      };
    })
    .filter((entry) => entry.text || entry.turnId);
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
      turnId: getTurnId(element),
      shell: shellForElement(element)
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
    nativeEntries.forEach(rememberChatGptOphelTarget);
    return turnsFromOphelNavigationSeeds(nativeEntries);
  }
  const shellEntries = turnShellEntries(doc).filter((entry) => entry.text);
  if (shellEntries.length > 0) {
    shellEntries.forEach(rememberChatGptOphelTarget);
    return turnsFromOphelNavigationSeeds(shellEntries);
  }

  const visibleEntries = visibleUserEntries(doc);
  visibleEntries.forEach(rememberChatGptOphelTarget);
  return turnsFromOphelNavigationSeeds(visibleEntries);
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

function targetFromVisibleEntries(navigation: TurnNavigation): HTMLElement | null {
  const entries = visibleUserEntries();
  entries.forEach(rememberChatGptOphelTarget);
  return entries.find((entry) => visibleEntryMatchesNavigation(entry, navigation))?.element ?? null;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function cachedTargetMatchesNavigation(entry: RuntimeCacheEntry, navigation: TurnNavigation): boolean {
  if (entry.navigationId === navigation.navigationId) return true;
  if (navigation.messageId && entry.messageId === navigation.messageId) return true;
  if (navigation.turnId && entry.turnId === navigation.turnId) return true;
  const targetIndex = navigation.nativeTocIndex ?? navigation.turnIndex;
  if (typeof targetIndex !== "number" || entry.nativeTocIndex !== targetIndex) return false;
  if (navigation.textHash && entry.textHash === navigation.textHash) return true;
  return Boolean(navigation.userPreview && entry.userPreview.includes(normalizeText(navigation.userPreview)));
}

function cachedEntryForNavigation(navigation: TurnNavigation): RuntimeCacheEntry | undefined {
  return (
    runtimeNavigationCache.get(navigation.navigationId) ??
    Array.from(runtimeNavigationCache.values()).find((entry) => cachedTargetMatchesNavigation(entry, navigation))
  );
}

function liveCachedTarget(entry: RuntimeCacheEntry): HTMLElement | null {
  if (entry.element?.isConnected && isMountedMessageTarget(entry.element)) return entry.element;
  if (entry.messageId) {
    const byMessage = targetFromMessageId(entry.messageId);
    if (byMessage) return byMessage;
  }
  if (entry.shell?.isConnected && isMountedMessageTarget(entry.shell)) {
    return entry.shell.querySelector<HTMLElement>('[data-message-author-role="user"]') ?? entry.shell;
  }
  if (entry.turnId) {
    const byTurn = targetFromTurnId(entry.turnId);
    if (byTurn && isMountedMessageTarget(byTurn)) {
      return byTurn.querySelector<HTMLElement>('[data-message-author-role="user"]') ?? byTurn;
    }
  }
  return null;
}

function shellFromCachedEntry(entry: RuntimeCacheEntry): HTMLElement | null {
  if (entry.shell?.isConnected) return entry.shell;
  if (!entry.turnId) return null;
  return targetFromTurnId(entry.turnId);
}

function scrollIntoViewForRevive(shell: HTMLElement): void {
  shell.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
}

async function waitForCachedChatGPTTargetRemount(
  navigation: TurnNavigation,
  timeoutMs: number
): Promise<HTMLElement | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const cached = cachedEntryForNavigation(navigation);
    const cachedTarget = cached ? liveCachedTarget(cached) : null;
    if (cachedTarget) return cachedTarget;

    const target =
      (navigation.messageId ? targetFromMessageId(navigation.messageId) : null) ??
      (navigation.turnId ? targetFromTurnId(navigation.turnId) : null) ??
      targetFromVisibleEntries(navigation);
    if (target && isMountedMessageTarget(target)) return target;
    await sleep(CACHE_WAIT_STEP_MS);
  }
  return null;
}

export async function resolveChatGptOphelTarget(
  navigation: TurnNavigation,
  timeoutMs = 1400
): Promise<OphelNavigationResolveResult> {
  const entries = nativeTocEntries();
  entries.forEach(rememberChatGptOphelTarget);

  const targetIndex = navigation.nativeTocIndex ?? navigation.turnIndex;
  const nativeEntry =
    entries.find((candidate) => cachedTargetMatchesNavigation(rememberedEntry(candidate), navigation)) ??
    (typeof targetIndex === "number" && !navigation.textHash && !navigation.userPreview
      ? entries.find((candidate) => candidate.index === targetIndex)
      : undefined);
  if (nativeEntry?.button) {
    nativeEntry.button.click();
    const mounted = await waitForCachedChatGPTTargetRemount(navigation, timeoutMs);
    if (mounted) return { ok: true, source: "native-toc", element: mounted };
  }

  const cached = cachedEntryForNavigation(navigation);
  const cachedTarget = cached ? liveCachedTarget(cached) : null;
  if (cachedTarget) return { ok: true, source: "visible-user", element: cachedTarget };

  const shell = cached ? shellFromCachedEntry(cached) : null;
  if (shell) {
    scrollIntoViewForRevive(shell);
    const revived = await waitForCachedChatGPTTargetRemount(navigation, Math.min(timeoutMs, 900));
    return { ok: true, source: "turn-shell", element: revived ?? shell };
  }

  if (navigation.messageId) {
    const byMessage = targetFromMessageId(navigation.messageId);
    if (byMessage) return { ok: true, source: "message-id", element: byMessage };
  }

  if (navigation.turnId) {
    const turnShell = targetFromTurnId(navigation.turnId);
    if (turnShell) {
      scrollIntoViewForRevive(turnShell);
      const revived = await waitForCachedChatGPTTargetRemount(navigation, Math.min(timeoutMs, 900));
      return { ok: true, source: "turn-shell", element: revived ?? turnShell };
    }
  }

  const visible = targetFromVisibleEntries(navigation);
  if (visible) return { ok: true, source: "visible-user", element: visible };

  if (entries.length === 0) {
    return {
      ok: false,
      reason: "native-toc-missing",
      detail: "ChatGPT native prompt navigation is not present."
    };
  }

  if (!nativeEntry?.button) {
    return {
      ok: false,
      reason: "native-toc-entry-missing",
      detail: "No ChatGPT native prompt navigation entry matches this turn navigation id."
    };
  }

  return {
    ok: false,
    reason: "native-target-timeout",
    detail: "ChatGPT native prompt navigation did not mount the requested turn in time."
  };
}

function rememberedEntry(entry: NativeUserEntry): RuntimeCacheEntry {
  const navigation = rememberChatGptOphelTarget(entry);
  return runtimeNavigationCache.get(navigation.navigationId)!;
}
