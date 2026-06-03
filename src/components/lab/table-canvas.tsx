"use client";

import { useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { Table } from "@/lib/engines/sql";

/**
 * Interactive ERD canvas (React Flow spike).
 * Tables become draggable nodes; foreign keys become animated edges that
 * connect the FK column to the referenced PK column. Pan/zoom is contained
 * inside the canvas, so it never fights the page scroll.
 */

type Tint = { head: string; ring: string };

const TINTS: Tint[] = [
  { head: "bg-sun-100", ring: "border-b-sun-500" },
  { head: "bg-sea-100", ring: "border-b-sea-500" },
  { head: "bg-rose-100", ring: "border-b-rose-500" },
  { head: "bg-mint-100", ring: "border-b-mint-500" },
  { head: "bg-lav-100", ring: "border-b-lav-500" },
];

type TableNodeData = { table: Table; tint: Tint };
type TableFlowNode = Node<TableNodeData, "table">;

/* ---------- Custom node: a table with column-level handles ---------- */
function TableNode({ data }: NodeProps<TableFlowNode>) {
  const { table, tint } = data;
  const fkCount = table.cols.filter((c) => c.fk).length;
  const isBridge = fkCount >= 2;
  return (
    <div className="border-line bg-paper shadow-paper2 min-w-[180px] overflow-hidden rounded-2xl border font-sans">
      <div className={`flex items-center justify-between gap-2 border-b-2 px-3.5 py-2 ${tint.head} ${tint.ring}`}>
        <span className="text-ink font-mono text-[13px] font-semibold">{table.name}</span>
        {isBridge && (
          <span
            className="bg-ink text-cream rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider"
            title="Tabla puente: resuelve una relación muchos a muchos"
          >
            N:N
          </span>
        )}
      </div>
      <div>
        {table.cols.map((c) => (
          <div
            key={c.name}
            className="border-line-soft relative flex items-center gap-2 border-b border-dashed px-3.5 py-1.5 last:border-b-0"
          >
            <Handle
              type="target"
              position={Position.Left}
              id={`t-${c.name}`}
              className="!h-2 !w-2 !border-0 !bg-sea-300"
            />
            <span className="text-ink font-mono text-[12px]">{c.name}</span>
            <span className="text-ink-mute ml-auto font-mono text-[10px]">
              {c.type}
              {c.typeArgs ? `(${c.typeArgs})` : ""}
            </span>
            {c.pk && (
              <span title="Primary Key" aria-label="Primary Key">
                🔑
              </span>
            )}
            {c.fk && (
              <span title={`FK → ${c.fk.refTable}.${c.fk.refCol}`} aria-label="Foreign Key">
                ↗
              </span>
            )}
            <Handle
              type="source"
              position={Position.Right}
              id={`s-${c.name}`}
              className="!h-2 !w-2 !border-0 !bg-sea-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const nodeTypes = { table: TableNode };

/* ---------- Builders ---------- */
function buildNodes(tables: Record<string, Table>): TableFlowNode[] {
  const names = Object.keys(tables);
  return names.map((name, i) => ({
    id: name,
    type: "table",
    position: { x: (i % 3) * 280, y: Math.floor(i / 3) * 300 },
    data: { table: tables[name]!, tint: TINTS[i % TINTS.length]! },
  }));
}

function buildEdges(tables: Record<string, Table>): Edge[] {
  const names = Object.keys(tables);
  const byLower = new Map(names.map((n) => [n.toLowerCase(), n]));
  const edges: Edge[] = [];
  for (const name of names) {
    for (const c of tables[name]!.cols) {
      if (!c.fk) continue;
      const target = byLower.get(c.fk.refTable.toLowerCase());
      if (!target) continue;
      // A unique/PK foreign key means each referenced row matches at most one
      // row here → 1:1. Otherwise the FK side is the "many" → 1:N.
      const card = c.pk || c.unique ? "1:1" : "1:N";
      const stroke = card === "1:1" ? "#8b5cf6" : "#3b82f6";
      edges.push({
        id: `${name}.${c.name}->${target}.${c.fk.refCol}`,
        source: name,
        sourceHandle: `s-${c.name}`,
        target,
        targetHandle: `t-${c.fk.refCol}`,
        animated: true,
        style: { stroke, strokeWidth: 1.5 },
        label: `${card} · ${c.name} → ${c.fk.refCol}`,
        labelBgStyle: { fill: "#fffaf0", fillOpacity: 0.92 },
        labelBgPadding: [5, 3],
        labelBgBorderRadius: 6,
        labelStyle: { fontSize: 10, fill: "#1e3a8a", fontWeight: 600 },
      });
    }
  }
  return edges;
}

/* ---------- Canvas ---------- */
export function TableCanvas({ tables }: { tables: Record<string, Table> }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<TableFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Rebuild when the schema (table names + columns) changes. Drag positions are
  // preserved between rebuilds because this only fires on schema changes.
  const schemaSig = Object.keys(tables)
    .map((n) => `${n}:${tables[n]!.cols.map((c) => `${c.name}/${c.pk ? "p" : ""}${c.fk ? "f" : ""}`).join(",")}`)
    .join("|");

  useEffect(() => {
    setNodes(buildNodes(tables));
    setEdges(buildEdges(tables));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaSig, setNodes, setEdges]);

  return (
    <div className="border-line bg-cream w-full overflow-hidden rounded-xl border">
      <div className="h-[440px] w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.3}
          maxZoom={1.75}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#d6c9b0" gap={18} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <div className="border-line text-ink-mute flex flex-wrap items-center gap-x-5 gap-y-1 border-t px-3.5 py-2 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-5 rounded bg-sea-500" />
          <strong className="text-ink font-semibold">1:N</strong> uno a muchos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[2px] w-5 rounded bg-lav-500" />
          <strong className="text-ink font-semibold">1:1</strong> uno a uno (FK única)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-ink text-cream rounded px-1 py-0.5 font-mono text-[9px] font-semibold">N:N</span>
          tabla puente
        </span>
      </div>
    </div>
  );
}
