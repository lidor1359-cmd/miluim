"use client";

import { useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { SHIFT_HOURS } from "@/lib/scheduler/types";
import { getContrastText } from "@/lib/colors";

interface SoldierLite {
  id: string;
  name: string;
  color: string;
}

export function PrintView({
  weekStartLabel,
  soldiers,
  positions,
  dayDates,
  assignments,
}: {
  weekStartLabel: string;
  soldiers: SoldierLite[];
  positions: { id: string; name: string }[];
  dayDates: { dayIndex: number; name: string; label: string }[];
  assignments: {
    dayIndex: number;
    hour: number;
    positionId: string;
    soldierId: string | null;
  }[];
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const assignmentMap = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const a of assignments) {
      m.set(`${a.dayIndex}-${a.hour}-${a.positionId}`, a.soldierId);
    }
    return m;
  }, [assignments]);

  const soldiersById = useMemo(() => {
    const m = new Map<string, SoldierLite>();
    for (const s of soldiers) m.set(s.id, s);
    return m;
  }, [soldiers]);

  async function handleDownload() {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(printRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `שבצק-${weekStartLabel}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert("שגיאה בייצוא תמונה");
      console.error(err);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container py-4">
        <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">תצוגת הדפסה</h1>
          <div className="flex gap-2">
            <Button onClick={() => window.print()} variant="outline">
              <Printer className="ms-2 h-4 w-4" />
              הדפס
            </Button>
            <Button onClick={handleDownload} disabled={downloading}>
              <Download className="ms-2 h-4 w-4" />
              {downloading ? "מייצא..." : "ייצא PNG"}
            </Button>
          </div>
        </div>

        <div
          ref={printRef}
          className="bg-white p-6 shadow"
          style={{ direction: "rtl", fontFamily: "inherit" }}
        >
          <div className="mb-4 text-center">
            <h2 className="text-xl font-bold">שבצ&quot;ק שמירות</h2>
            <p className="text-sm">{weekStartLabel}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_180px]">
            {positions.map((pos) => (
              <div key={pos.id}>
                <h3 className="mb-1.5 text-center font-bold text-sm">
                  {pos.name}
                </h3>
                <table className="w-full border-collapse text-center text-[10px]">
                  <thead>
                    <tr>
                      <th className="border border-black bg-slate-100 p-1 font-semibold">
                        שעה
                      </th>
                      {dayDates.map((d) => (
                        <th
                          key={d.dayIndex}
                          className="border border-black bg-slate-100 p-1 font-semibold"
                        >
                          {d.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SHIFT_HOURS.map((h) => {
                      const endH = (h + 4) % 24;
                      return (
                        <tr key={h}>
                          <td className="border border-black bg-slate-50 p-1 whitespace-nowrap font-medium">
                            {pad(h)}:00-{pad(endH)}:00
                          </td>
                          {dayDates.map((d) => {
                            const key = `${d.dayIndex}-${h}-${pos.id}`;
                            const sid = assignmentMap.get(key);
                            const s = sid ? soldiersById.get(sid) : null;
                            return (
                              <td
                                key={key}
                                className="border border-black p-1"
                                style={{
                                  backgroundColor: s
                                    ? s.color
                                    : "#000000",
                                  color: s
                                    ? getContrastText(s.color)
                                    : "#ffffff",
                                  minWidth: 60,
                                  height: 32,
                                }}
                              >
                                {s?.name || ""}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}

            <div>
              <h3 className="mb-1.5 text-center font-bold text-sm">מקרא</h3>
              <div className="grid grid-cols-2 gap-1">
                {soldiers.map((s) => (
                  <div
                    key={s.id}
                    className="rounded px-1.5 py-1 text-[10px] font-medium text-center"
                    style={{
                      backgroundColor: s.color,
                      color: getContrastText(s.color),
                    }}
                  >
                    {s.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}
