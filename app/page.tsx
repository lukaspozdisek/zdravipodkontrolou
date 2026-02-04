"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { LoginForm } from "@/components/auth/login-form";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  // Počkáme, až se komponenta připojí v prohlížeči
  useEffect(() => {
    setMounted(true);
  }, []);

  // Dokud nejsme v prohlížeči, nevyrenderujeme nic (zabráníme Hydration Error)
  if (!mounted) return null;

  return (
    <main>
      <AuthLoading>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AuthLoading>

      <Authenticated>
        <AppShell />
      </Authenticated>

      <Unauthenticated>
        <LoginForm />
      </Unauthenticated>
    </main>
  );
}
