"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Area, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from "recharts";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Activity, ChevronLeft, ChevronRight, User } from "lucide-react";
import { calculateDrugLevel } from "@/lib/pharmacokinetics";
import { findSubstance } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ProfileTab } from "@/components/tabs/profile-tab";

// Traffic light phase type
type TrafficPhase = "peak" | "cruise" | "washout" | "none";

interface TrafficLightConfig {
  color: string;
  bgColor: string;
  label: string;
  advice: string;
  emoji: string;
}

const trafficLightConfig: Record<TrafficPhase, TrafficLightConfig> = {
  peak: {
    color: "text-red-500",
    bgColor: "bg-red-500/10 border-red-500/30",
    label: "Maximální účinek",
    advice: "Dnes jez jen malé porce. Vyhni se tučnému. Hodně pij.",
    emoji: "🔴",
  },
  cruise: {
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10 border-yellow-500/30",
    label: "Optimální zóna",
    advice: "Využij dnešek k doplnění bílkovin a cvičení. Cítíš se dobře.",
    emoji: "🟡",
  },
  washout: {
    color: "text-green-500",
    bgColor: "bg-green-500/10 border-green-500/30",
    label: "Hladina klesá",
    advice: "Pozor na návrat hladu. Připrav si hodně zeleniny a vlákniny.",
    emoji: "🟢",
  },
  none: {
    color: "text-muted-foreground",
    bgColor: "bg-muted/50 border-border",
    label: "Žádná data",
    advice: "Zapiš svou první injekci pro personalizované rady.",
    emoji: "⚪",
  },
};
import { calculateBMI, calculateNutrition } from "@/lib/nutrition";

interface DashboardTabProps {
  user: Doc<"users">;
}

