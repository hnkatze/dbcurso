/**
 * Mini SQL engine — in-memory, animation-friendly.
 * Ported from the original DBs/sql-engine.js (window global) to an ES module.
 * Behavior is intentionally identical; only types and exports were added.
 *
 * Supports a teaching subset of MySQL/Postgres:
 *   CREATE TABLE  ALTER TABLE  DROP TABLE
 *   INSERT  UPDATE  DELETE
 *   SELECT ... FROM ... [JOIN] [WHERE] [GROUP BY] [HAVING] [ORDER BY] [LIMIT]
 *   Aggregates: COUNT, SUM, AVG, MIN, MAX
 *   Subqueries in FROM and in WHERE (= IN scalar)
 */

export type SqlValue = string | number | boolean | null;
export type Row = Record<string, SqlValue>;

export interface ForeignKey {
  refTable: string;
  refCol: string;
}

export interface Column {
  name: string;
  type: string;
  typeArgs?: string | number | null;
  pk?: boolean;
  notNull?: boolean;
  autoIncrement?: boolean;
  unique?: boolean;
  fk?: ForeignKey | null;
  defaultValue?: Expr | undefined;
}

export interface Table {
  name: string;
  cols: Column[];
  rows: Row[];
  _seq: number;
}

export type EngineEvent =
  | { type: "table-add"; table: string }
  | { type: "table-drop"; table: string }
  | { type: "table-alter"; table: string }
  | { type: "row-add"; table: string; row: Row; index: number }
  | { type: "row-update"; table: string; row: Row; index: number; cols: string[] }
  | { type: "row-delete"; table: string; row: Row; index: number }
  | { type: "select-hit"; table: string; indices: number[] };

export interface SelectResult {
  type: "select";
  cols: string[];
  rows: Row[];
}
export interface OkResult {
  type: "ok";
  message: string;
}
export type StatementResult = SelectResult | OkResult;

export type RunResult =
  | { ok: true; results: StatementResult[]; events: EngineEvent[] }
  | { ok: false; error: string; results: StatementResult[]; events: EngineEvent[] };

/* ---------- Tokenizer ---------- */
type Token =
  | { type: "kw"; value: string }
  | { type: "type"; value: string }
  | { type: "ident"; value: string }
  | { type: "string"; value: string }
  | { type: "number"; value: number }
  | { type: "op"; value: string };

const KW = new Set([
  "SELECT", "FROM", "WHERE", "AND", "OR", "NOT", "IN", "IS", "NULL", "TRUE", "FALSE",
  "INSERT", "INTO", "VALUES", "UPDATE", "SET", "DELETE",
  "CREATE", "TABLE", "ALTER", "ADD", "COLUMN", "DROP", "REFERENCES",
  "PRIMARY", "FOREIGN", "KEY", "UNIQUE", "DEFAULT", "AUTO_INCREMENT", "AUTOINCREMENT", "SERIAL",
  "INNER", "LEFT", "RIGHT", "OUTER", "FULL", "JOIN", "ON", "CROSS", "USING",
  "GROUP", "BY", "HAVING", "ORDER", "ASC", "DESC", "LIMIT", "OFFSET", "AS", "DISTINCT",
  "BETWEEN", "LIKE", "EXISTS", "ALL", "ANY", "SOME", "UNION", "CHECK",
]);
const TYPES = new Set([
  "INT", "INTEGER", "BIGINT", "SMALLINT", "TINYINT", "DECIMAL", "NUMERIC", "FLOAT", "REAL", "DOUBLE",
  "VARCHAR", "CHAR", "TEXT", "STRING", "DATE", "DATETIME", "TIMESTAMP", "BOOL", "BOOLEAN", "JSON",
]);

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i]!;
    // whitespace
    if (/\s/.test(c)) { i++; continue; }
    // line comment
    if (c === "-" && src[i + 1] === "-") { while (i < n && src[i] !== "\n") i++; continue; }
    // block comment
    if (c === "/" && src[i + 1] === "*") { i += 2; while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++; i += 2; continue; }
    // string
    if (c === "'" || c === '"') {
      const q = c; let j = i + 1; let s = "";
      while (j < n) {
        if (src[j] === q && src[j + 1] === q) { s += q; j += 2; continue; }
        if (src[j] === "\\" && j + 1 < n) { s += src[j + 1]; j += 2; continue; }
        if (src[j] === q) break;
        s += src[j]; j++;
      }
      out.push({ type: "string", value: s });
      i = j + 1; continue;
    }
    // number
    if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      let j = i;
      while (j < n && /[0-9.]/.test(src[j]!)) j++;
      out.push({ type: "number", value: parseFloat(src.slice(i, j)) });
      i = j; continue;
    }
    // identifier / keyword
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_]/.test(src[j]!)) j++;
      const word = src.slice(i, j);
      const up = word.toUpperCase();
      if (KW.has(up)) out.push({ type: "kw", value: up });
      else if (TYPES.has(up)) out.push({ type: "type", value: up });
      else out.push({ type: "ident", value: word });
      i = j; continue;
    }
    // backticked ident
    if (c === "`") {
      let j = i + 1;
      while (j < n && src[j] !== "`") j++;
      out.push({ type: "ident", value: src.slice(i + 1, j) });
      i = j + 1; continue;
    }
    // multi-char operators
    const two = src.slice(i, i + 2);
    if (["<=", ">=", "<>", "!=", "||"].includes(two)) { out.push({ type: "op", value: two }); i += 2; continue; }
    // single-char
    if ("()[]{},;.*+-/%<>=".includes(c)) {
      out.push({ type: "op", value: c });
      i++; continue;
    }
    throw new Error(`Carácter inesperado: "${c}"`);
  }
  return out;
}

