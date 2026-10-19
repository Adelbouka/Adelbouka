"use client";
import { useTransition } from "react";
import { documentUrlAction } from "@/lib/actions/business";
import { Button } from "@/components/ui/button";

/** Opens a private document through a 60-second signed URL generated for the current user. */
export function DocumentLink({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" size="sm" disabled={pending} onClick={() => start(async () => {
      const { url } = await documentUrlAction(id);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    })}>{label}</Button>
  );
}
