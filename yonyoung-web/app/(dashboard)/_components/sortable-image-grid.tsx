"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { shouldUseUnoptimizedImage } from "@/features/media/images/image-utils";

type SortableImageGridItem = {
  id: string;
  imageUrl: string;
  label?: string;
  alt?: string;
  subtitle?: string;
};

type SortableImageGridProps = {
  items: SortableImageGridItem[];
  onReorder: (nextItems: SortableImageGridItem[]) => void;
  onRemoveItem?: (itemId: string) => void;
  disabled?: boolean;
  emptyMessage: string;
};

type SortableCardProps = {
  item: SortableImageGridItem;
  disabled: boolean;
  onRemoveItem?: (itemId: string) => void;
};

const SortableImageCard = ({ item, disabled, onRemoveItem }: SortableCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: item.id,
      disabled,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
    >
      <div className="aspect-square overflow-hidden bg-slate-100 dark:bg-slate-700">
        <div className="relative h-full w-full">
          <Image
            src={item.imageUrl}
            alt={item.alt ?? item.label ?? "이미지 미리보기"}
            fill
            className="object-cover"
            unoptimized={shouldUseUnoptimizedImage(item.imageUrl)}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        </div>
      </div>

      <div className="flex items-start justify-between gap-2 px-2 py-1.5">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">
            {item.label ?? "이미지"}
          </p>
          {item.subtitle ? (
            <p className="truncate text-[10px] text-slate-600 dark:text-slate-300">{item.subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            data-testid={`sortable-image-drag-${item.id}`}
            {...attributes}
            {...listeners}
            disabled={disabled}
            className="rounded border border-slate-300 dark:border-slate-600 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="이미지 순서 변경"
            title="마우스로 끌어 순서 변경"
          >
            이동
          </button>
          {onRemoveItem ? (
            <button
              type="button"
              data-testid={`sortable-image-remove-${item.id}`}
              onClick={() => onRemoveItem(item.id)}
              disabled={disabled}
              aria-label="이미지 삭제"
              className="rounded border border-red-200 dark:border-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              삭제
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
};

export default function SortableImageGrid({
  items,
  onReorder,
  onRemoveItem,
  disabled = false,
  emptyMessage,
}: SortableImageGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId) ?? null,
    [activeId, items],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-4 text-xs text-slate-600 dark:text-slate-300">
        {emptyMessage}
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setActiveId(active.id.toString())}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemIds} strategy={rectSortingStrategy}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <SortableImageCard
              key={item.id}
              item={item}
              disabled={disabled}
              onRemoveItem={onRemoveItem}
            />
          ))}
        </ul>
      </SortableContext>
      <DragOverlay>
        {activeItem ? (
          <div className="w-[140px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
            <div className="relative aspect-square w-full">
              <Image
                src={activeItem.imageUrl}
                alt={activeItem.alt ?? activeItem.label ?? "이미지 미리보기"}
                fill
                className="object-cover"
                unoptimized={shouldUseUnoptimizedImage(activeItem.imageUrl)}
                sizes="140px"
              />
            </div>
            <p className="truncate px-2 py-1 text-[11px] text-slate-700 dark:text-slate-200">
              {activeItem.label ?? "이미지"}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
