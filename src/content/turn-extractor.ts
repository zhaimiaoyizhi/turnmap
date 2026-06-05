import { hashText } from "../shared/hash";
import { stableTurnIdAssigner } from "../shared/turn-id.ts";
import type { SourceAnchor, Turn } from "../shared/types";

type MessageBlock = {
  role: "user" | "assistant";
  element: HTMLElement;
  text: string;
  messageId?: string;
  attachmentNames?: string[];
};

const USER_SELECTORS = [
  '[data-message-author-role="user"]',
  '[data-message-author-role="user"] [class*="whitespace-pre-wrap"]',
  ".whitespace-pre-wrap"
];

const ASSISTANT_SELECTORS = [
  '[data-message-author-role="assistant"]',
  '[data-message-author-role="assistant"] .markdown',
  ".markdown"
];

const EMPTY_ASSISTANT_REPLY = "无文字回复";

const NON_MESSAGE_TEXT_SELECTORS = [
  "script",
  "style",
  "noscript",
  "svg",
  "button",
  "input",
  "textarea",
  "select",
  "nav",
  "menu",
  "form",
  "[hidden]",
  "[aria-hidden='true']",
  "[role='button']",
  "[data-testid*='copy' i]",
  "[data-testid*='feedback' i]",
  "[data-testid*='composer' i]",
  "[data-testid*='sources' i]",
  "[data-testid*='share' i]"
].join(",");

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function preview(text: string): string {
  return normalizeText(text).slice(0, 120);
}

function normalizeAttachmentName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractAttachmentNamesFromText(text: string): string[] {
  const names = new Set<string>();
  const pattern =
    /[^\s\\/:*?"<>|]{1,120}\.(?:pdf|docx?|pptx?|xlsx?|csv|tsv|txt|md|png|jpe?g|gif|webp|zip|json|py|js|ts|tsx|html|css)\b/gi;

  for (const match of text.matchAll(pattern)) {
    const name = normalizeAttachmentName(match[0]);
    if (name) names.add(name);
  }

  return [...names].slice(0, 8);
}

function extractAttachmentNames(element: HTMLElement): string[] {
  const names = new Set<string>();
  const selectors = [
    "[data-testid*='file' i]",
    "[data-testid*='attachment' i]",
    "[data-testid*='image' i]",
    "[aria-label*='file' i]",
    "[aria-label*='attachment' i]",
    "[aria-label*='image' i]",
    "img[alt]",
    "img[src]",
    "a[href*='file']",
    "a[download]"
  ];

  for (const candidate of element.querySelectorAll<HTMLElement>(selectors.join(","))) {
    for (const value of [
      candidate.getAttribute("download"),
      candidate.getAttribute("title"),
      candidate.getAttribute("aria-label"),
      candidate.getAttribute("alt"),
      candidate.getAttribute("src"),
      candidate.innerText
    ]) {
      if (!value) continue;
      for (const name of extractAttachmentNamesFromText(value)) names.add(name);
    }
  }

  for (const name of extractAttachmentNamesFromText(readCleanText(element))) names.add(name);
  return [...names].slice(0, 8);
}

function textFromAttachmentNames(role: "user" | "assistant", attachmentNames: string[]): string {
  if (attachmentNames.length === 0) return "";
  const label = role === "assistant" ? "Assistant returned attachment" : "User sent attachment";
  return `${label}: ${attachmentNames.join(", ")}`;
}

function readCleanText(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(NON_MESSAGE_TEXT_SELECTORS).forEach((child) => child.remove());
  return normalizeText(clone.textContent ?? "");
}

function getMessageContentElements(root: HTMLElement, role: "user" | "assistant"): HTMLElement[] {
  if (role === "assistant") {
    const markdownBlocks = Array.from(root.querySelectorAll<HTMLElement>(".markdown")).filter(
      (element, _index, elements) => !elements.some((candidate) => candidate !== element && candidate.contains(element))
    );
    return markdownBlocks.length > 0 ? markdownBlocks : [root];
  }

  return [root.querySelector<HTMLElement>('[class*="whitespace-pre-wrap"]') ?? root];
}

function getMessageText(root: HTMLElement, role: "user" | "assistant"): string {
  const text = getMessageContentElements(root, role).map(readCleanText).filter(Boolean).join("\n\n");
  if (role === "user") return text;

  return normalizeText(
    text
      .replace(/\bThought for \d+s\b/gi, "")
      .replace(/已思考\s*\d+\s*秒?/g, "")
      .replace(/^思考中[.。…]*$/g, "")
  );
}

function uniqueElements(selectors: string[]): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const elements: HTMLElement[] = [];

  for (const selector of selectors) {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      if (!seen.has(element)) {
        seen.add(element);
        elements.push(element);
      }
    });
  }

  return elements;
}

