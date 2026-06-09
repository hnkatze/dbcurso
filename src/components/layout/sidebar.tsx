"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Combine,
  Database,
  Flame,
  KeyRound,
  Leaf,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sigma,
  TableProperties,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { MODULES } from "@/lib/curriculum";

/** One icon per lesson, shown when the sidebar is collapsed. */
const ICONS: Record<string, LucideIcon> = {
  intro: Database,
  create: TableProperties,
  write: Pencil,
  select: Search,
  keys: KeyRound,
  joins: Combine,
  group: Sigma,
  ventas: ShoppingCart,
  redis: Zap,
  mongo: Leaf,
  firebase: Flame,
  cassandra: Network,
  auditoria: ShieldCheck,
  desafios: Trophy,
};

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      className={`border-line bg-cream-deep overflow-y-auto border-r py-7 md:sticky md:top-0 md:h-screen ${
        collapsed ? "px-2.5" : "px-5"
      }`}
    >
      <div className={`mb-8 flex items-center ${collapsed ? "flex-col gap-3" : "justify-between"}`}>
        <Link href="/" className="flex items-center gap-2.5" aria-label="DBs — inicio">
          <div className="bg-ink text-cream font-display relative grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] text-[22px] font-semibold italic">
            DB
            <span className="bg-sun-500 border-cream-deep absolute -right-[3px] -bottom-[3px] h-2 w-2 rounded-full border-2" />
          </div>
          {!collapsed && (
            <div>
              <div className="font-display text-[19px] leading-none font-semibold tracking-tight">DBs</div>
              <div className="text-ink-mute mt-1 text-[10px] tracking-widest uppercase">curso interactivo</div>
            </div>
          )}
        </Link>
        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expandir el menú" : "Colapsar el menú"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expandir" : "Colapsar"}
          className="text-ink-mute hover:text-ink hover:bg-ink/5 grid h-8 w-8 shrink-0 place-items-center rounded-lg transition"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav aria-label="Lecciones del curso">
        {MODULES.map((section) => (
          <div key={section.section} className="mb-6">
            {!collapsed && (
              <div className="text-ink-mute mb-1.5 px-2.5 text-[10px] font-semibold tracking-widest uppercase">
                {section.section}
              </div>
            )}
            <ul className={collapsed ? "flex flex-col items-center gap-1" : ""}>
              {section.items.map((item) => {
                const active = pathname === item.href;
                const Icon = ICONS[item.id] ?? Database;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      title={collapsed ? item.label : undefined}
                      className={[
                        "flex items-center rounded-lg text-[14px] transition",
                        collapsed ? "h-10 w-10 justify-center" : "gap-2.5 px-2.5 py-2",
                        active ? "bg-ink text-cream" : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                      ].join(" ")}
                    >
                      {collapsed ? (
                        <Icon size={18} aria-hidden="true" />
                      ) : (
                        <>
                          <span
                            className={`w-[18px] shrink-0 font-mono text-[11px] ${
                              active ? "text-cream/50" : "text-ink-mute"
                            }`}
                          >
                            {item.num}
                          </span>
                          <span className="flex-1">{item.label}</span>
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <p className="border-line text-ink-mute mt-10 border-t px-1 pt-5 text-[11px] leading-relaxed">
          Hecho para que entender bases de datos sea menos abstracto.
          <br />
          Escribe SQL real, mira tablas vivas.
        </p>
      )}
    </aside>
  );
}
