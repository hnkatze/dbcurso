/**
 * Mongo-shell syntax highlighter — pure function, no hooks, safe in Server Components.
 * Ported from the inline `highlight()` in DBs/mongo-lesson.jsx.
 */

interface HlPart {
  text: string;
  cls: string;
}

function mongoHighlight(src: string): HlPart[] {
  const out: HlPart[] = [];
  const re =
    /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|('[^']*')|(\b(?:db|find|insertOne|insertMany|updateOne|updateMany|deleteOne|deleteMany|aggregate|countDocuments|sort|limit|skip|findOne|collection)\b)|(\$[a-zA-Z]+)|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+\.?\d*)/g;

  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) {
      out.push({ text: src.slice(last, m.index), cls: "" });
    }
    let cls = "";
    if (m[1]) cls = "tok-comment";             // // comment
    else if (m[2] ?? m[3]) cls = "tok-str";   // "string" or 'string'
    else if (m[4]) cls = "tok-fn";            // mongo method / db keyword
    else if (m[5]) cls = "tok-kw";            // $operator — rose/pink in dark mode
    else if (m[6]) cls = "tok-type";          // true / false / null — blue in dark mode
    else if (m[7]) cls = "tok-num";           // number
    out.push({ text: m[0], cls });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ text: src.slice(last), cls: "" });
  return out;
}

export function MongoSnippet({ code }: { code: string }) {
  const parts = mongoHighlight(code);
  return (
    <pre className="snippet-dark bg-ink text-cream my-4 mb-6 overflow-x-auto rounded-lg px-5 py-4 font-mono text-[13px] leading-[1.55]">
      {parts.map((p, idx) => (
        <span key={idx} className={p.cls}>
          {p.text}
        </span>
      ))}
    </pre>
  );
}