function closestMessageRoot(element: HTMLElement): HTMLElement {
  return (
    element.closest<HTMLElement>('[data-message-author-role="user"]') ??
    element.closest<HTMLElement>('[data-message-author-role="assistant"]') ??
    element
  );
}

function hasMessageRole(element: HTMLElement, role: "user" | "assistant"): boolean {
  return element.getAttribute("data-message-author-role") === role;
}

function getMessageId(element: HTMLElement): string | undefined {
  const withId =
    element.closest<HTMLElement>("[data-message-id]") ??
    element.querySelector<HTMLElement>("[data-message-id]");
  const messageId = withId?.getAttribute("data-message-id");
  if (messageId) return messageId;

  const testId = element.getAttribute("data-testid");
  if (testId?.includes("message")) return testId;

  return undefined;
}

function elementContainsExistingBlock(blocks: MessageBlock[], element: HTMLElement): boolean {
  return blocks.some((block) => block.element.contains(element) || element.contains(block.element));
}

function getMessageBlocks(): MessageBlock[] {
  const blocks: MessageBlock[] = [];

  for (const element of uniqueElements(USER_SELECTORS)) {
    const root = closestMessageRoot(element);
    if (!hasMessageRole(root, "user")) continue;
    const attachmentNames = extractAttachmentNames(root);
    const text = getMessageText(root, "user") || textFromAttachmentNames("user", attachmentNames);
    if (text && !elementContainsExistingBlock(blocks, root)) {
      blocks.push({
        role: "user",
        element: root,
        text,
        messageId: getMessageId(root),
        attachmentNames
      });
    }
  }

  for (const element of uniqueElements(ASSISTANT_SELECTORS)) {
    const root = closestMessageRoot(element);
    if (!hasMessageRole(root, "assistant")) continue;
    const attachmentNames = extractAttachmentNames(root);
    const text = getMessageText(root, "assistant") || textFromAttachmentNames("assistant", attachmentNames);
    if (text && !elementContainsExistingBlock(blocks, root)) {
      blocks.push({
        role: "assistant",
        element: root,
        text,
        messageId: getMessageId(root),
        attachmentNames
      });
    }
  }

  return blocks.sort((left, right) => {
    const position = left.element.compareDocumentPosition(right.element);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    return 0;
  });
}

export function extractTurns(): Turn[] {
  const blocks = getMessageBlocks();
  const turns: Turn[] = [];
  let pendingUser: MessageBlock | null = null;
  const assignTurnId = stableTurnIdAssigner();

  const pushTurn = (user: MessageBlock, assistant?: MessageBlock) => {
    const assistantText = assistant?.text || EMPTY_ASSISTANT_REPLY;
    const turnIndex = turns.length;
    const sourceAnchor: SourceAnchor = {
      turnIndex,
      userMessageId: user.messageId,
      assistantMessageId: assistant?.messageId,
      userAttachmentNames: user.attachmentNames,
      userHash: hashText(user.text),
      assistantHash: hashText(assistantText),
      userPreview: preview(user.text),
      assistantPreview: preview(assistantText)
    };

    turns.push({
      id: assignTurnId(sourceAnchor),
      turnIndex,
      userText: user.text,
      assistantText,
      sourceAnchor,
      extractedAt: Date.now()
    });
  };

  for (const block of blocks) {
    if (block.role === "user") {
      if (pendingUser) {
        pushTurn(pendingUser);
      }
      pendingUser = block;
      continue;
    }

    if (block.role === "assistant" && pendingUser) {
      pushTurn(pendingUser, block);
      pendingUser = null;
    }
  }

  if (pendingUser) {
    pushTurn(pendingUser);
  }

  return turns;
}

