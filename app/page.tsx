"use client";

import { AppShell } from "@/components/app-shell";
import { LoginForm } from "@/components/auth/login-form";
// Tyto tři komponenty jsou váš "testovací skript"
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Loader2 } from "lucide-react";

export default function Home() {
  return (
    <>
      {/* 1. Pokud se stav ještě načítá (např. po kliknutí na Google) */}
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthLoading>

      {/* 2. Pokud se Convex (podle vašich logů) úspěšně spojil */}
      <Authenticated>
        <AppShell />
      </Authenticated>

      {/* 3. Pokud uživatel ještě není v logách vidět jako přihlášený */}
      <Unauthenticated>
        <LoginForm />
      </Unauthenticated>
    </>
  );
}
