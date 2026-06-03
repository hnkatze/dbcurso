"use client";

import { useEffect, useRef, useState } from "react";
import { FirebaseEngine } from "@/lib/engines/firebase";
import type { JsonObject, JsonValue } from "@/lib/engines/firebase";
import { DemoFrame } from "./DemoFrame";
import { JsonTree } from "./JsonTree";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ChatMessage {
  by: string;
  text: string;
  at: number;
  _key: string;
}

interface Phone {
  id: string;
  name: string;
  tint: string;
}

interface LogEntry {
  kind: string;
  path: string;
  at: number;
}

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const PHONES: Phone[] = [
  { id: "ana", name: "Ana", tint: "bg-rose-100 text-rose-700" },
  { id: "luis", name: "Luis", tint: "bg-sea-100 text-sea-700" },
];

/* ------------------------------------------------------------------ */
/* ChatPhone sub-component                                             */
/* ------------------------------------------------------------------ */

function ChatPhone({
  engine,
  me,
  peer,
  onSend,
}: {
  engine: FirebaseEngine;
  me: Phone;
  peer: Phone;
  onSend: (byId: string, text: string) => void;
}) {
  const ref = engine.rtdb.ref("chats/general/messages");
  const tree = (ref.val() ?? {}) as JsonObject;
  const msgs: ChatMessage[] = Object.entries(tree)
    .map(([k, v]) => ({ ...(v as JsonObject), _key: k } as ChatMessage))
    .sort((a, b) => a.at - b.at);

  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs.length]);

  function send() {
    if (!draft.trim()) return;
    onSend(me.id, draft.trim());
    setDraft("");
  }

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[28px] border border-ink bg-ink"
      style={{ minHeight: 380 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 bg-black/40 px-3 py-2">
        <div
          className={`grid h-7 w-7 place-items-center rounded-full font-display text-[14px] font-medium italic ${me.tint}`}
          aria-hidden="true"
        >
          {me.name[0]}
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-medium text-cream">{me.name}</div>
          <div className="text-[10.5px] text-cream/50">chateando con {peer.name}</div>
        </div>
        <span
          className="ml-auto h-2 w-2 animate-pulse rounded-full bg-mint-500"
          aria-label="Conectado"
        />
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto bg-[#1a1611] px-3 py-3"
        style={{ maxHeight: 280 }}
        aria-live="polite"
        aria-label={`Chat de ${me.name}`}
      >
        {msgs.length === 0 && (
          <div className="py-6 text-center font-mono text-[12px] italic text-cream/40">
            Escribe algo abajo →
          </div>
        )}
        {msgs.map((m) => {
          const mine = m.by === me.id;
          return (
            <div
              key={m._key}
              className={`anim-fade-up flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-[13px] ${
                  mine ? "bg-sun-500 text-ink" : "bg-white/10 text-cream"
                }`}
              >
                <div className="leading-snug">{m.text}</div>
                <div className={`mt-0.5 text-[9.5px] ${mine ? "text-ink/60" : "text-cream/50"}`}>
                  {new Date(m.at).toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-white/10 bg-black/40 px-2 py-2">
        <label htmlFor={`msg-${me.id}`} className="sr-only">
          Mensaje de {me.name}
        </label>
        <input
          id={`msg-${me.id}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="mensaje…"
          className="flex-1 bg-transparent px-2 text-[13px] text-cream placeholder-cream/40 focus:outline-none"
        />
        <button
          onClick={send}
          disabled={!draft.trim()}
          className="rounded-full bg-sun-500 px-3 py-1.5 text-[12px] font-medium text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          enviar
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ChatDemo                                                            */
/* ------------------------------------------------------------------ */

export function ChatDemo() {
  const [engine] = useState(() => {
    const e = new FirebaseEngine();
    e.rtdb.ref("chats/general/messages").push({ by: "ana", text: "¿Estás ahí?", at: Date.now() - 60000 });
    e.rtdb.ref("chats/general/messages").push({ by: "luis", text: "Sí, te leo.", at: Date.now() - 30000 });
    return e;
  });

  // force re-render on any RTDB change
  const [, force] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);

  useEffect(() => {
    const unsub = engine.rtdb.onAny((ev) => {
      setLog((l) => [...l, { kind: ev.kind, path: ev.path, at: Date.now() }].slice(-6));
      force((x) => x + 1);
    });
    return unsub;
  }, [engine]);

  function send(byId: string, text: string) {
    engine.rtdb.ref("chats/general/messages").push({ by: byId, text, at: Date.now() });
  }

  function reset() {
    engine.rtdb.ref("chats/general/messages").remove();
    setLog([]);
  }

  return (
    <DemoFrame icon="✆" title="Chat en tiempo real · Realtime Database" subtitle="dos dispositivos, un solo árbol JSON">
      <div className="grid grid-cols-1 gap-5 bg-paper p-6 xl:grid-cols-[1fr_1fr_1.2fr]">
        <ChatPhone engine={engine} me={PHONES[0]!} peer={PHONES[1]!} onSend={send} />
        <ChatPhone engine={engine} me={PHONES[1]!} peer={PHONES[0]!} onSend={send} />

        {/* Tree panel */}
        <div className="flex flex-col gap-3 rounded-2xl bg-ink p-5 font-mono text-[12px] text-cream">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] tracking-widest text-sun-500 uppercase">
              Árbol /chats/general/messages
            </span>
            <button
              onClick={reset}
              className="text-[10px] text-cream/40 hover:text-rose-300"
              aria-label="Limpiar mensajes"
            >
              limpiar
            </button>
          </div>

          <div className="flex-1 overflow-auto rounded-xl border border-white/10 bg-white/5 p-3.5" style={{ maxHeight: 260 }}>
            <JsonTree data={engine.rtdb.tree as JsonValue} />
          </div>

          <div className="text-[10.5px] tracking-widest text-sun-500 uppercase">
            Listeners disparados
          </div>
          <div
            className="overflow-auto rounded-xl border border-white/10 bg-white/5 p-3.5 text-[11px]"
            style={{ minHeight: 80 }}
            aria-live="polite"
            aria-label="Log de eventos RTDB"
          >
            {log.length === 0 ? (
              <div className="italic text-cream/40">on(&apos;value&apos;) está escuchando…</div>
            ) : (
              log.map((e, i) => (
                <div key={i} className={`mb-0.5 ${i === log.length - 1 ? "anim-fade-up" : ""}`}>
                  <span className="text-mint-100">{e.kind.toUpperCase()}</span>
                  <span className="text-cream/40"> · </span>
                  <span className="text-rose-300">{e.path}</span>
                </div>
              ))
            )}
          </div>

          <div className="text-[10.5px] leading-relaxed text-cream/50">
            <span className="text-sun-500">Magia:</span> escribir en un teléfono dispara el listener
            en el otro instantáneamente — sin polling, sin refresh.
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}
