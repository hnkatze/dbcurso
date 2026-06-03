"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { LessonFooter } from "./footer";

/**
 * Client shell that owns the sidebar collapse state. It wraps the sidebar and
 * the main content so the grid column width can react to the collapse toggle.
 * The choice persists in localStorage.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // localStorage is client-only — reading the persisted preference on mount
    // (not during render) is what avoids an SSR hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      return next;
    });

  return (
    <div
      className={`grid min-h-screen grid-cols-1 ${
        collapsed ? "md:grid-cols-[68px_minmax(0,1fr)]" : "md:grid-cols-[280px_minmax(0,1fr)]"
      }`}
    >
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main id="main" className="mx-auto w-full max-w-[1440px] px-7 py-14 pb-24 md:px-16">
        {children}
        <LessonFooter />
      </main>
    </div>
  );
}