/* ---------- AST ---------- */
export type Expr =
  | { kind: "lit"; value: SqlValue }
  | { kind: "col"; table: string | null; name: string }
  | { kind: "binop"; op: string; left: Expr; right: Expr }
  | { kind: "unop"; op: string; arg: Expr }
  | { kind: "isnull"; neg: boolean; arg: Expr }
  | { kind: "in"; left: Expr; vals?: Expr[]; sub?: SelectStmt }
  | { kind: "like"; left: Expr; pat: Expr }
  | { kind: "between"; arg: Expr; lo: Expr; hi: Expr }
  | { kind: "call"; name: string; args: Expr[] }
  | { kind: "subexpr"; query: SelectStmt }
  | { kind: "star" };

type SelectItem =
  | { kind: "star" }
  | { kind: "expr"; expr: Expr; alias: string | null };

type TableRef =
  | { kind: "table"; name: string; alias: string | null }
  | { kind: "subquery"; query: SelectStmt; alias: string | null };

interface Join { kind: "inner" | "left" | "right" | "full"; right: TableRef; on: Expr }
interface OrderItem { expr: Expr; dir: "ASC" | "DESC" }

type ColumnDef = Column;
interface Constraint { kind: "pk" | "fk"; col: string; refTable?: string; refCol?: string }

export interface SelectStmt {
  kind: "select";
  items: SelectItem[];
  from: TableRef;
  joins: Join[];
  where: Expr | null;
  groupBy: Expr[] | null;
  having: Expr | null;
  orderBy: OrderItem[] | null;
  limit: Expr | null;
  distinct: boolean;
}

type Stmt =
  | { kind: "create"; name: string; cols: ColumnDef[]; constraints: Constraint[] }
  | { kind: "drop"; name: string }
  | { kind: "alter-add"; table: string; col: Column }
  | { kind: "alter-drop"; table: string; col: string }
  | { kind: "insert"; table: string; cols: string[] | null; rows: Expr[][] }
  | { kind: "update"; table: string; sets: { col: string; value: Expr }[]; where: Expr | null }
  | { kind: "delete"; table: string; where: Expr | null }
  | SelectStmt;

type Env = Record<string, Row | undefined>;

/* ---------- Parser ---------- */
class Parser {
  private toks: Token[];
  private i = 0;
  constructor(toks: Token[]) { this.toks = toks; }

  private peek(o = 0): Token | undefined { return this.toks[this.i + o]; }
  private eof(): boolean { return this.i >= this.toks.length; }
  private take(): Token { return this.toks[this.i++]!; }
  private is(type: Token["type"], value?: string | string[]): boolean {
    const t = this.peek();
    if (!t) return false;
    if (t.type !== type) return false;
    if (value === undefined) return true;
    if (Array.isArray(value)) return value.includes(t.value as string);
    return t.value === value;
  }
  private consume(type: Token["type"], value?: string): Token {
    if (!this.is(type, value)) {
      const t = this.peek();
      throw new Error(`Esperaba ${value || type} pero ${t ? `vi ${t.value ?? t.type}` : "fin de consulta"}`);
    }
    return this.take();
  }
  private kw(...names: string[]): boolean { return this.is("kw", names); }
  private op(...names: string[]): boolean { return this.is("op", names); }

  parseProgram(): Stmt[] {
    const stmts: Stmt[] = [];
    while (!this.eof()) {
      if (this.is("op", ";")) { this.take(); continue; }
      stmts.push(this.parseStmt());
      if (this.is("op", ";")) this.take();
    }
    return stmts;
  }

  private parseStmt(): Stmt {
    if (this.kw("CREATE")) return this.parseCreate();
    if (this.kw("DROP")) return this.parseDrop();
    if (this.kw("ALTER")) return this.parseAlter();
    if (this.kw("INSERT")) return this.parseInsert();
    if (this.kw("UPDATE")) return this.parseUpdate();
    if (this.kw("DELETE")) return this.parseDelete();
    if (this.kw("SELECT")) return this.parseSelect();
    const t = this.peek();
    throw new Error(`No reconozco el comando "${t ? t.value : ""}"`);
  }

  private parseCreate(): Stmt {
    this.consume("kw", "CREATE");
    this.consume("kw", "TABLE");
    const name = String(this.consume("ident").value);
    this.consume("op", "(");
    const cols: ColumnDef[] = [];
    const constraints: Constraint[] = [];
    while (true) {
      if (this.kw("PRIMARY")) {
        this.take();
        this.consume("kw", "KEY");
        this.consume("op", "(");
        const k = String(this.consume("ident").value);
        this.consume("op", ")");
        constraints.push({ kind: "pk", col: k });
      } else if (this.kw("FOREIGN")) {
        this.take();
        this.consume("kw", "KEY");
        this.consume("op", "(");
        const k = String(this.consume("ident").value);
        this.consume("op", ")");
        this.consume("kw", "REFERENCES");
        const refTbl = String(this.consume("ident").value);
        this.consume("op", "(");
        const refCol = String(this.consume("ident").value);
        this.consume("op", ")");
        constraints.push({ kind: "fk", col: k, refTable: refTbl, refCol });
      } else {
        const colName = String(this.consume("ident").value);
        let type = "TEXT";
        let typeArgs: string | number | null = null;
        if (this.is("type")) {
          type = String(this.take().value);
          if (this.op("(")) {
            this.take();
            // Collect every comma-separated arg, e.g. DECIMAL(10,2), VARCHAR(80).
            const args: (string | number)[] = [];
            while (!this.op(")") && !this.eof()) {
              args.push(this.take().value as string | number);
              if (this.op(",")) this.take();
            }
            this.consume("op", ")");
            typeArgs = args.join(",");
          }
        }
        const colDef: ColumnDef = { name: colName, type, typeArgs, pk: false, notNull: false, autoIncrement: false, fk: null, defaultValue: undefined };
        while (true) {
          if (this.kw("PRIMARY")) { this.take(); this.consume("kw", "KEY"); colDef.pk = true; }
          else if (this.kw("NOT")) { this.take(); this.consume("kw", "NULL"); colDef.notNull = true; }
          else if (this.kw("AUTO_INCREMENT") || this.kw("AUTOINCREMENT") || this.kw("SERIAL")) { this.take(); colDef.autoIncrement = true; }
          else if (this.kw("UNIQUE")) { this.take(); colDef.unique = true; }
          else if (this.kw("DEFAULT")) { this.take(); colDef.defaultValue = this.parseLiteral(); }
          else if (this.kw("REFERENCES")) {
            this.take();
            const rt = String(this.consume("ident").value);
            this.consume("op", "(");
            const rc = String(this.consume("ident").value);
            this.consume("op", ")");
            colDef.fk = { refTable: rt, refCol: rc };
          } else break;
        }
        cols.push(colDef);
      }
      if (this.op(",")) { this.take(); continue; }
      break;
    }
    this.consume("op", ")");
    return { kind: "create", name, cols, constraints };
  }

