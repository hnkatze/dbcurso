"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/curriculum";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-line bg-cream-deep overflow-y-auto border-r px-5 py-7 md:sticky md:top-0 md:h-screen">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <div className="bg-ink text-cream font-display relative grid h-[38px] w-[38px] place-items-center rounded-[10px] text-[22px] font-semibold italic">
          DB
          <span className="bg-sun-500 border-cream-deep absolute -right-[3px] -bottom-[3px] h-2 w-2 rounded-full border-2" />
        </div>
        <div>
          <div className="font-display text-[19px] leading-none font-semibold tracking-tight">
            DBs
          </div>
          <div className="text-ink-mute mt-1 text-[10px] tracking-widest uppercase">
            curso interactivo
          </div>
        </div>
      </Link>

      <nav aria-label="Lecciones del curso">
        {MODULES.map((section) => (
          <div key={section.section} className="mb-6">
            <div className="text-ink-mute mb-1.5 px-2.5 text-[10px] font-semibold tracking-widest uppercase">
              {section.section}
            </div>
            <ul>
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] transition",
                        active
                          ? "bg-ink text-cream"
                          : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                      ].join(" ")}
                    >
                      <span
                        className={`w-[18px] shrink-0 font-mono text-[11px] ${
                          active ? "text-cream/50" : "text-ink-mute"
                        }`}
                      >
                        {item.num}
                      </span>
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <p className="border-line text-ink-mute mt-10 border-t px-1 pt-5 text-[11px] leading-relaxed">
        Hecho para que entender bases de datos sea menos abstracto.
        <br />
        Escribe SQL real, mira tablas vivas.
      </p>
    </aside>
  );
}
