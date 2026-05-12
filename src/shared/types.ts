export type SourceAnchor = {
  turnIndex: number;
  userMessageId?: string;
  assistantMessageId?: string;
  userAttachmentNames?: string[];
  userHash: string;
  assistantHash: string;
  userPreview: string;
  assistantPreview: string;
};

export type Turn = {
  id: string;
  turnIndex: number;
  userText: string;
  assistantText: string;
  sourceAnchor: SourceAnchor;
  extractedAt: number;
};

export type ConversationInfo = {
  id: string;
  title: string;
};

export type ExtractedTurnsMessage = {
  type: "CHATMAP_TURNS_UPDATED";
  turns: Turn[];
  conversationTitle: string;
  conversationId: string;
  harvestMeta?: {
    attempted: boolean;
    source: "conversation-api" | "structured" | "web-storage" | "indexeddb" | "dom" | "deep-scan";
    scrollContainer: string;
    scrollHeight: number;
    clientHeight: number;
    scannedSteps: number;
  };
};

export type RequestTurnsMessage = {
  type: "CHATMAP_REQUEST_TURNS";
  harvest?: boolean;
  ensureFull?: boolean;
};

export type JumpToTurnMessage = {
  type: "CHATMAP_JUMP_TO_TURN";
  anchor: SourceAnchor;
};

export type SetFloatingPanelMessage = {
  type: "CHATMAP_SET_FLOATING_PANEL";
  enabled: boolean;
};

export type OpenSidePanelMessage = {
  type: "CHATMAP_OPEN_SIDE_PANEL";
};

export type OpenSettingsMessage = {
  type: "CHATMAP_OPEN_SETTINGS";
};

export type JumpToTurnResult = {
  ok: boolean;
  reason?: string;
};

export type FetchConversationApiMessage = {
  type: "CHATMAP_FETCH_CONVERSATION_API";
  conversationId: string;
};

export type FetchConversationApiResult = {
  ok: boolean;
  root?: unknown;
  status?: number;
  reason?: string;
};

export type ChatMapMessage =
  | ExtractedTurnsMessage
  | RequestTurnsMessage
  | JumpToTurnMessage
  | SetFloatingPanelMessage
  | OpenSidePanelMessage
  | OpenSettingsMessage
  | FetchConversationApiMessage;