  private parseDrop(): Stmt {
    this.consume("kw", "DROP");
    this.consume("kw", "TABLE");
    const name = String(this.consume("ident").value);
    return { kind: "drop", name };
  }

  private parseAlter(): Stmt {
    this.consume("kw", "ALTER");
    this.consume("kw", "TABLE");
    const name = String(this.consume("ident").value);
    if (this.kw("ADD")) {
      this.take();
      if (this.kw("COLUMN")) this.take();
      const colName = String(this.consume("ident").value);
      let type = "TEXT";
      if (this.is("type")) {
        type = String(this.take().value);
        if (this.op("(")) {
          // Skip type args, e.g. DECIMAL(10,2).
          this.take();
          while (!this.op(")") && !this.eof()) this.take();
          if (this.op(")")) this.take();
        }
      }
      // Tolerate (and ignore) trailing modifiers like DEFAULT x or NOT NULL.
      while (!this.eof() && !this.is("op", ";")) this.take();
      return { kind: "alter-add", table: name, col: { name: colName, type } };
    }
    if (this.kw("DROP")) {
      this.take();
      if (this.kw("COLUMN")) this.take();
      const colName = String(this.consume("ident").value);
      return { kind: "alter-drop", table: name, col: colName };
    }
    throw new Error("ALTER TABLE: solo se soportan ADD COLUMN y DROP COLUMN");
  }

  private parseInsert(): Stmt {
    this.consume("kw", "INSERT");
    this.consume("kw", "INTO");
    const name = String(this.consume("ident").value);
    let cols: string[] | null = null;
    if (this.op("(")) {
      this.take();
      cols = [];
      while (true) {
        cols.push(String(this.consume("ident").value));
        if (this.op(",")) { this.take(); continue; }
        break;
      }
      this.consume("op", ")");
    }
    this.consume("kw", "VALUES");
    const rows: Expr[][] = [];
    while (true) {
      this.consume("op", "(");
      const row: Expr[] = [];
      while (true) {
        row.push(this.parseExpr());
        if (this.op(",")) { this.take(); continue; }
        break;
      }
      this.consume("op", ")");
      rows.push(row);
      if (this.op(",")) { this.take(); continue; }
      break;
    }
    return { kind: "insert", table: name, cols, rows };
  }

  private parseUpdate(): Stmt {
    this.consume("kw", "UPDATE");
    const name = String(this.consume("ident").value);
    this.consume("kw", "SET");
    const sets: { col: string; value: Expr }[] = [];
    while (true) {
      const c = String(this.consume("ident").value);
      this.consume("op", "=");
      const v = this.parseExpr();
      sets.push({ col: c, value: v });
      if (this.op(",")) { this.take(); continue; }
      break;
    }
    let where: Expr | null = null;
    if (this.kw("WHERE")) { this.take(); where = this.parseExpr(); }
    return { kind: "update", table: name, sets, where };
  }

  private parseDelete(): Stmt {
    this.consume("kw", "DELETE");
    this.consume("kw", "FROM");
    const name = String(this.consume("ident").value);
    let where: Expr | null = null;
    if (this.kw("WHERE")) { this.take(); where = this.parseExpr(); }
    return { kind: "delete", table: name, where };
  }

  private parseSelect(): SelectStmt {
    this.consume("kw", "SELECT");
    let distinct = false;
    if (this.kw("DISTINCT")) { this.take(); distinct = true; }
    const items: SelectItem[] = [];
    while (true) {
      if (this.op("*")) {
        this.take();
        items.push({ kind: "star" });
      } else {
        const expr = this.parseExpr();
        let alias: string | null = null;
        if (this.kw("AS")) { this.take(); alias = String(this.consume("ident").value); }
        else if (this.peek() && this.peek()!.type === "ident") alias = String(this.take().value);
        items.push({ kind: "expr", expr, alias });
      }
      if (this.op(",")) { this.take(); continue; }
      break;
    }
    this.consume("kw", "FROM");
    const from = this.parseTableRef();
    const joins: Join[] = [];
    while (true) {
      let joinKind: Join["kind"] | null = null;
      if (this.kw("INNER")) { this.take(); this.consume("kw", "JOIN"); joinKind = "inner"; }
      else if (this.kw("LEFT")) { this.take(); if (this.kw("OUTER")) this.take(); this.consume("kw", "JOIN"); joinKind = "left"; }
      else if (this.kw("RIGHT")) { this.take(); if (this.kw("OUTER")) this.take(); this.consume("kw", "JOIN"); joinKind = "right"; }
      else if (this.kw("FULL")) { this.take(); if (this.kw("OUTER")) this.take(); this.consume("kw", "JOIN"); joinKind = "full"; }
      else if (this.kw("JOIN")) { this.take(); joinKind = "inner"; }
      else break;
      const right = this.parseTableRef();
      this.consume("kw", "ON");
      const on = this.parseExpr();
      joins.push({ kind: joinKind, right, on });
    }
    let where: Expr | null = null;
    if (this.kw("WHERE")) { this.take(); where = this.parseExpr(); }
    let groupBy: Expr[] | null = null;
    if (this.kw("GROUP")) { this.take(); this.consume("kw", "BY"); groupBy = []; while (true) { groupBy.push(this.parseExpr()); if (this.op(",")) { this.take(); continue; } break; } }
    let having: Expr | null = null;
    if (this.kw("HAVING")) { this.take(); having = this.parseExpr(); }
    let orderBy: OrderItem[] | null = null;
    if (this.kw("ORDER")) {
      this.take(); this.consume("kw", "BY");
      orderBy = [];
      while (true) {
        const expr = this.parseExpr();
        let dir: "ASC" | "DESC" = "ASC";
        if (this.kw("ASC")) { this.take(); dir = "ASC"; }
        else if (this.kw("DESC")) { this.take(); dir = "DESC"; }
        orderBy.push({ expr, dir });
        if (this.op(",")) { this.take(); continue; }
        break;
      }
    }
    let limit: Expr | null = null;
    if (this.kw("LIMIT")) { this.take(); limit = this.parseLiteral(); }
    return { kind: "select", items, from, joins, where, groupBy, having, orderBy, limit, distinct };
  }

