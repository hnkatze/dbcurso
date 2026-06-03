/**
 * Mini Redis engine — in-memory, teaching subset.
 * Ported from DBs/redis-engine.js (window.RedisEngine global) to an ES module.
 * Behavior is intentionally identical; only types and exports were added.
 *
 * Structures: string, list, hash, set, zset
 * Supports TTL with EX and EXPIRE (visual — expires on read, not on a real timer)
 */

/* ---------- Public types ---------- */

export type RedisType = "string" | "list" | "hash" | "set" | "zset";

export interface RedisEntry {
  type: RedisType;
  val: string | string[] | Record<string, string> | Record<string, number>;
  expireAt?: number;
}

export type RedisEvent =
  | { type: "key-set"; key: string; kind: RedisType }
  | { type: "key-del"; key: string }
  | { type: "key-touch"; key: string }
  | { type: "ttl"; key: string; ttlMs: number | null };

export interface CommandOutput {
  ok: true;
  cmd: string;
  args: string[];
  result: RedisResult;
}

export interface CommandError {
  ok: false;
  cmd: string;
  args: string[];
  error: string;
}

export type CommandOutputEntry = CommandOutput | CommandError;

export interface ExecResult {
  outputs: CommandOutputEntry[];
  events: RedisEvent[];
}

/** Primitive result values returned by Redis commands. */
export type RedisResult =
  | string
  | number
  | null
  | string[]
  | (string | number)[]
  | Record<string, string>;

/* ---------- Database ---------- */

export class RedisDB {
  data: Record<string, RedisEntry> = {};
  keyOrder: string[] = [];
}

/* ---------- Internal helpers ---------- */

function getLive(db: RedisDB, key: string): RedisEntry | null {
  const v = db.data[key];
  if (!v) return null;
  if (v.expireAt !== undefined && Date.now() > v.expireAt) {
    removeKey(db, key);
    return null;
  }
  return v;
}

function setKey(
  db: RedisDB,
  key: string,
  type: RedisType,
  val: RedisEntry["val"],
  opts: { expireAt?: number } = {},
): void {
  if (!(key in db.data)) db.keyOrder.push(key);
  db.data[key] = { type, val, expireAt: opts.expireAt };
}

function removeKey(db: RedisDB, key: string): void {
  if (key in db.data) {
    delete db.data[key];
    db.keyOrder = db.keyOrder.filter((k) => k !== key);
  }
}

/* ---------- Tokenizer ---------- */

export function tokenize(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    const c = line[i]!;
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      let s = "";
      while (j < line.length && line[j] !== q) {
        if (line[j] === "\\" && j + 1 < line.length) { s += line[j + 1]; j += 2; }
        else { s += line[j]; j++; }
      }
      out.push(s);
      i = j + 1;
      continue;
    }
    let j = i;
    while (j < line.length && !/\s/.test(line[j]!)) j++;
    out.push(line.slice(i, j));
    i = j;
  }
  return out;
}

/* ---------- Formatter (Redis CLI style) ---------- */

export function fmt(v: RedisResult): string {
  if (v === null || v === undefined) return "(nil)";
  if (Array.isArray(v)) {
    if (v.length === 0) return "(empty array)";
    return v.map((x, i) => `${i + 1}) ${typeof x === "string" ? `"${x}"` : x}`).join("\n");
  }
  if (typeof v === "object") {
    const keys = Object.keys(v);
    if (keys.length === 0) return "(empty)";
    return keys
      .map((k, i) => `${i * 2 + 1}) "${k}"\n${i * 2 + 2}) "${(v as Record<string, string>)[k]}"`)
      .join("\n");
  }
  if (typeof v === "string") return `"${v}"`;
  return String(v);
}

/* ---------- Command runner ---------- */

