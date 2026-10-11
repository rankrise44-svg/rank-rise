"use client";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui";

export function LogoutButton() {
  return (
    <Button variant="ghost" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.assign("/login"); }}>
      <LogOut className="size-4" /> تسجيل الخروج
    </Button>
  );
}