  private parseTableRef(): TableRef {
    if (this.op("(")) {
      this.take();
      const sub = this.parseSelect();
      this.consume("op", ")");
      let alias: string | null = null;
      if (this.kw("AS")) { this.take(); alias = String(this.consume("ident").value); }
      else if (this.peek() && this.peek()!.type === "ident") alias = String(this.take().value);
      return { kind: "subquery", query: sub, alias };
    }
    const name = String(this.consume("ident").value);
    let alias: string | null = null;
    if (this.kw("AS")) { this.take(); alias = String(this.consume("ident").value); }
    else if (this.peek() && this.peek()!.type === "ident") alias = String(this.take().value);
    return { kind: "table", name, alias };
  }

  /* ---- Expression parser (precedence climbing) ---- */
  private parseExpr(): Expr { return this.parseOr(); }
  private parseOr(): Expr {
    let left = this.parseAnd();
    while (this.kw("OR")) { this.take(); const right = this.parseAnd(); left = { kind: "binop", op: "OR", left, right }; }
    return left;
  }
  private parseAnd(): Expr {
    let left = this.parseNot();
    while (this.kw("AND")) { this.take(); const right = this.parseNot(); left = { kind: "binop", op: "AND", left, right }; }
    return left;
  }
  private parseNot(): Expr {
    if (this.kw("NOT")) { this.take(); return { kind: "unop", op: "NOT", arg: this.parseNot() }; }
    return this.parseCmp();
  }
  private parseCmp(): Expr {
    let left = this.parseAdd();
    while (true) {
      if (this.op("=", "<>", "!=", "<", ">") || this.is("op", "<=") || this.is("op", ">=")) {
        const op = String(this.take().value);
        const right = this.parseAdd();
        left = { kind: "binop", op, left, right };
      } else if (this.kw("IS")) {
        this.take();
        let neg = false;
        if (this.kw("NOT")) { this.take(); neg = true; }
        this.consume("kw", "NULL");
        left = { kind: "isnull", neg, arg: left };
      } else if (this.kw("IN")) {
        this.take();
        this.consume("op", "(");
        if (this.kw("SELECT")) {
          const sub = this.parseSelect();
          this.consume("op", ")");
          left = { kind: "in", left, sub };
        } else {
          const vals: Expr[] = [];
          while (true) { vals.push(this.parseExpr()); if (this.op(",")) { this.take(); continue; } break; }
          this.consume("op", ")");
          left = { kind: "in", left, vals };
        }
      } else if (this.kw("LIKE")) {
        this.take();
        const pat = this.parseAdd();
        left = { kind: "like", left, pat };
      } else if (this.kw("BETWEEN")) {
        this.take();
        const lo = this.parseAdd();
        this.consume("kw", "AND");
        const hi = this.parseAdd();
        left = { kind: "between", arg: left, lo, hi };
      } else break;
    }
    return left;
  }
  private parseAdd(): Expr {
    let left = this.parseMul();
    while (this.op("+", "-") || this.is("op", "||")) {
      const op = String(this.take().value);
      const right = this.parseMul();
      left = { kind: "binop", op, left, right };
    }
    return left;
  }
  private parseMul(): Expr {
    let left = this.parseUnary();
    while (this.op("*", "/", "%")) { const op = String(this.take().value); const right = this.parseUnary(); left = { kind: "binop", op, left, right }; }
    return left;
  }
  private parseUnary(): Expr {
    if (this.op("-")) { this.take(); return { kind: "unop", op: "-", arg: this.parseUnary() }; }
    if (this.op("+")) { this.take(); return this.parseUnary(); }
    return this.parsePrimary();
  }
  private parsePrimary(): Expr {
    const t = this.peek();
    if (!t) throw new Error("Expresión incompleta");
    if (t.type === "number") { this.take(); return { kind: "lit", value: t.value }; }
    if (t.type === "string") { this.take(); return { kind: "lit", value: t.value }; }
    if (t.type === "kw" && t.value === "NULL") { this.take(); return { kind: "lit", value: null }; }
    if (t.type === "kw" && t.value === "TRUE") { this.take(); return { kind: "lit", value: true }; }
    if (t.type === "kw" && t.value === "FALSE") { this.take(); return { kind: "lit", value: false }; }
    if (t.type === "op" && t.value === "(") {
      this.take();
      if (this.kw("SELECT")) { const sub = this.parseSelect(); this.consume("op", ")"); return { kind: "subexpr", query: sub }; }
      const e = this.parseExpr();
      this.consume("op", ")");
      return e;
    }
    if (t.type === "op" && t.value === "*") { this.take(); return { kind: "star" }; }
    if (t.type === "ident") {
      this.take();
      // function call?
      if (this.op("(")) {
        this.take();
        const args: Expr[] = [];
        if (!this.op(")")) {
          while (true) {
            if (this.op("*")) { this.take(); args.push({ kind: "star" }); }
            else args.push(this.parseExpr());
            if (this.op(",")) { this.take(); continue; }
            break;
          }
        }
        this.consume("op", ")");
        return { kind: "call", name: String(t.value).toUpperCase(), args };
      }
      // qualified?
      if (this.op(".")) {
        this.take();
        if (this.op("*")) { this.take(); return { kind: "col", table: String(t.value), name: "*" }; }
        const nm = String(this.consume("ident").value);
        return { kind: "col", table: String(t.value), name: nm };
      }
      return { kind: "col", table: null, name: String(t.value) };
    }
    throw new Error(`No esperaba "${t.value}"`);
  }

