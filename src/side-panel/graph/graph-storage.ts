import type { Edge, Node, XYPosition } from "@xyflow/react";

export type LayoutMode = "single" | "radial" | "list" | "two-sided";
type NodeStatus = "open" | "review" | "done";

type StoredGraph = {
  schemaVersion: number;
  positions: Record<string, XYPosition>;
  userEdges: Edge[];
  nodeOverrides: Record<string, { title?: string; summary?: string; status?: NodeStatus; tags?: string[] }>;
  customNodes?: Array<{
    id: string;
    position: XYPosition;
    title: string;
    summary: string;
    status?: NodeStatus;
    tags?: string[];
  }>;
  hiddenNodeIds?: string[];
  layoutMode?: LayoutMode;
  hiddenRoot?: boolean;
  hiddenAutoEdgeIds?: string[];
};

const STORAGE_PREFIX = "chatmap.graph.";
const DEFAULT_LAYOUT_KEY = "chatmap.defaultLayout";
const CURRENT_SCHEMA_VERSION = 2;

function storageKey(conversationId: string): string {
  return `${STORAGE_PREFIX}${conversationId}`;
}

function nodeStatus(value: unknown): NodeStatus | undefined {
  return value === "open" || value === "review" || value === "done" ? value : undefined;
}

export async function loadStoredGraph(conversationId: string): Promise<StoredGraph> {
  const result = await chrome.storage.local.get(storageKey(conversationId));
  const value = result[storageKey(conversationId)] as StoredGraph | undefined;

  return {
    schemaVersion: value?.schemaVersion ?? 0,
    positions: value?.positions ?? {},
    userEdges: value?.userEdges ?? [],
    nodeOverrides: value?.nodeOverrides ?? {},
    customNodes: value?.customNodes ?? [],
    hiddenNodeIds: value?.hiddenNodeIds ?? [],
    layoutMode: value?.layoutMode,
    hiddenRoot: value?.hiddenRoot ?? false,
    hiddenAutoEdgeIds: value?.hiddenAutoEdgeIds ?? []
  };
}

export async function saveStoredGraph(
  conversationId: string,
  nodes: Node[],
  userEdges: Edge[],
  layoutMode?: LayoutMode,
  hiddenRoot = false,
  hiddenAutoEdgeIds: string[] = [],
  hiddenNodeIds: string[] = []
): Promise<void> {
  const positions = Object.fromEntries(nodes.map((node) => [node.id, node.position]));
  const nodeOverrides = Object.fromEntries(
    nodes.map((node) => [
      node.id,
      {
        title: typeof node.data?.title === "string" ? node.data.title : undefined,
        summary: typeof node.data?.summary === "string" ? node.data.summary : undefined,
        status: nodeStatus(node.data?.status),
        tags: Array.isArray(node.data?.tags) ? node.data.tags.filter((tag) => typeof tag === "string") : undefined
      }
    ])
  );
  const customNodes = nodes
    .filter((node) => node.id !== "conversation-root" && !node.data?.turn)
    .map((node) => ({
      id: node.id,
      position: node.position,
      title: typeof node.data?.title === "string" ? node.data.title : node.id,
      summary: typeof node.data?.summary === "string" ? node.data.summary : "",
      status: nodeStatus(node.data?.status),
      tags: Array.isArray(node.data?.tags) ? node.data.tags.filter((tag) => typeof tag === "string") : undefined
    }));

  await chrome.storage.local.set({
    [storageKey(conversationId)]: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      positions,
      userEdges,
      nodeOverrides,
      customNodes,
      hiddenNodeIds,
      layoutMode,
      hiddenRoot,
      hiddenAutoEdgeIds
    } satisfies StoredGraph
  });
}

export async function resetStoredGraph(conversationId: string): Promise<void> {
  await chrome.storage.local.remove(storageKey(conversationId));
}

export async function loadDefaultLayout(): Promise<LayoutMode> {
  const result = await chrome.storage.local.get(DEFAULT_LAYOUT_KEY);
  const value = result[DEFAULT_LAYOUT_KEY];
  return value === "radial" || value === "list" || value === "two-sided" || value === "single"
    ? value
    : "single";
}

export async function saveDefaultLayout(layoutMode: LayoutMode): Promise<void> {
  await chrome.storage.local.set({ [DEFAULT_LAYOUT_KEY]: layoutMode });
}
