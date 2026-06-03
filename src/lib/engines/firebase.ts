/**
 * Mini Firebase engine — in-memory simulator of Realtime Database + Firestore.
 * Ported from DBs/firebase-engine.js (window.FirebaseEngine global) to an ES module.
 * Behavior is intentionally identical; only types and exports were added.
 *
 * API:
 *   const fb = new FirebaseEngine();
 *   fb.rtdb.ref('chats/general/messages').push({ ... })
 *   fb.rtdb.ref('users/u1').set({ ... })
 *   fb.rtdb.onAny(cb)       // global listener — returns unsubscribe fn
 *   fb.firestore.collection('orders').add({ ... })
 *   fb.firestore.collection('orders').docs()
 *   fb.firestore.onAny(cb)  // global listener — returns unsubscribe fn
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue }
export type JsonArray = JsonValue[];

export interface RtdbChangeEvent {
  path: string;
  kind: "set" | "update" | "push" | "remove";
  snapshot: JsonValue | undefined;
}

export interface FsChangeEvent {
  coll: string;
  kind: "add" | "update" | "delete";
  doc: FirestoreDoc;
}

export interface FirestoreDoc {
  id: string;
  [key: string]: JsonValue;
}

export type RtdbUnsubscribe = () => void;
export type FsUnsubscribe = () => void;

/* ------------------------------------------------------------------ */
/* Path helpers                                                         */
/* ------------------------------------------------------------------ */

function genKey(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `-${t}${r}`;
}

function getPath(obj: JsonObject, path: string): JsonValue | undefined {
  if (!path) return obj;
  const parts = path.split("/").filter(Boolean);
  let cur: JsonValue = obj;
  for (const p of parts) {
    if (cur === null || typeof cur !== "object" || Array.isArray(cur)) return undefined;
    cur = (cur as JsonObject)[p] as JsonValue;
  }
  return cur;
}

function setPath(obj: JsonObject, path: string, value: JsonValue): JsonObject {
  if (!path) return value as JsonObject;
  const parts = path.split("/").filter(Boolean);
  let cur: JsonObject = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]!;
    const existing = cur[p];
    if (existing === null || existing === undefined || typeof existing !== "object" || Array.isArray(existing)) {
      cur[p] = {} as JsonObject;
    }
    cur = cur[p] as JsonObject;
  }
  cur[parts[parts.length - 1]!] = value;
  return obj;
}

function unsetPath(obj: JsonObject, path: string): void {
  const parts = path.split("/").filter(Boolean);
  let cur: JsonObject = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = cur[parts[i]!];
    if (!next || typeof next !== "object" || Array.isArray(next)) return;
    cur = next as JsonObject;
  }
  delete cur[parts[parts.length - 1]!];
}

/* ------------------------------------------------------------------ */
/* RTDB — Realtime Database                                            */
/* ------------------------------------------------------------------ */

class Ref {
  constructor(
    private readonly db: RTDB,
    readonly path: string,
  ) {}

  val(): JsonValue | undefined {
    return getPath(this.db.tree as JsonObject, this.path);
  }

  set(value: JsonValue): this {
    setPath(this.db.tree as JsonObject, this.path, value);
    this.db._notify(this.path, "set");
    return this;
  }

  update(patch: JsonObject): this {
    const cur = getPath(this.db.tree as JsonObject, this.path);
    const next: JsonObject =
      cur !== null && cur !== undefined && typeof cur === "object" && !Array.isArray(cur)
        ? { ...(cur as JsonObject), ...patch }
        : { ...patch };
    setPath(this.db.tree as JsonObject, this.path, next);
    this.db._notify(this.path, "update");
    return this;
  }

  push(value: JsonValue): string {
    const k = genKey();
    setPath(this.db.tree as JsonObject, `${this.path}/${k}`, value);
    this.db._notify(`${this.path}/${k}`, "push");
    return k;
  }

  remove(): this {
    unsetPath(this.db.tree as JsonObject, this.path);
    this.db._notify(this.path, "remove");
    return this;
  }

  child(seg: string): Ref {
    return new Ref(this.db, `${this.path}/${seg}`);
  }
}

export class RTDB {
  readonly tree: JsonObject = {};
  private readonly _listeners = new Set<(ev: RtdbChangeEvent) => void>();
  private _lastChange: { path: string; kind: string; at: number } | null = null;

  /** @internal */
  _notify(path: string, kind: RtdbChangeEvent["kind"]): void {
    this._lastChange = { path, kind, at: Date.now() };
    const snapshot = getPath(this.tree, path);
    for (const fn of this._listeners) {
      try { fn({ path, kind, snapshot }); } catch { /* swallow listener errors */ }
    }
  }

  ref(path: string): Ref {
    return new Ref(this, (path ?? "").replace(/^\//, ""));
  }

  onAny(fn: (ev: RtdbChangeEvent) => void): RtdbUnsubscribe {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  get lastChange() { return this._lastChange; }
}

/* ------------------------------------------------------------------ */
/* Firestore-lite                                                       */
/* ------------------------------------------------------------------ */

class FCollection {
  constructor(
    private readonly fs: Firestore,
    readonly name: string,
    private readonly _arr: FirestoreDoc[],
  ) {}

  add(doc: Omit<FirestoreDoc, "id"> & Record<string, JsonValue>): string {
    const id = genKey().slice(1);
    const d: FirestoreDoc = { id, ...doc };
    this._arr.push(d);
    this.fs._notify(this.name, "add", d);
    return id;
  }

  set(id: string, doc: Omit<FirestoreDoc, "id"> & Record<string, JsonValue>): string {
    const idx = this._arr.findIndex((x) => x.id === id);
    const d: FirestoreDoc = { id, ...doc };
    if (idx >= 0) {
      this._arr[idx] = d;
      this.fs._notify(this.name, "update", d);
    } else {
      this._arr.push(d);
      this.fs._notify(this.name, "add", d);
    }
    return id;
  }

  update(id: string, patch: Record<string, JsonValue>): boolean {
    const idx = this._arr.findIndex((x) => x.id === id);
    if (idx < 0) return false;
    this._arr[idx] = { ...this._arr[idx]!, ...patch };
    this.fs._notify(this.name, "update", this._arr[idx]!);
    return true;
  }

  delete(id: string): boolean {
    const idx = this._arr.findIndex((x) => x.id === id);
    if (idx < 0) return false;
    const [d] = this._arr.splice(idx, 1);
    this.fs._notify(this.name, "delete", d!);
    return true;
  }

  docs(): FirestoreDoc[] {
    return [...this._arr];
  }
}

export class Firestore {
  private readonly _collections: Record<string, FirestoreDoc[]> = {};
  private readonly _listeners = new Set<(ev: FsChangeEvent) => void>();

  /** @internal */
  _notify(coll: string, kind: FsChangeEvent["kind"], doc: FirestoreDoc): void {
    for (const fn of this._listeners) {
      try { fn({ coll, kind, doc }); } catch { /* swallow listener errors */ }
    }
  }

  collection(name: string): FCollection {
    if (!this._collections[name]) this._collections[name] = [];
    return new FCollection(this, name, this._collections[name]!);
  }

  onAny(fn: (ev: FsChangeEvent) => void): FsUnsubscribe {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }
}

/* ------------------------------------------------------------------ */
/* Public facade                                                        */
/* ------------------------------------------------------------------ */

export class FirebaseEngine {
  readonly rtdb = new RTDB();
  readonly firestore = new Firestore();
}
