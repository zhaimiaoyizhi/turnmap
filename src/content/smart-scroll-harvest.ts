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

function upwardStepSize(element: HTMLElement): number {
  const viewport = Math.max(360, element.clientHeight || 0);
  const top = scrollTop(element);
  if (top < viewport * 1.2) return Math.max(180, viewport * 0.32);
  if (top < viewport * 3) return Math.max(260, viewport * 0.55);
  return Math.max(520, Math.min(1100, viewport * 0.95));
}

function downwardStepSize(element: HTMLElement): number {
  const viewport = Math.max(360, element.clientHeight || 0);
  return Math.max(520, Math.min(1200, viewport * 0.95));
}

async function waitForScrollSettle(
  scrollElement: HTMLElement,
  collect: () => void,
  countTurns: () => number
): Promise<void> {
  let stableFrames = 0;
  let previousTop = scrollTop(scrollElement);
  let previousHeight = scrollElement.scrollHeight;
  let previousCount = countTurns();

  for (let frame = 0; frame < 8; frame += 1) {
    await delay(frame < 2 ? 55 : 80);
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

export async function smartHarvestByScrolling<T>({
  scrollElement,
  collectTurns,
  mergeTurns,
  normalizeTurns,
  maxUpSteps = 120,
  maxDownSteps = 120
}: SmartScrollHarvestOptions<T>): Promise<SmartScrollHarvestResult<T>> {
  let fallbackHarvested: T[] = [];
  let harvested: T[] = [];
  let scannedSteps = 0;

  const collectFallback = () => {
    fallbackHarvested = mergeTurns(fallbackHarvested, collectTurns());
  };
  const collectOrdered = () => {
    harvested = mergeTurns(harvested, collectTurns());
  };

  collectFallback();

  let blockedUpSteps = 0;
  for (let step = 0; step < maxUpSteps; step += 1) {
    const beforeTop = scrollTop(scrollElement);
    if (beforeTop <= 4) break;

    const targetTop = Math.max(0, beforeTop - upwardStepSize(scrollElement));
    scrollElement.scrollTo({ top: targetTop, behavior: "instant" });
    scannedSteps += 1;
    await waitForScrollSettle(scrollElement, collectFallback, () => fallbackHarvested.length);

    const afterTop = scrollTop(scrollElement);
    if (afterTop >= beforeTop - 4) {
      blockedUpSteps += 1;
      if (blockedUpSteps >= 3) break;
    } else {
      blockedUpSteps = 0;
    }
  }

  collectFallback();
  collectOrdered();

  let blockedDownSteps = 0;
  for (let step = 0; step < maxDownSteps; step += 1) {
    collectOrdered();
    if (isNearBottom(scrollElement)) break;

    const beforeTop = scrollTop(scrollElement);
    const targetTop = Math.min(beforeTop + downwardStepSize(scrollElement), scrollElement.scrollHeight);
    if (targetTop <= beforeTop + 4) break;

    scrollElement.scrollTo({ top: targetTop, behavior: "instant" });
    scannedSteps += 1;
    await waitForScrollSettle(scrollElement, collectOrdered, () => harvested.length);

    const afterTop = scrollTop(scrollElement);
    if (afterTop <= beforeTop + 4) {
      blockedDownSteps += 1;
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
