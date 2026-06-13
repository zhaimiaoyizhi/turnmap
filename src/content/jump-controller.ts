import type { JumpToTurnResult, SourceAnchor } from "../shared/types";
import { getLatestTurns } from "./chatgpt-observer";
import { loadReadingBehaviorSettings } from "./reading-settings.ts";
import { getChatScrollElement } from "./scroll-container";
import { findTurnElement, getVisibleTurnIndexRange } from "./turn-extractor";

const HIGHLIGHT_CLASS = "turnmap-source-highlight";
let jumpSequence = 0;
let activeJump: { key: string; promise: Promise<JumpToTurnResult> } | null = null;

function ensureHighlightStyle(): void {
  if (document.getElementById("turnmap-highlight-style")) return;

  const style = document.createElement("style");
  style.id = "turnmap-highlight-style";
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      outline: 3px solid #10a37f !important;
      outline-offset: 6px !important;
      border-radius: 8px !important;
      transition: outline-color 200ms ease;
    }
  `;
  document.documentElement.append(style);
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function isCurrentJump(sequence: number): boolean {
  return sequence === jumpSequence;
}

function anchorKey(anchor: SourceAnchor): string {
  return [
    anchor.turnIndex,
    anchor.userMessageId ?? "",
    anchor.assistantMessageId ?? "",
    anchor.userHash,
    anchor.assistantHash,
    (anchor.userAttachmentNames ?? []).join("|")
  ].join("::");
}

function scrollElementToCenter(element: HTMLElement, scrollElement: HTMLElement): void {
  const elementRect = element.getBoundingClientRect();
  const containerRect = scrollElement.getBoundingClientRect();
  const containerTop =
    scrollElement === document.documentElement || scrollElement === document.body ? 0 : containerRect.top;
  const targetTop =
    scrollElement.scrollTop + elementRect.top - containerTop - scrollElement.clientHeight * 0.35;

  scrollElement.scrollTo({
    top: Math.max(0, targetTop),
    behavior: "instant"
  });
}

function highlightElement(element: HTMLElement, sequence: number): void {
  if (!isCurrentJump(sequence)) return;
  scrollElementToCenter(element, getChatScrollElement());
  element.classList.add(HIGHLIGHT_CLASS);
  window.setTimeout(() => {
    if (!isCurrentJump(sequence)) return;
    element.classList.remove(HIGHLIGHT_CLASS);
  }, 2200);
}

function jumpSearchDelta(scrollElement: HTMLElement, strength: number): number {
  const scrollRange = Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight);
  const viewport = Math.max(240, scrollElement.clientHeight || 0);
  const safeStrength = Math.max(0.5, Math.min(2, strength));
  if (scrollRange <= viewport * 2.5) return Math.max(120, Math.min(560, viewport * 0.35 * safeStrength));
  return Math.max(260, Math.min(1200, viewport * 0.65 * safeStrength));
}

function jumpSearchStepLimit(scrollElement: HTMLElement, requestedMaxSteps: number, strength: number): number {
  const scrollRange = Math.max(0, scrollElement.scrollHeight - scrollElement.clientHeight);
  const byDistance = Math.ceil(scrollRange / Math.max(1, jumpSearchDelta(scrollElement, strength))) + 3;
  return Math.max(2, Math.min(requestedMaxSteps, byDistance));
}

async function findTurnElementWithLazyScroll(
  anchor: SourceAnchor,
  sequence: number
): Promise<HTMLElement | null> {
  const immediate = findTurnElement(anchor, getLatestTurns());
  if (immediate) return immediate;
  if (!isCurrentJump(sequence)) return null;

  const scrollElement = getChatScrollElement();
  const originalTop = scrollElement.scrollTop;
  const direction = getSearchDirection(anchor, scrollElement);
  const settings = await loadReadingBehaviorSettings();
  const strength = settings.jumpSearchStrength;

  const directedResult = await searchInDirection(anchor, scrollElement, direction, 90, sequence, strength);
  if (directedResult) return directedResult;
  if (!isCurrentJump(sequence)) return null;

  const fallbackDirection = direction === "up" ? "down" : "up";
  const fallbackResult = await searchInDirection(anchor, scrollElement, fallbackDirection, 45, sequence, strength);
  if (fallbackResult) return fallbackResult;
  if (!isCurrentJump(sequence)) return null;

  scrollElement.scrollTo({ top: originalTop, behavior: "instant" });
  await delay(120);
  return null;
}

function getSearchDirection(anchor: SourceAnchor, scrollElement: HTMLElement): "up" | "down" {
  const knownTurns = getLatestTurns();
  const range = getVisibleTurnIndexRange(knownTurns);

  if (range) {
    if (anchor.turnIndex < range.first) return "up";
    if (anchor.turnIndex > range.last) return "down";

    const midpoint = (range.first + range.last) / 2;
    return anchor.turnIndex < midpoint ? "up" : "down";
  }

  if (knownTurns.length > 1) {
    const maxScrollTop = Math.max(1, scrollElement.scrollHeight - scrollElement.clientHeight);
    const scrollRatio = scrollElement.scrollTop / maxScrollTop;
    const estimatedCurrentTurn = scrollRatio * (knownTurns.length - 1);
    return anchor.turnIndex < estimatedCurrentTurn ? "up" : "down";
  }

  return anchor.turnIndex === 0 ? "up" : "down";
}

async function searchInDirection(
  anchor: SourceAnchor,
  scrollElement: HTMLElement,
  direction: "up" | "down",
  maxSteps: number,
  sequence: number,
  strength: number
): Promise<HTMLElement | null> {
  const boundedMaxSteps = jumpSearchStepLimit(scrollElement, maxSteps, strength);
  let blockedSteps = 0;

  for (let step = 0; step < boundedMaxSteps; step += 1) {
    if (!isCurrentJump(sequence)) return null;

    const visible = findTurnElement(anchor, getLatestTurns());
    if (visible) return visible;

    const currentTop = scrollElement.scrollTop;
    const delta = jumpSearchDelta(scrollElement, strength);
    const nextTop =
      direction === "up"
        ? Math.max(0, currentTop - delta)
        : Math.min(scrollElement.scrollHeight, currentTop + delta);

    if (Math.abs(nextTop - currentTop) < 4) break;

    scrollElement.scrollTo({
      top: nextTop,
      behavior: "instant"
    });
    await delay(120);
    if (!isCurrentJump(sequence)) return null;

    const found = findTurnElement(anchor, getLatestTurns());
    if (found) return found;

    if (Math.abs(scrollElement.scrollTop - currentTop) < 4) {
      blockedSteps += 1;
      if (blockedSteps >= 2) break;
    } else {
      blockedSteps = 0;
    }
  }

  return null;
}

async function runJump(anchor: SourceAnchor, sequence: number): Promise<JumpToTurnResult> {
  ensureHighlightStyle();

  const element = await findTurnElementWithLazyScroll(anchor, sequence);
  if (!isCurrentJump(sequence)) {
    return { ok: false, reason: "Jump cancelled by a newer node click." };
  }
  if (!element) {
    return { ok: false, reason: "The original ChatGPT turn could not be found." };
  }

  highlightElement(element, sequence);

  return { ok: true };
}

export function jumpToTurn(anchor: SourceAnchor): Promise<JumpToTurnResult> {
  const key = anchorKey(anchor);
  if (activeJump?.key === key) return activeJump.promise;

  const sequence = (jumpSequence += 1);
  const promise = runJump(anchor, sequence).finally(() => {
    if (activeJump?.key === key) activeJump = null;
  });

  activeJump = { key, promise };
  return promise;
}
