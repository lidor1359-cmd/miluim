"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

export type TabKey = "schedule" | "constraints";

interface TabDef {
  key: TabKey;
  label: string;
  available: boolean;
  badge?: string | null;
}

interface Props {
  active: TabKey;
  tabs: TabDef[];
}

export function CTabs({ active, tabs }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const select = useCallback(
    (key: TabKey) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", key);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return (
    <div
      role="tablist"
      className="grid grid-cols-2 gap-1 rounded-lg bg-slate-200 p-1"
    >
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={!t.available}
            onClick={() => t.available && select(t.key)}
            className={`relative rounded-md px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-white shadow"
                : t.available
                ? "text-slate-700 hover:bg-white/50"
                : "text-slate-400 cursor-not-allowed"
            }`}
          >
            {t.label}
            {t.badge && (
              <span className="ms-2 inline-flex items-center justify-center rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] text-white">
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
