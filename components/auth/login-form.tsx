"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Mail, KeyRound, Syringe, Lock, Check, X, ArrowLeft } from "lucide-react";

type Step =
  | "signIn"
  | "signUp"
  | "forgot"
  | "otp"
  | { type: "verifyEmail"; email: string }
  | { type: "resetPassword"; email: string };

export function LoginForm() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<Step>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordValid = password.length >= 8;

  // OTP Flow (Email zadání)
  const handleOtpEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      const emailValue = formData.get("email") as string;
      setEmail(emailValue);
      await signIn("resend-otp", formData);
      setStep({ type: "verifyEmail", email: emailValue });
    } catch (err) {
      console.error("Email submit error:", err);
      setError("Nepodařilo se odeslat kód. Zkuste to znovu.");
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Code verification
  const handleOtpCodeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      await signIn("resend-otp", formData);
    } catch (err) {
      console.error("Code submit error:", err);
      setError("Neplatný kód. Zkuste to znovu.");
    } finally {
      setIsLoading(false);
    }
  };

  // Password Sign In / Sign Up
  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      await signIn("password", formData);
      // If sign up, go to email verification
      if (step === "signUp") {
        setStep({ type: "verifyEmail", email: formData.get("email") as string });
      }
    } catch (err) {
      console.error("Password submit error:", err);
      const errorMessage = err instanceof Error ? err.message : "Nastala chyba";
      
      if (errorMessage.includes("already exists")) {
        setError("Účet s tímto emailem již existuje. Přihlaste se.");
      } else if (errorMessage.includes("Invalid password")) {
        setError("Heslo musí mít alespoň 8 znaků.");
      } else if (errorMessage.includes("Invalid credentials") || errorMessage.includes("invalid")) {
        setError("Nesprávný email nebo heslo.");
      } else {
        setError("Nastala chyba. Zkuste to znovu.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password - send reset code
  const handleForgotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      const emailValue = formData.get("email") as string;
      await signIn("password", formData);
      setStep({ type: "resetPassword", email: emailValue });
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("Nepodařilo se odeslat kód. Zkontrolujte email.");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password verification
  const handleResetPasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      await signIn("password", formData);
    } catch (err) {
      console.error("Reset password error:", err);
      setError("Neplatný kód nebo slabé heslo. Zkuste to znovu.");
    } finally {
      setIsLoading(false);
    }
  };

  // Email verification (after sign up)
  const handleEmailVerificationSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData(e.currentTarget);
      await signIn("resend-otp", formData);
    } catch (err) {
      console.error("Email verification error:", err);
      setError("Neplatný kód. Zkuste to znovu.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderHeader = (title: string, description: string) => (
    <CardHeader className="text-center space-y-4">
      <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
        <Syringe className="w-8 h-8 text-primary" />
      </div>
      <CardTitle className="text-2xl font-bold">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
  );

  // OTP Email form
  if (step === "otp") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border-border bg-card">
          {renderHeader("GLP Tracker", "Zadejte svůj email pro přihlášení")}
          <CardContent>
            <form onSubmit={handleOtpEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="vas@email.cz"
                    required
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Odesílám...
                  </>
                ) : (
                  "Odeslat kód"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setStep("signIn"); setError(""); }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zpět na přihlášení
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email verification (OTP code entry)
  if (typeof step === "object" && step.type === "verifyEmail") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border-border bg-card">
          {renderHeader("GLP Tracker", "Zadejte ověřovací kód z emailu")}
          <CardContent>
            <form onSubmit={handleEmailVerificationSubmit} className="space-y-4">
              <input type="hidden" name="email" value={step.email} />
              <input type="hidden" name="flow" value="email-verification" />
              <div className="space-y-2">
                <Label htmlFor="code">Ověřovací kód</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    placeholder="123456"
                    required
                    className="pl-10 text-center text-lg tracking-widest"
                    disabled={isLoading}
                    autoComplete="one-time-code"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Kód byl odeslán na {step.email}
                </p>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ověřuji...
                  </>
                ) : (
                  "Ověřit kód"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setStep("signIn"); setError(""); }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zpět na přihlášení
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Forgot password form
  if (step === "forgot") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border-border bg-card">
          {renderHeader("Zapomenuté heslo", "Zadejte email pro obnovení hesla")}
          <CardContent>
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <input type="hidden" name="flow" value="reset" />
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="vas@email.cz"
                    required
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Odesílám...
                  </>
                ) : (
                  "Odeslat kód pro obnovení"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setStep("signIn"); setError(""); }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zpět na přihlášení
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reset password verification form
  if (typeof step === "object" && step.type === "resetPassword") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md border-border bg-card">
          {renderHeader("Nové heslo", "Zadejte kód a nové heslo")}
          <CardContent>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <input type="hidden" name="email" value={step.email} />
              <input type="hidden" name="flow" value="reset-verification" />
              <div className="space-y-2">
                <Label htmlFor="code">Ověřovací kód</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    placeholder="123456"
                    required
                    className="pl-10 text-center text-lg tracking-widest"
                    disabled={isLoading}
                    autoComplete="one-time-code"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nové heslo</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {passwordValid ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={passwordValid ? "text-green-500" : "text-muted-foreground"}>
                    Alespoň 8 znaků
                  </span>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ukládám...
                  </>
                ) : (
                  "Nastavit nové heslo"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setStep("signIn"); setError(""); setPassword(""); }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zpět na přihlášení
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Sign In / Sign Up form
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border bg-card">
        {renderHeader(
          "GLP Tracker",
          step === "signIn" ? "Přihlaste se do svého účtu" : "Vytvořte si nový účet"
        )}
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input type="hidden" name="flow" value={step === "signIn" ? "signIn" : "signUp"} />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="vas@email.cz"
                  required
                  className="pl-10"
                  disabled={isLoading}
                  autoComplete="email"
                  onChange={() => setError("")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Heslo</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="pl-10"
                  disabled={isLoading}
                  autoComplete={step === "signIn" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                />
              </div>
              {step === "signUp" && (
                <div className="flex items-center gap-2 text-xs">
                  {passwordValid ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <X className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className={passwordValid ? "text-green-500" : "text-muted-foreground"}>
                    Alespoň 8 znaků
                  </span>
                </div>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {step === "signIn" ? "Přihlašuji..." : "Registruji..."}
                </>
              ) : (
                step === "signIn" ? "Přihlásit se" : "Registrovat"
              )}
            </Button>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">nebo</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => { setStep("otp"); setError(""); setPassword(""); }}
            >
              <Mail className="mr-2 h-4 w-4" />
              Přihlásit se kódem z emailu
            </Button>

            <div className="flex flex-col items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setStep(step === "signIn" ? "signUp" : "signIn"); setError(""); setPassword(""); }}
                className="text-sm text-primary hover:underline"
              >
                {step === "signIn" ? "Nemáte účet? Registrujte se" : "Máte účet? Přihlaste se"}
              </button>
              {step === "signIn" && (
                <button
                  type="button"
                  onClick={() => { setStep("forgot"); setError(""); setPassword(""); }}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Zapomněli jste heslo?
                </button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
