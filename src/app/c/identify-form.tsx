"use client";

import { useFormState, useFormStatus } from "react-dom";
import { identifySoldier, type IdentifyState } from "@/actions/soldier-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? (
        <Loader2 className="ms-2 h-4 w-4 animate-spin" />
      ) : (
        <LogIn className="ms-2 h-4 w-4" />
      )}
      כניסה
    </Button>
  );
}

export function IdentifyForm() {
  const [state, formAction] = useFormState<IdentifyState, FormData>(
    identifySoldier,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">שם מלא</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          autoFocus
          placeholder="לדוגמה: יוסי כהן"
        />
      </div>
      {state?.error && (
        <div className="rounded border border-destructive bg-red-50 p-2 text-sm text-destructive">
          {state.error}
        </div>
      )}
      <SubmitButton />
    </form>
  );
}
