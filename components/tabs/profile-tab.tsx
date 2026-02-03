"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { User, Mail, Ruler, Target, LogOut, Calendar, Settings, Upload, FileJson, Check, AlertCircle, Loader2, Crown, Clock, AlertTriangle, Gift, Sparkles, Lock } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { calculateNutrition, getIntensityLabel } from "@/lib/nutrition";
import type { Gender, WeightGoal, WeightIntensity, ActivityLevel } from "@/lib/constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { substancesDB } from "@/lib/constants";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FlaskConical, ChevronDown } from "lucide-react";

interface ProfileTabProps {
  user: Doc<"users">;
}

export function ProfileTab({ user }: ProfileTabProps) {
  const { signOut } = useAuthActions();
  const updateProfile = useMutation(api.users.updateProfile);
  const activateTrial = useMutation(api.users.activateTrial);
  const redeemPromoCode = useMutation(api.users.redeemPromoCode);
  const weightRecords = useQuery(api.records.getWeightRecords) ?? [];
  
  // Premium activation state
  const [promoCode, setPromoCode] = useState("");
  const [isActivatingTrial, setIsActivatingTrial] = useState(false);
  const [isRedeemingCode, setIsRedeemingCode] = useState(false);

  const [profile, setProfile] = useState({
    name: user.name ?? "",
    surname: user.surname ?? "",
    heightCm: user.heightCm ?? 175,
    targetWeightKg: user.targetWeightKg ?? 75,
    birthDate: user.birthDate ?? null,
    gender: (user.gender as Gender) ?? "male",
    goal: (user.goal as WeightGoal) ?? "lose",
    intensity: (user.intensity as WeightIntensity) ?? "normal",
    activityLevel: (user.activityLevel as ActivityLevel) ?? "light",
    isUSMode: user.isUSMode ?? false,
    showPeptides: user.showPeptides ?? false,
    enabledSubstances: user.enabledSubstances ?? (user.defaultSubstanceId ? [user.defaultSubstanceId] : ["wegovy"]),
    customIntervalEnabled: user.customIntervalEnabled ?? false,
    injectionIntervalDays: user.injectionIntervalDays ?? 7,
    halfDayDosing: user.halfDayDosing ?? false,
    menstrualCycleStartDate: user.menstrualCycleStartDate ?? null,
    menstrualCycleLength: user.menstrualCycleLength ?? 28,
  });

  const [showHalfDayWarning, setShowHalfDayWarning] = useState(false);
  const [showCustomIntervalWarning, setShowCustomIntervalWarning] = useState(false);

  // Get recommended interval based on the first enabled substance
  const primarySubstance = substancesDB.find(s => s.id === profile.enabledSubstances[0]) ?? substancesDB[0];
  const recommendedInterval = primarySubstance.recommendedIntervalDays;

  const [substancesOpen, setSubstancesOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState<{
    weightRecords: { date: number; kg: number }[];
    injectionRecords: { date: number; substanceId: string; mg: number; site?: string }[];
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importFromShotsy = useMutation(api.records.importFromShotsy);

  // Calculate nutrition
  const latestWeight = weightRecords[0]?.kg ?? 80;
  const birthDate = profile.birthDate ? new Date(profile.birthDate) : new Date(1990, 0, 1);
  const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  const nutrition = calculateNutrition({
    gender: profile.gender,
    heightCm: profile.heightCm,
    currentWeightKg: latestWeight,
    age,
    goal: profile.goal,
    intensity: profile.intensity,
    activityLevel: profile.activityLevel,
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        name: profile.name || undefined,
        surname: profile.surname || undefined,
        heightCm: profile.heightCm,
        targetWeightKg: profile.targetWeightKg,
        birthDate: profile.birthDate ?? undefined,
        gender: profile.gender,
        goal: profile.goal,
        intensity: profile.intensity,
        activityLevel: profile.activityLevel,
        isUSMode: profile.isUSMode,
        showPeptides: profile.showPeptides,
        enabledSubstances: profile.enabledSubstances,
        customIntervalEnabled: profile.customIntervalEnabled,
        injectionIntervalDays: profile.customIntervalEnabled ? profile.injectionIntervalDays : undefined,
        halfDayDosing: profile.halfDayDosing,
        menstrualCycleStartDate: profile.gender === "female" ? profile.menstrualCycleStartDate ?? undefined : undefined,
        menstrualCycleLength: profile.gender === "female" ? profile.menstrualCycleLength : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save on changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      handleSave();
    }, 1000);
    return () => clearTimeout(timeout);
  }, [profile]);

  // Parse Shotsy JSON file
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const weightRecords: { date: number; kg: number }[] = [];
        const injectionRecords: { date: number; substanceId: string; mg: number; site?: string }[] = [];

        // Parse days array
        if (json.days && Array.isArray(json.days)) {
          for (const dayObj of json.days) {
            const dayKey = Object.keys(dayObj)[0];
            const dayData = dayObj[dayKey];

            // Parse weight
            if (dayData.Weight) {
              const weight = dayData.Weight;
              const date = weight.date ? new Date(weight.date).getTime() : parseInt(dayKey) * 1000;
              const kg = weight.unit === "kg" ? weight.value : weight.value * 0.453592; // Convert lbs to kg
              weightRecords.push({ date, kg });
            }

            // Parse shots/injections
            if (dayData.shots && Array.isArray(dayData.shots)) {
              for (const shot of dayData.shots) {
                if (!shot.taken) continue;

                // Map medication name to substanceId
                let substanceId = "tirz"; // default
                const medName = shot.medicationName?.toLowerCase() || "";
                if (medName.includes("mounjaro") || medName.includes("zepbound") || medName.includes("tirzepatide")) {
                  substanceId = "tirz";
                } else if (medName.includes("wegovy")) {
                  substanceId = "wegovy";
                } else if (medName.includes("ozempic")) {
                  substanceId = "ozempic";
                } else if (medName.includes("semaglutide")) {
                  // Generic semaglutide defaults to wegovy
                  substanceId = "wegovy";
                } else if (medName.includes("saxenda") || medName.includes("liraglutide")) {
                  substanceId = "saxenda";
                } else if (medName.includes("retatrutide")) {
                  substanceId = "reta";
                }

                // Map injection site
                let site: string | undefined;
                const siteRaw = shot.injectionSite?.toLowerCase() || "";
                if (siteRaw.includes("stomach") || siteRaw.includes("belly")) {
                  if (siteRaw.includes("left")) site = "belly-left";
                  else if (siteRaw.includes("right")) site = "belly-right";
                  else site = "belly-left";
                } else if (siteRaw.includes("thigh")) {
                  if (siteRaw.includes("left")) site = "thigh-left";
                  else site = "thigh-right";
                } else if (siteRaw.includes("arm")) {
                  if (siteRaw.includes("left")) site = "arm-left";
                  else site = "arm-right";
                }

                injectionRecords.push({
                  date: shot.timestamp * 1000,
                  substanceId,
                  mg: shot.dosageStrength,
                  site,
                });
              }
            }
          }
        }

        console.log("Parsed Shotsy data:", { weightRecords: weightRecords.length, injectionRecords: injectionRecords.length });
        setImportData({ weightRecords, injectionRecords });
        setShowImportDialog(true);
      } catch (error) {
        console.error("Error parsing Shotsy file:", error);
        toast.error("Chyba při čtení souboru. Zkontrolujte, že je to platný Shotsy export.");
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = "";
  };

  // Execute import
  const handleImport = async () => {
    if (!importData) return;
    setIsImporting(true);
    try {
      const result = await importFromShotsy(importData);
      toast.success(`Importováno: ${result.weightCount} vážení, ${result.injectionCount} injekcí`);
      setShowImportDialog(false);
      setImportData(null);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Chyba při importu dat.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Avatar */}
      <div className="flex justify-center">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
          <span className="text-3xl font-bold text-primary-foreground">
            {profile.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
          </span>
        </div>
      </div>

      {/* Personal info */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-foreground">
            <User className="w-4 h-4" />
            Osobní údaje
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Jméno</Label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Jan"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Příjmení</Label>
              <Input
                value={profile.surname}
                onChange={(e) => setProfile(prev => ({ ...prev, surname: e.target.value }))}
                placeholder="Novák"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-2">
              <Mail className="w-3 h-3" />
              Email
            </Label>
            <Input value={user.email ?? ""} disabled className="bg-secondary" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              Datum narození
            </Label>
            <Input
              type="date"
              value={profile.birthDate ? format(new Date(profile.birthDate), "yyyy-MM-dd") : ""}
              onChange={(e) => setProfile(prev => ({ 
                ...prev, 
                birthDate: e.target.value ? new Date(e.target.value).getTime() : null 
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-2">
                <Ruler className="w-3 h-3" />
                Výška (cm)
              </Label>
              <Input
                type="number"
                value={profile.heightCm || ""}
                onChange={(e) => setProfile(prev => ({ ...prev, heightCm: e.target.value ? Number(e.target.value) : 0 }))}
                placeholder="175"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-2">
                <Target className="w-3 h-3" />
                Cílová váha (kg)
              </Label>
              <Input
                type="number"
                step="0.1"
                value={profile.targetWeightKg || ""}
                onChange={(e) => setProfile(prev => ({ ...prev, targetWeightKg: e.target.value ? Number(e.target.value) : 0 }))}
                placeholder="75"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nutrition plan */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">Nutriční Plán</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Gender */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={profile.gender === "male" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setProfile(prev => ({ ...prev, gender: "male" }))}
            >
              Muž
            </Button>
            <Button
              type="button"
              variant={profile.gender === "female" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setProfile(prev => ({ ...prev, gender: "female" }))}
            >
              Žena
            </Button>
          </div>

          {/* Menstrual cycle - only for women */}
          {profile.gender === "female" && (
            <div className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg space-y-4">
              <div className="flex items-center gap-2 text-pink-400">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Menstruační cyklus</span>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">První den poslední menstruace</Label>
                <Input
                  type="date"
                  value={profile.menstrualCycleStartDate ? format(new Date(profile.menstrualCycleStartDate), "yyyy-MM-dd") : ""}
                  onChange={(e) => setProfile(prev => ({ 
                    ...prev, 
                    menstrualCycleStartDate: e.target.value ? new Date(e.target.value).getTime() : null 
                  }))}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Délka cyklu (dní)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[profile.menstrualCycleLength]}
                    onValueChange={([value]) => setProfile(prev => ({ ...prev, menstrualCycleLength: value }))}
                    min={21}
                    max={35}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-lg font-bold text-pink-400 w-12 text-center">
                    {profile.menstrualCycleLength}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Běžná délka cyklu je 21-35 dní</p>
              </div>
            </div>
          )}

          {/* Goal */}
          <div className="space-y-2">
            <Label className="text-xs">Váš Cíl</Label>
            <Select 
              value={profile.goal} 
              onValueChange={(v) => setProfile(prev => ({ ...prev, goal: v as WeightGoal }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lose">🔻 Hubnutí (Deficit)</SelectItem>
                <SelectItem value="maintain">⚖️ Udržování (Balanční)</SelectItem>
                <SelectItem value="gain">🔺 Nabírání (Nadbytek)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Intensity */}
          <div className="space-y-2">
            <Label className="text-xs">Rychlost / Intenzita</Label>
            <Select 
              value={profile.intensity} 
              onValueChange={(v) => setProfile(prev => ({ ...prev, intensity: v as WeightIntensity }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slow">
                  {getIntensityLabel(profile.goal, "slow")}
                </SelectItem>
                <SelectItem value="normal">
                  {getIntensityLabel(profile.goal, "normal")}
                </SelectItem>
                <SelectItem value="fast">
                  {getIntensityLabel(profile.goal, "fast")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Activity */}
          <div className="space-y-2">
            <Label className="text-xs">Denní Aktivita</Label>
            <Select 
              value={profile.activityLevel} 
              onValueChange={(v) => setProfile(prev => ({ ...prev, activityLevel: v as ActivityLevel }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Žádná (sedavé)</SelectItem>
                <SelectItem value="light">Lehká (1-2x týdně)</SelectItem>
                <SelectItem value="medium">Střední (3-5x týdně)</SelectItem>
                <SelectItem value="heavy">Vysoká (denně)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Calorie target */}
          <div className="p-4 bg-secondary rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Váš denní cíl:</span>
              <span className="text-xl font-bold text-app-purple">{nutrition.target} kcal</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App settings */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-foreground">
            <Settings className="w-4 h-4" />
            Nastavení aplikace
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Režim USA (Units / Zepbound)</p>
              <p className="text-xs text-muted-foreground">
                Změní kalkulačku na jednotky (Units) a zobrazí US názvy léků.
              </p>
            </div>
            <Switch
              checked={profile.isUSMode}
              onCheckedChange={(checked) => setProfile(prev => ({ ...prev, isUSMode: checked }))}
            />
          </div>

          <Separator />

          {/* Substances submenu */}
          <Collapsible open={substancesOpen} onOpenChange={setSubstancesOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between py-1">
                <div className="text-left">
                  <p className="font-medium text-sm">Nastavení látek</p>
                  <p className="text-xs text-muted-foreground">
                    Vyberte látky zobrazené v aplikaci
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${substancesOpen ? "rotate-180" : ""}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              {substancesDB.map((substance) => {
                const isEnabled = profile.enabledSubstances.includes(substance.id);
                const isDefault = user.defaultSubstanceId === substance.id;
                return (
                  <div 
                    key={substance.id} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <Checkbox
                      id={`substance-${substance.id}`}
                      checked={isEnabled}
                      disabled={isEnabled && profile.enabledSubstances.length === 1}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setProfile(prev => ({
                            ...prev,
                            enabledSubstances: [...prev.enabledSubstances, substance.id]
                          }));
                        } else {
                          // Don't allow disabling if it's the only one enabled
                          if (profile.enabledSubstances.length > 1) {
                            setProfile(prev => ({
                              ...prev,
                              enabledSubstances: prev.enabledSubstances.filter(id => id !== substance.id)
                            }));
                          } else {
                            toast.error("Nelze deaktivovat", {
                              description: "Musí být aktivní alespoň jedna látka"
                            });
                          }
                        }
                      }}
                    />
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: substance.color }}
                    />
                    <label 
                      htmlFor={`substance-${substance.id}`} 
                      className="flex-1 text-sm cursor-pointer"
                    >
                      {profile.isUSMode ? substance.usName : substance.name}
                      {isDefault && (
                        <span className="ml-2 text-xs text-muted-foreground">(výchozí)</span>
                      )}
                    </label>
                  </div>
                );
              })}

              {/* Peptides toggle inside substances submenu */}
              {!profile.isUSMode && (() => {
                const hasPremiumAccess = user.isPremium || user.premiumPermanent || (user.premiumUntil && user.premiumUntil > Date.now());
                return (
                  <>
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between p-2">
                      <div className="flex items-center gap-3">
                        {hasPremiumAccess ? (
                          <FlaskConical className="w-4 h-4 text-app-purple" />
                        ) : (
                          <Lock className="w-4 h-4 text-amber-500/60" />
                        )}
                        <div>
                          <p className="font-medium text-sm flex items-center gap-2">
                            Míchání Peptidů (Vialky)
                            {!hasPremiumAccess && <Crown className="w-3 h-3 text-amber-500" />}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {hasPremiumAccess 
                              ? "Kalkulačka pro ředění lyofilizátu"
                              : "Vyžaduje Premium účet"
                            }
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={hasPremiumAccess ? profile.showPeptides : false}
                        disabled={!hasPremiumAccess}
                        onCheckedChange={(checked) => {
                          if (hasPremiumAccess) {
                            setProfile(prev => ({ ...prev, showPeptides: checked }));
                          } else {
                            toast.error("Premium funkce", {
                              description: "Míchání peptidů vyžaduje Premium účet"
                            });
                          }
                        }}
                      />
                    </div>
                    {!hasPremiumAccess && (
                      <div className="mx-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <p className="text-xs text-amber-500 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Aktivujte Premium níže pro přístup k vialkovému módu
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Injection interval */}
              <Separator className="my-2" />
              <div className="p-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-app-purple" />
                    <p className="font-medium text-sm">Interval mezi injekcemi</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-app-purple">
                      {profile.customIntervalEnabled ? profile.injectionIntervalDays : recommendedInterval}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {profile.customIntervalEnabled 
                        ? (profile.injectionIntervalDays === 1 ? "den" : profile.injectionIntervalDays < 5 && Number.isInteger(profile.injectionIntervalDays) ? "dny" : "dní")
                        : `${recommendedInterval === 1 ? "den" : recommendedInterval < 5 ? "dny" : "dní"} (dopor.)`
                      }
                    </p>
                  </div>
                </div>

                {/* Custom interval toggle */}
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    <span className="text-xs text-muted-foreground">Vlastní interval</span>
                  </div>
                  <Switch
                    checked={profile.customIntervalEnabled}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setShowCustomIntervalWarning(true);
                      } else {
                        setProfile(prev => ({ 
                          ...prev, 
                          customIntervalEnabled: false,
                          injectionIntervalDays: recommendedInterval
                        }));
                      }
                    }}
                  />
                </div>

                {/* Slider - only enabled when custom interval is on */}
                {profile.customIntervalEnabled && (
                  <>
                    <Slider
                      value={[profile.injectionIntervalDays]}
                      onValueChange={([value]) => setProfile(prev => ({ ...prev, injectionIntervalDays: value }))}
                      min={1}
                      max={30}
                      step={profile.halfDayDosing ? 0.5 : 1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 den</span>
                      <span>30 dní</span>
                    </div>
                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <p className="text-xs text-amber-500">
                        ⚠️ Vlastní interval je mimo doporučení výrobce ({recommendedInterval} {recommendedInterval === 1 ? "den" : recommendedInterval < 5 ? "dny" : "dní"})
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Half-day dosing */}
              <Separator className="my-2" />
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="font-medium text-sm">Půldenní intervaly</p>
                    <p className="text-xs text-muted-foreground">
                      Povolit intervaly 3.5, 4.5, 5.5 dní atd.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={profile.halfDayDosing}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setShowHalfDayWarning(true);
                    } else {
                      setProfile(prev => ({ ...prev, halfDayDosing: false }));
                    }
                  }}
                />
              </div>
              {profile.halfDayDosing && (
                <div className="mx-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-xs text-amber-500">
                    ⚠️ Půldenní intervaly jsou mimo doporučení výrobce
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Import from Shotsy */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-foreground">
            <FileJson className="w-4 h-4" />
            Import dat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Nahrajte soubor .shotsyjson z aplikace Shotsy pro import váhy a injekcí.
          </p>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".shotsyjson,.json"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Vybrat soubor</span>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Premium */}
      <Card className="bg-card border-border overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-yellow-500/5 to-amber-500/5 pointer-events-none" />
        <CardHeader className="pb-2 relative">
          <CardTitle className="text-sm flex items-center gap-2 text-amber-500">
            <Crown className="w-4 h-4" />
            Premium účet
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-4">
          {user.isPremium || user.premiumPermanent || (user.premiumUntil && user.premiumUntil > Date.now()) ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-500">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Premium aktivován</span>
              </div>
              {user.premiumPermanent ? (
                <p className="text-xs text-muted-foreground">
                  Trvalé premium
                </p>
              ) : user.premiumUntil ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Platí do: {new Date(user.premiumUntil).toLocaleDateString("cs")}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              {/* 60-day Trial offer */}
              {!user.trialActivated && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-amber-500">60-denní Adaptační Protokol</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Aktivujte si zdarma 60 dní premium funkcí.
                  </p>
                  <Button 
                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-medium"
                    onClick={async () => {
                      setIsActivatingTrial(true);
                      try {
                        const result = await activateTrial();
                        if (result.success) {
                          toast.success("60-denní Adaptační Protokol aktivován!");
                        } else {
                          toast.error(result.error || "Nepodařilo se aktivovat");
                        }
                      } catch (error) {
                        console.error("Trial activation error:", error);
                        toast.error("Chyba při aktivaci");
                      } finally {
                        setIsActivatingTrial(false);
                      }
                    }}
                    disabled={isActivatingTrial}
                  >
                    {isActivatingTrial ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Aktivovat zdarma
                  </Button>
                </div>
              )}

              {/* Promo code input */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Máte promo kód?</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="XXXXXXXX"
                    className="font-mono tracking-wider"
                    maxLength={8}
                  />
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!promoCode.trim()) return;
                      setIsRedeemingCode(true);
                      try {
                        const result = await redeemPromoCode({ code: promoCode.trim() });
                        if (result.success) {
                          toast.success(`Premium aktivováno! (${result.productTitle})`);
                          setPromoCode("");
                        } else {
                          toast.error(result.error || "Neplatný kód");
                        }
                      } catch (error) {
                        console.error("Redeem error:", error);
                        toast.error("Chyba při aktivaci kódu");
                      } finally {
                        setIsRedeemingCode(false);
                      }
                    }}
                    disabled={!promoCode.trim() || isRedeemingCode}
                  >
                    {isRedeemingCode ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {user.trialActivated && (
                <p className="text-xs text-muted-foreground">
                  Trial již byl využit. Pro pokračování použijte promo kód.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sign out */}
      <Button 
        variant="destructive" 
        className="w-full"
        onClick={() => signOut()}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Odhlásit se
      </Button>

      {/* Custom interval warning dialog */}
      <AlertDialog open={showCustomIntervalWarning} onOpenChange={setShowCustomIntervalWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Upozornění na změnu intervalu
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
              <p className="font-medium">Doporučené intervaly výrobce:</p>
              <ul className="text-sm space-y-1 ml-2">
                {substancesDB.map(s => {
                  const isActive = profile.enabledSubstances.includes(s.id);
                  const interval = s.recommendedIntervalDays;
                  const intervalText = interval === 1 ? "den" : interval < 5 ? "dny" : "dní";
                  return (
                    <li key={s.id} className={isActive ? "text-foreground" : "text-muted-foreground/50"}>
                      {isActive ? "✓" : "○"} <strong>{s.name}</strong>: {interval} {intervalText}
                    </li>
                  );
                })}
              </ul>
              <p>
                Změna intervalu mezi injekcemi je <strong>mimo doporučení výrobce</strong> a může ovlivnit účinnost a bezpečnost léčby.
              </p>
              <p className="font-medium text-foreground">
                Potvrzením souhlasíte, že používáte tuto funkci na vlastní riziko a konzultovali jste změnu se svým lékařem.
              </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 text-black hover:bg-amber-600"
              onClick={async () => {
                setProfile(prev => ({ ...prev, customIntervalEnabled: true }));
                await updateProfile({ customIntervalAccepted: true });
                toast.success("Vlastní interval aktivován");
              }}
            >
              Rozumím a souhlasím
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Half-day dosing warning dialog */}
      <AlertDialog open={showHalfDayWarning} onOpenChange={setShowHalfDayWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Upozornění na půldenní intervaly
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
              <p>
                Půldenní intervaly (např. 3.5, 4.5, 5.5 dní) jsou <strong>mimo doporučení výrobce</strong> a mohou ovlivnit účinnost léčby.
              </p>
              <p>
                Tato funkce je určena pouze pro uživatele, kteří si jsou vědomi rizik a konzultovali změnu se svým lékařem.
              </p>
              <p className="font-medium text-foreground">
                Potvrzením souhlasíte, že používáte tuto funkci na vlastní riziko.
              </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 text-black hover:bg-amber-600"
              onClick={async () => {
                setProfile(prev => ({ ...prev, halfDayDosing: true }));
                await updateProfile({ halfDayDosingAccepted: true });
                toast.success("Půldenní intervaly aktivovány");
              }}
            >
              Rozumím a souhlasím
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import z Shotsy</DialogTitle>
            <DialogDescription>
              Nalezena data k importu. Duplicity budou automaticky přeskočeny.
            </DialogDescription>
          </DialogHeader>
          
          {importData && (
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{importData.weightRecords.length} záznamů váhy</p>
                  <p className="text-xs text-muted-foreground">
                    {importData.weightRecords.length > 0 && (
                      <>Od {new Date(Math.min(...importData.weightRecords.map(r => r.date))).toLocaleDateString("cs")}</>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{importData.injectionRecords.length} injekcí</p>
                  <p className="text-xs text-muted-foreground">
                    {importData.injectionRecords.length > 0 && (
                      <>Od {new Date(Math.min(...importData.injectionRecords.map(r => r.date))).toLocaleDateString("cs")}</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Zrušit
            </Button>
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importuji...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Importovat
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
