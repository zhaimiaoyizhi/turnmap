import type { JumpToTurnMessage, JumpToTurnResult, TurnNavigation } from "../shared/types";
import { resolveChatGptOphelTarget } from "./chatgpt-ophel-navigation";

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

function isCurrentJump(sequence: number): boolean {
  return sequence === jumpSequence;
}

function navigationKey(navigation: TurnNavigation): string {
  return [
    navigation.kind,
    navigation.site,
    navigation.navigationId,
    navigation.messageId ?? "",
    navigation.turnId ?? "",
    navigation.nativeTocIndex ?? ""
  ].join("::");
}

function highlightElement(element: HTMLElement, sequence: number, scroll = false): void {
  if (!isCurrentJump(sequence)) return;
  if (scroll) {
    element.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  }
  element.classList.add(HIGHLIGHT_CLASS);
  window.setTimeout(() => {
    if (!isCurrentJump(sequence)) return;
    element.classList.remove(HIGHLIGHT_CLASS);
  }, 2200);
}

async function runJump(target: Pick<JumpToTurnMessage, "navigation">, sequence: number): Promise<JumpToTurnResult> {
  ensureHighlightStyle();

  if (!target.navigation) {
    return {
      ok: false,
      reason: "This ChatGPT turn has no ophel_notSourceAnchor navigation identity."
    };
  }

  const nativeTarget = await resolveChatGptOphelTarget(target.navigation);
  if (!isCurrentJump(sequence)) {
    return { ok: false, reason: "Jump cancelled by a newer node click." };
  }
  if (!nativeTarget.ok) {
    return { ok: false, reason: nativeTarget.detail };
  }

  highlightElement(nativeTarget.element, sequence, false);
  return { ok: true };
}

export function jumpToTurn(target: Pick<JumpToTurnMessage, "navigation">): Promise<JumpToTurnResult> {
  const key = target.navigation ? navigationKey(target.navigation) : "missing-navigation";
  if (activeJump?.key === key) return activeJump.promise;

  const sequence = (jumpSequence += 1);
  const promise = runJump(target, sequence).finally(() => {
    if (activeJump?.key === key) activeJump = null;
  });

  activeJump = { key, promise };
  return promise;
}
