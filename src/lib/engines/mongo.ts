/**
 * Mini MongoDB engine — in-memory teaching subset.
 * Ported from DBs/mongo-engine.js (window.MongoEngine global) to an ES module.
 * Behavior is intentionally identical; only types and exports were added.
 *
 * Public API:
 *   const db = new MongoDB();
 *   const coll = db.collection("name");
 *   coll.insertOne(doc)              → InsertOneResult
 *   coll.insertMany(docs)            → InsertManyResult
 *   coll.find(query?, opts?)         → MongoDocument[]
 *   coll.findOne(query?, opts?)      → MongoDocument | null
 *   coll.updateOne(query, update)    → UpdateResult
 *   coll.updateMany(query, update)   → UpdateResult
 *   coll.deleteOne(query)            → DeleteResult
 *   coll.deleteMany(query)           → DeleteResult
 *   coll.countDocuments(query?)      → number
 *   coll.aggregate(pipeline)         → MongoDocument[]
 *   db.listCollections()             → string[]
 *   db.drop(name)                    → void
 *
 * Query operators: $eq $ne $gt $gte $lt $lte $in $nin $exists $regex
 *                  $and $or $nor $not $size $all
 * Update operators: $set $unset $inc $push $pull $addToSet $pop
 * Supports dot-notation in queries and updates ("address.city")
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MongoValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | MongoDocument
  | MongoValue[];

export type MongoDocument = { [key: string]: MongoValue };

export type MongoQuery = Record<string, MongoValue | QueryOperator | LogicalCondition>;

type QueryOperator = {
  $eq?: MongoValue;
  $ne?: MongoValue;
  $gt?: MongoValue;
  $gte?: MongoValue;
  $lt?: MongoValue;
  $lte?: MongoValue;
  $in?: MongoValue[];
  $nin?: MongoValue[];
  $exists?: boolean;
  $regex?: string;
  $not?: Record<string, MongoValue>;
  $size?: number;
  $all?: MongoValue[];
};

type LogicalCondition = MongoQuery[];

export type MongoUpdate = {
  $set?: Record<string, MongoValue>;
  $unset?: Record<string, unknown>;
  $inc?: Record<string, number>;
  $push?: Record<string, MongoValue | { $each: MongoValue[] }>;
  $pull?: Record<string, MongoValue | MongoQuery>;
  $addToSet?: Record<string, MongoValue | { $each: MongoValue[] }>;
  $pop?: Record<string, 1 | -1>;
};

export type FindOptions = {
  sort?: Record<string, 1 | -1>;
  skip?: number;
  limit?: number;
  projection?: Record<string, 0 | 1>;
};

export interface InsertOneResult {
  acknowledged: true;
  insertedId: string;
}

export interface InsertManyResult {
  acknowledged: true;
  insertedIds: string[];
}

export interface UpdateResult {
  matched: number;
  modified: number;
}

export interface DeleteResult {
  deleted: number;
}

export type MongoEvent =
  | { type: "insert"; coll: string; id: string }
  | { type: "update"; coll: string; id: string }
  | { type: "delete"; coll: string; id: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function genId(): string {
  const t = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");
  const r = Math.random().toString(16).slice(2, 18).padEnd(16, "0");
  return (t + r).slice(0, 24);
}

function deepClone<T>(x: T): T {
  if (x == null || typeof x !== "object") return x;
  return JSON.parse(JSON.stringify(x)) as T;
}

function getField(obj: MongoDocument | null | undefined, path: string): MongoValue {
  if (obj == null) return undefined;
  const parts = path.split(".");
  let cur: MongoValue = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object" || Array.isArray(cur)) return undefined;
    cur = (cur as MongoDocument)[p];
  }
  return cur;
}

function setField(obj: MongoDocument, path: string, value: MongoValue): void {
  const parts = path.split(".");
  let cur: MongoDocument = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]!;
    const next = cur[p];
    if (next == null || typeof next !== "object" || Array.isArray(next)) {
      cur[p] = {};
    }
    cur = cur[p] as MongoDocument;
  }
  cur[parts[parts.length - 1]!] = value;
}

function unsetField(obj: MongoDocument, path: string): void {
  const parts = path.split(".");
  let cur: MongoValue = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur == null || typeof cur !== "object" || Array.isArray(cur)) return;
    cur = (cur as MongoDocument)[parts[i]!];
  }
  if (cur != null && typeof cur === "object" && !Array.isArray(cur)) {
    delete (cur as MongoDocument)[parts[parts.length - 1]!];
  }
}

function isOperatorObject(val: MongoValue): boolean {
  if (val == null || typeof val !== "object" || Array.isArray(val)) return false;
  return Object.keys(val as object).some((k) => k.startsWith("$"));
}

function checkOp(val: MongoValue, op: string, opVal: MongoValue): boolean {
  switch (op) {
    case "$eq": return val === opVal;
    case "$ne": return val !== opVal;
    case "$gt": return (val as number) > (opVal as number);
    case "$gte": return (val as number) >= (opVal as number);
    case "$lt": return (val as number) < (opVal as number);
    case "$lte": return (val as number) <= (opVal as number);
    case "$in": {
      const list = opVal as MongoValue[];
      if (Array.isArray(val)) return (val as MongoValue[]).some((v) => list.includes(v));
      return list.includes(val);
    }
    case "$nin": {
      const list = opVal as MongoValue[];
      if (Array.isArray(val)) return !(val as MongoValue[]).some((v) => list.includes(v));
      return !list.includes(val);
    }
    case "$exists": return (val !== undefined) === !!opVal;
    case "$regex": return val != null && new RegExp(opVal as string, "i").test(String(val));
    case "$not": {
      if (typeof opVal === "object" && opVal !== null && !Array.isArray(opVal)) {
        for (const [k, v] of Object.entries(opVal as Record<string, MongoValue>)) {
          if (checkOp(val, k, v)) return false;
        }
        return true;
      }
      return val !== opVal;
    }
    case "$size": return Array.isArray(val) && (val as MongoValue[]).length === opVal;
    case "$all": {
      const required = opVal as MongoValue[];
      return Array.isArray(val) && required.every((v) => (val as MongoValue[]).includes(v));
    }
    default: return false;
  }
}

function match(doc: MongoDocument, query: MongoQuery): boolean {
  if (!query) return true;
  for (const [key, cond] of Object.entries(query)) {
    if (key === "$or") {
      const branches = cond as MongoQuery[];
      if (!branches.some((q) => match(doc, q))) return false;
      continue;
    }
    if (key === "$and") {
      const branches = cond as MongoQuery[];
      if (!branches.every((q) => match(doc, q))) return false;
      continue;
    }
    if (key === "$nor") {
      const branches = cond as MongoQuery[];
      if (branches.some((q) => match(doc, q))) return false;
      continue;
    }
    const val = getField(doc, key);
    if (isOperatorObject(cond as MongoValue)) {
      for (const [op, opVal] of Object.entries(cond as Record<string, MongoValue>)) {
        if (!checkOp(val, op, opVal)) return false;
      }
    } else if (Array.isArray(cond)) {
      if (JSON.stringify(val) !== JSON.stringify(cond)) return false;
    } else if (cond !== null && typeof cond === "object") {
      if (JSON.stringify(val) !== JSON.stringify(cond)) return false;
    } else {
      if (Array.isArray(val)) {
        if (!(val as MongoValue[]).includes(cond as MongoValue)) return false;
      } else if (val !== cond) {
        return false;
      }
    }
  }
  return true;
}

function applyUpdate(doc: MongoDocument, update: MongoUpdate): void {
  for (const [op, fields] of Object.entries(update)) {
    if (op === "$set" && fields) {
      for (const k of Object.keys(fields as Record<string, MongoValue>)) {
        setField(doc, k, deepClone((fields as Record<string, MongoValue>)[k]));
      }
    } else if (op === "$unset" && fields) {
      for (const k of Object.keys(fields as Record<string, unknown>)) {
        unsetField(doc, k);
      }
    } else if (op === "$inc" && fields) {
      for (const k of Object.keys(fields as Record<string, number>)) {
        const cur = getField(doc, k);
        setField(doc, k, (typeof cur === "number" ? cur : 0) + (fields as Record<string, number>)[k]!);
      }
    } else if (op === "$push" && fields) {
      for (const k of Object.keys(fields as Record<string, MongoValue>)) {
        const arr = getField(doc, k);
        const newArr: MongoValue[] = Array.isArray(arr) ? [...(arr as MongoValue[])] : [];
        const val = (fields as Record<string, MongoValue>)[k];
        if (val && typeof val === "object" && !Array.isArray(val) && "$each" in (val as object)) {
          newArr.push(...((val as { $each: MongoValue[] }).$each));
        } else {
          newArr.push(deepClone(val));
        }
        setField(doc, k, newArr);
      }
    } else if (op === "$pull" && fields) {
      for (const k of Object.keys(fields as Record<string, MongoValue>)) {
        const arr = getField(doc, k);
        if (!Array.isArray(arr)) continue;
        const cond = (fields as Record<string, MongoValue>)[k];
        const filtered = (arr as MongoValue[]).filter((x) => {
          if (isOperatorObject(cond)) {
            for (const [oop, oval] of Object.entries(cond as Record<string, MongoValue>)) {
              if (checkOp(x, oop, oval)) return false;
            }
            return true;
          }
          if (cond !== null && typeof cond === "object" && !Array.isArray(cond)) {
            return !match(x as MongoDocument, cond as MongoQuery);
          }
          return x !== cond;
        });
        setField(doc, k, filtered);
      }
    } else if (op === "$addToSet" && fields) {
      for (const k of Object.keys(fields as Record<string, MongoValue>)) {
        const arr = getField(doc, k);
        const newArr: MongoValue[] = Array.isArray(arr) ? [...(arr as MongoValue[])] : [];
        const val = (fields as Record<string, MongoValue>)[k];
        const candidates: MongoValue[] =
          val && typeof val === "object" && !Array.isArray(val) && "$each" in (val as object)
            ? (val as { $each: MongoValue[] }).$each
            : [val];
        for (const c of candidates) {
          if (!newArr.some((x) => JSON.stringify(x) === JSON.stringify(c))) {
            newArr.push(deepClone(c));
          }
        }
        setField(doc, k, newArr);
      }
    } else if (op === "$pop" && fields) {
      for (const k of Object.keys(fields as Record<string, 1 | -1>)) {
        const arr = getField(doc, k);
        if (!Array.isArray(arr)) continue;
        const newArr = [...(arr as MongoValue[])];
        if ((fields as Record<string, 1 | -1>)[k] === -1) newArr.shift();
        else newArr.pop();
        setField(doc, k, newArr);
      }
    }
  }
}

function projectDoc(doc: MongoDocument, projection: Record<string, 0 | 1>): MongoDocument {
  const keys = Object.keys(projection);
  const inclusive = keys.some((k) => projection[k]);
  const out: MongoDocument = inclusive ? {} : deepClone(doc);
  if (inclusive) {
    if (!("_id" in projection)) out._id = doc._id;
    for (const k of keys) {
      if (projection[k]) {
        const v = getField(doc, k);
        if (v !== undefined) setField(out, k, deepClone(v));
      } else if (k === "_id") {
        delete out._id;
      }
    }
  } else {
    for (const k of keys) {
      if (!projection[k]) unsetField(out, k);
    }
  }
  return out;
}

function compareForSort(a: MongoDocument, b: MongoDocument, sort: Record<string, 1 | -1>): number {
  for (const [k, dir] of Object.entries(sort)) {
    const av = getField(a, k);
    const bv = getField(b, k);
    let cmp = 0;
    if (av == null && bv != null) cmp = -1;
    else if (av != null && bv == null) cmp = 1;
    else if ((av as number) < (bv as number)) cmp = -1;
    else if ((av as number) > (bv as number)) cmp = 1;
    if (dir < 0) cmp = -cmp;
    if (cmp !== 0) return cmp;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Aggregation pipeline stage type
// ---------------------------------------------------------------------------

export type AggregatePipeline = Array<
  | { $match: MongoQuery }
  | { $sort: Record<string, 1 | -1> }
  | { $limit: number }
  | { $skip: number }
  | { $project: Record<string, 0 | 1> }
  | { $group: Record<string, MongoValue | { $sum: MongoValue } | { $avg: MongoValue } | { $min: MongoValue } | { $max: MongoValue } | { $push: MongoValue }> }
>;

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

export class Collection {
  private readonly _db: MongoDB;
  private readonly _name: string;
  private readonly _docs: MongoDocument[];

  constructor(db: MongoDB, name: string) {
    this._db = db;
    this._name = name;
    this._docs = db._data[name] = db._data[name] ?? [];
  }

  insertOne(doc: MongoDocument): InsertOneResult {
    const d = deepClone(doc);
    if (!d._id) d._id = genId();
    this._docs.push(d);
    this._db._events.push({ type: "insert", coll: this._name, id: d._id as string });
    return { acknowledged: true, insertedId: d._id as string };
  }

  insertMany(docs: MongoDocument[]): InsertManyResult {
    const ids: string[] = [];
    for (const doc of docs) {
      const d = deepClone(doc);
      if (!d._id) d._id = genId();
      this._docs.push(d);
      ids.push(d._id as string);
      this._db._events.push({ type: "insert", coll: this._name, id: d._id as string });
    }
    return { acknowledged: true, insertedIds: ids };
  }

  find(query?: MongoQuery, opts: FindOptions = {}): MongoDocument[] {
    let results = this._docs.filter((d) => match(d, query ?? {}));
    if (opts.sort) results = [...results].sort((a, b) => compareForSort(a, b, opts.sort!));
    if (opts.skip) results = results.slice(opts.skip);
    if (opts.limit) results = results.slice(0, opts.limit);
    if (opts.projection) results = results.map((d) => projectDoc(d, opts.projection!));
    else results = results.map((d) => deepClone(d));
    return results;
  }

  findOne(query?: MongoQuery, opts: Omit<FindOptions, "limit"> = {}): MongoDocument | null {
    const r = this.find(query, { ...opts, limit: 1 });
    return r[0] ?? null;
  }

  updateOne(query: MongoQuery, update: MongoUpdate): UpdateResult {
    for (const d of this._docs) {
      if (match(d, query)) {
        applyUpdate(d, update);
        this._db._events.push({ type: "update", coll: this._name, id: d._id as string });
        return { matched: 1, modified: 1 };
      }
    }
    return { matched: 0, modified: 0 };
  }

  updateMany(query: MongoQuery, update: MongoUpdate): UpdateResult {
    let n = 0;
    for (const d of this._docs) {
      if (match(d, query)) {
        applyUpdate(d, update);
        this._db._events.push({ type: "update", coll: this._name, id: d._id as string });
        n++;
      }
    }
    return { matched: n, modified: n };
  }

  deleteOne(query: MongoQuery): DeleteResult {
    const idx = this._docs.findIndex((d) => match(d, query));
    if (idx >= 0) {
      const [d] = this._docs.splice(idx, 1);
      this._db._events.push({ type: "delete", coll: this._name, id: (d as MongoDocument)._id as string });
      return { deleted: 1 };
    }
    return { deleted: 0 };
  }

  deleteMany(query: MongoQuery): DeleteResult {
    const keep: MongoDocument[] = [];
    let n = 0;
    for (const d of this._docs) {
      if (match(d, query)) {
        this._db._events.push({ type: "delete", coll: this._name, id: d._id as string });
        n++;
      } else {
        keep.push(d);
      }
    }
    this._docs.length = 0;
    this._docs.push(...keep);
    return { deleted: n };
  }

  countDocuments(query?: MongoQuery): number {
    return this._docs.filter((d) => match(d, query ?? {})).length;
  }

  aggregate(pipeline: AggregatePipeline): MongoDocument[] {
    let docs = this._docs.map((d) => deepClone(d));
    for (const stage of pipeline) {
      const op = Object.keys(stage)[0] as keyof typeof stage;
      const arg = (stage as Record<string, unknown>)[op];
      if (op === "$match") {
        docs = docs.filter((d) => match(d, arg as MongoQuery));
      } else if (op === "$sort") {
        docs.sort((a, b) => compareForSort(a, b, arg as Record<string, 1 | -1>));
      } else if (op === "$limit") {
        docs = docs.slice(0, arg as number);
      } else if (op === "$skip") {
        docs = docs.slice(arg as number);
      } else if (op === "$project") {
        docs = docs.map((d) => projectDoc(d, arg as Record<string, 0 | 1>));
      } else if (op === "$group") {
        const groupSpec = arg as Record<string, MongoValue | Record<string, MongoValue>>;
        const out = new Map<string, MongoDocument>();
        const counts = new Map<string, number>();
        for (const d of docs) {
          const keyExpr = groupSpec._id as MongoValue;
          const keyVal =
            typeof keyExpr === "string" && keyExpr.startsWith("$")
              ? getField(d, (keyExpr as string).slice(1))
              : keyExpr;
          const keyJson = JSON.stringify(keyVal);
          if (!out.has(keyJson)) {
            out.set(keyJson, { _id: keyVal });
            counts.set(keyJson, 0);
          }
          const acc = out.get(keyJson)!;
          counts.set(keyJson, counts.get(keyJson)! + 1);
          for (const [k, spec] of Object.entries(groupSpec)) {
            if (k === "_id") continue;
            const specObj = spec as Record<string, MongoValue>;
            const [aggOp, aggVal] = Object.entries(specObj)[0] as [string, MongoValue];
            const v =
              typeof aggVal === "string" && aggVal.startsWith("$")
                ? getField(d, aggVal.slice(1))
                : aggVal;
            const count = counts.get(keyJson)!;
            if (aggOp === "$sum") {
              acc[k] = ((acc[k] as number) || 0) + (typeof v === "number" ? v : 1);
            } else if (aggOp === "$avg") {
              acc[k] = (((acc[k] as number) || 0) * (count - 1) + (v as number)) / count;
            } else if (aggOp === "$min") {
              acc[k] = acc[k] === undefined ? v : Math.min(acc[k] as number, v as number);
            } else if (aggOp === "$max") {
              acc[k] = acc[k] === undefined ? v : Math.max(acc[k] as number, v as number);
            } else if (aggOp === "$push") {
              acc[k] = acc[k] || [];
              (acc[k] as MongoValue[]).push(v);
            }
          }
        }
        docs = [...out.values()];
      }
    }
    return docs;
  }
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

export class MongoDB {
  /** @internal — exposed for Collection constructor; treat as private. */
  _data: Record<string, MongoDocument[]> = {};
  /** @internal — event log for UI; treat as private. */
  _events: MongoEvent[] = [];

  collection(name: string): Collection {
    return new Collection(this, name);
  }

  listCollections(): string[] {
    return Object.keys(this._data);
  }

  drop(name: string): void {
    delete this._data[name];
  }
}
