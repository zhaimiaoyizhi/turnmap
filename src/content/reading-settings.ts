export type ContentReadingBehaviorSettings = {
  scrollSpeedMultiplier: number;
  edgeWaitSeconds: number;
  jumpSearchStrength: number;
};

const CONTENT_READING_BEHAVIOR_DEFAULTS: ContentReadingBehaviorSettings = {
  scrollSpeedMultiplier: 1,
  edgeWaitSeconds: 0.8,
  jumpSearchStrength: 1
};

const CONTENT_READING_BEHAVIOR_STORAGE_KEYS = {
  scrollSpeedMultiplier: "turnmap.reading.scrollSpeedMultiplier",
  edgeWaitSeconds: "turnmap.reading.edgeWaitSeconds",
  jumpSearchStrength: "turnmap.reading.jumpSearchStrength"
} as const;

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function normalizeScrollSpeedMultiplier(value: unknown): number {
  return Math.round(clampNumber(value, CONTENT_READING_BEHAVIOR_DEFAULTS.scrollSpeedMultiplier, 0.5, 2) * 10) / 10;
}

function normalizeEdgeWaitSeconds(value: unknown): number {
  return Math.round(clampNumber(value, CONTENT_READING_BEHAVIOR_DEFAULTS.edgeWaitSeconds, 0, 20) * 10) / 10;
}

function normalizeJumpSearchStrength(value: unknown): number {
  return Math.round(clampNumber(value, CONTENT_READING_BEHAVIOR_DEFAULTS.jumpSearchStrength, 0.5, 2) * 10) / 10;
}

export async function loadReadingBehaviorSettings(): Promise<ContentReadingBehaviorSettings> {
  try {
    const stored = await chrome.storage.local.get(Object.values(CONTENT_READING_BEHAVIOR_STORAGE_KEYS));
    return {
      scrollSpeedMultiplier: normalizeScrollSpeedMultiplier(
        stored[CONTENT_READING_BEHAVIOR_STORAGE_KEYS.scrollSpeedMultiplier]
      ),
      edgeWaitSeconds: normalizeEdgeWaitSeconds(stored[CONTENT_READING_BEHAVIOR_STORAGE_KEYS.edgeWaitSeconds]),
      jumpSearchStrength: normalizeJumpSearchStrength(stored[CONTENT_READING_BEHAVIOR_STORAGE_KEYS.jumpSearchStrength])
    };
  } catch {
    return { ...CONTENT_READING_BEHAVIOR_DEFAULTS };
  }
}
