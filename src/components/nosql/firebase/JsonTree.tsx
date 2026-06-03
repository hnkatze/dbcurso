import type { JsonValue } from "@/lib/engines/firebase";

/**
 * Minimal JSON tree renderer for Firebase demo panels.
 * Pure presentational (no hooks), renders in dark code panels.
 * Replaces the legacy window.MongoJsonView global reference.
 */
export function JsonTree({ data, depth = 0 }: { data: JsonValue; depth?: number }) {
  if (data === null || data === undefined) {
    return <span className="italic text-cream/40">null</span>;
  }

  if (typeof data !== "object" || Array.isArray(data)) {
    if (typeof data === "string") {
      return <span className="text-mint-100">&quot;{data}&quot;</span>;
    }
    if (typeof data === "number") {
      return <span className="text-sun-300">{String(data)}</span>;
    }
    if (typeof data === "boolean") {
      return <span className="text-sea-300">{String(data)}</span>;
    }
    if (Array.isArray(data)) {
      return <span className="text-cream/60">[…]</span>;
    }
    return <span className="text-cream/60">{String(data)}</span>;
  }

  const entries = Object.entries(data as Record<string, JsonValue>);

  if (entries.length === 0) {
    return <span className="italic text-cream/40">{"{}"}</span>;
  }

  return (
    <div style={{ paddingLeft: depth > 0 ? "1rem" : 0 }}>
      {entries.map(([key, value]) => (
        <div key={key} className="leading-relaxed">
          <span className="text-rose-300">&quot;{key}&quot;</span>
          <span className="text-cream/40">: </span>
          <JsonTree data={value} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}