export function normalizeTurnIndexes(turns: Turn[]): Turn[] {
  const assignTurnId = stableTurnIdAssigner();
  return turns.map((turn, turnIndex) => {
    const sourceAnchor: SourceAnchor = {
      ...turn.sourceAnchor,
      turnIndex
    };

    return {
      ...turn,
      id: assignTurnId(sourceAnchor),
      turnIndex,
      sourceAnchor
    };
  });
}

function isFallbackAssistantText(text: string): boolean {
  return text.trim() === EMPTY_ASSISTANT_REPLY;
}

function mergeUserKey(turn: Turn): string {
  return turn.sourceAnchor.userMessageId
    ? `id:${turn.sourceAnchor.userMessageId}`
    : `hash:${turn.sourceAnchor.userHash}:${(turn.sourceAnchor.userAttachmentNames ?? []).join("|")}`;
}

function shouldReplaceMergedTurn(existing: Turn, next: Turn): boolean {
  if (isFallbackAssistantText(existing.assistantText) && !isFallbackAssistantText(next.assistantText)) return true;
  if (!existing.sourceAnchor.assistantMessageId && next.sourceAnchor.assistantMessageId) return true;
  return false;
}

export function mergeTurns(existingTurns: Turn[], newTurns: Turn[]): Turn[] {
  const merged = new Map<string, Turn>();
  const byUser = new Map<string, string>();

  for (const turn of [...existingTurns, ...newTurns]) {
    const key =
      turn.sourceAnchor.userMessageId || turn.sourceAnchor.assistantMessageId
        ? `${turn.sourceAnchor.userMessageId ?? ""}:${turn.sourceAnchor.assistantMessageId ?? ""}`
        : `${turn.sourceAnchor.userHash}:${turn.sourceAnchor.assistantHash}`;
    const userKey = mergeUserKey(turn);
    const existingKey = byUser.get(userKey);
    const existing = existingKey ? merged.get(existingKey) : undefined;

    if (existingKey && existing) {
      if (shouldReplaceMergedTurn(existing, turn)) {
        merged.delete(existingKey);
        merged.set(key, turn);
        byUser.set(userKey, key);
      }
      continue;
    }

    if (!merged.has(key)) {
      merged.set(key, turn);
      byUser.set(userKey, key);
    }
  }

  return normalizeTurnIndexes([...merged.values()]);
}

type TurnCandidate = {
  index: number;
  user: MessageBlock;
  assistant: MessageBlock;
  userHash: string;
  assistantHash: string;
};

type UserTurnMarker = {
  index: number;
  user: MessageBlock;
  userHash: string;
};

function getTurnCandidates(): TurnCandidate[] {
  const blocks = getMessageBlocks();
  const turnCandidates: TurnCandidate[] = [];
  let currentTurn = -1;

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block.role !== "user") continue;

    const next = blocks[index + 1];
    if (!next || next.role !== "assistant") continue;

    currentTurn += 1;
    const userHash = hashText(block.text);
    const assistantHash = hashText(next.text);
    turnCandidates.push({
      index: currentTurn,
      user: block,
      assistant: next,
      userHash,
      assistantHash
    });
  }

  return turnCandidates;
}

function getUserTurnMarkers(): UserTurnMarker[] {
  const blocks = getMessageBlocks();
  const markers: UserTurnMarker[] = [];
  let currentTurn = -1;

  for (const block of blocks) {
    if (block.role !== "user") continue;
    currentTurn += 1;
    markers.push({
      index: currentTurn,
      user: block,
      userHash: hashText(block.text)
    });
  }

  return markers;
}

