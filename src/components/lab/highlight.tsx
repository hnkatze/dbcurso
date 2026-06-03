/**
 * SQL syntax highlighter — pure, no hooks, safe in Server Components.
 * Ported from the highlighter in DBs/editor.jsx.
 */

const SQL_KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "IS", "NULL", "TRUE", "FALSE",
  "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE",
  "CREATE", "TABLE", "ALTER", "ADD", "COLUMN", "DROP", "REFERENCES",
  "PRIMARY", "FOREIGN", "KEY", "UNIQUE", "DEFAULT", "AUTO_INCREMENT", "AUTOINCREMENT", "SERIAL",
  "INNER", "LEFT", "RIGHT", "OUTER", "FULL", "JOIN", "ON", "CROSS", "USING",
  "GROUP", "BY", "HAVING", "ORDER", "ASC", "DESC", "LIMIT", "OFFSET", "AS", "DISTINCT",
  "BETWEEN", "LIKE", "EXISTS", "ALL", "ANY", "SOME", "UNION", "CHECK",
]);
const SQL_TYPES = new Set([
  "INT", "INTEGER", "BIGINT", "SMALLINT", "TINYINT", "DECIMAL", "NUMERIC", "FLOAT", "REAL", "DOUBLE",
  "VARCHAR", "CHAR", "TEXT", "STRING", "DATE", "DATETIME", "TIMESTAMP", "BOOL", "BOOLEAN", "JSON",
]);
const SQL_FNS = new Set(["COUNT", "SUM", "AVG", "MIN", "MAX", "UPPER", "LOWER", "LENGTH", "LEN", "TRIM", "CONCAT", "COALESCE", "ABS", "ROUND", "NOW"]);

interface HlPart {
  text: string;
  cls: string;
}

export function highlight(src: string): HlPart[] {
  const out: HlPart[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === "\n") { out.push({ text: "\n", cls: "" }); i++; continue; }
    if (/\s/.test(c)) {
      let j = i;
      while (j < src.length && /[ \t]/.test(src[j]!)) j++;
      out.push({ text: src.slice(i, j), cls: "" });
      i = j; continue;
    }
    if (c === "-" && src[i + 1] === "-") {
      let j = i;
      while (j < src.length && src[j] !== "\n") j++;
      out.push({ text: src.slice(i, j), cls: "tok-comment" });
      i = j; continue;
    }
    if (c === "'" || c === '"') {
      const q = c;
      let j = i + 1;
      while (j < src.length && src[j] !== q) {
        if (src[j] === "\\" && j + 1 < src.length) j += 2;
        else j++;
      }
      j = Math.min(j + 1, src.length);
      out.push({ text: src.slice(i, j), cls: "tok-str" });
      i = j; continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j]!)) j++;
      out.push({ text: src.slice(i, j), cls: "tok-num" });
      i = j; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j]!)) j++;
      const w = src.slice(i, j);
      const up = w.toUpperCase();
      let cls = "";
      if (SQL_KEYWORDS.has(up)) cls = "tok-kw";
      else if (SQL_TYPES.has(up)) cls = "tok-type";
      else if (SQL_FNS.has(up) && src[j] === "(") cls = "tok-fn";
      out.push({ text: w, cls });
      i = j; continue;
    }
    if (/[(),;]/.test(c)) {
      out.push({ text: c, cls: "tok-punc" });
      i++; continue;
    }
    out.push({ text: c, cls: "" });
    i++;
  }
  return out;
}

export function HighlightedCode({ source, className = "" }: { source: string; className?: string }) {
  const parts = highlight(source);
  return (
    <pre className={className}>
      {parts.map((p, idx) => (
        <span key={idx} className={p.cls}>
          {p.text}
        </span>
      ))}
    </pre>
  );
}

export function Snippet({ code }: { code: string }) {
  return (
    <HighlightedCode
      source={code}
      className="snippet-dark bg-ink text-cream my-4 mb-6 overflow-x-auto rounded-lg px-5 py-4 font-mono text-[13px] leading-[1.55]"
    />
  );
}
