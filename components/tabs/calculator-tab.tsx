"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Syringe, FlaskConical, Pen, Check, Package, Lock, Crown } from "lucide-react";
import { toast } from "sonner";
import { 
  substancesDB, 
  penDatabase, 
  vialMgOptions, 
  vialMlOptions, 
  genericVialDoses,
  syringeSizes,
  injectionSites
} from "@/lib/constants";
import { calculateUnits, calculateMgFromUnits, calculatePenClicks, calculateVialDoses } from "@/lib/pharmacokinetics";

interface CalculatorTabProps {
  user: Doc<"users">;
}

export function CalculatorTab({ user }: CalculatorTabProps) {
  const addInjection = useMutation(api.records.addInjectionRecord);
  const addStock = useMutation(api.records.addStockItem);
  const injectionRecords = useQuery(api.records.getInjectionRecords, {}) ?? [];

  // Premium check
  const hasPremium = user.isPremium || user.premiumPermanent || (user.premiumUntil && user.premiumUntil > Date.now());

  // Vial state
  const [vialMg, setVialMg] = useState(10);
  const [vialMl, setVialMl] = useState(2);
  const [vialWantMg, setVialWantMg] = useState(2.5);
  const [vialUnits, setVialUnits] = useState(50);
  const [syringeSize, setSyringeSize] = useState(1.0);

  // Enabled substances - only those with pens available
  const enabledSubstances = user.enabledSubstances ?? [user.defaultSubstanceId ?? "tirz"];
  const substancesWithPens = substancesDB.filter(s => enabledSubstances.includes(s.id) && penDatabase[s.id]?.length > 0);
  
  // Find a valid default - must be enabled AND have pens
  const getValidSubstance = (id: string | undefined): string => {
    if (id && substancesWithPens.some(s => s.id === id)) return id;
    return substancesWithPens[0]?.id ?? "tirz";
  };
  
  const defaultSubstance = getValidSubstance(user.defaultSubstanceId);
  console.log("[Calculator] enabledSubstances:", enabledSubstances, "substancesWithPens:", substancesWithPens.map(s => s.id), "defaultSubstance:", defaultSubstance);

  // Pen state
  const [selectedSubstanceId, setSelectedSubstanceId] = useState(defaultSubstance);
  const [selectedPenIndex, setSelectedPenIndex] = useState(0);
  const [penWantMg, setPenWantMg] = useState(2.5);

  // Mode - vial mode requires peptides enabled AND premium
  const canUseVialMode = user.showPeptides && hasPremium;
  const [mode, setMode] = useState<"vial" | "pen">(canUseVialMode ? "vial" : "pen");

  // Auto-switch to pen mode if premium expires
  useEffect(() => {
    if (!canUseVialMode && mode === "vial") {
      setMode("pen");
    }
  }, [canUseVialMode, mode]);

  // Set substance from last injection when data loads (only if it has pens)
  const lastInjectionSubstance = injectionRecords[0]?.substanceId;
  const validLastSubstance = lastInjectionSubstance ? getValidSubstance(lastInjectionSubstance) : null;
  console.log("[Calculator] injectionRecords:", injectionRecords.length, "lastInjectionSubstance:", lastInjectionSubstance, "validLastSubstance:", validLastSubstance, "selectedSubstanceId:", selectedSubstanceId);
  useEffect(() => {
    console.log("[Calculator] useEffect triggered, validLastSubstance:", validLastSubstance);
    if (validLastSubstance) {
      console.log("[Calculator] Setting selectedSubstanceId to:", validLastSubstance);
      setSelectedSubstanceId(validLastSubstance);
    }
  }, [validLastSubstance]);

  // Injection dialog state
  const [injectionDialogOpen, setInjectionDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>("");
  const [pendingMg, setPendingMg] = useState(0);
  const [pendingSubstanceId, setPendingSubstanceId] = useState("");

  // Calculations
  const units = calculateUnits(vialWantMg, vialMg, vialMl);
  const { doses: dosesPerVial, remnant } = calculateVialDoses(vialMg, vialWantMg);
  const syringeScale = syringeSize * 100;

  const currentSubstance = substancesDB.find(s => s.id === selectedSubstanceId) ?? substancesDB[0];
  const pens = penDatabase[selectedSubstanceId] ?? [];
  const selectedPen = pens[selectedPenIndex] ?? pens[0];
  const penClicks = selectedPen ? calculatePenClicks(penWantMg, selectedPen.mg) : 0;

  const openInjectionDialog = (mg: number, substanceId: string = "reta") => {
    setPendingMg(mg);
    setPendingSubstanceId(mode === "vial" ? "reta" : substanceId);
    setSelectedSite("");
    setInjectionDialogOpen(true);
  };

  const handleRecordInjection = async () => {
    if (!selectedSite) return;
    
    await addInjection({
      date: Date.now(),
      substanceId: pendingSubstanceId,
      mg: pendingMg,
      site: selectedSite,
    });
    
    setInjectionDialogOpen(false);
    toast.success("Aplikace zapsána", {
      description: `${pendingMg.toFixed(2)} mg ${substancesDB.find(s => s.id === pendingSubstanceId)?.name ?? pendingSubstanceId}`,
    });
  };

  // Handle US mode units slider
  const handleUnitsChange = (value: number[]) => {
    setVialUnits(value[0]);
    setVialWantMg(calculateMgFromUnits(value[0], vialMg, vialMl));
  };

  // Handle mg slider
  const handleMgChange = (value: number[]) => {
    setVialWantMg(value[0]);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Mode toggle - only show if peptides enabled AND has premium */}
      {user.showPeptides && hasPremium && (
        <div className="flex rounded-lg bg-secondary p-1">
          <button
            onClick={() => {
              if (hasPremium) {
                setMode("vial");
              } else {
                toast.error("Premium funkce", {
                  description: "Míchání peptidů a vialek vyžaduje Premium účet",
                });
              }
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              mode === "vial" && hasPremium
                ? "bg-app-orange text-black" 
                : !hasPremium 
                  ? "text-muted-foreground/50 cursor-not-allowed"
                  : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {hasPremium ? (
              <FlaskConical className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            {user.isUSMode ? "VIAL / UNITS" : "VIALKA"}
            {!hasPremium && <Crown className="w-3 h-3 text-amber-500" />}
          </button>
          <button
            onClick={() => setMode("pen")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              mode === "pen" 
                ? "bg-app-purple text-white" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Pen className="w-4 h-4" />
            PERO
          </button>
        </div>
      )}

      {/* Vial Calculator - Premium only */}
      {mode === "vial" && hasPremium && (
        <Card className="bg-card border-app-orange/50">
          <CardContent className="pt-6 space-y-6">
            {/* Vial configuration */}
            <div>
              <p className="text-xs text-muted-foreground mb-3">
                {user.isUSMode ? "Compounded Config" : "Konfigurace míchání"}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Vialka (mg)</Label>
                  <Select value={vialMg.toString()} onValueChange={(v) => setVialMg(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {vialMgOptions.map((mg) => (
                        <SelectItem key={mg} value={mg.toString()}>{mg} mg</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Voda (ml)</Label>
                  <Select value={vialMl.toString()} onValueChange={(v) => setVialMl(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {vialMlOptions.map((ml) => (
                        <SelectItem key={ml} value={ml.toString()}>{ml} ml</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-3">
                {user.isUSMode ? "Dose in Units (IU):" : "Chci aplikovat (mg):"}
              </p>

              {/* Quick dose buttons */}
              {!user.isUSMode && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {genericVialDoses.slice(0, 8).map((dose) => (
                    <button
                      key={dose}
                      onClick={() => setVialWantMg(dose)}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        vialWantMg === dose
                          ? "bg-app-orange text-black"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {dose}
                    </button>
                  ))}
                </div>
              )}

              {/* Slider */}
              {user.isUSMode ? (
                <>
                  <Slider
                    value={[vialUnits]}
                    onValueChange={handleUnitsChange}
                    max={100}
                    step={1}
                    className="mb-4"
                  />
                  <div className="text-center">
                    <p className="text-4xl font-bold text-app-orange">{vialUnits} Units</p>
                    <p className="text-muted-foreground">({vialWantMg.toFixed(2)} mg)</p>
                  </div>
                </>
              ) : (
                <>
                  <Slider
                    value={[vialWantMg]}
                    onValueChange={handleMgChange}
                    max={15}
                    step={0.05}
                    className="mb-4"
                  />
                  <div className="text-center">
                    <p className="text-4xl font-bold">{vialWantMg.toFixed(2)} mg</p>
                  </div>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-background/50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Výdrž</p>
                <p className="font-bold">{dosesPerVial} dávek</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Zbytek</p>
                <p className={`font-bold ${remnant > 0 ? "text-app-red" : ""}`}>
                  {remnant.toFixed(2)} mg
                </p>
              </div>
            </div>

            {/* Units result (EU mode) */}
            {!user.isUSMode && (
              <div className="text-center border-t border-border pt-4">
                <p className="text-5xl font-bold text-app-orange">{Math.round(units)} IU</p>
              </div>
            )}

            {/* Syringe selector */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">Stříkačka:</span>
              <Select value={syringeSize.toString()} onValueChange={(v) => setSyringeSize(Number(v))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {syringeSizes.map((s) => (
                    <SelectItem key={s.value} value={s.value.toString()}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Syringe visualization */}
            <div className="relative h-24 bg-background/30 rounded-lg overflow-hidden">
              <div className="absolute inset-y-4 left-4 right-16 bg-secondary/50 rounded-full">
                <div 
                  className="absolute inset-y-0 left-0 bg-app-orange/80 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (user.isUSMode ? vialUnits : units) / syringeScale * 100)}%` }}
                />
              </div>
              {/* Scale marks */}
              <div className="absolute bottom-0 left-4 right-16 flex justify-between px-2 text-[10px] text-muted-foreground">
                {[0, 25, 50, 75, 100].map((mark) => (
                  <span key={mark}>{Math.round(mark * syringeSize)}</span>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => openInjectionDialog(vialWantMg)}
                className="flex-1 bg-app-orange/20 text-app-orange hover:bg-app-orange/30"
              >
                <Syringe className="w-4 h-4 mr-2" />
                Zapsat aplikaci
              </Button>
              <Button 
                onClick={async () => {
                  await addStock({
                    name: `Vialka ${vialMg}mg`,
                    substanceId: "reta",
                    isVial: true,
                    totalMg: vialMg,
                    currentMg: vialMg,
                    vialMg: vialMg,
                    vialMl: vialMl,
                  });
                  toast.success("✅ Vialka přidána do skladu!", {
                    description: `${vialMg}mg vialka (${vialMl}ml vody) je připravena k použití`,
                    duration: 4000,
                  });
                }}
                variant="outline"
                className="border-app-orange/50 text-app-orange hover:bg-app-orange/10"
              >
                <Package className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vial mode locked - requires premium */}
      {mode === "vial" && !hasPremium && (
        <Card className="bg-card border-amber-500/30">
          <CardContent className="pt-6 pb-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Lock className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-amber-500 flex items-center justify-center gap-2">
                  <Crown className="w-5 h-5" />
                  Premium funkce
                </h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                  Míchání peptidů a vialek je dostupné pouze pro Premium uživatele.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Aktivujte Premium v sekci Profil
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pen Calculator */}
      {mode === "pen" && (
        <Card className="bg-card" style={{ borderColor: `${selectedPen?.color ?? currentSubstance.color}50` }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2" style={{ color: selectedPen?.color ?? currentSubstance.color }}>
              <Pen className="w-5 h-5" />
              {user.isUSMode ? "Brand Name Pens" : "Kliky Pera"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Substance selector - only enabled substances with pens */}
            <div className="space-y-2">
              <Label className="text-xs">Látka</Label>
              <Select 
                value={selectedSubstanceId} 
                onValueChange={(v) => {
                  setSelectedSubstanceId(v);
                  setSelectedPenIndex(0);
                  const substance = substancesDB.find(s => s.id === v);
                  if (substance) setPenWantMg(substance.commonDoses[0] ?? 2.5);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {substancesDB.filter(s => enabledSubstances.includes(s.id) && penDatabase[s.id]?.length > 0).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                        {user.isUSMode ? s.usName : s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pen type selector */}
            <div className="space-y-2">
              <Label className="text-xs">Typ pera (mg)</Label>
              <Select 
                value={selectedPenIndex.toString()} 
                onValueChange={(v) => setSelectedPenIndex(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pens.map((pen, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      <span style={{ color: pen.color }}>{pen.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border pt-4">
              {/* Quick dose buttons */}
              <div className="flex flex-wrap gap-1 mb-4">
                {currentSubstance.commonDoses.map((dose) => (
                  <button
                    key={dose}
                    onClick={() => setPenWantMg(dose)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors`}
                    style={{
                      backgroundColor: penWantMg === dose ? selectedPen?.color : undefined,
                      color: penWantMg === dose ? "black" : undefined,
                    }}
                  >
                    {dose}
                  </button>
                ))}
              </div>

              {/* Slider */}
              <Slider
                value={[penWantMg]}
                onValueChange={(v) => setPenWantMg(v[0])}
                max={currentSubstance.typicalMaxDose}
                step={0.05}
                className="mb-4"
              />

              <div className="text-center">
                <p className="text-2xl font-bold">{penWantMg.toFixed(2)} mg</p>
              </div>
            </div>

            {/* Clicks result (EU mode) */}
            {!user.isUSMode && (
              <div className="text-center border-t border-border pt-4">
                <p className="text-5xl font-bold" style={{ color: selectedPen?.color }}>
                  {penClicks} KLIKŮ
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => openInjectionDialog(penWantMg, selectedSubstanceId)}
                className="w-full"
                style={{ 
                  backgroundColor: `${selectedPen?.color}30`,
                  color: selectedPen?.color,
                }}
              >
                <Syringe className="w-4 h-4 mr-2" />
                Zapsat aplikaci
              </Button>
              <Button 
                onClick={async () => {
                  const total = selectedPen?.totalMg ?? 10;
                  await addStock({
                    name: `${selectedPen?.label ?? currentSubstance.name} (${total}mg)`,
                    substanceId: selectedSubstanceId,
                    isVial: false,
                    totalMg: total,
                    currentMg: total,
                    penType: selectedPen?.label,
                    penColor: selectedPen?.color,
                  });
                  toast.success("✅ Pero přidáno do skladu!", {
                    description: `${selectedPen?.label} (${total}mg) je připraveno k použití`,
                    duration: 4000,
                  });
                }}
                variant="outline"
                className="w-full h-14"
                style={{ 
                  borderColor: `${selectedPen?.color}50`,
                  color: selectedPen?.color,
                }}
              >
                <Package className="w-5 h-5 mr-2" />
                Přidat pero do skladu ({selectedPen?.totalMg ?? 10}mg)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Injection Site Dialog */}
      <Dialog open={injectionDialogOpen} onOpenChange={setInjectionDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Vyberte místo vpichu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground mb-4">
              {pendingMg.toFixed(2)} mg {substancesDB.find(s => s.id === pendingSubstanceId)?.name ?? pendingSubstanceId}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {injectionSites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => setSelectedSite(site.id)}
                  className={`p-3 rounded-lg border transition-all flex items-center gap-2 ${
                    selectedSite === site.id
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  <span className="text-lg">{site.icon}</span>
                  <span className="text-sm">{site.name}</span>
                  {selectedSite === site.id && (
                    <Check className="w-4 h-4 ml-auto" />
                  )}
                </button>
              ))}
            </div>
            <Button 
              onClick={handleRecordInjection}
              disabled={!selectedSite}
              className="w-full"
            >
              <Syringe className="w-4 h-4 mr-2" />
              Potvrdit aplikaci
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