  private parseLiteral(): Expr {
    const t = this.take();
    if (t.type === "number") return { kind: "lit", value: t.value };
    if (t.type === "string") return { kind: "lit", value: t.value };
    if (t.type === "kw" && t.value === "NULL") return { kind: "lit", value: null };
    throw new Error("Esperaba un valor literal");
  }
}

/* ---------- Database ---------- */
export class Database {
  tables: Record<string, Table> = {};
  log: string[] = [];

  clone(): Database {
    const d = new Database();
    d.tables = JSON.parse(JSON.stringify(this.tables));
    return d;
  }
  findTable(name: string | null | undefined): Table | null {
    if (!name) return null;
    const key = Object.keys(this.tables).find((k) => k.toLowerCase() === name.toLowerCase());
    return key ? this.tables[key]! : null;
  }
}

/* ---------- Executor ---------- */
const AGG_FNS = ["COUNT", "SUM", "AVG", "MIN", "MAX"];

class Executor {
  db: Database;
  events: EngineEvent[] = [];
  constructor(db: Database) { this.db = db; }

  private push(ev: EngineEvent): void { this.events.push(ev); }
  private err(msg: string): never { throw new Error(msg); }

  exec(stmts: Stmt[]): StatementResult[] {
    const results: StatementResult[] = [];
    for (const s of stmts) results.push(this.execStmt(s));
    return results;
  }
  private execStmt(s: Stmt): StatementResult {
    switch (s.kind) {
      case "create": return this.execCreate(s);
      case "drop": return this.execDrop(s);
      case "alter-add": return this.execAlterAdd(s);
      case "alter-drop": return this.execAlterDrop(s);
      case "insert": return this.execInsert(s);
      case "update": return this.execUpdate(s);
      case "delete": return this.execDelete(s);
      case "select": return this.execSelect(s);
      default: return this.err("Comando no implementado");
    }
  }

  private execCreate(s: Extract<Stmt, { kind: "create" }>): OkResult {
    if (this.db.findTable(s.name)) this.err(`La tabla "${s.name}" ya existe`);
    const cols: Column[] = s.cols.map((c) => ({ ...c }));
    for (const con of s.constraints || []) {
      if (con.kind === "pk") { const c = cols.find((x) => x.name.toLowerCase() === con.col.toLowerCase()); if (c) c.pk = true; }
      if (con.kind === "fk") { const c = cols.find((x) => x.name.toLowerCase() === con.col.toLowerCase()); if (c) c.fk = { refTable: con.refTable!, refCol: con.refCol! }; }
    }
    const tbl: Table = { name: s.name, cols, rows: [], _seq: 1 };
    this.db.tables[s.name] = tbl;
    this.push({ type: "table-add", table: s.name });
    return { type: "ok", message: `Tabla "${s.name}" creada con ${cols.length} columna(s).` };
  }
  private execDrop(s: Extract<Stmt, { kind: "drop" }>): OkResult {
    const t = this.db.findTable(s.name);
    if (!t) this.err(`La tabla "${s.name}" no existe`);
    delete this.db.tables[t.name];
    this.push({ type: "table-drop", table: t.name });
    return { type: "ok", message: `Tabla "${t.name}" eliminada.` };
  }
  private execAlterAdd(s: Extract<Stmt, { kind: "alter-add" }>): OkResult {
    const t = this.db.findTable(s.table);
    if (!t) this.err(`La tabla "${s.table}" no existe`);
    t.cols.push({ ...s.col });
    this.push({ type: "table-alter", table: t.name });
    return { type: "ok", message: `Columna "${s.col.name}" añadida a "${t.name}".` };
  }
  private execAlterDrop(s: Extract<Stmt, { kind: "alter-drop" }>): OkResult {
    const t = this.db.findTable(s.table);
    if (!t) this.err(`La tabla "${s.table}" no existe`);
    t.cols = t.cols.filter((c) => c.name.toLowerCase() !== s.col.toLowerCase());
    for (const r of t.rows) delete r[s.col];
    this.push({ type: "table-alter", table: t.name });
    return { type: "ok", message: `Columna "${s.col}" eliminada de "${t.name}".` };
  }
  private execInsert(s: Extract<Stmt, { kind: "insert" }>): OkResult {
    const t = this.db.findTable(s.table);
    if (!t) this.err(`La tabla "${s.table}" no existe`);
    const colNames = s.cols || t.cols.map((c) => c.name);
    let count = 0;
    for (const row of s.rows) {
      if (row.length !== colNames.length) this.err(`Cantidad de valores (${row.length}) ≠ columnas (${colNames.length})`);
      const r: Row = {};
      // Auto-increment / defaults first
      for (const c of t.cols) {
        if (c.autoIncrement || (c.pk && /int/i.test(c.type))) {
          if (!colNames.find((nm) => nm.toLowerCase() === c.name.toLowerCase())) {
            r[c.name] = t._seq++;
          }
        } else if (c.defaultValue !== undefined) {
          if (!colNames.find((nm) => nm.toLowerCase() === c.name.toLowerCase())) {
            r[c.name] = this.eval(c.defaultValue, {});
          }
        }
      }
      for (let i = 0; i < colNames.length; i++) {
        const cn = colNames[i]!;
        const val = this.eval(row[i]!, {});
        r[cn] = val;
        const c = t.cols.find((x) => x.name.toLowerCase() === cn.toLowerCase());
        if (c && c.autoIncrement && typeof val === "number" && val >= t._seq) t._seq = val + 1;
      }
      // NOT NULL
      for (const c of t.cols) {
        if (c.notNull && (r[c.name] === null || r[c.name] === undefined)) this.err(`La columna "${c.name}" no admite NULL`);
      }
      // PK uniqueness
      const pk = t.cols.find((c) => c.pk);
      if (pk && r[pk.name] !== undefined) {
        if (t.rows.some((x) => x[pk.name] === r[pk.name])) this.err(`Clave duplicada en "${pk.name}": ${r[pk.name]}`);
      }
      // FK check
      for (const c of t.cols) {
        if (c.fk && r[c.name] !== null && r[c.name] !== undefined) {
          const ref = this.db.findTable(c.fk.refTable);
          if (!ref) this.err(`FK apunta a tabla inexistente "${c.fk.refTable}"`);
          if (!ref.rows.some((x) => x[c.fk!.refCol] == r[c.name])) {
            this.err(`Valor "${r[c.name]}" no existe en ${c.fk.refTable}(${c.fk.refCol})`);
          }
        }
      }
      t.rows.push(r);
      this.push({ type: "row-add", table: t.name, row: r, index: t.rows.length - 1 });
      count++;
    }
    return { type: "ok", message: `${count} fila(s) insertada(s) en "${t.name}".` };
  }
  private execUpdate(s: Extract<Stmt, { kind: "update" }>): OkResult {
    const t = this.db.findTable(s.table);
    if (!t) this.err(`La tabla "${s.table}" no existe`);
    let count = 0;
    const cols = s.sets.map((x) => x.col);
    for (let i = 0; i < t.rows.length; i++) {
      const r = t.rows[i]!;
      const env: Env = { [t.name.toLowerCase()]: r, _row: r };
      if (s.where && !this.truthy(this.eval(s.where, env))) continue;
      for (const set of s.sets) {
        r[set.col] = this.eval(set.value, env);
      }
      this.push({ type: "row-update", table: t.name, row: r, index: i, cols });
      count++;
    }
    return { type: "ok", message: `${count} fila(s) actualizada(s) en "${t.name}".` };
  }
  private execDelete(s: Extract<Stmt, { kind: "delete" }>): OkResult {
    const t = this.db.findTable(s.table);
    if (!t) this.err(`La tabla "${s.table}" no existe`);
    const keep: Row[] = [];
    const del: { row: Row; index: number }[] = [];
    for (let i = 0; i < t.rows.length; i++) {
      const r = t.rows[i]!;
      const env: Env = { [t.name.toLowerCase()]: r, _row: r };
      if (s.where && !this.truthy(this.eval(s.where, env))) keep.push(r);
      else del.push({ row: r, index: i });
    }
    for (const { row, index } of del) this.push({ type: "row-delete", table: t.name, row, index });
    t.rows = keep;
    return { type: "ok", message: `${del.length} fila(s) eliminada(s) de "${t.name}".` };
  }

