"use client";

import { useState } from "react";
import { MongoDB } from "@/lib/engines/mongo";
import type { MongoDocument } from "@/lib/engines/mongo";
import { JsonView } from "./json-view";
import { CmdLog, DemoFrame, LeftPane, RightPane } from "./demo-frame";
import type { CmdEntry } from "./demo-frame";

interface BlogPost extends MongoDocument {
  _id: string;
  title: string;
  author: string;
  tags: string[];
  stats: { views: number; likes: number };
  comments: Array<{ by: string; text: string; likes: number }>;
}

function createInitialDb(): MongoDB {
  const d = new MongoDB();
  d.collection("posts").insertOne({
    _id: "p001",
    title: "Por qué empezar con SQL antes que NoSQL",
    author: "profesor_db",
    tags: ["sql", "tutorial", "aprender"],
    stats: { views: 142, likes: 28 },
    comments: [
      { by: "ana", text: "Buenísimo, muy claro 👏", likes: 3 },
      { by: "luis", text: "¿Y cuándo se justifica Mongo entonces?", likes: 1 },
    ],
  });
  return d;
}

export function BlogDemo() {
  const [db] = useState<MongoDB>(createInitialDb);
  const [, forceUpdate] = useState(0);
  const [history, setHistory] = useState<CmdEntry[]>([]);
  const [name, setName] = useState("tu_usuario");
  const [draft, setDraft] = useState("");

  const post = db.collection("posts").findOne({ _id: "p001" }) as BlogPost;

  function record(cmd: string) {
    setHistory((h) => [...h, { cmd }].slice(-8));
  }

  function addComment() {
    if (!draft.trim()) return;
    const c = { by: name || "anónimo", text: draft.trim(), likes: 0 };
    db.collection("posts").updateOne(
      { _id: "p001" },
      { $push: { comments: c }, $inc: { "stats.views": 1 } },
    );
    record(
      `db.posts.updateOne({_id:"p001"}, { $push: { comments: ${JSON.stringify(c)} }, $inc: { "stats.views": 1 } })`,
    );
    setDraft("");
    forceUpdate((x) => x + 1);
  }

  function likeComment(idx: number) {
    const cur = post.comments[idx];
    if (!cur) return;
    const newLikes = (cur as { likes: number }).likes + 1;
    db.collection("posts").updateOne(
      { _id: "p001" },
      { $set: { [`comments.${idx}.likes`]: newLikes } },
    );
    record(
      `db.posts.updateOne({_id:"p001"}, { $set: { "comments.${idx}.likes": ${newLikes} } })`,
    );
    forceUpdate((x) => x + 1);
  }

  function removeComment(idx: number) {
    const c = post.comments[idx] as { by: string; text: string };
    if (!c) return;
    db.collection("posts").updateOne(
      { _id: "p001" },
      { $pull: { comments: { by: c.by, text: c.text } } },
    );
    record(
      `db.posts.updateOne({_id:"p001"}, { $pull: { comments: { by: "${c.by}", text: "${c.text}" } } })`,
    );
    forceUpdate((x) => x + 1);
  }

  function likePost() {
    db.collection("posts").updateOne({ _id: "p001" }, { $inc: { "stats.likes": 1 } });
    record(`db.posts.updateOne({_id:"p001"}, { $inc: { "stats.likes": 1 } })`);
    forceUpdate((x) => x + 1);
  }

  const tags = post.tags as string[];
  const comments = post.comments as Array<{ by: string; text: string; likes: number }>;
  const stats = post.stats as { views: number; likes: number };

  return (
    <DemoFrame
      icon="✎"
      title="Blog · post con comentarios"
      subtitle="collection posts · documento con arrays anidados"
    >
      <LeftPane>
        <article className="rounded-2xl bg-cream border border-line overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-line">
            <div className="text-[10.5px] tracking-widest uppercase text-ink-mute mb-1">
              {tags.join(" · ")}
            </div>
            <h3 className="font-display text-[22px] font-semibold leading-tight mb-2 mt-0">
              {post.title as string}
            </h3>
            <div className="flex items-center gap-3 text-[12px] text-ink-mute flex-wrap">
              <span className="font-mono">@{post.author as string}</span>
              <span aria-hidden="true">·</span>
              <button
                onClick={likePost}
                className="hover:text-rose-700 transition"
                aria-label={`Dar like al post. ${stats.likes} likes`}
              >
                ♥ {stats.likes}
              </button>
              <span aria-hidden="true">·</span>
              <span aria-label={`${stats.views} vistas`}>👁 {stats.views}</span>
            </div>
          </div>

          <div className="px-5 py-3">
            <div className="text-[11px] tracking-widest uppercase text-ink-mute mb-2">
              {comments.length} comentarios
            </div>
            <div className="space-y-2 mb-3">
              {comments.map((c, i) => (
                <div
                  key={i}
                  className="anim-fade-up flex items-start gap-3 p-2.5 rounded-lg bg-paper border border-line"
                >
                  <div
                    className="w-7 h-7 rounded-full bg-sea-100 text-sea-700 grid place-items-center font-display italic text-[12px] font-medium shrink-0"
                    aria-hidden="true"
                  >
                    {c.by[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-ink-mute font-mono mb-0.5">@{c.by}</div>
                    <div className="text-[13px] text-ink leading-snug">{c.text}</div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <button
                        onClick={() => likeComment(i)}
                        className="font-mono text-[11px] text-ink-mute hover:text-rose-700 transition"
                        aria-label={`Dar like al comentario de ${c.by}. ${c.likes} likes`}
                      >
                        ♥ {c.likes}
                      </button>
                      <button
                        onClick={() => removeComment(i)}
                        className="font-mono text-[11px] text-ink-mute hover:text-rose-700 transition"
                        aria-label={`Borrar comentario de ${c.by}`}
                      >
                        borrar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-paper border border-line p-2 flex items-center gap-2">
              <label className="sr-only" htmlFor="blog-comment-user">
                Usuario
              </label>
              <input
                id="blog-comment-user"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="font-mono text-[11.5px] bg-cream-deep border-0 rounded px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-sun-500"
                placeholder="usuario"
              />
              <label className="sr-only" htmlFor="blog-comment-draft">
                Comentario
              </label>
              <input
                id="blog-comment-draft"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addComment();
                }}
                placeholder="Escribe un comentario…"
                className="flex-1 text-[13px] bg-transparent border-0 focus:outline-none"
              />
              <button
                onClick={addComment}
                disabled={!draft.trim()}
                className="bg-ink text-cream rounded-md px-3 py-1.5 text-[12px] font-medium hover:bg-[#2a221a] active:translate-y-px transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Comentar
              </button>
            </div>
          </div>
        </article>
      </LeftPane>

      <RightPane>
        <div className="text-[10.5px] tracking-widest uppercase text-sun-500 mb-1">
          Documento completo · posts/{post._id as string}
        </div>
        <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 overflow-auto max-h-[280px]">
          <div className="font-mono text-[11.5px] leading-relaxed">
            <JsonView data={post} />
          </div>
        </div>
        <div className="text-[10.5px] tracking-widest uppercase text-sun-500 mt-1">
          Últimos comandos
        </div>
        <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 flex-1 overflow-auto">
          <CmdLog entries={history} />
        </div>
      </RightPane>
    </DemoFrame>
  );
}
