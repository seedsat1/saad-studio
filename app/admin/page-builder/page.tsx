"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  Eye,
  Edit3,
  Save,
  Type,
  Image as ImageIcon,
  Video,
  Minus,
  LayoutPanelTop,
} from "lucide-react";

type BlockType =
  | "heading"
  | "text"
  | "button"
  | "image"
  | "video"
  | "divider"
  | "spacer";

type Block = {
  id: string;
  type: BlockType;
  label?: string;
  content?: string;
  url?: string;
  href?: string;
  align?: "left" | "center" | "right";
  size?: "sm" | "md" | "lg" | "xl";
  bg?: string;
  color?: string;
  padding?: number;
  height?: number;
};

const STORAGE_KEY = "saad-admin-page-builder-v1";

function uid() {
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createBlock(type: BlockType): Block {
  const base: Block = { id: uid(), type, align: "left", size: "md", padding: 12 };
  switch (type) {
    case "heading":
      return { ...base, label: "Heading", content: "عنوان رئيسي" };
    case "text":
      return { ...base, label: "Text", content: "نص وصفي بسيط..." };
    case "button":
      return { ...base, label: "Button", content: "ابدأ الآن", href: "#", bg: "#111827", color: "#ffffff" };
    case "image":
      return { ...base, label: "Image", url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200" };
    case "video":
      return { ...base, label: "Video", url: "https://www.w3schools.com/html/mov_bbb.mp4" };
    case "divider":
      return { ...base, label: "Divider" };
    case "spacer":
      return { ...base, label: "Spacer", height: 24 };
    default:
      return base;
  }
}

function SortableRow({
  block,
  selected,
  onSelect,
  children,
}: {
  block: Block;
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border bg-white p-3 shadow-sm ${
        selected ? "border-cyan-400 ring-2 ring-cyan-200" : "border-slate-200 hover:border-slate-300"
      }`}
      onClick={onSelect}
    >
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-40 group-hover:opacity-100">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="rounded-md border border-slate-200 bg-white p-1 text-slate-500"
          title="Move"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

export default function AdminPageBuilder() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Block[];
        setBlocks(parsed);
        setSelectedId(parsed[0]?.id ?? null);
      } else {
        const seed = [createBlock("heading"), createBlock("text"), createBlock("button")];
        setBlocks(seed);
        setSelectedId(seed[0].id);
      }
    } catch {
      const seed = [createBlock("heading"), createBlock("text")];
      setBlocks(seed);
      setSelectedId(seed[0].id);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  }, [blocks]);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedId) ?? null,
    [blocks, selectedId]
  );

  function addBlock(type: BlockType) {
    const next = createBlock(type);
    setBlocks((prev) => [...prev, next]);
    setSelectedId(next.id);
  }

  function removeSelected() {
    if (!selectedId) return;
    setBlocks((prev) => prev.filter((b) => b.id !== selectedId));
    setSelectedId((prev) => (prev === selectedId ? null : prev));
  }

  function duplicateSelected() {
    if (!selectedBlock) return;
    const copy = { ...selectedBlock, id: uid(), label: `${selectedBlock.label ?? "Block"} Copy` };
    setBlocks((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  }

  function updateSelected(patch: Partial<Block>) {
    if (!selectedId) return;
    setBlocks((prev) => prev.map((b) => (b.id === selectedId ? { ...b, ...patch } : b)));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const oldIndex = prev.findIndex((x) => x.id === active.id);
      const newIndex = prev.findIndex((x) => x.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function exportJson() {
    navigator.clipboard.writeText(JSON.stringify(blocks, null, 2)).catch(() => null);
  }

  return (
    <section className="min-h-screen bg-slate-100 p-4 text-slate-900">
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LayoutPanelTop className="h-5 w-5 text-cyan-600" />
            <h1 className="text-lg font-semibold">Admin Page Builder (Drag & Drop)</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode((v) => !v)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
            >
              {previewMode ? <><Edit3 className="mr-1 inline h-3.5 w-3.5" /> Edit</> : <><Eye className="mr-1 inline h-3.5 w-3.5" /> Preview</>}
            </button>
            <button
              onClick={exportJson}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
            >
              <Copy className="mr-1 inline h-3.5 w-3.5" />
              Copy JSON
            </button>
            <button
              onClick={() => localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks))}
              className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white"
            >
              <Save className="mr-1 inline h-3.5 w-3.5" />
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Add Blocks</p>
          <div className="grid grid-cols-2 gap-2">
            <AddBtn icon={<Type className="h-4 w-4" />} label="Heading" onClick={() => addBlock("heading")} />
            <AddBtn icon={<Type className="h-4 w-4" />} label="Text" onClick={() => addBlock("text")} />
            <AddBtn icon={<Plus className="h-4 w-4" />} label="Button" onClick={() => addBlock("button")} />
            <AddBtn icon={<ImageIcon className="h-4 w-4" />} label="Image" onClick={() => addBlock("image")} />
            <AddBtn icon={<Video className="h-4 w-4" />} label="Video" onClick={() => addBlock("video")} />
            <AddBtn icon={<Minus className="h-4 w-4" />} label="Divider" onClick={() => addBlock("divider")} />
            <AddBtn icon={<Minus className="h-4 w-4" />} label="Spacer" onClick={() => addBlock("spacer")} />
          </div>
        </aside>

        <main className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase text-slate-500">Canvas</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {blocks.map((block) => (
                  <SortableRow
                    key={block.id}
                    block={block}
                    selected={!previewMode && selectedId === block.id}
                    onSelect={() => !previewMode && setSelectedId(block.id)}
                  >
                    <CanvasBlock block={block} />
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </main>

        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Inspector</p>
          {!selectedBlock ? (
            <p className="text-sm text-slate-500">Select a block to edit.</p>
          ) : (
            <div className="space-y-2 text-xs">
              <Field label="Type" value={selectedBlock.type} readOnly />
              <Field
                label="Label"
                value={selectedBlock.label ?? ""}
                onChange={(v) => updateSelected({ label: v })}
              />
              {(selectedBlock.type === "heading" ||
                selectedBlock.type === "text" ||
                selectedBlock.type === "button") && (
                <Field
                  label="Content"
                  value={selectedBlock.content ?? ""}
                  onChange={(v) => updateSelected({ content: v })}
                  textarea
                />
              )}
              {selectedBlock.type === "button" && (
                <Field
                  label="Link (href)"
                  value={selectedBlock.href ?? ""}
                  onChange={(v) => updateSelected({ href: v })}
                />
              )}
              {(selectedBlock.type === "image" || selectedBlock.type === "video") && (
                <Field
                  label="Source URL"
                  value={selectedBlock.url ?? ""}
                  onChange={(v) => updateSelected({ url: v })}
                  textarea
                />
              )}
              {selectedBlock.type === "spacer" && (
                <Field
                  label="Height"
                  value={String(selectedBlock.height ?? 24)}
                  onChange={(v) => updateSelected({ height: Number(v) || 24 })}
                />
              )}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={duplicateSelected}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5"
                >
                  <Copy className="mr-1 inline h-3.5 w-3.5" />
                  Duplicate
                </button>
                <button
                  onClick={removeSelected}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-rose-700"
                >
                  <Trash2 className="mr-1 inline h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function AddBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs hover:bg-slate-50"
    >
      {icon}
      <span className="ml-1">{label}</span>
    </button>
  );
}

function CanvasBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "heading":
      return <h2 className="text-2xl font-bold text-slate-900">{block.content}</h2>;
    case "text":
      return <p className="text-sm text-slate-700">{block.content}</p>;
    case "button":
      return (
        <button
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: block.bg ?? "#111827", color: block.color ?? "#ffffff" }}
        >
          {block.content || "Button"}
        </button>
      );
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.url} alt={block.label || "Image block"} className="max-h-[280px] w-full rounded-lg object-cover" />
      );
    case "video":
      return <video src={block.url} controls className="max-h-[300px] w-full rounded-lg bg-black" />;
    case "divider":
      return <hr className="border-slate-300" />;
    case "spacer":
      return <div style={{ height: block.height ?? 24 }} />;
    default:
      return null;
  }
}

function Field({
  label,
  value,
  onChange,
  textarea,
  readOnly,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  textarea?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <p className="mb-1 text-[11px] font-medium text-slate-500">{label}</p>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          rows={3}
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
        />
      )}
    </label>
  );
}