  execSelect(s: SelectStmt): SelectResult {
    const source = this.buildFrom(s.from, s.joins);
    let rows = source.rows;
    const aliases = source.aliases;
    if (s.where) rows = rows.filter((env) => this.truthy(this.eval(s.where!, env)));

    // Mark hit rows for animation (only single-table case)
    if (aliases.length === 1) {
      const a = aliases[0]!;
      const t = this.db.findTable(a.table);
      if (t) {
        const indices = rows
          .map((env) => {
            const r = env[a.alias.toLowerCase()];
            return r ? t.rows.indexOf(r) : -1;
          })
          .filter((i) => i >= 0);
        this.push({ type: "select-hit", table: t.name, indices });
      }
    }

    const aggsInSelect = s.items.some((it) => it.kind === "expr" && this.hasAgg(it.expr));
    const isGrouped = !!s.groupBy || aggsInSelect;

    let outRows: Row[] = [];
    let outCols: string[] = [];

    if (isGrouped) {
      const keys = s.groupBy || [];
      const groups = new Map<string, Env[]>();
      for (const env of rows) {
        const k = keys.map((kk) => JSON.stringify(this.eval(kk, env))).join("|");
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k)!.push(env);
      }
      if (groups.size === 0 && keys.length === 0) groups.set("", []);
      for (const [, grp] of groups) {
        const sample = grp[0] || {};
        if (s.having && !this.truthy(this.evalAgg(s.having, sample, grp))) continue;
        const out: Row = {};
        for (const it of s.items) {
          if (it.kind === "star") continue;
          const name = it.alias || this.exprName(it.expr);
          out[name] = this.evalAgg(it.expr, sample, grp);
          if (!outCols.includes(name)) outCols.push(name);
        }
        outRows.push(out);
      }
    } else {
      const expandedItems: { kind: "expr"; expr: Expr; alias: string | null }[] = [];
      for (const it of s.items) {
        if (it.kind === "star") {
          for (const a of aliases) {
            const tbl = this.db.findTable(a.table) || (a.cols ? { cols: a.cols.map((c) => ({ name: c })) } : null);
            if (tbl) for (const c of tbl.cols) expandedItems.push({ kind: "expr", expr: { kind: "col", table: a.alias, name: c.name }, alias: c.name });
          }
        } else if (it.kind === "expr" && it.expr.kind === "col" && it.expr.name === "*") {
          const a = aliases.find((a) => a.alias.toLowerCase() === (it.expr as { table: string }).table.toLowerCase());
          if (a) {
            const tbl = this.db.findTable(a.table);
            if (tbl) for (const c of tbl.cols) expandedItems.push({ kind: "expr", expr: { kind: "col", table: a.alias, name: c.name }, alias: c.name });
          }
        } else if (it.kind === "expr") {
          expandedItems.push(it);
        }
      }
      outCols = expandedItems.map((it) => it.alias || this.exprName(it.expr));
      for (const env of rows) {
        const o: Row = {};
        for (let i = 0; i < expandedItems.length; i++) {
          const it = expandedItems[i]!;
          o[outCols[i]!] = this.eval(it.expr, env);
        }
        outRows.push(o);
      }
    }

