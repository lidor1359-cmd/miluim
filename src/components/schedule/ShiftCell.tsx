"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { getContrastText } from "@/lib/colors";
import { X, Lock, Unlock } from "lucide-react";

interface Soldier {
  id: string;
  name: string;
  color: string;
}

export function ShiftCell({
  cellKey,
  soldier,
  locked,
  onClear,
  onToggleLock,
  highlight,
}: {
  cellKey: string;
  soldier: Soldier | null;
  locked: boolean;
  onClear: () => void;
  onToggleLock: () => void;
  highlight: "ok" | "preferred" | "blocked" | null;
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `cell-${cellKey}`,
  });

  let bgClass = "";
  if (highlight === "blocked") bgClass = "bg-red-100";
  else if (highlight === "preferred") bgClass = "bg-green-200";
  else if (highlight === "ok") bgClass = "";

  const lockedRing = locked ? "ring-2 ring-slate-900 ring-inset" : "";

  if (!soldier) {
    return (
      <td
        ref={setDropRef}
        className={`relative border p-2 ${bgClass} ${
          isOver ? "ring-2 ring-blue-500 ring-inset" : ""
        }`}
        style={{ minHeight: 40, height: 40 }}
      >
        <span className="text-xs text-muted-foreground">—</span>
      </td>
    );
  }

  return (
    <td
      ref={setDropRef}
      className={`relative border p-0 ${
        isOver ? "ring-2 ring-blue-500 ring-inset" : ""
      } ${bgClass} ${lockedRing}`}
      style={{ minHeight: 40, height: 40 }}
    >
      <DraggableCell
        cellKey={cellKey}
        soldier={soldier}
        locked={locked}
        onClear={onClear}
        onToggleLock={onToggleLock}
      />
    </td>
  );
}

function DraggableCell({
  cellKey,
  soldier,
  locked,
  onClear,
  onToggleLock,
}: {
  cellKey: string;
  soldier: Soldier;
  locked: boolean;
  onClear: () => void;
  onToggleLock: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: `cell-${cellKey}`, disabled: locked });

  const textColor = getContrastText(soldier.color);

  return (
    <div
      ref={setNodeRef}
      style={{
        backgroundColor: soldier.color,
        color: textColor,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        opacity: isDragging ? 0.3 : 1,
      }}
      className={`group flex h-full w-full items-center justify-center px-1 py-1 text-xs font-medium touch-none relative select-none ${
        locked ? "cursor-default" : "cursor-grab"
      }`}
    >
      <span
        {...listeners}
        {...attributes}
        className="flex-1 truncate text-center"
      >
        {soldier.name}
      </span>

      {/* Persistent lock indicator when locked */}
      {locked && (
        <span
          className="absolute bottom-0 end-0 m-0.5 rounded bg-black/40 p-0.5"
          title="שיבוץ קשיח"
        >
          <Lock className="h-2.5 w-2.5" style={{ color: "white" }} />
        </span>
      )}

      {/* Toggle lock button (hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleLock();
        }}
        className="absolute top-0 end-0 h-4 w-4 rounded-bl bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
        title={locked ? "שחרר" : "נעל"}
      >
        {locked ? (
          <Unlock className="h-3 w-3" style={{ color: "white" }} />
        ) : (
          <Lock className="h-3 w-3" style={{ color: "white" }} />
        )}
      </button>

      {/* Clear button (hover) - hidden when locked */}
      {!locked && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="absolute top-0 start-0 h-4 w-4 rounded-br bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
          title="הסר"
        >
          <X className="h-3 w-3" style={{ color: "white" }} />
        </button>
      )}
    </div>
  );
}
