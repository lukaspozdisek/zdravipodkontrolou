"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, ChevronLeft, Check } from "lucide-react";

// Medication options matching the image design
const medications = [
  { 
    id: "ozempic", 
    name: "Ozempic", 
    icon: "🔵",
    textColor: "#C8102E",
    substanceId: "ozempic" 
  },
  { 
    id: "wegovy", 
    name: "Wegovy", 
    icon: null,
    textColor: "#007AFF",
    substanceId: "wegovy" 
  },
  { 
    id: "tirz-mounjaro", 
    name: "Mounjaro", 
    icon: "🟣",
    textColor: "#7B2D8E",
    substanceId: "tirz" 
  },
  { 
    id: "tirz-zepbound", 
    name: "Zepbound", 
    icon: null,
    textColor: "#5D3A9B",
    substanceId: "tirz" 
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedMed, setSelectedMed] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Profile data
  const [name, setName] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [targetWeightKg, setTargetWeightKg] = useState("");
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [birthYear, setBirthYear] = useState("");

  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const handleContinue = () => {
    if (step === 1 && selectedMed) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleFinish = async () => {
    if (!selectedMed) return;
    
    setIsSubmitting(true);
    try {
      const medication = medications.find(m => m.id === selectedMed);
      
      // Calculate birthDate from year
      let birthDate: number | undefined;
      if (birthYear) {
        const year = parseInt(birthYear);
        if (year >= 1900 && year <= new Date().getFullYear()) {
          birthDate = new Date(year, 0, 1).getTime();
        }
      }

      await completeOnboarding({
        defaultSubstanceId: medication?.substanceId || "wegovy",
        name: name || undefined,
        heightCm: heightCm ? parseInt(heightCm) : undefined,
        targetWeightKg: targetWeightKg ? parseFloat(targetWeightKg) : undefined,
        birthDate,
        gender: gender || undefined,
      });
      
      onComplete();
    } catch (error) {
      console.error("Onboarding error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Dark gradient background with purple/blue tones */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, #1a1040 0%, #0d0d1a 50%, #0a0a12 100%)"
        }}
      />
      
      {/* Sparkle effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.2,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${Math.random() * 2 + 1}s`,
            }}
          />
        ))}
      </div>
      
      {/* Step 1: Medication Selection */}
      {step === 1 && (
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center space-y-8 animate-in fade-in duration-500">
          {/* Logo - Heart with syringe */}
          <div className="relative w-24 h-24">
            {/* Heart shape */}
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Heart background */}
              <path
                d="M50 88 C20 65 5 45 5 30 C5 15 18 5 33 5 C42 5 50 12 50 12 C50 12 58 5 67 5 C82 5 95 15 95 30 C95 45 80 65 50 88Z"
                fill="#E91E63"
                opacity="0.8"
              />
              {/* Heart border/glow */}
              <path
                d="M50 88 C20 65 5 45 5 30 C5 15 18 5 33 5 C42 5 50 12 50 12 C50 12 58 5 67 5 C82 5 95 15 95 30 C95 45 80 65 50 88Z"
                fill="none"
                stroke="#FF69B4"
                strokeWidth="2"
              />
            </svg>
            {/* Syringe */}
            <svg 
              viewBox="0 0 24 24" 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[45%] w-10 h-10"
              style={{ transform: "translate(-50%, -45%) rotate(45deg)" }}
            >
              {/* Syringe body */}
              <rect x="8" y="4" width="8" height="14" rx="1" fill="#00CED1" />
              {/* Syringe plunger */}
              <rect x="10" y="1" width="4" height="3" fill="#00CED1" />
              {/* Needle */}
              <path d="M11 18 L11 22 L13 22 L13 18" fill="#00CED1" />
              {/* Measurement lines */}
              <line x1="9" y1="8" x2="11" y2="8" stroke="#0a0a12" strokeWidth="0.5" />
              <line x1="9" y1="11" x2="11" y2="11" stroke="#0a0a12" strokeWidth="0.5" />
              <line x1="9" y1="14" x2="11" y2="14" stroke="#0a0a12" strokeWidth="0.5" />
            </svg>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-white">
              Tvůj průvodce na cestě<br />s GLP-1.
            </h1>
            <p className="text-gray-300 text-lg">
              Bezpečně, anonymně, spolu.
            </p>
          </div>

          {/* Medication selection */}
          <div className="w-full space-y-4">
            <p className="text-center text-white font-medium text-lg">
              Vyber svůj lék:
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {medications.map((med) => (
                <button
                  key={med.id}
                  onClick={() => setSelectedMed(med.id)}
                  className={cn(
                    "py-4 px-5 rounded-2xl font-bold text-lg transition-all",
                    "bg-white shadow-lg hover:shadow-xl hover:scale-[1.02]",
                    selectedMed === med.id 
                      ? "ring-3 ring-purple-500 ring-offset-2 ring-offset-transparent scale-[1.02]" 
                      : ""
                  )}
                  style={{ color: med.textColor }}
                >
                  <span className="flex items-center justify-center gap-1">
                    {med.icon && <span className="text-sm">{med.icon}</span>}
                    {med.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Continue button */}
          <button
            onClick={handleContinue}
            disabled={!selectedMed}
            className={cn(
              "w-full py-4 rounded-2xl text-lg font-semibold text-white transition-all",
              "shadow-lg hover:shadow-xl",
              selectedMed 
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700" 
                : "bg-gray-600 opacity-50 cursor-not-allowed"
            )}
          >
            Pokračovat
          </button>
        </div>
      )}

      {/* Step 2: Profile Details */}
      {step === 2 && (
        <div className="relative z-10 w-full max-w-sm flex flex-col space-y-6 animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-white">
              O tobě
            </h1>
            <p className="text-gray-400 text-sm">
              Tyto údaje nám pomohou přizpůsobit aplikaci
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">Jméno (volitelné)</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jak ti říkat?"
                className="h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300">Pohlaví</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender("male")}
                  className={cn(
                    "py-3 px-4 rounded-xl font-medium transition-all",
                    gender === "male"
                      ? "bg-purple-600 text-white"
                      : "bg-white/10 text-gray-300 hover:bg-white/20"
                  )}
                >
                  👨 Muž
                </button>
                <button
                  type="button"
                  onClick={() => setGender("female")}
                  className={cn(
                    "py-3 px-4 rounded-xl font-medium transition-all",
                    gender === "female"
                      ? "bg-purple-600 text-white"
                      : "bg-white/10 text-gray-300 hover:bg-white/20"
                  )}
                >
                  👩 Žena
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthYear" className="text-gray-300">Rok narození</Label>
              <Input
                id="birthYear"
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="např. 1985"
                className="h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                min={1900}
                max={new Date().getFullYear()}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="height" className="text-gray-300">Výška (cm)</Label>
              <Input
                id="height"
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="např. 175"
                className="h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetWeight" className="text-gray-300">Cílová váha (kg)</Label>
              <Input
                id="targetWeight"
                type="number"
                step="0.1"
                value={targetWeightKg}
                onChange={(e) => setTargetWeightKg(e.target.value)}
                placeholder="např. 70"
                className="h-12 bg-white/10 border-white/20 text-white placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              className="h-12 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Zpět
            </Button>
            <button
              onClick={handleFinish}
              disabled={isSubmitting}
              className={cn(
                "flex-1 h-12 rounded-xl text-lg font-semibold text-white transition-all flex items-center justify-center",
                "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700",
                isSubmitting && "opacity-50 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Dokončit
                  <Check className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step indicators */}
      <div className="absolute bottom-8 flex gap-2">
        <div className={cn(
          "w-2 h-2 rounded-full transition-colors",
          step === 1 ? "bg-purple-500" : "bg-gray-600"
        )} />
        <div className={cn(
          "w-2 h-2 rounded-full transition-colors",
          step === 2 ? "bg-purple-500" : "bg-gray-600"
        )} />
      </div>
    </div>
  );
}