    if (s.distinct) {
      const seen = new Set<string>();
      outRows = outRows.filter((r) => {
        const k = JSON.stringify(r);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }

    if (s.orderBy) {
      const orderBy = s.orderBy;
      outRows.sort((a, b) => {
        for (const o of orderBy) {
          const name = this.exprName(o.expr);
          const av = a[name] !== undefined ? a[name] : this.eval(o.expr, { _row: a });
          const bv = b[name] !== undefined ? b[name] : this.eval(o.expr, { _row: b });
          let cmp = 0;
          if (av === null || av === undefined) cmp = -1;
          else if (bv === null || bv === undefined) cmp = 1;
          else if (av < bv) cmp = -1;
          else if (av > bv) cmp = 1;
          if (o.dir === "DESC") cmp = -cmp;
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
    }

    if (s.limit) {
      const n = Number((s.limit as Extract<Expr, { kind: "lit" }>).value);
      outRows = outRows.slice(0, n);
    }

    return { type: "select", cols: outCols, rows: outRows };
  }

  private buildFrom(
    from: TableRef,
    joins: Join[],
  ): { rows: Env[]; aliases: { alias: string; table: string; cols?: string[] }[] } {
    let rows: Env[] = [];
    let aliases: { alias: string; table: string; cols?: string[] }[] = [];
    if (from.kind === "table") {
      const t = this.db.findTable(from.name);
      if (!t) this.err(`La tabla "${from.name}" no existe`);
      const alias = from.alias || t.name;
      aliases = [{ alias, table: t.name }];
      rows = t.rows.map((r) => ({ [alias.toLowerCase()]: r, _row: r }));
    } else if (from.kind === "subquery") {
      const sub = this.execSelect(from.query);
      const alias = from.alias || "__sub";
      aliases = [{ alias, table: alias, cols: sub.cols }];
      rows = sub.rows.map((r) => ({ [alias.toLowerCase()]: r, _row: r }));
    }
    for (const j of joins) {
      const rightInfo = this.buildFrom(j.right, []);
      const newRows: Env[] = [];
      const used = new Set<number>();
      for (const lEnv of rows) {
        let any = false;
        for (let ri = 0; ri < rightInfo.rows.length; ri++) {
          const rEnv = rightInfo.rows[ri]!;
          const merged = { ...lEnv, ...rEnv };
          if (this.truthy(this.eval(j.on, merged))) {
            newRows.push(merged);
            any = true;
            used.add(ri);
          }
        }
        if (!any && (j.kind === "left" || j.kind === "full")) {
          const nulls: Env = {};
          for (const a of rightInfo.aliases) nulls[a.alias.toLowerCase()] = this.nullRow(a);
          newRows.push({ ...lEnv, ...nulls, _row: lEnv._row });
        }
      }
      if (j.kind === "right" || j.kind === "full") {
        for (let ri = 0; ri < rightInfo.rows.length; ri++) {
          if (used.has(ri)) continue;
          const rEnv = rightInfo.rows[ri]!;
          const nulls: Env = {};
          for (const a of aliases) nulls[a.alias.toLowerCase()] = this.nullRow(a);
          newRows.push({ ...nulls, ...rEnv });
        }
      }
      aliases = [...aliases, ...rightInfo.aliases];
      rows = newRows;
    }
    return { rows, aliases };
  }

  private nullRow(a: { alias: string; table: string }): Row {
    const t = this.db.findTable(a.table);
    if (!t) return {};
    const r: Row = {};
    for (const c of t.cols) r[c.name] = null;
    return r;
  }

  /* ---- Expression evaluation ---- */
  private eval(e: Expr, env: Env): SqlValue {
    switch (e.kind) {
      case "lit": return e.value;
      case "col": return this.resolveCol(e, env);
      case "binop": return this.evalBin(e, env);
      case "unop": {
        const v = this.eval(e.arg, env);
        if (e.op === "NOT") return !this.truthy(v);
        if (e.op === "-") return -(v as number);
        return v;
      }
      case "isnull": {
        const v = this.eval(e.arg, env);
        const isNull = v === null || v === undefined;
        return e.neg ? !isNull : isNull;
      }
      case "in": {
        const v = this.eval(e.left, env);
        if (e.sub) {
          const sub = this.execSelect(e.sub);
          const col = sub.cols[0]!;
          return sub.rows.some((r) => r[col] == v);
        }
        return (e.vals ?? []).some((x) => this.eval(x, env) == v);
      }
      case "like": {
        const v = this.eval(e.left, env);
        const pat = this.eval(e.pat, env);
        if (v == null || pat == null) return false;
        const re = new RegExp("^" + String(pat).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$", "i");
        return re.test(String(v));
      }
      case "between": {
        const v = this.eval(e.arg, env);
        const lo = this.eval(e.lo, env);
        const hi = this.eval(e.hi, env);
        return v! >= lo! && v! <= hi!;
      }
      case "call": return this.evalCall(e, env);
      case "subexpr": {
        const sub = this.execSelect(e.query);
        if (sub.rows.length === 0) return null;
        return sub.rows[0]![sub.cols[0]!] ?? null;
      }
      case "star": return "*";
    }
    return this.err("Expresión no soportada");
  }

  private resolveCol(e: Extract<Expr, { kind: "col" }>, env: Env): SqlValue {
    if (e.table) {
      const r = env[e.table.toLowerCase()];
      if (r && e.name in r) return r[e.name]!;
      if (r) {
        const k = Object.keys(r).find((k) => k.toLowerCase() === e.name.toLowerCase());
        if (k) return r[k]!;
      }
      return null;
    }
    for (const key of Object.keys(env)) {
      if (key === "_row") continue;
      const r = env[key];
      if (r && e.name in r) return r[e.name]!;
      if (r) {
        const k = Object.keys(r).find((k) => k.toLowerCase() === e.name.toLowerCase());
        if (k) return r[k]!;
      }
    }
    if (env._row) {
      const r = env._row;
      if (e.name in r) return r[e.name]!;
      const k = Object.keys(r).find((k) => k.toLowerCase() === e.name.toLowerCase());
      if (k) return r[k]!;
    }
    return null;
  }

  private evalBin(e: Extract<Expr, { kind: "binop" }>, env: Env): SqlValue {
    const op = e.op;
    if (op === "AND") return this.truthy(this.eval(e.left, env)) && this.truthy(this.eval(e.right, env));
    if (op === "OR") return this.truthy(this.eval(e.left, env)) || this.truthy(this.eval(e.right, env));
    const a = this.eval(e.left, env);
    const b = this.eval(e.right, env);
    if (a === null || b === null) {
      if (op === "=" || op === "<>") return null;
    }
    switch (op) {
      case "+": return (typeof a === "string" || typeof b === "string") ? String(a) + String(b) : (a as number) + (b as number);
      case "-": return (a as number) - (b as number);
      case "*": return (a as number) * (b as number);
      case "/": return (a as number) / (b as number);
      case "%": return (a as number) % (b as number);
      case "||": return String(a ?? "") + String(b ?? "");
      case "=": return a == b;
      case "<>": case "!=": return a != b;
      case "<": return a! < b!;
      case ">": return a! > b!;
      case "<=": return a! <= b!;
      case ">=": return a! >= b!;
    }
    return this.err("Operador desconocido: " + op);
  }

  private truthy(v: SqlValue): boolean {
    return v !== null && v !== undefined && v !== false && v !== 0 && v !== "";
  }

  private evalCall(e: Extract<Expr, { kind: "call" }>, env: Env): SqlValue {
    const args = e.args.map((a) => (a.kind === "star" ? "*" : this.eval(a, env)));
    switch (e.name) {
      case "UPPER": return String(args[0] ?? "").toUpperCase();
      case "LOWER": return String(args[0] ?? "").toLowerCase();
      case "LENGTH": case "LEN": return String(args[0] ?? "").length;
      case "TRIM": return String(args[0] ?? "").trim();
      case "CONCAT": return args.map((x) => x ?? "").join("");
      case "COALESCE": return args.find((x) => x !== null && x !== undefined) ?? null;
      case "ABS": return Math.abs(args[0] as number);
      case "ROUND": return Math.round((args[0] as number) * Math.pow(10, (args[1] as number) || 0)) / Math.pow(10, (args[1] as number) || 0);
      case "NOW": return new Date().toISOString();
    }
    return this.err(`Función "${e.name}" no soportada en este contexto`);
  }

  private hasAgg(e: unknown): boolean {
    if (!e || typeof e !== "object") return false;
    const node = e as Record<string, unknown>;
    if (node.kind === "call" && AGG_FNS.includes(node.name as string)) return true;
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (Array.isArray(v)) { if (v.some((x) => this.hasAgg(x))) return true; }
      else if (v && typeof v === "object") { if (this.hasAgg(v)) return true; }
    }
    return false;
  }

  private evalAgg(e: Expr, env: Env, group: Env[]): SqlValue {
    if (e.kind === "call" && AGG_FNS.includes(e.name)) {
      const arg = e.args[0];
      if (e.name === "COUNT") {
        if (arg && arg.kind === "star") return group.length;
        const vals = group.map((g) => this.eval(arg!, g)).filter((v) => v !== null && v !== undefined);
        return vals.length;
      }
      const vals = group.map((g) => this.eval(arg!, g)).filter((v) => v !== null && v !== undefined) as number[];
      if (vals.length === 0) return null;
      if (e.name === "SUM") return vals.reduce((a, b) => a + Number(b), 0);
      if (e.name === "AVG") return vals.reduce((a, b) => a + Number(b), 0) / vals.length;
      if (e.name === "MIN") return vals.reduce((a, b) => (a < b ? a : b));
      if (e.name === "MAX") return vals.reduce((a, b) => (a > b ? a : b));
    }
    switch (e.kind) {
      case "lit": return e.value;
      case "col": return this.resolveCol(e, env);
      case "binop": {
        const op = e.op;
        if (op === "AND") return this.truthy(this.evalAgg(e.left, env, group)) && this.truthy(this.evalAgg(e.right, env, group));
        if (op === "OR") return this.truthy(this.evalAgg(e.left, env, group)) || this.truthy(this.evalAgg(e.right, env, group));
        const a = this.evalAgg(e.left, env, group);
        const b = this.evalAgg(e.right, env, group);
        switch (op) {
          case "+": return (a as number) + (b as number);
          case "-": return (a as number) - (b as number);
          case "*": return (a as number) * (b as number);
          case "/": return (a as number) / (b as number);
          case "=": return a == b;
          case "<>": case "!=": return a != b;
          case "<": return a! < b!;
          case ">": return a! > b!;
          case "<=": return a! <= b!;
          case ">=": return a! >= b!;
          default: return null;
        }
      }
      case "unop": {
        const v = this.evalAgg(e.arg, env, group);
        if (e.op === "NOT") return !this.truthy(v);
        if (e.op === "-") return -(v as number);
        return v;
      }
      case "call": return this.evalCall(e, env);
    }
    return this.eval(e, env);
  }

  private exprName(e: Expr | undefined): string {
    if (!e) return "?";
    if (e.kind === "col") return e.name;
    if (e.kind === "call") return `${e.name}(${e.args.map((a) => (a.kind === "star" ? "*" : this.exprName(a))).join(",")})`;
    if (e.kind === "lit") return String(e.value);
    return "expr";
  }
}

/* ---------- Public API ---------- */
export function run(db: Database, sql: string): RunResult {
  let stmts: Stmt[];
  try {
    const toks = tokenize(sql);
    stmts = new Parser(toks).parseProgram();
  } catch (e) {
    return { ok: false, error: "Error de sintaxis: " + (e as Error).message, events: [], results: [] };
  }
  const ex = new Executor(db);
  try {
    const results = ex.exec(stmts);
    return { ok: true, results, events: ex.events };
  } catch (e) {
    return { ok: false, error: (e as Error).message, events: ex.events, results: [] };
  }
}

export { tokenize };
