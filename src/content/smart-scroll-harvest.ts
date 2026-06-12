import type { ReadingBehaviorSettings } from "../shared/reading-settings.ts";

export type SmartScrollHarvestResult<T> = {
  turns: T[];
  scannedSteps: number;
};

type SmartScrollHarvestOptions<T> = {
  scrollElement: HTMLElement;
  collectTurns: () => T[];
  mergeTurns: (existing: T[], incoming: T[]) => T[];
  normalizeTurns: (turns: T[]) => T[];
  maxUpSteps?: number;
  maxDownSteps?: number;
  settings?: Pick<ReadingBehaviorSettings, "scrollSpeedMultiplier" | "edgeWaitSeconds">;
};

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function scrollTop(element: HTMLElement): number {
  return Math.max(0, element.scrollTop);
}

function isNearBottom(element: HTMLElement): boolean {
  return scrollTop(element) + element.clientHeight >= element.scrollHeight - 6;
}

function upwardStepSize(element: HTMLElement, speedMultiplier: number): number {
  const viewport = Math.max(360, element.clientHeight || 0);
  const top = scrollTop(element);
  const speed = Math.max(0.5, Math.min(2, speedMultiplier));
  if (top < viewport * 1.2) return Math.max(140, Math.min(520, viewport * 0.32 * speed));
  if (top < viewport * 3) return Math.max(220, Math.min(760, viewport * 0.55 * speed));
  return Math.max(380, Math.min(1500, viewport * 0.95 * speed));
}

function downwardStepSize(element: HTMLElement, speedMultiplier: number): number {
  const viewport = Math.max(360, element.clientHeight || 0);
  const speed = Math.max(0.5, Math.min(2, speedMultiplier));
  return Math.max(380, Math.min(1600, viewport * 0.95 * speed));
}

async function waitForScrollSettle(
  scrollElement: HTMLElement,
  collect: () => void,
  countTurns: () => number,
  speedMultiplier: number
): Promise<void> {
  let stableFrames = 0;
  let previousTop = scrollTop(scrollElement);
  let previousHeight = scrollElement.scrollHeight;
  let previousCount = countTurns();
  const speed = Math.max(0.5, Math.min(2, speedMultiplier));

  for (let frame = 0; frame < 8; frame += 1) {
    await delay(Math.round((frame < 2 ? 55 : 80) / speed));
    collect();

    const nextTop = scrollTop(scrollElement);
    const nextHeight = scrollElement.scrollHeight;
    const nextCount = countTurns();
    const stable =
      Math.abs(nextTop - previousTop) < 3 &&
      Math.abs(nextHeight - previousHeight) < 3 &&
      nextCount === previousCount;

    stableFrames = stable ? stableFrames + 1 : 0;
    previousTop = nextTop;
    previousHeight = nextHeight;
    previousCount = nextCount;

    if (stableFrames >= 2) break;
  }
}

async function waitForEdgeLoad(edgeWaitSeconds: number, collect: () => void): Promise<void> {
  if (edgeWaitSeconds <= 0) return;
  await delay(Math.round(edgeWaitSeconds * 1000));
  collect();
}

export async function smartHarvestByScrolling<T>({
  scrollElement,
  collectTurns,
  mergeTurns,
  normalizeTurns,
  maxUpSteps = 120,
  maxDownSteps = 120,
  settings
}: SmartScrollHarvestOptions<T>): Promise<SmartScrollHarvestResult<T>> {
  let fallbackHarvested: T[] = [];
  let harvested: T[] = [];
  let scannedSteps = 0;
  const speedMultiplier = settings?.scrollSpeedMultiplier ?? 1;
  const edgeWaitSeconds = settings?.edgeWaitSeconds ?? 0.8;

  const collectFallback = () => {
    fallbackHarvested = mergeTurns(fallbackHarvested, collectTurns());
  };
  const collectOrdered = () => {
    harvested = mergeTurns(harvested, collectTurns());
  };

  collectFallback();

  let blockedUpSteps = 0;
  let waitedAtTop = false;
  for (let step = 0; step < maxUpSteps; step += 1) {
    const beforeTop = scrollTop(scrollElement);
    if (beforeTop <= 4) {
      if (!waitedAtTop) {
        waitedAtTop = true;
        await waitForEdgeLoad(edgeWaitSeconds, collectFallback);
      }
      break;
    }

    const targetTop = Math.max(0, beforeTop - upwardStepSize(scrollElement, speedMultiplier));
    scrollElement.scrollTo({ top: targetTop, behavior: "instant" });
    scannedSteps += 1;
    await waitForScrollSettle(scrollElement, collectFallback, () => fallbackHarvested.length, speedMultiplier);

    const afterTop = scrollTop(scrollElement);
    if (afterTop >= beforeTop - 4) {
      blockedUpSteps += 1;
      if (!waitedAtTop) {
        waitedAtTop = true;
        await waitForEdgeLoad(edgeWaitSeconds, collectFallback);
      }
      if (blockedUpSteps >= 3) break;
    } else {
      blockedUpSteps = 0;
    }
  }

  collectFallback();
  collectOrdered();

  let blockedDownSteps = 0;
  let waitedAtBottom = false;
  for (let step = 0; step < maxDownSteps; step += 1) {
    collectOrdered();
    if (isNearBottom(scrollElement)) {
      if (!waitedAtBottom) {
        waitedAtBottom = true;
        await waitForEdgeLoad(edgeWaitSeconds, collectOrdered);
      }
      break;
    }

    const beforeTop = scrollTop(scrollElement);
    const targetTop = Math.min(beforeTop + downwardStepSize(scrollElement, speedMultiplier), scrollElement.scrollHeight);
    if (targetTop <= beforeTop + 4) break;

    scrollElement.scrollTo({ top: targetTop, behavior: "instant" });
    scannedSteps += 1;
    await waitForScrollSettle(scrollElement, collectOrdered, () => harvested.length, speedMultiplier);

    const afterTop = scrollTop(scrollElement);
    if (afterTop <= beforeTop + 4) {
      blockedDownSteps += 1;
      if (!waitedAtBottom) {
        waitedAtBottom = true;
        await waitForEdgeLoad(edgeWaitSeconds, collectOrdered);
      }
      if (blockedDownSteps >= 3) break;
    } else {
      blockedDownSteps = 0;
    }
  }

  collectOrdered();
  return {
    turns: normalizeTurns(harvested.length > 0 ? harvested : fallbackHarvested),
    scannedSteps
  };
}