export function DashboardTab({ user }: DashboardTabProps) {
  const weightRecords = useQuery(api.records.getWeightRecords) ?? [];
  const allInjectionRecords = useQuery(api.records.getInjectionRecords) ?? [];
  
  // Profile sheet state
  const [profileOpen, setProfileOpen] = useState(false);
  
  // Filter out future injections for display purposes (non-premium users never see them)
  const now = Date.now();
  const injectionRecords = allInjectionRecords.filter(r => r.date <= now);
  
  // Injection navigation state (0 = latest injection)
  const [selectedInjectionIndex, setSelectedInjectionIndex] = useState(0);

  // Calculate current drug level (combining all substances)
  const injectionData = allInjectionRecords.map(r => ({
    date: r.date,
    substanceId: r.substanceId,
    mg: r.mg
  }));
  // Only include future injections in calculation if user has premium
  const currentLevel = calculateDrugLevel(injectionData, now, user.isPremium);

  // Get latest weight
  const latestWeight = weightRecords[0]?.kg ?? 0;

  // Calculate BMI
  const bmi = user.heightCm ? calculateBMI(latestWeight, user.heightCm) : 0;

  // Calculate nutrition targets
  const birthDate = user.birthDate ? new Date(user.birthDate) : new Date(1990, 0, 1);
  const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  
  const nutrition = calculateNutrition({
    gender: (user.gender as "male" | "female") ?? "male",
    heightCm: user.heightCm ?? 175,
    currentWeightKg: latestWeight || 80,
    age,
    goal: (user.goal as "lose" | "maintain" | "gain") ?? "maintain",
    intensity: (user.intensity as "slow" | "normal" | "fast") ?? "normal",
    activityLevel: (user.activityLevel as "none" | "light" | "medium" | "heavy") ?? "light",
  });

  // PK curve data based on injection navigation
  const selectedInjection = injectionRecords[selectedInjectionIndex];
  const nextInjection = injectionRecords[selectedInjectionIndex - 1]; // newer injection
  
  // Calculate time range between two injections (or from injection + 7 days for half-life)
  const startTime = selectedInjection?.date ?? now - 7 * 24 * 60 * 60 * 1000;
  const halfLifeMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const endTime = nextInjection?.date ?? (selectedInjection ? selectedInjection.date + halfLifeMs : now);

  // Generate daily data points with weight bars
  const oneDayMs = 24 * 60 * 60 * 1000;
  const numDays = Math.ceil((endTime - startTime) / oneDayMs);
  
  // Create a map of weight records by day
  const weightByDay = new Map<string, number>();
  weightRecords.forEach(record => {
    const dayKey = format(new Date(record.date), "yyyy-MM-dd");
    // Keep the latest weight for each day
    if (!weightByDay.has(dayKey) || record.date > (weightByDay.get(dayKey) || 0)) {
      weightByDay.set(dayKey, record.kg);
    }
  });

  // Generate chart data with daily points (combining all substances)
  const pkChartData: { time: number; level: number; weight: number | null; label: string; isFuture?: boolean }[] = [];
  for (let i = 0; i <= numDays; i++) {
    const time = startTime + i * oneDayMs;
    const dayKey = format(new Date(time), "yyyy-MM-dd");
    const level = calculateDrugLevel(injectionData, time, user.isPremium);
    const weight = weightByDay.get(dayKey);
    
    pkChartData.push({
      time,
      level,
      weight: weight || null,
      label: format(new Date(time), "d.M.", { locale: cs }),
      isFuture: time > now,
    });
  }



  // Calculate weight domain for Y axis (to scale bars properly)
  const weightsInRange = pkChartData.filter(d => d.weight !== null).map(d => d.weight as number);
  const minWeight = weightsInRange.length > 0 ? Math.min(...weightsInRange) - 2 : 80;
  const maxWeight = weightsInRange.length > 0 ? Math.max(...weightsInRange) + 2 : 100;

  // Calculate traffic light phase based on hours since last injection
  const getTrafficPhase = (): TrafficPhase => {
    if (injectionRecords.length === 0) return "none";
    
    const lastInjection = injectionRecords[0];
    const hoursSinceInjection = (now - lastInjection.date) / (1000 * 60 * 60);
    
    if (hoursSinceInjection < 48) return "peak";
    if (hoursSinceInjection < 120) return "cruise"; // 5 days = 120 hours
    return "washout";
  };

  const trafficPhase = getTrafficPhase();
  const trafficConfig = trafficLightConfig[trafficPhase];

  // Days since last injection for display
  const daysSinceInjection = injectionRecords.length > 0 
    ? Math.floor((now - injectionRecords[0].date) / (1000 * 60 * 60 * 24))
    : null;

  // Get weight on or near injection day
  const getWeightNearInjection = (injection: typeof selectedInjection) => {
    if (!injection) return null;
    
    // Find the closest weight BEFORE or ON the injection date (within 3 days before)
    const maxDiffBeforeMs = 3 * 24 * 60 * 60 * 1000;
    const weightsBefore = weightRecords.filter(r => 
      r.date <= injection.date && (injection.date - r.date) <= maxDiffBeforeMs
    );
    
    if (weightsBefore.length > 0) {
      // Return the latest weight before/on injection
      const sorted = [...weightsBefore].sort((a, b) => b.date - a.date);
      return sorted[0]?.kg ?? null;
    }
    
    // If no weight before, find closest weight within 7 days after
    const maxDiffAfterMs = 7 * 24 * 60 * 60 * 1000;
    const weightsAfter = weightRecords.filter(r => 
      r.date > injection.date && (r.date - injection.date) <= maxDiffAfterMs
    );
    
    if (weightsAfter.length === 0) return null;
    
    // Return the earliest weight after injection
    const sorted = [...weightsAfter].sort((a, b) => a.date - b.date);
    return sorted[0]?.kg ?? null;
  };

  // Get latest weight before a date
  const getLatestWeightBefore = (beforeDate: number) => {
    const weightsBefore = weightRecords.filter(r => r.date <= beforeDate);
    if (weightsBefore.length === 0) return null;
    // weightRecords are sorted by date desc, so first match is the latest
    return weightsBefore[0]?.kg ?? null;
  };

  // Weight on selected injection day vs weight on next injection day (or latest available)
  const weightOnSelectedInjection = getWeightNearInjection(selectedInjection);
  const weightOnNextInjection = nextInjection 
    ? getWeightNearInjection(nextInjection)
    : getLatestWeightBefore(now); // If no next injection, use latest available weight
  const weightChangeBetweenInjections = (weightOnSelectedInjection && weightOnNextInjection) 
    ? weightOnNextInjection - weightOnSelectedInjection 
    : null;

  // Days until next injection based on user settings or substance default
  const getInjectionIntervalDays = (substanceId: string): number => {
    // If user has custom interval enabled, use their setting
    if (user.customIntervalEnabled && user.injectionIntervalDays) {
      return user.injectionIntervalDays;
    }
    // Otherwise use substance's recommended interval
    const substance = findSubstance(substanceId);
    return substance?.recommendedIntervalDays ?? 7;
  };

  const lastInjection = injectionRecords[0];
  const lastSubstance = lastInjection ? findSubstance(lastInjection.substanceId) : null;
  const intervalDays = lastSubstance ? getInjectionIntervalDays(lastInjection.substanceId) : 7;
  const nextInjectionDate = lastInjection ? new Date(lastInjection.date + intervalDays * 24 * 60 * 60 * 1000) : null;
  const daysUntilNextInjection = nextInjectionDate 
    ? Math.round((nextInjectionDate.getTime() - now) / (1000 * 60 * 60 * 24))
    : null;

  // Calculate recommended next dose
  const getNextRecommendedDose = () => {
    if (!lastInjection || !lastSubstance) return null;
    
    const currentDose = lastInjection.mg;
    const doses = lastSubstance.commonDoses;
    
    // If custom interval is enabled - user manages their own schedule, keep same dose
    if (user.customIntervalEnabled) {
      const isMax = currentDose >= lastSubstance.typicalMaxDose;
      return { dose: currentDose, isMax, isCustom: true };
    }
    
    // Standard mode: follow manufacturer titration schedule
    // Count how many injections at current dose level
    const injectionsAtCurrentDose = injectionRecords.filter(r => 
      r.substanceId === lastInjection.substanceId && 
      Math.abs(r.mg - currentDose) < 0.1
    ).length;
    
    // Manufacturer recommends 4 weeks (4 injections) at each dose before escalating
    const minInjectionsBeforeEscalation = 4;
    
    // Find current dose index
    const currentIndex = doses.findIndex(d => Math.abs(d - currentDose) < 0.1);
    
    // If at max dose or not found, stay at current
    if (currentIndex === -1 || currentIndex >= doses.length - 1) {
      return { dose: currentDose, isMax: true, isCustom: false };
    }
    
    // If not enough injections at current dose, stay at current
    if (injectionsAtCurrentDose < minInjectionsBeforeEscalation) {
      return { 
        dose: currentDose, 
        isMax: false, 
        isCustom: false,
        injectionsRemaining: minInjectionsBeforeEscalation - injectionsAtCurrentDose 
      };
    }
    
    // Ready to escalate - suggest next dose up
    return { dose: doses[currentIndex + 1], isMax: false, isCustom: false };
  };

  const nextDoseInfo = getNextRecommendedDose();

  return (
    <div className="p-4 space-y-4">
      {/* Profile avatar - top left */}
      <div className="flex items-center justify-between">
        <Sheet open={profileOpen} onOpenChange={setProfileOpen}>
          <SheetTrigger asChild>
            <button className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:opacity-90 transition-opacity">
              <span className="text-sm font-bold text-primary-foreground">
                {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? <User className="w-5 h-5" />}
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full sm:max-w-md p-0 overflow-y-auto">
            <SheetHeader className="sr-only">
              <SheetTitle>Profil</SheetTitle>
            </SheetHeader>
            <ProfileTab user={user} />
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-semibold">Přehled</h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Aktuální hladina</p>
            <p className="text-lg font-bold text-app-purple">{currentLevel.toFixed(2)} mg</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Váha</p>
            <p className="text-lg font-bold">{latestWeight.toFixed(1)} kg</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">BMI</p>
            <p className="text-lg font-bold text-primary">{bmi.toFixed(1)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Light - Semafor dne */}
      <Card className={`border ${trafficConfig.bgColor}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="text-4xl">{trafficConfig.emoji}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-bold ${trafficConfig.color}`}>
                  {trafficConfig.label}
                </h3>
                {daysSinceInjection !== null && (
                  <span className="text-xs text-muted-foreground">
                    (den {daysSinceInjection + 1})
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {trafficConfig.advice}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PK Curve */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-app-purple" />
            Hladina léku
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Injection navigation */}
          {injectionRecords.length > 0 && (
            <div className="flex items-center justify-between mb-2">
              <Button 
                variant="ghost" 
                size="icon"
                className="h-7 w-7"
                onClick={() => setSelectedInjectionIndex(prev => Math.min(injectionRecords.length - 1, prev + 1))}
                disabled={selectedInjectionIndex >= injectionRecords.length - 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <div 
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ backgroundColor: findSubstance(selectedInjection?.substanceId ?? "")?.color ?? "#888" }}
                  >
                    {injectionRecords.length - selectedInjectionIndex}
                  </div>
                  <span className="text-xs font-medium">
                    {format(new Date(startTime), "d.M.", { locale: cs })} → {format(new Date(endTime), "d.M.", { locale: cs })}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {findSubstance(selectedInjection?.substanceId ?? "")?.name ?? "Neznámá"} ({selectedInjection?.mg ?? 0} mg)
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-7 w-7"
                onClick={() => setSelectedInjectionIndex(prev => Math.max(0, prev - 1))}
                disabled={selectedInjectionIndex === 0}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={pkChartData}>
                <defs>
                  <linearGradient id="levelGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--app-purple))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--app-purple))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  yAxisId="weight"
                  orientation="left"
                  domain={[minWeight, maxWeight]}
                  tick={{ fontSize: 10, fill: "hsl(var(--app-gold))" }}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                  tickFormatter={(value) => `${value}kg`}
                />
                <YAxis 
                  yAxisId="level"
                  orientation="right"
                  tick={{ fontSize: 10, fill: "hsl(var(--app-purple))" }}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                  tickFormatter={(value) => `${value}mg`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number, name: string) => {
                    if (name === "weight") return value ? [`${value.toFixed(1)} kg`, "Váha"] : null;
                    return [`${value.toFixed(2)} mg`, "Hladina"];
                  }}
                />
                <Bar 
                  yAxisId="weight"
                  dataKey="weight" 
                  fill="hsl(var(--app-gold))"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={30}
                  label={{
                    position: 'top',
                    fill: 'hsl(var(--foreground))',
                    fontSize: 9,
                    formatter: (value: number | null) => value ? `${value.toFixed(1)}kg` : ''
                  }}
                />
                <Area 
                  yAxisId="level"
                  type="monotone" 
                  dataKey="level" 
                  stroke="hsl(var(--app-purple))" 
                  fill="url(#levelGradient)"
                  strokeWidth={2}
                />
                {currentLevel > 0 && selectedInjectionIndex === 0 && (
                  <ReferenceLine 
                    yAxisId="level"
                    y={currentLevel} 
                    stroke="hsl(var(--app-purple))"
                    strokeDasharray="5 5"
                    strokeOpacity={0.6}
                    label={{
                      value: `${currentLevel.toFixed(1)}mg`,
                      position: 'right',
                      fill: 'hsl(var(--app-purple))',
                      fontSize: 11,
                      fontWeight: 'bold'
                    }}
                  />
                )}

              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Injection stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Změna váhy</p>
            {weightChangeBetweenInjections !== null ? (
              <p className={`text-sm font-bold ${weightChangeBetweenInjections < 0 ? "text-app-green" : weightChangeBetweenInjections > 0 ? "text-app-red" : ""}`}>
                {weightChangeBetweenInjections > 0 ? "+" : ""}{weightChangeBetweenInjections.toFixed(1)} kg
              </p>
            ) : (
              <p className="text-sm font-bold text-muted-foreground">-</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Další aplikace</p>
            {daysUntilNextInjection !== null ? (
              <p className={`text-sm font-bold ${daysUntilNextInjection <= 0 ? "text-app-red" : daysUntilNextInjection <= 2 ? "text-app-gold" : "text-app-green"}`}>
                {daysUntilNextInjection <= 0 ? "Dnes!" : `za ${daysUntilNextInjection} ${daysUntilNextInjection === 1 ? "den" : daysUntilNextInjection < 5 ? "dny" : "dní"}`}
              </p>
            ) : (
              <p className="text-sm font-bold text-muted-foreground">-</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Další dávka</p>
            {nextDoseInfo ? (
              <div>
                <p className={`text-sm font-bold ${nextDoseInfo.isMax ? "text-app-purple" : nextDoseInfo.injectionsRemaining ? "text-foreground" : "text-app-gold"}`}>
                  {nextDoseInfo.dose} mg
                </p>
                {nextDoseInfo.isMax && (
                  <span className="text-[10px] block text-muted-foreground">max</span>
                )}
                {nextDoseInfo.injectionsRemaining && (
                  <span className="text-[10px] block text-muted-foreground">
                    ještě {nextDoseInfo.injectionsRemaining}× před ↑
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm font-bold text-muted-foreground">-</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Nutrition GLP-1 */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Výživa GLP-1</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Circular progress rings */}
          <div className="flex justify-around items-center mb-4">
            {/* Protein ring */}
            <div className="relative flex flex-col items-center">
              <svg className="progress-ring w-24 h-24" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="proteinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="50%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                  <filter id="proteinGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                  opacity="0.2"
                />
                <circle
                  className="progress-ring-circle"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="url(#proteinGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(80 / 100) * 251} 251`}
                  filter="url(#proteinGlow)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold">80</span>
                <span className="text-[10px] text-muted-foreground">/{nutrition.protein}g</span>
              </div>
              <span className="text-xs text-muted-foreground mt-1">Bílkoviny</span>
            </div>

            {/* Water ring */}
            <div className="relative flex flex-col items-center">
              <svg className="progress-ring w-24 h-24" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="waterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="50%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#0891b2" />
                  </linearGradient>
                  <filter id="waterGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                  opacity="0.2"
                />
                <circle
                  className="progress-ring-circle"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="url(#waterGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(75 / 100) * 251} 251`}
                  filter="url(#waterGlow)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold">1.5</span>
                <span className="text-[10px] text-muted-foreground">/2L</span>
              </div>
              <span className="text-xs text-muted-foreground mt-1">Voda</span>
            </div>

            {/* Calories ring */}
            <div className="relative flex flex-col items-center">
              <svg className="progress-ring w-24 h-24" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="caloriesGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <filter id="caloriesGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                  opacity="0.2"
                />
                <circle
                  className="progress-ring-circle"
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="url(#caloriesGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(73 / 100) * 251} 251`}
                  filter="url(#caloriesGlow)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold">1270</span>
                <span className="text-[10px] text-muted-foreground">/{nutrition.target}</span>
              </div>
              <span className="text-xs text-muted-foreground mt-1">Kalorie</span>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex justify-center gap-2 mb-4">
            <Button variant="outline" size="sm" className="text-xs">
              + Přidat protein
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              + Přidat vodu
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              &lt; Týsobost
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
