"use client";

import { useConvexAuth } from "convex/react";
import { AppShell } from "@/components/app-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function Home() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  // 1. Logování do konzole prohlížeče (F12) pro kontrolu
  console.log("Stav přihlášení:", { isLoading, isAuthenticated });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-xl font-bold animate-pulse">Načítám Convex stav...</p>
          <p className="text-sm text-gray-500">Sleduji logy: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Miniaturní debug lišta nahoře na webu */}
      <div className={`fixed top-0 left-0 w-full p-1 text-center text-xs text-white z-[9999] ${isAuthenticated ? 'bg-green-600' : 'bg-red-600'}`}>
        DEBUG: {isAuthenticated ? "JSTE PŘIHLÁŠEN ✅" : "NENÍ PŘIHLÁŠENO ❌"}
      </div>

      {isAuthenticated ? <AppShell /> : <LoginForm />}
    </div>
  );
}