function attachmentNamesMatch(candidateNames: string[] | undefined, anchor: SourceAnchor): boolean {
  const anchorNames = anchor.userAttachmentNames ?? [];
  if (anchorNames.length === 0) return true;
  const candidateNameSet = new Set((candidateNames ?? []).map((name) => name.toLowerCase()));
  return anchorNames.every((name) => candidateNameSet.has(name.toLowerCase()));
}

function hasSameMessageIds(candidate: TurnCandidate, anchor: SourceAnchor): boolean {
  return (
    Boolean(anchor.userMessageId || anchor.assistantMessageId) &&
    (!anchor.userMessageId || candidate.user.messageId === anchor.userMessageId) &&
    (!anchor.assistantMessageId || candidate.assistant.messageId === anchor.assistantMessageId)
  );
}

function hasSameHashes(candidate: TurnCandidate, anchor: SourceAnchor): boolean {
  return candidate.userHash === anchor.userHash && candidate.assistantHash === anchor.assistantHash;
}

function hasSamePreviews(candidate: TurnCandidate, anchor: SourceAnchor): boolean {
  return (
    candidate.user.text.includes(anchor.userPreview) &&
    candidate.assistant.text.includes(anchor.assistantPreview)
  );
}

function hasSameUserPreview(candidate: TurnCandidate, anchor: SourceAnchor): boolean {
  return candidate.user.text.includes(anchor.userPreview);
}

function hasSameAttachments(candidate: TurnCandidate, anchor: SourceAnchor): boolean {
  return attachmentNamesMatch(candidate.user.attachmentNames, anchor);
}

function candidateMatchesTurn(candidate: TurnCandidate, turn: Turn): boolean {
  const anchor = turn.sourceAnchor;
  if (hasSameMessageIds(candidate, anchor)) return true;
  if (hasSameHashes(candidate, anchor) && hasSameAttachments(candidate, anchor)) return true;
  return hasSamePreviews(candidate, anchor) && hasSameAttachments(candidate, anchor);
}

function getCandidateGlobalIndex(candidate: TurnCandidate, knownTurns: Turn[]): number | null {
  if (knownTurns.length === 0) return null;

  const match = knownTurns.find((turn) => candidateMatchesTurn(candidate, turn));
  return match?.turnIndex ?? null;
}

function markerMatchesTurn(marker: UserTurnMarker, turn: Turn): boolean {
  const anchor = turn.sourceAnchor;
  if (anchor.userMessageId && marker.user.messageId === anchor.userMessageId) return true;
  if (marker.userHash === anchor.userHash && attachmentNamesMatch(marker.user.attachmentNames, anchor)) return true;
  return Boolean(
    anchor.userPreview &&
      marker.user.text.includes(anchor.userPreview) &&
      attachmentNamesMatch(marker.user.attachmentNames, anchor)
  );
}

function markerMatchesAnchor(marker: UserTurnMarker, anchor: SourceAnchor): boolean {
  if (anchor.userMessageId && marker.user.messageId === anchor.userMessageId) return true;
  if (marker.userHash === anchor.userHash && attachmentNamesMatch(marker.user.attachmentNames, anchor)) return true;
  return Boolean(
    anchor.userPreview &&
      marker.user.text.includes(anchor.userPreview) &&
      attachmentNamesMatch(marker.user.attachmentNames, anchor)
  );
}

function getMarkerGlobalIndex(marker: UserTurnMarker, knownTurns: Turn[]): number | null {
  if (knownTurns.length === 0) return null;

  const match = knownTurns.find((turn) => markerMatchesTurn(marker, turn));
  return match?.turnIndex ?? null;
}

