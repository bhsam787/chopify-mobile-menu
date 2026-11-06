import type { ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Design } from "@chopi/menu-core";
import { locate, moveNode } from "@chopi/menu-core";

/**
 * Moves `activeId` to where `overId` is, within the same container
 * (arrayMove semantics on top of `moveNode`, which inserts before an index).
 */
export function reorder(
  design: Design,
  activeId: string,
  overId: string,
): Design {
  const from = locate(design, activeId);
  const to = locate(design, overId);
  if (
    !from?.parent ||
    !to?.parent ||
    from.parent.id !== to.parent.id ||
    activeId === overId
  )
    return design;
  const target = from.index < to.index ? to.index + 1 : to.index;
  return moveNode(design, activeId, from.parent.id, target);
}

/** Vertical drag-and-drop list. Pointer drags start after 4px; keyboard: focus the handle, Space, arrows, Space. */
export function SortableList({
  ids,
  onReorder,
  children,
}: {
  ids: string[];
  onReorder: (activeId: string, overId: string) => void;
  children: ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id)
      onReorder(String(active.id), String(over.id));
  };
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/** One draggable entry. `children` receives the drag handle to place in the row. */
export function SortableItem({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="chm-drag-handle"
      aria-label={`Drag to reorder ${label}`}
      {...attributes}
      {...listeners}
    >
      <s-icon type="drag-handle" color="subdued" />
    </button>
  );
  return (
    <div
      ref={setNodeRef}
      className={isDragging ? "chm-sortable is-dragging" : "chm-sortable"}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {children(handle)}
    </div>
  );
}
