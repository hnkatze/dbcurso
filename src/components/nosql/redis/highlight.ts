/**
 * Redis CLI syntax highlighter — pure function, no hooks, server-safe.
 * Ported from the highlightRedis function in DBs/redis-module.jsx.
 */

const REDIS_COMMANDS = new Set([
  "SET", "GET", "DEL", "EXISTS", "KEYS", "TYPE", "EXPIRE", "PERSIST", "TTL",
  "FLUSHDB", "FLUSHALL", "DBSIZE",
  "INCR", "DECR", "INCRBY", "DECRBY", "APPEND", "STRLEN", "MSET", "MGET",
  "LPUSH", "RPUSH", "LPOP", "RPOP", "LRANGE", "LLEN", "LINDEX",
  "HSET", "HGET", "HGETALL", "HDEL", "HINCRBY", "HKEYS", "HVALS", "HLEN", "HEXISTS",
  "SADD", "SREM", "SMEMBERS", "SISMEMBER", "SCARD",
  "ZADD", "ZRANGE", "ZREVRANGE", "ZSCORE", "ZINCRBY", "ZCARD", "ZRANK", "ZREVRANK",
  "WITHSCORES", "EX",
]);

export interface HlPart {
  text: string;
  cls: string;
}

export function highlightRedis(src: string): HlPart[] {
  const out: HlPart[] = [];
  const lines = src.split("\n");

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]!;

    // Comment line
    const cmt = line.match(/^(\s*)(#.*|\/\/.*)$/);
    if (cmt) {
      out.push({ text: cmt[1]!, cls: "" });
      out.push({ text: cmt[2]!, cls: "tok-comment" });
    } else {
      let i = 0;
      let firstTokenSeen = false;

      while (i < line.length) {
        const c = line[i]!;

        // Whitespace
        if (/\s/.test(c)) {
          let j = i;
          while (j < line.length && /[ \t]/.test(line[j]!)) j++;
          out.push({ text: line.slice(i, j), cls: "" });
          i = j;
          continue;
        }

        // Quoted string
        if (c === '"' || c === "'") {
          const q = c;
          let j = i + 1;
          while (j < line.length && line[j] !== q) j++;
          j = Math.min(j + 1, line.length);
          out.push({ text: line.slice(i, j), cls: "tok-str" });
          i = j;
          continue;
        }

        // Number (only when preceded by whitespace or at start)
        if (
          /[0-9-]/.test(c) &&
          (i === 0 || /\s/.test(line[i - 1]!)) &&
          /[0-9]/.test(line[i + 1] ?? c)
        ) {
          let j = i;
          if (line[j] === "-") j++;
          while (j < line.length && /[0-9.]/.test(line[j]!)) j++;
          out.push({ text: line.slice(i, j), cls: "tok-num" });
          i = j;
          continue;
        }

        // Word token
        let j = i;
        while (j < line.length && !/\s/.test(line[j]!)) j++;
        const w = line.slice(i, j);
        const up = w.toUpperCase();

        if (!firstTokenSeen && REDIS_COMMANDS.has(up)) {
          out.push({ text: w, cls: "tok-kw" });
          firstTokenSeen = true;
        } else if (REDIS_COMMANDS.has(up)) {
          out.push({ text: w, cls: "tok-fn" });
        } else {
          out.push({ text: w, cls: "" });
        }
        i = j;
      }
    }

    if (li < lines.length - 1) out.push({ text: "\n", cls: "" });
  }

  return out;
}
