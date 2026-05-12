import { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export function TurnNode({ id, data, selected }: NodeProps) {
  const nodeData = data as {
    title: string;
    summary: string;
    turn?: { turnIndex: number };
    isConversationRoot?: boolean;
    isCustomNode?: boolean;
    status?: "open" | "review" | "done";
    tags?: string[];
    onUpdate?: (nodeId: string, updates: { title?: string; summary?: string }) => void;
    onSummarize?: (nodeId: string) => void;
    isSummarizing?: boolean;
  };
  const [editingField, setEditingField] = useState<"title" | "summary" | null>(null);

  const commitEdit = (field: "title" | "summary", value: string) => {
    const trimmed = value.trim();
    if (trimmed) {
      nodeData.onUpdate?.(id, { [field]: trimmed });
    }
    setEditingField(null);
  };

  return (
    <article
      className={`turn-node ${nodeData.isConversationRoot ? "is-root" : ""} ${
        selected ? "is-selected" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="turn-node__meta">
        <span>
          {nodeData.isConversationRoot
            ? "Conversation"
            : nodeData.isCustomNode
              ? "Note"
              : `Turn ${nodeData.turn!.turnIndex + 1}`}
        </span>
        {!nodeData.isConversationRoot && !nodeData.isCustomNode ? (
          <button
            type="button"
            className="turn-node__mini-button"
            disabled={nodeData.isSummarizing}
            onClick={(event) => {
              event.stopPropagation();
              nodeData.onSummarize?.(id);
            }}
          >
            {nodeData.isSummarizing ? "AI..." : "AI"}
          </button>
        ) : null}
      </div>
      {editingField === "title" ? (
        <textarea
          className="turn-node__editor turn-node__editor--title"
          defaultValue={nodeData.title}
          onBlur={(event) => commitEdit("title", event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              commitEdit("title", event.currentTarget.value);
            }
          }}
          autoFocus
        />
      ) : (
        <h2 onDoubleClick={() => setEditingField("title")}>{nodeData.title}</h2>
      )}
      {editingField === "summary" ? (
        <textarea
          className="turn-node__editor"
          defaultValue={nodeData.summary}
          onBlur={(event) => commitEdit("summary", event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.ctrlKey) {
              event.preventDefault();
              commitEdit("summary", event.currentTarget.value);
            }
          }}
          autoFocus
        />
      ) : (
        <p onDoubleClick={() => setEditingField("summary")}>{nodeData.summary}</p>
      )}
      {(nodeData.status || (nodeData.tags && nodeData.tags.length > 0)) && !nodeData.isConversationRoot ? (
        <div className="turn-node__badges">
          {nodeData.status ? <span>{nodeData.status}</span> : null}
          {nodeData.tags?.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      ) : null}
      <Handle type="source" position={Position.Bottom} />
    </article>
  );
}
