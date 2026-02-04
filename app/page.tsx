"use client";

import { AppShell } from "@/components/app-shell";
// Pokud máte soubor login-form.tsx ve složce src/components, použijte toto:
import { LoginForm } from "@/components/auth/login-form";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Loader2 } from "lucide-react";

export default function Home() {
  return (
    <main>
      {/* 1. STAV: Načítání - zobrazí se při ověřování session (např. po refresh) */}
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">Ověřování přihlášení...</p>
          </div>
        </div>
      </AuthLoading>

      {/* 2. STAV: Přihlášen - Convex potvrdil, že uživatel je OK */}
      <Authenticated>
        <AppShell />
      </Authenticated>

      {/* 3. STAV: Nepřihlášen - Zobrazíme formulář s Google tlačítkem */}
      <Unauthenticated>
        <LoginForm />
      </Unauthenticated>
    </main>
  );
}
