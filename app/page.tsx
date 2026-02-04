"use client";

import { AppShell } from "@/components/app-shell";
import { LoginForm } from "@/components/login-form";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Loader2 } from "lucide-react";

export default function Home() {
  return (
    <>
      {/* Zobrazí se jen když je uživatel přihlášen */}
      <Authenticated>
        <AppShell />
      </Authenticated>

      {/* Zobrazí se jen když uživatel NENÍ přihlášen */}
      <Unauthenticated>
        <LoginForm />
      </Unauthenticated>

      {/* Volitelné: Zobrazí se při načítání stavu (např. po refresh stránky) */}
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthLoading>
    </>
  );
}
