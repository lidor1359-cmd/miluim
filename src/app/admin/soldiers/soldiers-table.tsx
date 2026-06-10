"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createSoldier,
  updateSoldier,
  deleteSoldier,
  toggleSoldierActive,
} from "@/actions/soldiers";
import { Trash2, Plus, Check, X, Copy } from "lucide-react";

interface SoldierRow {
  id: string;
  name: string;
  personalId: string | null;
  color: string;
  phone: string | null;
  active: boolean;
}

export function SoldiersTable({
  soldiers,
  availableColors,
}: {
  soldiers: SoldierRow[];
  availableColors: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  function handleCopySharedLink() {
    const url = `${window.location.origin}/c`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    });
  }

  return (
    <div className="space-y-3">
      {/* Shared identification link */}
      <div className="rounded-md border bg-blue-50 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <div className="font-medium">קישור משותף להגשת אילוצים</div>
          <div className="text-muted-foreground text-xs">
            שלחו את הקישור לכל החיילים. כל אחד יזדהה בשם ובמספר אישי לפני הגשה.
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={handleCopySharedLink}>
          {linkCopied ? (
            <Check className="ms-2 h-3 w-3" />
          ) : (
            <Copy className="ms-2 h-3 w-3" />
          )}
          {linkCopied ? "הועתק" : "העתק קישור /c"}
        </Button>
      </div>

      {adding && (
        <AddSoldierForm
          availableColors={availableColors}
          usedColors={soldiers.map((s) => s.color)}
          onClose={() => setAdding(false)}
        />
      )}
      {!adding && (
        <Button onClick={() => setAdding(true)} className="mb-2">
          <Plus className="ms-2 h-4 w-4" />
          הוסף חייל
        </Button>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-right">
              <th className="p-2 font-medium">צבע</th>
              <th className="p-2 font-medium">שם</th>
              <th className="p-2 font-medium">מספר אישי</th>
              <th className="p-2 font-medium">טלפון</th>
              <th className="p-2 font-medium">סטטוס</th>
              <th className="p-2 font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {soldiers.map((s) =>
              editingId === s.id ? (
                <EditSoldierRow
                  key={s.id}
                  soldier={s}
                  availableColors={availableColors}
                  usedColors={soldiers.filter((x) => x.id !== s.id).map((x) => x.color)}
                  onClose={() => setEditingId(null)}
                />
              ) : (
                <tr
                  key={s.id}
                  className="border-b hover:bg-slate-50"
                  style={{ opacity: s.active ? 1 : 0.5 }}
                >
                  <td className="p-2">
                    <div
                      className="h-8 w-8 rounded"
                      style={{ backgroundColor: s.color }}
                      title={s.color}
                    />
                  </td>
                  <td className="p-2 font-medium">{s.name}</td>
                  <td className="p-2 font-mono text-xs">
                    {s.personalId || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-2 text-muted-foreground">
                    {s.phone || "—"}
                  </td>
                  <td className="p-2">
                    {s.active ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                        פעיל
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs">
                        לא פעיל
                      </span>
                    )}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingId(s.id)}
                      >
                        ערוך
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            await toggleSoldierActive(s.id, !s.active);
                          })
                        }
                      >
                        {s.active ? "השבת" : "הפעל"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => {
                          if (confirm(`למחוק את ${s.name}?`)) {
                            startTransition(async () => {
                              await deleteSoldier(s.id);
                            });
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddSoldierForm({
  availableColors,
  usedColors,
  onClose,
}: {
  availableColors: string[];
  usedColors: string[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const firstFreeColor =
    availableColors.find((c) => !usedColors.includes(c)) || availableColors[0];
  const [color, setColor] = useState(firstFreeColor);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("color", color);
    startTransition(async () => {
      const res = await createSoldier(fd);
      if (res.error) setError(res.error);
      else onClose();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border bg-slate-50 p-4 space-y-3"
    >
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <Label htmlFor="name">שם מלא</Label>
          <Input id="name" name="name" required autoFocus />
        </div>
        <div>
          <Label htmlFor="personalId">מספר אישי</Label>
          <Input
            id="personalId"
            name="personalId"
            inputMode="numeric"
            placeholder="להזדהות בהגשת אילוצים"
          />
        </div>
        <div>
          <Label htmlFor="phone">טלפון (אופציונלי)</Label>
          <Input id="phone" name="phone" type="tel" />
        </div>
        <div>
          <Label>צבע</Label>
          <ColorPicker
            value={color}
            onChange={setColor}
            colors={availableColors}
            usedColors={usedColors}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          הוסף
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          ביטול
        </Button>
      </div>
    </form>
  );
}

function EditSoldierRow({
  soldier,
  availableColors,
  usedColors,
  onClose,
}: {
  soldier: SoldierRow;
  availableColors: string[];
  usedColors: string[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [color, setColor] = useState(soldier.color);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("color", color);
    startTransition(async () => {
      const res = await updateSoldier(soldier.id, fd);
      if (res.error) setError(res.error);
      else onClose();
    });
  }

  return (
    <tr className="border-b bg-blue-50">
      <td colSpan={6} className="p-3">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label>שם מלא</Label>
              <Input name="name" defaultValue={soldier.name} required />
            </div>
            <div>
              <Label>מספר אישי</Label>
              <Input
                name="personalId"
                inputMode="numeric"
                defaultValue={soldier.personalId || ""}
              />
            </div>
            <div>
              <Label>טלפון</Label>
              <Input name="phone" type="tel" defaultValue={soldier.phone || ""} />
            </div>
            <div>
              <Label>צבע</Label>
              <ColorPicker
                value={color}
                onChange={setColor}
                colors={availableColors}
                usedColors={usedColors}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              <Check className="ms-1 h-3 w-3" />
              שמור
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onClose}>
              <X className="ms-1 h-3 w-3" />
              ביטול
            </Button>
          </div>
        </form>
      </td>
    </tr>
  );
}

function ColorPicker({
  value,
  onChange,
  colors,
  usedColors,
}: {
  value: string;
  onChange: (c: string) => void;
  colors: string[];
  usedColors: string[];
}) {
  return (
    <div className="grid grid-cols-10 gap-1.5">
      {colors.map((c) => {
        const used = usedColors.includes(c) && c !== value;
        return (
          <button
            type="button"
            key={c}
            onClick={() => onChange(c)}
            className={`h-7 w-7 rounded transition-transform ${
              value === c ? "ring-2 ring-offset-2 ring-black scale-110" : ""
            } ${used ? "opacity-30" : "hover:scale-105"}`}
            style={{ backgroundColor: c }}
            title={used ? `${c} (בשימוש)` : c}
          />
        );
      })}
    </div>
  );
}
