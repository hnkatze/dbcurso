"use client";

import type { MongoValue } from "@/lib/engines/mongo";

/**
 * Recursive JSON viewer — colored, single-depth inline for small arrays.
 * dark=true renders on the ink (dark) right panel; dark=false on the cream left panel.
 */
export function JsonView({ data, depth = 0, dark = true }: { data: MongoValue; depth?: number; dark?: boolean }) {
  if (data === null) {
    return <span className={dark ? "text-rose-300" : "text-rose-700"}>null</span>;
  }
  if (data === undefined) {
    return <span className="text-white/40 italic">undefined</span>;
  }
  if (typeof data === "boolean") {
    return <span className={dark ? "text-lav-300" : "text-lav-700"}>{String(data)}</span>;
  }
  if (typeof data === "number") {
    return <span className={dark ? "text-sun-500" : "text-sun-700"}>{data}</span>;
  }
  if (typeof data === "string") {
    return <span className={dark ? "text-mint-100" : "text-mint-700"}>"{data}"</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-white/40">{"[ ]"}</span>;
    }
    const inline =
      data.every((x) => typeof x !== "object" || x === null) &&
      data.length <= 4 &&
      JSON.stringify(data).length < 50;

    if (inline) {
      return (
        <span>
          {"["}
          {data.map((v, i) => (
            <span key={i}>
              <JsonView data={v} depth={depth + 1} dark={dark} />
              {i < data.length - 1 && (
                <span className={dark ? "text-white/40" : "text-ink-mute"}>, </span>
              )}
            </span>
          ))}
          {"]"}
        </span>
      );
    }

    return (
      <span>
        <span className={dark ? "text-white/60" : "text-ink-mute"}>{"["}</span>
        <div className="pl-4">
          {data.map((v, i) => (
            <div key={i}>
              <JsonView data={v} depth={depth + 1} dark={dark} />
              {i < data.length - 1 && (
                <span className={dark ? "text-white/40" : "text-ink-mute"}>,</span>
              )}
            </div>
          ))}
        </div>
        <span className={dark ? "text-white/60" : "text-ink-mute"}>"]"</span>
      </span>
    );
  }

  if (typeof data === "object") {
    const keys = Object.keys(data);
    if (keys.length === 0) {
      return <span className="text-white/40">{"{ }"}</span>;
    }
    return (
      <span>
        <span className={dark ? "text-white/60" : "text-ink-mute"}>{"{"}</span>
        <div className="pl-4">
          {keys.map((k, i) => (
            <div key={k}>
              <span className={dark ? "text-rose-300" : "text-rose-700"}>"{k}"</span>
              <span className={dark ? "text-white/40" : "text-ink-mute"}>: </span>
              <JsonView data={(data as Record<string, MongoValue>)[k]} depth={depth + 1} dark={dark} />
              {i < keys.length - 1 && (
                <span className={dark ? "text-white/40" : "text-ink-mute"}>,</span>
              )}
            </div>
          ))}
        </div>
        <span className={dark ? "text-white/60" : "text-ink-mute"}>{"}"}</span>
      </span>
    );
  }

  return <span>{String(data)}</span>;
}
