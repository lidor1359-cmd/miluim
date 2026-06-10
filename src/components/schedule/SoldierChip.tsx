"use client";

import { useDraggable } from "@dnd-kit/core";
import { getContrastText } from "@/lib/colors";

interface Soldier {
  id: string;
  name: string;
  color: string;
}

export function SoldierChip({
  id,
  soldier,
  count,
  isDragging,
}: {
  id: string;
  soldier: Soldier;
  count: number;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging: dragging } =
    useDraggable({ id });

  const style: React.CSSProperties = {
    backgroundColor: soldier.color,
    color: getContrastText(soldier.color),
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: dragging ? 0.3 : 1,
    cursor: "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium shadow-sm select-none touch-none ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      <span className="truncate">{soldier.name}</span>
      {count > 0 && (
        <span className="ms-1 rounded-full bg-black/20 px-1.5 text-xs">
          {count}
        </span>
      )}
    </div>
  );
}
