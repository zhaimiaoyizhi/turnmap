export type ReadingBehaviorSettings = {
  scrollSpeedMultiplier: number;
  edgeWaitSeconds: number;
  jumpSearchStrength: number;
};

export const READING_BEHAVIOR_DEFAULTS: ReadingBehaviorSettings = {
  scrollSpeedMultiplier: 1,
  edgeWaitSeconds: 0.8,
  jumpSearchStrength: 1
};

export const READING_BEHAVIOR_STORAGE_KEYS = {
  scrollSpeedMultiplier: "turnmap.reading.scrollSpeedMultiplier",
  edgeWaitSeconds: "turnmap.reading.edgeWaitSeconds",
  jumpSearchStrength: "turnmap.reading.jumpSearchStrength"
} as const;

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

export function normalizeScrollSpeedMultiplier(value: unknown): number {
  return Math.round(clampNumber(value, READING_BEHAVIOR_DEFAULTS.scrollSpeedMultiplier, 0.5, 2) * 10) / 10;
}

export function normalizeEdgeWaitSeconds(value: unknown): number {
  return Math.round(clampNumber(value, READING_BEHAVIOR_DEFAULTS.edgeWaitSeconds, 0, 20) * 10) / 10;
}

export function normalizeJumpSearchStrength(value: unknown): number {
  return Math.round(clampNumber(value, READING_BEHAVIOR_DEFAULTS.jumpSearchStrength, 0.5, 2) * 10) / 10;
}

export function normalizeReadingBehaviorSettings(value: Partial<ReadingBehaviorSettings>): ReadingBehaviorSettings {
  return {
    scrollSpeedMultiplier: normalizeScrollSpeedMultiplier(value.scrollSpeedMultiplier),
    edgeWaitSeconds: normalizeEdgeWaitSeconds(value.edgeWaitSeconds),
    jumpSearchStrength: normalizeJumpSearchStrength(value.jumpSearchStrength)
  };
}

export async function loadReadingBehaviorSettings(): Promise<ReadingBehaviorSettings> {
  try {
    const stored = await chrome.storage.local.get(Object.values(READING_BEHAVIOR_STORAGE_KEYS));
    return normalizeReadingBehaviorSettings({
      scrollSpeedMultiplier: stored[READING_BEHAVIOR_STORAGE_KEYS.scrollSpeedMultiplier],
      edgeWaitSeconds: stored[READING_BEHAVIOR_STORAGE_KEYS.edgeWaitSeconds],
      jumpSearchStrength: stored[READING_BEHAVIOR_STORAGE_KEYS.jumpSearchStrength]
    });
  } catch {
    return { ...READING_BEHAVIOR_DEFAULTS };
  }
}

export async function saveReadingBehaviorSettings(settings: ReadingBehaviorSettings): Promise<void> {
  const normalized = normalizeReadingBehaviorSettings(settings);
  await chrome.storage.local.set({
    [READING_BEHAVIOR_STORAGE_KEYS.scrollSpeedMultiplier]: normalized.scrollSpeedMultiplier,
    [READING_BEHAVIOR_STORAGE_KEYS.edgeWaitSeconds]: normalized.edgeWaitSeconds,
    [READING_BEHAVIOR_STORAGE_KEYS.jumpSearchStrength]: normalized.jumpSearchStrength
  });
}