function run(db: RedisDB, cmd: string, args: string[], events: RedisEvent[]): RedisResult {
  const c = (cmd || "").toUpperCase();

  switch (c) {
    /* ===== Generic ===== */
    case "DEL": {
      let n = 0;
      for (const k of args) {
        if (db.data[k]) {
          events.push({ type: "key-del", key: k });
          removeKey(db, k);
          n++;
        }
      }
      return n;
    }
    case "EXISTS": {
      let n = 0;
      for (const k of args) {
        if (getLive(db, k)) {
          events.push({ type: "key-touch", key: k });
          n++;
        }
      }
      return n;
    }
    case "KEYS": {
      const pat = args[0] ?? "*";
      const re = new RegExp(
        "^" +
          pat
            .replace(/[.+^${}()|[\]\\]/g, "\\$&")
            .replace(/\*/g, ".*")
            .replace(/\?/g, ".") +
          "$",
      );
      return db.keyOrder.filter((k) => re.test(k));
    }
    case "TYPE": {
      const v = getLive(db, args[0] ?? "");
      return v ? v.type : "none";
    }
    case "EXPIRE": {
      const [key, sec] = args as [string, string];
      const v = getLive(db, key);
      if (!v) return 0;
      v.expireAt = Date.now() + parseInt(sec) * 1000;
      events.push({ type: "ttl", key, ttlMs: parseInt(sec) * 1000 });
      return 1;
    }
    case "PERSIST": {
      const v = getLive(db, args[0] ?? "");
      if (!v || !v.expireAt) return 0;
      delete v.expireAt;
      events.push({ type: "ttl", key: args[0]!, ttlMs: null });
      return 1;
    }
    case "TTL": {
      const v = getLive(db, args[0] ?? "");
      if (!v) return -2;
      if (!v.expireAt) return -1;
      return Math.max(0, Math.ceil((v.expireAt - Date.now()) / 1000));
    }
    case "FLUSHDB":
    case "FLUSHALL": {
      const keys = [...db.keyOrder];
      for (const k of keys) {
        events.push({ type: "key-del", key: k });
        removeKey(db, k);
      }
      return "OK";
    }
    case "DBSIZE":
      return db.keyOrder.length;

    /* ===== Strings ===== */
    case "SET": {
      const [key, value, ...opts] = args as [string, string, ...string[]];
      if (!key || value === undefined) throw new Error("uso: SET key value [EX seconds]");
      let expireAt: number | undefined;
      for (let i = 0; i < opts.length; i++) {
        if ((opts[i] ?? "").toUpperCase() === "EX") {
          expireAt = Date.now() + parseInt(opts[i + 1] ?? "0") * 1000;
        }
      }
      setKey(db, key, "string", value, { expireAt });
      events.push({ type: "key-set", key, kind: "string" });
      if (expireAt !== undefined) events.push({ type: "ttl", key, ttlMs: expireAt - Date.now() });
      return "OK";
    }
    case "GET": {
      const key = args[0] ?? "";
      const v = getLive(db, key);
      events.push({ type: "key-touch", key });
      if (!v) return null;
      if (v.type !== "string") throw new Error("WRONGTYPE");
      return v.val as string;
    }
    case "INCR":
    case "DECR":
    case "INCRBY":
    case "DECRBY": {
      const key = args[0] ?? "";
      const by =
        c === "INCR" ? 1
        : c === "DECR" ? -1
        : c === "INCRBY" ? parseInt(args[1] ?? "1")
        : -parseInt(args[1] ?? "1");
      let v = getLive(db, key);
      if (!v) {
        setKey(db, key, "string", "0");
        v = db.data[key]!;
      }
      if (v.type !== "string") throw new Error("WRONGTYPE");
      const n = (parseInt(v.val as string) || 0) + by;
      v.val = String(n);
      events.push({ type: "key-set", key, kind: "string" });
      return n;
    }
    case "APPEND": {
      const [key, value] = args as [string, string];
      let v = getLive(db, key);
      if (!v) {
        setKey(db, key, "string", "");
        v = db.data[key]!;
      }
      v.val = (v.val as string) + value;
      events.push({ type: "key-set", key, kind: "string" });
      return (v.val as string).length;
    }
    case "STRLEN": {
      const v = getLive(db, args[0] ?? "");
      return v ? (v.val as string).length : 0;
    }
    case "MSET": {
      for (let i = 0; i < args.length; i += 2) {
        setKey(db, args[i]!, "string", args[i + 1] ?? "");
        events.push({ type: "key-set", key: args[i]!, kind: "string" });
      }
      return "OK";
    }
    case "MGET": {
      return args.map((k) => {
        const v = getLive(db, k);
        events.push({ type: "key-touch", key: k });
        return v ? (v.val as string) : null;
      }) as string[];
    }

    /* ===== Lists ===== */
    case "LPUSH":
    case "RPUSH": {
      const [key, ...vals] = args as [string, ...string[]];
      let v = getLive(db, key);
      if (!v) {
        setKey(db, key, "list", []);
        v = db.data[key]!;
      }
      if (v.type !== "list") throw new Error("WRONGTYPE");
      const list = v.val as string[];
      for (const x of vals) {
        if (c === "LPUSH") list.unshift(x);
        else list.push(x);
      }
      events.push({ type: "key-set", key, kind: "list" });
      return list.length;
    }
    case "LPOP":
    case "RPOP": {
      const key = args[0] ?? "";
      const v = getLive(db, key);
      if (!v) return null;
      if (v.type !== "list") throw new Error("WRONGTYPE");
      const list = v.val as string[];
      const x = c === "LPOP" ? list.shift() : list.pop();
      if (list.length === 0) {
        events.push({ type: "key-del", key });
        removeKey(db, key);
      } else {
        events.push({ type: "key-set", key, kind: "list" });
      }
      return x ?? null;
    }
    case "LRANGE": {
      const [key, start, stop] = args as [string, string, string];
      const v = getLive(db, key);
      events.push({ type: "key-touch", key });
      if (!v) return [];
      if (v.type !== "list") throw new Error("WRONGTYPE");
      const list = v.val as string[];
      let s = parseInt(start);
      let e = parseInt(stop);
      if (s < 0) s = list.length + s;
      if (e < 0) e = list.length + e;
      return list.slice(s, e + 1);
    }
    case "LLEN": {
      const v = getLive(db, args[0] ?? "");
      return v ? (v.val as string[]).length : 0;
    }
    case "LINDEX": {
      const v = getLive(db, args[0] ?? "");
      if (!v) return null;
      let i = parseInt(args[1] ?? "0");
      const list = v.val as string[];
      if (i < 0) i = list.length + i;
      return list[i] ?? null;
    }

    /* ===== Hashes ===== */
    case "HSET": {
      const [key, ...rest] = args as [string, ...string[]];
      let v = getLive(db, key);
      if (!v) {
        setKey(db, key, "hash", {});
        v = db.data[key]!;
      }
      if (v.type !== "hash") throw new Error("WRONGTYPE");
      const hash = v.val as Record<string, string>;
      let n = 0;
      for (let i = 0; i < rest.length; i += 2) {
        if (!(rest[i]! in hash)) n++;
        hash[rest[i]!] = rest[i + 1] ?? "";
      }
      events.push({ type: "key-set", key, kind: "hash" });
      return n;
    }
    case "HGET": {
      const [key, field] = args as [string, string];
      const v = getLive(db, key);
      events.push({ type: "key-touch", key });
      if (!v) return null;
      return (v.val as Record<string, string>)[field] ?? null;
    }
    case "HGETALL": {
      const v = getLive(db, args[0] ?? "");
      events.push({ type: "key-touch", key: args[0]! });
      if (!v) return {};
      return { ...(v.val as Record<string, string>) };
    }
    case "HDEL": {
      const [key, ...fields] = args as [string, ...string[]];
      const v = getLive(db, key);
      if (!v) return 0;
      const hash = v.val as Record<string, string>;
      let n = 0;
      for (const f of fields) {
        if (f in hash) {
          delete hash[f];
          n++;
        }
      }
      if (Object.keys(hash).length === 0) {
        events.push({ type: "key-del", key });
        removeKey(db, key);
      } else {
        events.push({ type: "key-set", key, kind: "hash" });
      }
      return n;
    }
    case "HINCRBY": {
      const [key, field, by] = args as [string, string, string];
      let v = getLive(db, key);
      if (!v) {
        setKey(db, key, "hash", {});
        v = db.data[key]!;
      }
      const hash = v.val as Record<string, string>;
      const n = (parseInt(hash[field] ?? "0") || 0) + parseInt(by);
      hash[field] = String(n);
      events.push({ type: "key-set", key, kind: "hash" });
      return n;
    }
    case "HKEYS": {
      const v = getLive(db, args[0] ?? "");
      return v ? Object.keys(v.val as Record<string, string>) : [];
    }
    case "HVALS": {
      const v = getLive(db, args[0] ?? "");
      return v ? Object.values(v.val as Record<string, string>) : [];
    }
    case "HLEN": {
      const v = getLive(db, args[0] ?? "");
      return v ? Object.keys(v.val as Record<string, string>).length : 0;
    }
    case "HEXISTS": {
      const v = getLive(db, args[0] ?? "");
      return v && args[1] !== undefined && args[1] in (v.val as Record<string, string>) ? 1 : 0;
    }

    /* ===== Sets ===== */
    case "SADD": {
      const [key, ...vals] = args as [string, ...string[]];
      let v = getLive(db, key);
      if (!v) {
        setKey(db, key, "set", []);
        v = db.data[key]!;
      }
      if (v.type !== "set") throw new Error("WRONGTYPE");
      const set = v.val as string[];
      let n = 0;
      for (const x of vals) {
        if (!set.includes(x)) {
          set.push(x);
          n++;
        }
      }
      events.push({ type: "key-set", key, kind: "set" });
      return n;
    }
    case "SREM": {
      const [key, ...vals] = args as [string, ...string[]];
      const v = getLive(db, key);
      if (!v) return 0;
      const set = v.val as string[];
      let n = 0;
      for (const x of vals) {
        const idx = set.indexOf(x);
        if (idx >= 0) {
          set.splice(idx, 1);
          n++;
        }
      }
      if (set.length === 0) {
        events.push({ type: "key-del", key });
        removeKey(db, key);
      } else {
        events.push({ type: "key-set", key, kind: "set" });
      }
      return n;
    }
    case "SMEMBERS": {
      const v = getLive(db, args[0] ?? "");
      events.push({ type: "key-touch", key: args[0]! });
      return v ? [...(v.val as string[])] : [];
    }
    case "SISMEMBER": {
      const v = getLive(db, args[0] ?? "");
      return v && (v.val as string[]).includes(args[1] ?? "") ? 1 : 0;
    }
    case "SCARD": {
      const v = getLive(db, args[0] ?? "");
      return v ? (v.val as string[]).length : 0;
    }

    /* ===== Sorted sets ===== */
    case "ZADD": {
      const [key, ...rest] = args as [string, ...string[]];
      let v = getLive(db, key);
      if (!v) {
        setKey(db, key, "zset", {});
        v = db.data[key]!;
      }
      if (v.type !== "zset") throw new Error("WRONGTYPE");
      const zset = v.val as Record<string, number>;
      let n = 0;
      for (let i = 0; i < rest.length; i += 2) {
        if (!(rest[i + 1]! in zset)) n++;
        zset[rest[i + 1]!] = parseFloat(rest[i]!);
      }
      events.push({ type: "key-set", key, kind: "zset" });
      return n;
    }
    case "ZRANGE":
    case "ZREVRANGE": {
      const [key, start, stop, ...rest] = args as [string, string, string, ...string[]];
      const v = getLive(db, key);
      events.push({ type: "key-touch", key });
      if (!v) return [];
      const zset = v.val as Record<string, number>;
      const sorted = Object.entries(zset).sort((a, b) =>
        c === "ZRANGE" ? a[1] - b[1] : b[1] - a[1],
      );
      let s = parseInt(start);
      let e = parseInt(stop);
      if (s < 0) s = sorted.length + s;
      if (e < 0) e = sorted.length + e;
      const slice = sorted.slice(s, e + 1);
      const withScores = rest.some((r) => (r ?? "").toUpperCase() === "WITHSCORES");
      return withScores
        ? slice.flatMap(([m, sc]) => [m, sc] as [string, number])
        : slice.map(([m]) => m);
    }
    case "ZSCORE": {
      const v = getLive(db, args[0] ?? "");
      return v ? ((v.val as Record<string, number>)[args[1] ?? ""] ?? null) : null;
    }
    case "ZINCRBY": {
      const [key, by, member] = args as [string, string, string];
      let v = getLive(db, key);
      if (!v) {
        setKey(db, key, "zset", {});
        v = db.data[key]!;
      }
      const zset = v.val as Record<string, number>;
      zset[member] = (zset[member] ?? 0) + parseFloat(by);
      events.push({ type: "key-set", key, kind: "zset" });
      return zset[member]!;
    }
    case "ZCARD": {
      const v = getLive(db, args[0] ?? "");
      return v ? Object.keys(v.val as Record<string, number>).length : 0;
    }
    case "ZRANK": {
      const v = getLive(db, args[0] ?? "");
      if (!v) return null;
      const sorted = Object.entries(v.val as Record<string, number>).sort((a, b) => a[1] - b[1]);
      const i = sorted.findIndex(([m]) => m === args[1]);
      return i >= 0 ? i : null;
    }
    case "ZREVRANK": {
      const v = getLive(db, args[0] ?? "");
      if (!v) return null;
      const sorted = Object.entries(v.val as Record<string, number>).sort((a, b) => b[1] - a[1]);
      const i = sorted.findIndex(([m]) => m === args[1]);
      return i >= 0 ? i : null;
    }
  }

  throw new Error(`Comando desconocido: ${cmd}`);
}

/* ---------- Public API ---------- */

/**
 * Execute one or more Redis commands (separated by newlines) against a RedisDB.
 * Comments starting with # or // are ignored.
 * Mutates the db in place and returns outputs + events.
 */
export function exec(db: RedisDB, src: string): ExecResult {
  const events: RedisEvent[] = [];
  const outputs: CommandOutputEntry[] = [];
  const lines = src.split("\n");

  for (const raw of lines) {
    const line = raw
      .replace(/^\s*#.*/, "")
      .replace(/^\s*\/\/.*/, "")
      .replace(/\s+#.*$/, "")
      .trim();
    if (!line) continue;
    const tokens = tokenize(line);
    if (tokens.length === 0) continue;
    const cmd = tokens[0]!;
    const cmdArgs = tokens.slice(1);
    try {
      const result = run(db, cmd, cmdArgs, events);
      outputs.push({ ok: true, cmd: cmd.toUpperCase(), args: cmdArgs, result });
    } catch (e) {
      outputs.push({ ok: false, cmd: cmd.toUpperCase(), args: cmdArgs, error: (e as Error).message });
    }
  }

  return { outputs, events };
}
