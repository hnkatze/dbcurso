"use client";

import { useState } from "react";
import { MongoDB } from "@/lib/engines/mongo";
import type { MongoDocument, MongoValue } from "@/lib/engines/mongo";
import { JsonView } from "./json-view";
import { CmdLog, DemoFrame, LeftPane, RightPane } from "./demo-frame";
import type { CmdEntry } from "./demo-frame";

interface UserProfile extends MongoDocument {
  _id: string;
  name: string;
  email: string;
  age: number;
  address: { city: string; country: string; zip: string };
  prefs: { theme: string; newsletter: boolean };
  interests: string[];
}

const INTEREST_POOL = [
  "fotografía",
  "café",
  "running",
  "lectura",
  "cocina",
  "cine",
  "música",
  "viajes",
] as const;

function createInitialDb(): MongoDB {
  const d = new MongoDB();
  d.collection("users").insertOne({
    _id: "u042",
    name: "Ana Restrepo",
    email: "ana@mail.com",
    age: 27,
    address: { city: "Bogotá", country: "Colombia", zip: "110111" },
    prefs: { theme: "light", newsletter: true },
    interests: ["café", "lectura"],
  });
  return d;
}

function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
}: {
  id: string;
  label: string;
  type?: "text" | "number";
  value: string | number;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block font-mono text-[10.5px] tracking-widest uppercase text-ink-mute mb-1"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full font-mono text-[13px] bg-paper border border-line rounded px-2 py-1.5 focus:outline-none focus:border-sun-500"
      />
    </div>
  );
}

export function ProfileDemo() {
  const [db] = useState<MongoDB>(createInitialDb);
  const [, forceUpdate] = useState(0);
  const [history, setHistory] = useState<CmdEntry[]>([]);

  const user = db.collection("users").findOne({ _id: "u042" }) as UserProfile;

  function setVal(field: string, value: MongoValue) {
    db.collection("users").updateOne({ _id: "u042" }, { $set: { [field]: value } });
    const v = typeof value === "string" ? `"${value}"` : String(value);
    setHistory((h) =>
      [
        ...h,
        { cmd: `db.users.updateOne({_id:"u042"}, { $set: { "${field}": ${v} } })` },
      ].slice(-8),
    );
    forceUpdate((x) => x + 1);
  }

  function toggleInterest(t: string) {
    const interests = user.interests as string[];
    if (interests.includes(t)) {
      db.collection("users").updateOne({ _id: "u042" }, { $pull: { interests: t } });
      setHistory((h) =>
        [
          ...h,
          { cmd: `db.users.updateOne({_id:"u042"}, { $pull: { interests: "${t}" } })` },
        ].slice(-8),
      );
    } else {
      db.collection("users").updateOne({ _id: "u042" }, { $addToSet: { interests: t } });
      setHistory((h) =>
        [
          ...h,
          { cmd: `db.users.updateOne({_id:"u042"}, { $addToSet: { interests: "${t}" } })` },
        ].slice(-8),
      );
    }
    forceUpdate((x) => x + 1);
  }

  const address = user.address as { city: string; country: string; zip: string };
  const prefs = user.prefs as { theme: string; newsletter: boolean };
  const interests = user.interests as string[];

  return (
    <DemoFrame
      icon="◆"
      title="Editor de perfil · usuario u042"
      subtitle="$set con dot-notation · $pull / $addToSet"
    >
      <LeftPane>
        <div className="rounded-2xl bg-cream border border-line p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 grid place-items-center font-display italic text-[22px] font-medium"
              aria-hidden="true"
            >
              {(user.name as string)[0]}
            </div>
            <div className="flex-1 min-w-0">
              <label className="sr-only" htmlFor="profile-name">
                Nombre completo
              </label>
              <input
                id="profile-name"
                value={user.name as string}
                onChange={(e) => setVal("name", e.target.value)}
                className="font-display text-[18px] font-semibold bg-transparent border-0 border-b border-transparent hover:border-line focus:border-sun-500 focus:outline-none w-full"
              />
              <div className="font-mono text-[11px] text-ink-mute">u042</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              id="profile-email"
              label="Email"
              value={user.email as string}
              onChange={(v) => setVal("email", v)}
            />
            <Field
              id="profile-age"
              label="Edad"
              type="number"
              value={user.age as number}
              onChange={(v) => setVal("age", parseInt(v) || 0)}
            />
          </div>

          <fieldset>
            <legend className="font-mono text-[10.5px] tracking-widest uppercase text-ink-mute mb-2">
              Dirección
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <Field
                id="profile-city"
                label="Ciudad"
                value={address.city}
                onChange={(v) => setVal("address.city", v)}
              />
              <Field
                id="profile-country"
                label="País"
                value={address.country}
                onChange={(v) => setVal("address.country", v)}
              />
            </div>
          </fieldset>

          <div>
            <div className="font-mono text-[10.5px] tracking-widest uppercase text-ink-mute mb-2">
              Preferencias
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                <span>Tema:</span>
                <select
                  value={prefs.theme}
                  onChange={(e) => setVal("prefs.theme", e.target.value)}
                  className="font-mono text-[12px] bg-paper border border-line rounded px-2 py-1"
                  aria-label="Tema de la interfaz"
                >
                  <option value="light">light</option>
                  <option value="dark">dark</option>
                  <option value="auto">auto</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.newsletter}
                  onChange={(e) => setVal("prefs.newsletter", e.target.checked)}
                  className="accent-sun-500"
                />
                <span>Newsletter</span>
              </label>
            </div>
          </div>

          <div>
            <div className="font-mono text-[10.5px] tracking-widest uppercase text-ink-mute mb-2">
              Intereses
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Intereses">
              {INTEREST_POOL.map((t) => {
                const on = interests.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggleInterest(t)}
                    aria-pressed={on}
                    className={`text-[12px] px-2.5 py-1 rounded-full border transition ${
                      on
                        ? "bg-ink text-cream border-ink"
                        : "bg-paper text-ink-soft border-line hover:bg-cream-deep"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </LeftPane>

      <RightPane>
        <div className="text-[10.5px] tracking-widest uppercase text-sun-500 mb-1">
          Documento · users/u042
        </div>
        <div className="bg-white/5 rounded-xl p-3.5 border border-white/10 overflow-auto max-h-[260px]">
          <div className="font-mono text-[11.5px] leading-relaxed">
            <JsonView data={user} />
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