function pickBestUserMarker(
  markers: UserTurnMarker[],
  anchor: SourceAnchor,
  knownTurns: Turn[]
): UserTurnMarker | null {
  if (markers.length === 0) return null;

  const indexed = markers
    .map((marker) => ({
      marker,
      globalIndex: getMarkerGlobalIndex(marker, knownTurns)
    }))
    .filter((entry) => entry.globalIndex !== null);

  const exactIndex = indexed.find((entry) => entry.globalIndex === anchor.turnIndex);
  if (exactIndex) return exactIndex.marker;
  if (knownTurns.length > 0) return null;
  return markers.length === 1 ? markers[0] : null;
}

function pickBestCandidate(
  candidates: TurnCandidate[],
  anchor: SourceAnchor,
  knownTurns: Turn[]
): TurnCandidate | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const indexed = candidates
    .map((candidate) => ({
      candidate,
      globalIndex: getCandidateGlobalIndex(candidate, knownTurns)
    }))
    .filter((entry) => entry.globalIndex !== null);

  const exactIndex = indexed.find((entry) => entry.globalIndex === anchor.turnIndex);
  if (exactIndex) return exactIndex.candidate;

  if (knownTurns.length > 0) return null;
  return null;
}

export function findTurnElement(anchor: SourceAnchor, knownTurns: Turn[] = []): HTMLElement | null {
  const turnCandidates = getTurnCandidates();
  const userMarkers = getUserTurnMarkers();

  const idMatch = pickBestCandidate(turnCandidates.filter((candidate) => hasSameMessageIds(candidate, anchor)), anchor, knownTurns);
  if (idMatch) return idMatch.user.element;

  const exactMatch = pickBestCandidate(
    turnCandidates.filter((candidate) => hasSameHashes(candidate, anchor) && hasSameAttachments(candidate, anchor)),
    anchor,
    knownTurns
  );
  if (exactMatch) return exactMatch.user.element;

  const previewMatch = pickBestCandidate(
    turnCandidates.filter((candidate) => hasSamePreviews(candidate, anchor) && hasSameAttachments(candidate, anchor)),
    anchor,
    knownTurns
  );
  if (previewMatch) return previewMatch.user.element;

  const userPreviewMatch = pickBestCandidate(
    turnCandidates.filter((candidate) => hasSameUserPreview(candidate, anchor) && hasSameAttachments(candidate, anchor)),
    anchor,
    knownTurns
  );
  if (userPreviewMatch) return userPreviewMatch.user.element;

  const userMarkerMatch = pickBestUserMarker(
    userMarkers.filter((marker) => markerMatchesAnchor(marker, anchor)),
    anchor,
    knownTurns
  );
  if (userMarkerMatch) return userMarkerMatch.user.element;

  return null;
}

export function getVisibleTurnIndexRange(knownTurns: Turn[] = []): { first: number; last: number; count: number } | null {
  const candidates = getTurnCandidates();
  const userMarkers = getUserTurnMarkers();
  if (candidates.length === 0 && userMarkers.length === 0) return null;

  if (knownTurns.length > 0) {
    const completeIndexes = candidates
      .map((candidate) => getCandidateGlobalIndex(candidate, knownTurns))
      .filter((index): index is number => index !== null)
      .sort((left, right) => left - right);
    const markerIndexes = userMarkers
      .map((marker) => getMarkerGlobalIndex(marker, knownTurns))
      .filter((index): index is number => index !== null)
      .sort((left, right) => left - right);
    const indexes = [...new Set([...completeIndexes, ...markerIndexes])].sort((left, right) => left - right);

    if (indexes.length > 0) {
      return {
        first: indexes[0],
        last: indexes[indexes.length - 1],
        count: indexes.length
      };
    }

    if (candidates.length === knownTurns.length) {
      return {
        first: 0,
        last: knownTurns.length - 1,
        count: candidates.length
      };
    }

    return null;
  }

  if (candidates.length === 0) {
    return {
      first: userMarkers[0].index,
      last: userMarkers[userMarkers.length - 1].index,
      count: userMarkers.length
    };
  }

  return {
    first: candidates[0].index,
    last: candidates[candidates.length - 1].index,
    count: candidates.length
  };
}
