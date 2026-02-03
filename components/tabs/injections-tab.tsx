"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from "recharts";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Plus, Trash2, ChevronLeft, ChevronRight, Syringe, Pencil, Package, Pen, FlaskConical, Crown, CalendarClock, Calculator, Check, Lock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { generatePKCurvesBySubstance, calculateUnits, calculateMgFromUnits, calculatePenClicks, calculateVialDoses } from "@/lib/pharmacokinetics";
import { substancesDB, injectionSites, type TimeRange, timeRangeLabels, findSubstance, penDatabase, vialMgOptions, vialMlOptions, genericVialDoses, syringeSizes } from "@/lib/constants";
import { toast } from "sonner";

// Helper to get site name from ID
const getSiteName = (siteId: string | undefined): string | null => {
  if (!siteId) return null;
  const site = injectionSites.find(s => s.id === siteId);
  return site ? `${site.icon} ${site.name}` : siteId;
};

interface InjectionsTabProps {
  user: Doc<"users">;
}

export function InjectionsTab({ user }: InjectionsTabProps) {
  const injectionRecords = useQuery(api.records.getInjectionRecords) ?? [];
  const stockItems = useQuery(api.records.getStockItems) ?? [];
  const addInjection = useMutation(api.records.addInjectionRecord);
  const deleteInjection = useMutation(api.records.deleteInjectionRecord);
  const updateInjection = useMutation(api.records.updateInjectionRecord);
  const updateStock = useMutation(api.records.updateStockItem);
  const addStock = useMutation(api.records.addStockItem);

  // Main view toggle: "injekce", "sklad", or "kalkulacka"
  const [mainView, setMainView] = useState<"injekce" | "sklad" | "kalkulacka">("injekce");
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [newStockItem, setNewStockItem] = useState({
    name: "",
    substanceId: "tirz",
    isVial: false,
    totalMg: 10,
  });
  const deleteStock = useMutation(api.records.deleteStockItem);

  // Filter all usable stock items (pens and vials with remaining mg)
  const availableStock = stockItems.filter(item => item.currentMg > 0);

  // Premium check for stock features
  const hasPremium = user.isPremium || user.premiumPermanent || (user.premiumUntil && user.premiumUntil > Date.now());
  const canUseVials = user.showPeptides && hasPremium;

  // Handler to add stock item
  const handleAddStockItem = async () => {
    const substance = substancesDB.find(s => s.id === newStockItem.substanceId);
    await addStock({
      name: newStockItem.name || `${substance?.name} ${newStockItem.totalMg}mg`,
      substanceId: newStockItem.substanceId,
      isVial: newStockItem.isVial,
      totalMg: newStockItem.totalMg,
      currentMg: newStockItem.totalMg,
    });
    setNewStockItem({ name: "", substanceId: "tirz", isVial: canUseVials ? true : false, totalMg: 10 });
    setInventoryDialogOpen(false);
  };

  const handleDeleteStock = async (id: Id<"stockItems">) => {
    if (confirm("Opravdu chcete smazat tuto položku?")) {
      await deleteStock({ id });
    }
  };

  

  const [selectedRange, setSelectedRange] = useState<TimeRange>("month");
  const [offsetIndex, setOffsetIndex] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [injectionMode, setInjectionMode] = useState<"stock" | "manual">(hasPremium && availableStock.length > 0 ? "stock" : "manual");
  const [selectedStockId, setSelectedStockId] = useState<string>("");
  const [stockDose, setStockDose] = useState<string>("");
  const [stockSite, setStockSite] = useState<string>("");
  const [stockDate, setStockDate] = useState<string>("");
  const [stockTime, setStockTime] = useState<string>("");
  const defaultSubstance = user.defaultSubstanceId ?? "tirz";

  // Calculator state
  const [vialMg, setVialMg] = useState(10);
  const [vialMl, setVialMl] = useState(2);
  const [vialWantMg, setVialWantMg] = useState(2.5);
  const [vialUnits, setVialUnits] = useState(50);
  const [syringeSize, setSyringeSize] = useState(1.0);
  const [calcMode, setCalcMode] = useState<"vial" | "pen">(user.isUSMode || user.showPeptides ? "vial" : "pen");
  const [selectedCalcSubstanceId, setSelectedCalcSubstanceId] = useState(defaultSubstance);
  const [selectedPenIndex, setSelectedPenIndex] = useState(0);
  const [penWantMg, setPenWantMg] = useState(2.5);
  const [calcInjectionDialogOpen, setCalcInjectionDialogOpen] = useState(false);
  const [calcSelectedSite, setCalcSelectedSite] = useState<string>("");
  const [calcPendingMg, setCalcPendingMg] = useState(0);
  const [calcPendingSubstanceId, setCalcPendingSubstanceId] = useState("");
  const [stockSiteDialogOpen, setStockSiteDialogOpen] = useState(false);
  const [manualSiteDialogOpen, setManualSiteDialogOpen] = useState(false);
  const [manualSite, setManualSite] = useState<string>("");

  // Calculator calculations
  const calcUnits = calculateUnits(vialWantMg, vialMg, vialMl);
  const { doses: dosesPerVial, remnant } = calculateVialDoses(vialMg, vialWantMg);
  const syringeScale = syringeSize * 100;
  const currentCalcSubstance = substancesDB.find(s => s.id === selectedCalcSubstanceId) ?? substancesDB[0];
  const pens = penDatabase[selectedCalcSubstanceId] ?? [];
  const selectedPen = pens[selectedPenIndex] ?? pens[0];
  const penClicks = selectedPen ? calculatePenClicks(penWantMg, selectedPen.mg) : 0;

  const [newInjection, setNewInjection] = useState({
    substanceId: defaultSubstance,
    mg: "",
    site: "",
    date: "",
    time: "",
  });

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Doc<"injectionRecords"> | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  // Substance visibility for chart - default to enabled substances only
  const enabledSubstances = user.enabledSubstances ?? [user.defaultSubstanceId ?? "tirz"];
  const [visibleSubstances, setVisibleSubstances] = useState<Set<string>>(
    new Set(enabledSubstances)
  );

  // Calculate time window
  const rangeMs = {
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    threeMonths: 90 * 24 * 60 * 60 * 1000,
    sixMonths: 180 * 24 * 60 * 60 * 1000,
    all: 365 * 2 * 24 * 60 * 60 * 1000,
  }[selectedRange];

  const now = Date.now();
  
  // Premium users can see into the future up to their last scheduled injection
  const futureInjections = injectionRecords.filter(r => r.date > now);
  const lastFutureInjectionDate = futureInjections.length > 0 
    ? Math.max(...futureInjections.map(r => r.date))
    : now;
  const futureExtension = user.isPremium && lastFutureInjectionDate > now
    ? (lastFutureInjectionDate - now) + (1 * 24 * 60 * 60 * 1000) // +1 day buffer after last injection
    : 0;
  const baseEndTime = now - offsetIndex * rangeMs;
  const endTime = offsetIndex === 0 ? baseEndTime + futureExtension : baseEndTime;
  const startTime = endTime - rangeMs - (offsetIndex === 0 ? futureExtension : 0);

  // Generate PK curves per substance
  const injectionData = injectionRecords.map(r => ({
    date: r.date,
    substanceId: r.substanceId,
    mg: r.mg
  }));
  
  const visibleSubstanceIds = Array.from(visibleSubstances);
  const chartData = generatePKCurvesBySubstance(
    injectionData,
    visibleSubstanceIds,
    startTime,
    endTime,
    100,
    user.isPremium
  );

  // Check if any visible substance has data
  const hasData = chartData.some(point => 
    visibleSubstanceIds.some(id => (point[id] as number) > 0)
  );

  // Find the "now" label for reference line (premium only)
  const nowLabel = user.isPremium && offsetIndex === 0 
    ? new Date(now).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })
    : null;

  const toggleSubstance = (substanceId: string) => {
    setVisibleSubstances(prev => {
      const newSet = new Set(prev);
      if (newSet.has(substanceId)) {
        // Don't allow deselecting all
        if (newSet.size > 1) {
          newSet.delete(substanceId);
        }
      } else {
        newSet.add(substanceId);
      }
      return newSet;
    });
  };

  // Open site selection dialog for manual injection
  const openManualSiteDialog = () => {
    const mg = parseFloat(newInjection.mg);
    if (isNaN(mg) || mg <= 0) {
      toast.error("Zadejte platnou dávku");
      return;
    }
    
    // Validate date for non-premium
    if (newInjection.date) {
      const dateTime = new Date(`${newInjection.date}T${newInjection.time || "12:00"}`);
      if (!isNaN(dateTime.getTime()) && dateTime.getTime() > Date.now() && !user.isPremium) {
        toast.error("Budoucí datum je dostupné pouze pro Premium účty");
        return;
      }
    }
    
    console.log("Opening manual site dialog");
    setDialogOpen(false);
    setManualSite("");
    setManualSiteDialogOpen(true);
  };
  
  // Confirm manual injection with selected site
  const handleManualSiteConfirm = async () => {
    const mg = parseFloat(newInjection.mg);
    if (isNaN(mg) || mg <= 0) return;

    let injectionDate = Date.now();
    if (newInjection.date) {
      const dateTime = new Date(`${newInjection.date}T${newInjection.time || "12:00"}`);
      if (!isNaN(dateTime.getTime())) {
        injectionDate = dateTime.getTime();
      }
    }

    await addInjection({
      date: injectionDate,
      substanceId: newInjection.substanceId,
      mg,
      site: manualSite || undefined,
    });

    setNewInjection({ substanceId: defaultSubstance, mg: "", site: "", date: "", time: "" });
    setManualSiteDialogOpen(false);
    setManualSite("");
    toast.success("Injekce zapsána");
  };

  const handleAddInjection = async () => {
    const mg = parseFloat(newInjection.mg);
    if (isNaN(mg) || mg <= 0) return;

    let injectionDate = Date.now();
    if (newInjection.date) {
      const dateTime = new Date(`${newInjection.date}T${newInjection.time || "12:00"}`);
      if (!isNaN(dateTime.getTime())) {
        // Check if future date and user is not premium
        if (dateTime.getTime() > Date.now() && !user.isPremium) {
          toast.error("Budoucí datum je dostupné pouze pro Premium účty");
          return;
        }
        injectionDate = dateTime.getTime();
      }
    }

    await addInjection({
      date: injectionDate,
      substanceId: newInjection.substanceId,
      mg,
      site: newInjection.site || undefined,
    });

    setNewInjection({ substanceId: defaultSubstance, mg: "", site: "", date: "", time: "" });
    setDialogOpen(false);
    toast.success("Injekce zapsána");
  };

  const handleAddFromStock = async () => {
    const mg = parseFloat(stockDose);
    if (isNaN(mg) || mg <= 0) {
      toast.error("Zadejte platnou dávku");
      return;
    }

    const selectedItem = stockItems.find(item => item._id === selectedStockId);
    if (!selectedItem) {
      toast.error("Vyberte položku ze skladu");
      return;
    }

    if (mg > selectedItem.currentMg) {
      toast.error(`Zbývá pouze ${selectedItem.currentMg} mg`);
      return;
    }

    // Calculate injection date
    let injectionDate = Date.now();
    if (stockDate) {
      const dateTime = new Date(`${stockDate}T${stockTime || "12:00"}`);
      if (!isNaN(dateTime.getTime())) {
        // Check if future date and user is not premium
        if (dateTime.getTime() > Date.now() && !user.isPremium) {
          toast.error("Budoucí datum je dostupné pouze pro Premium účty");
          return;
        }
        injectionDate = dateTime.getTime();
      }
    }

    // Add injection record
    await addInjection({
      date: injectionDate,
      substanceId: selectedItem.substanceId,
      mg,
      site: stockSite || undefined,
    });

    // Deduct from stock
    const newCurrentMg = selectedItem.currentMg - mg;
    await updateStock({
      id: selectedItem._id as Id<"stockItems">,
      currentMg: newCurrentMg,
    });

    // Reset form
    setSelectedStockId("");
    setStockDose("");
    setStockSite("");
    setStockDate("");
    setStockTime("");
    setDialogOpen(false);
    
    const itemType = selectedItem.isVial ? "vialce" : "peru";
    toast.success("Injekce zapsána a odečteno ze skladu", {
      description: `Zbývá ${newCurrentMg.toFixed(1)} mg v ${itemType}`,
    });
  };

  const selectedStockItem = stockItems.find(item => item._id === selectedStockId);
  const selectedItemSubstance = selectedStockItem ? substancesDB.find(s => s.id === selectedStockItem.substanceId) : null;

  const openStockSiteDialog = () => {
    console.log("openStockSiteDialog called", { stockDose, selectedStockItem });
    const mg = parseFloat(stockDose);
    if (isNaN(mg) || mg <= 0) {
      toast.error("Zadejte platnou dávku");
      return;
    }

    if (!selectedStockItem) {
      toast.error("Vyberte položku ze skladu");
      return;
    }

    if (mg > selectedStockItem.currentMg) {
      toast.error(`Zbývá pouze ${selectedStockItem.currentMg} mg`);
      return;
    }

    console.log("Opening stock site dialog");
    setStockSite("");
    setStockSiteDialogOpen(true);
  };

  const handleStockSiteConfirm = async () => {
    console.log("handleStockSiteConfirm called", { stockSite });
    if (!stockSite) {
      console.log("No stockSite selected, returning");
      return;
    }
    setStockSiteDialogOpen(false);
    await handleAddFromStock();
  };

  const handleDelete = async (id: Id<"injectionRecords">) => {
    if (confirm("Opravdu chcete smazat tento záznam?")) {
      await deleteInjection({ id });
      toast.success("Záznam smazán");
    }
  };

  const openEditDialog = (record: Doc<"injectionRecords">) => {
    setEditingRecord(record);
    const recordDate = new Date(record.date);
    setEditDate(format(recordDate, "yyyy-MM-dd"));
    setEditTime(format(recordDate, "HH:mm"));
    setEditDialogOpen(true);
  };

  const handleUpdateInjection = async () => {
    if (!editingRecord) return;
    
    const dateTime = new Date(`${editDate}T${editTime}`);
    if (isNaN(dateTime.getTime())) {
      toast.error("Neplatné datum nebo čas");
      return;
    }

    // Check if future date and user is not premium
    if (dateTime.getTime() > Date.now() && !user.isPremium) {
      toast.error("Budoucí datum je dostupné pouze pro Premium účty");
      return;
    }

    await updateInjection({
      id: editingRecord._id,
      date: dateTime.getTime(),
    });

    setEditDialogOpen(false);
    setEditingRecord(null);
    toast.success("Záznam upraven");
  };

  const getSubstance = (id: string) => findSubstance(id);

  // Calculator handlers
  const openCalcInjectionDialog = (mg: number, substanceId: string = "reta") => {
    setCalcPendingMg(mg);
    setCalcPendingSubstanceId(calcMode === "vial" ? "reta" : substanceId);
    setCalcSelectedSite("");
    setCalcInjectionDialogOpen(true);
  };

  const handleCalcRecordInjection = async () => {
    console.log("handleCalcRecordInjection called", { calcSelectedSite, calcPendingSubstanceId, calcPendingMg });
    if (!calcSelectedSite) {
      console.log("No site selected, returning early");
      return;
    }
    
    try {
      await addInjection({
        date: Date.now(),
        substanceId: calcPendingSubstanceId,
        mg: calcPendingMg,
        site: calcSelectedSite,
      });
      
      setCalcInjectionDialogOpen(false);
      toast.success("Aplikace zapsána", {
        description: `${calcPendingMg.toFixed(2)} mg ${substancesDB.find(s => s.id === calcPendingSubstanceId)?.name ?? calcPendingSubstanceId}`,
      });
    } catch (error) {
      console.error("Error adding injection:", error);
      toast.error("Chyba při zápisu aplikace");
    }
  };

  const handleUnitsChange = (value: number[]) => {
    setVialUnits(value[0]);
    setVialWantMg(calculateMgFromUnits(value[0], vialMg, vialMl));
  };

  const handleMgChange = (value: number[]) => {
    setVialWantMg(value[0]);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Main view toggle */}
      <div className="flex rounded-lg bg-secondary p-1">
        <button
          onClick={() => setMainView("injekce")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            mainView === "injekce" 
              ? "bg-app-purple text-white" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Syringe className="w-4 h-4" />
          Injekce
        </button>
        <button
          onClick={() => setMainView("sklad")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            mainView === "sklad" 
              ? "bg-emerald-600 text-white" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package className="w-4 h-4" />
          Sklad
        </button>
        <button
          onClick={() => setMainView("kalkulacka")}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            mainView === "kalkulacka" 
              ? "bg-app-orange text-black" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calculator className="w-4 h-4" />
          Kalkulačka
        </button>
      </div>

      {/* INJEKCE VIEW */}
      {mainView === "injekce" && (
        <>
      {/* Time range selector */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {(Object.keys(timeRangeLabels) as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => {
              setSelectedRange(range);
              setOffsetIndex(0);
            }}
            className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors ${
              selectedRange === range 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {timeRangeLabels[range]}
          </button>
        ))}
      </div>

      {/* Substance legend - clickable (only enabled substances) */}
      <div className="flex flex-wrap gap-2">
        {substancesDB.filter(s => enabledSubstances.includes(s.id)).map((s) => {
          const isVisible = visibleSubstances.has(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggleSubstance(s.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all ${
                isVisible ? "opacity-100" : "opacity-40"
              }`}
              style={{ backgroundColor: isVisible ? `${s.color}30` : `${s.color}10` }}
            >
              <div 
                className={`w-2 h-2 rounded-full transition-all ${isVisible ? "" : "opacity-40"}`}
                style={{ backgroundColor: s.color }}
              />
              <span style={{ color: isVisible ? s.color : undefined }}>
                {user.isUSMode ? s.usName : s.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setOffsetIndex(prev => prev + 1)}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="text-sm font-medium">
          {format(new Date(startTime), "d.M.", { locale: cs })} - {format(new Date(endTime), "d.M.", { locale: cs })}
        </span>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setOffsetIndex(prev => Math.max(0, prev - 1))}
          disabled={offsetIndex === 0}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* PK Chart - multi-line per substance */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4">
          <div className="h-56">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    {substancesDB.map((s) => (
                      <linearGradient key={s.id} id={`gradient-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={s.color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    width={35}
                    tickFormatter={(v) => v.toFixed(1)}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number, name: string) => {
                      const substance = getSubstance(name);
                      return [`${value.toFixed(2)} mg`, substance?.name ?? name];
                    }}
                  />
                  {visibleSubstanceIds.map((substanceId) => {
                    const substance = getSubstance(substanceId);
                    if (!substance) return null;
                    return (
                      <Area 
                        key={substanceId}
                        type="monotone" 
                        dataKey={substanceId}
                        stroke={substance.color}
                        fill={`url(#gradient-${substanceId})`}
                        strokeWidth={2}
                        name={substanceId}
                      />
                    );
                  })}
                  {nowLabel && (
                    <ReferenceLine
                      x={nowLabel}
                      stroke="hsl(var(--primary))"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      label={{
                        value: "Teď",
                        position: "top",
                        fill: "hsl(var(--primary))",
                        fontSize: 10,
                      }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Žádná data v tomto období
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add injection button */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (open) {
          // Reset to stock mode if items available AND premium
          setInjectionMode(hasPremium && availableStock.length > 0 ? "stock" : "manual");
          // Set substance from last injection (if any)
          const lastSubstance = injectionRecords.length > 0 
            ? injectionRecords[0].substanceId 
            : defaultSubstance;
          setNewInjection(prev => ({ ...prev, substanceId: lastSubstance }));
        }
      }}>
        <DialogTrigger asChild>
          <Button className="w-full bg-app-purple hover:bg-app-purple/90">
            <Plus className="w-4 h-4 mr-2" />
            Zapsat injekci
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Nová injekce</DialogTitle>
          </DialogHeader>
          
          <Tabs value={injectionMode} onValueChange={(v) => {
            if (v === "stock" && !hasPremium) return;
            setInjectionMode(v as "stock" | "manual");
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="stock" 
                className="text-xs"
                disabled={!hasPremium}
              >
                {hasPremium ? (
                  <Package className="w-3 h-3 mr-1.5" />
                ) : (
                  <Lock className="w-3 h-3 mr-1.5" />
                )}
                Ze skladu
                {!hasPremium && (
                  <Crown className="w-3 h-3 ml-1.5 text-amber-500" />
                )}
              </TabsTrigger>
              <TabsTrigger value="manual" className="text-xs">
                <Syringe className="w-3 h-3 mr-1.5" />
                Jednorázový
              </TabsTrigger>
            </TabsList>

            {/* Stock mode - select from inventory */}
            <TabsContent value="stock" className="space-y-4 mt-4">
              {availableStock.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nemáte žádné zásoby</p>
                  <p className="text-xs mt-1">Přidejte pero nebo vialku v záložce Sklad nebo Kalkulačka</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Vyberte ze skladu</Label>
                    <Select value={selectedStockId} onValueChange={(v) => {
                      setSelectedStockId(v);
                      setStockDose("");
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte položku" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStock.map((item) => {
                          const substance = substancesDB.find(s => s.id === item.substanceId);
                          const iconColor = item.isVial ? substance?.color : (item.penColor ?? substance?.color);
                          return (
                            <SelectItem key={item._id} value={item._id}>
                              <div className="flex items-center gap-2">
                                {item.isVial ? (
                                  <FlaskConical className="w-3.5 h-3.5" style={{ color: iconColor }} />
                                ) : (
                                  <Pen className="w-3.5 h-3.5" style={{ color: iconColor }} />
                                )}
                                <span>{item.name}</span>
                                <span className="text-muted-foreground text-xs">
                                  ({item.currentMg.toFixed(1)} mg)
                                </span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedStockItem && (
                    <>
                      <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: `${selectedStockItem.isVial ? selectedItemSubstance?.color : (selectedStockItem.penColor ?? selectedItemSubstance?.color)}20` }}>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {selectedStockItem.isVial ? (
                              <FlaskConical className="w-4 h-4" style={{ color: selectedItemSubstance?.color }} />
                            ) : (
                              <Pen className="w-4 h-4" style={{ color: selectedStockItem.penColor ?? selectedItemSubstance?.color }} />
                            )}
                            <span style={{ color: selectedStockItem.isVial ? selectedItemSubstance?.color : (selectedStockItem.penColor ?? selectedItemSubstance?.color) }}>
                              {selectedItemSubstance?.name}
                            </span>
                          </div>
                          <span className="text-muted-foreground">
                            Zbývá: <strong>{selectedStockItem.currentMg.toFixed(1)} mg</strong>
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Dávka (mg)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={stockDose}
                          onChange={(e) => setStockDose(e.target.value)}
                          placeholder="2.5"
                          max={selectedStockItem.currentMg}
                        />
                        {/* Quick dose buttons */}
                        <div className="flex flex-wrap gap-1">
                          {selectedItemSubstance?.commonDoses.map((dose) => (
                            <button
                              key={dose}
                              onClick={() => setStockDose(dose.toString())}
                              disabled={dose > selectedStockItem.currentMg}
                              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                                stockDose === dose.toString()
                                  ? "bg-app-purple text-white"
                                  : dose > selectedStockItem.currentMg
                                  ? "bg-secondary/50 text-muted-foreground cursor-not-allowed"
                                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                              }`}
                            >
                              {dose}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Date/time picker - premium feature for future dates */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <CalendarClock className="w-3 h-3" />
                          Datum a čas
                          {user.isPremium && (
                            <span className="text-xs text-amber-500 flex items-center gap-1">
                              <Crown className="w-3 h-3" />
                              Premium
                            </span>
                          )}
                        </Label>
                        {user.isPremium ? (
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="date"
                              value={stockDate}
                              onChange={(e) => setStockDate(e.target.value)}
                            />
                            <Input
                              type="time"
                              value={stockTime}
                              onChange={(e) => setStockTime(e.target.value)}
                            />
                          </div>
                        ) : (
                          <div className="p-3 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
                            {format(new Date(), "d. MMMM yyyy, HH:mm", { locale: cs })}
                          </div>
                        )}
                        {user.isPremium && (
                          <p className="text-xs text-muted-foreground">
                            Prázdné = aktuální čas
                          </p>
                        )}
                      </div>

                      <Button 
                        onClick={() => {
                          console.log("Button clicked!");
                          console.log("stockDose:", stockDose);
                          console.log("selectedStockItem:", selectedStockItem);
                          openStockSiteDialog();
                        }} 
                        className="w-full"
                      >
                        Zapsat a odečíst ze skladu
                      </Button>
                    </>
                  )}
                </>
              )}
            </TabsContent>

            {/* Manual mode - classic entry */}
            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Látka</Label>
                <Select 
                  value={newInjection.substanceId} 
                  onValueChange={(v) => setNewInjection(prev => ({ ...prev, substanceId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {substancesDB.filter(s => enabledSubstances.includes(s.id)).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: s.color }}
                          />
                          {user.isUSMode ? s.usName : s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dávka (mg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={newInjection.mg}
                  onChange={(e) => setNewInjection(prev => ({ ...prev, mg: e.target.value }))}
                  placeholder="2.5"
                />
                {/* Quick dose buttons */}
                <div className="flex flex-wrap gap-1">
                  {getSubstance(newInjection.substanceId)?.commonDoses.map((dose) => (
                    <button
                      key={dose}
                      onClick={() => setNewInjection(prev => ({ ...prev, mg: dose.toString() }))}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        newInjection.mg === dose.toString()
                          ? "bg-app-purple text-white"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {dose}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date/time picker - premium feature for future dates */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <CalendarClock className="w-3 h-3" />
                  Datum a čas
                  {user.isPremium && (
                    <span className="text-xs text-amber-500 flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      Premium
                    </span>
                  )}
                </Label>
                {user.isPremium ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={newInjection.date}
                      onChange={(e) => setNewInjection(prev => ({ ...prev, date: e.target.value }))}
                    />
                    <Input
                      type="time"
                      value={newInjection.time}
                      onChange={(e) => setNewInjection(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
                    {format(new Date(), "d. MMMM yyyy, HH:mm", { locale: cs })}
                  </div>
                )}
                {user.isPremium && (
                  <p className="text-xs text-muted-foreground">
                    Prázdné = aktuální čas
                  </p>
                )}
              </div>

              <Button onClick={openManualSiteDialog} className="w-full">
                Pokračovat
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit injection dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Upravit datum a čas</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm font-medium">
                  {getSubstance(editingRecord.substanceId)?.name ?? "Neznámá"} ({editingRecord.mg} mg)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Datum</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  max={!user.isPremium ? format(new Date(), "yyyy-MM-dd") : undefined}
                />
                {!user.isPremium && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Premium umožňuje plánovat injekce do budoucnosti
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Čas</Label>
                <Input
                  type="time"
                  value={editTime}
                  onChange={(e) => {
                    const selectedDateTime = new Date(`${editDate}T${e.target.value}`);
                    if (!user.isPremium && selectedDateTime > new Date()) {
                      // Non-premium: limit to current time if date is today
                      setEditTime(format(new Date(), "HH:mm"));
                    } else {
                      setEditTime(e.target.value);
                    }
                  }}
                />
              </div>

              <Button onClick={handleUpdateInjection} className="w-full">
                Uložit změny
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Stock Injection Site Dialog */}
      <Dialog open={stockSiteDialogOpen} onOpenChange={setStockSiteDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Vyberte místo vpichu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground mb-4">
              {stockDose} mg {selectedItemSubstance?.name ?? ""}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {injectionSites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => setStockSite(site.id)}
                  className={`p-3 rounded-lg border transition-all flex items-center gap-2 ${
                    stockSite === site.id
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  <span className="text-lg">{site.icon}</span>
                  <span className="text-sm">{site.name}</span>
                  {stockSite === site.id && (
                    <Check className="w-4 h-4 ml-auto" />
                  )}
                </button>
              ))}
            </div>
            <Button 
              onClick={handleStockSiteConfirm}
              disabled={!stockSite}
              className="w-full"
            >
              <Syringe className="w-4 h-4 mr-2" />
              Potvrdit a zapsat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Injection Site Dialog */}
      <Dialog open={manualSiteDialogOpen} onOpenChange={setManualSiteDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Vyberte místo vpichu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground mb-4">
              {newInjection.mg} mg {getSubstance(newInjection.substanceId)?.name ?? ""}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {injectionSites.map((site) => (
                <button
                  key={site.id}
                  onClick={() => setManualSite(site.id)}
                  className={`p-3 rounded-lg border transition-all flex items-center gap-2 ${
                    manualSite === site.id
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  <span className="text-lg">{site.icon}</span>
                  <span className="text-sm">{site.name}</span>
                  {manualSite === site.id && (
                    <Check className="w-4 h-4 ml-auto" />
                  )}
                </button>
              ))}
            </div>
            <Button 
              onClick={handleManualSiteConfirm}
              disabled={!manualSite}
              className="w-full"
            >
              <Syringe className="w-4 h-4 mr-2" />
              Potvrdit a zapsat
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Injection history */}
      <div className="space-y-2">
        {injectionRecords.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            Zatím žádné záznamy
          </p>
        ) : (
          injectionRecords.map((record, index) => {
            const substance = getSubstance(record.substanceId);
            const injectionNumber = injectionRecords.length - index;
            return (
              <Card key={record._id} className="bg-card border-border">
                <CardContent className="p-3 flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center relative"
                    style={{ backgroundColor: substance?.color ?? "#888" }}
                  >
                    <Syringe className="w-5 h-5 text-white" />
                    <span className="absolute -top-1 -right-1 bg-background text-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-border">
                      {injectionNumber}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {substance?.name ?? "Neznámá"} ({record.mg} mg)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(record.date), "d. MMMM HH:mm", { locale: cs })}
                    </p>
                    {record.site && (
                      <p className="text-xs text-primary">{getSiteName(record.site)}</p>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => openEditDialog(record)}
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDelete(record._id)}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
        </>
      )}

      {/* SKLAD VIEW */}
      {mainView === "sklad" && (
        <>
          {/* Add stock button */}
          <Dialog open={inventoryDialogOpen} onOpenChange={setInventoryDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline" disabled={!hasPremium}>
                {hasPremium ? (
                  <Plus className="w-4 h-4 mr-2" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Přidat do skladu
                {!hasPremium && <Crown className="w-3 h-3 ml-2 text-amber-500" />}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Nová položka</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {user.showPeptides ? (
                  <div className="space-y-2">
                    <Label>Typ</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={newStockItem.isVial && canUseVials ? "default" : "outline"}
                        className={`flex-1 ${!hasPremium ? "opacity-50" : ""}`}
                        onClick={() => {
                          if (hasPremium) {
                            setNewStockItem(prev => ({ ...prev, isVial: true }));
                          }
                        }}
                        disabled={!hasPremium}
                      >
                        {hasPremium ? (
                          <FlaskConical className="w-4 h-4 mr-2" />
                        ) : (
                          <Lock className="w-4 h-4 mr-2" />
                        )}
                        Vialka
                        {!hasPremium && <Crown className="w-3 h-3 ml-1 text-amber-500" />}
                      </Button>
                      <Button
                        type="button"
                        variant={!newStockItem.isVial ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setNewStockItem(prev => ({ ...prev, isVial: false }))}
                      >
                        <Pen className="w-4 h-4 mr-2" />
                        Pero
                      </Button>
                    </div>
                    {!hasPremium && (
                      <p className="text-xs text-amber-500/80 flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        Vialky vyžadují Premium účet
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-secondary/50 rounded-lg">
                    <Pen className="w-5 h-5 text-app-purple" />
                    <span className="text-sm font-medium">Pero</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Látka</Label>
                  <Select 
                    value={newStockItem.substanceId} 
                    onValueChange={(v) => setNewStockItem(prev => ({ ...prev, substanceId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {substancesDB.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Celkové množství (mg)</Label>
                  <Input
                    type="number"
                    value={newStockItem.totalMg}
                    onChange={(e) => setNewStockItem(prev => ({ ...prev, totalMg: Number(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Název (volitelné)</Label>
                  <Input
                    value={newStockItem.name}
                    onChange={(e) => setNewStockItem(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Např. Mounjaro 5mg pero"
                  />
                </div>

                <Button onClick={handleAddStockItem} className="w-full">
                  Přidat
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Stock list */}
          {stockItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Zatím žádné zásoby</p>
              <p className="text-sm">Přidejte je v Kalkulačce nebo zde</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stockItems.map((item) => {
                const substance = getSubstance(item.substanceId);
                const percentage = (item.currentMg / item.totalMg) * 100;
                
                // For pens: use penColor for icon, substanceColor for border
                const iconColor = item.isVial ? substance?.color : (item.penColor ?? substance?.color);
                const borderColor = substance?.color ?? "#888";
                
                return (
                  <Card 
                    key={item._id} 
                    className="bg-card"
                    style={{ borderColor: `${borderColor}50`, borderWidth: '2px' }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {item.isVial ? (
                            <FlaskConical className="w-5 h-5" style={{ color: iconColor }} />
                          ) : (
                            <Pen className="w-5 h-5" style={{ color: iconColor }} />
                          )}
                          <div>
                            <span className="font-medium">{item.name}</span>
                            {!item.isVial && substance && (
                              <p className="text-xs text-muted-foreground" style={{ color: borderColor }}>
                                {substance.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteStock(item._id)}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>

                      {/* Progress bar */}
                      <div className="relative h-5 bg-secondary rounded-full overflow-hidden mb-2">
                        <div 
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: `${iconColor ?? "#888"}B0`
                          }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                          {Math.round(percentage)}%
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span style={{ color: iconColor }}>
                          Zbývá: {item.currentMg.toFixed(1)} mg
                        </span>
                        <span className="text-muted-foreground">
                          z {item.totalMg} mg
                        </span>
                      </div>

                      <Button 
                        className="w-full mt-3"
                        style={{ backgroundColor: hasPremium ? iconColor : undefined }}
                        variant={hasPremium ? "default" : "outline"}
                        onClick={() => {
                          if (hasPremium) {
                            setSelectedStockId(item._id);
                            setInjectionMode("stock");
                            setMainView("injekce");
                            setDialogOpen(true);
                          }
                        }}
                        disabled={!hasPremium}
                      >
                        {!hasPremium && <Lock className="w-4 h-4 mr-2" />}
                        POUŽÍT (Zapsat dávku)
                        {!hasPremium && <Crown className="w-3 h-3 ml-2 text-amber-500" />}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* KALKULAČKA VIEW */}
      {mainView === "kalkulacka" && (
        <>
          {/* Mode toggle - only show if US mode or peptides enabled */}
          {(user.isUSMode || user.showPeptides) && (
            <div className="flex rounded-lg bg-secondary p-1">
              <button
                onClick={() => setCalcMode("vial")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  calcMode === "vial" 
                    ? "bg-app-orange text-black" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                {user.isUSMode ? "VIAL / UNITS" : "VIALKA"}
              </button>
              <button
                onClick={() => setCalcMode("pen")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  calcMode === "pen" 
                    ? "bg-app-purple text-white" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Pen className="w-4 h-4" />
                PERO
              </button>
            </div>
          )}

          {/* Vial Calculator */}
          {calcMode === "vial" && (
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
                    <p className="text-5xl font-bold text-app-orange">{Math.round(calcUnits)} IU</p>
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
                      style={{ width: `${Math.min(100, (user.isUSMode ? vialUnits : calcUnits) / syringeScale * 100)}%` }}
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
                    onClick={() => openCalcInjectionDialog(vialWantMg)}
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

          {/* Pen Calculator */}
          {calcMode === "pen" && (
            <Card className="bg-card" style={{ borderColor: `${selectedPen?.color ?? currentCalcSubstance.color}50` }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2" style={{ color: selectedPen?.color ?? currentCalcSubstance.color }}>
                  <Pen className="w-5 h-5" />
                  {user.isUSMode ? "Brand Name Pens" : "Kliky Pera"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Substance selector - only enabled substances with pens */}
                <div className="space-y-2">
                  <Label className="text-xs">Látka</Label>
                  <Select 
                    value={selectedCalcSubstanceId} 
                    onValueChange={(v) => {
                      setSelectedCalcSubstanceId(v);
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
                    {currentCalcSubstance.commonDoses.map((dose) => (
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
                    max={currentCalcSubstance.typicalMaxDose}
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
                    onClick={() => openCalcInjectionDialog(penWantMg, selectedCalcSubstanceId)}
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
                        name: `${selectedPen?.label ?? currentCalcSubstance.name} (${total}mg)`,
                        substanceId: selectedCalcSubstanceId,
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

          {/* Calculator Injection Site Dialog */}
          <Dialog open={calcInjectionDialogOpen} onOpenChange={setCalcInjectionDialogOpen}>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Vyberte místo vpichu</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-center text-sm text-muted-foreground mb-4">
                  {calcPendingMg.toFixed(2)} mg {substancesDB.find(s => s.id === calcPendingSubstanceId)?.name ?? calcPendingSubstanceId}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {injectionSites.map((site) => (
                    <button
                      key={site.id}
                      onClick={() => setCalcSelectedSite(site.id)}
                      className={`p-3 rounded-lg border transition-all flex items-center gap-2 ${
                        calcSelectedSite === site.id
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                    >
                      <span className="text-lg">{site.icon}</span>
                      <span className="text-sm">{site.name}</span>
                      {calcSelectedSite === site.id && (
                        <Check className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
                <Button 
                  onClick={handleCalcRecordInjection}
                  disabled={!calcSelectedSite}
                  className="w-full"
                >
                  <Syringe className="w-4 h-4 mr-2" />
                  Potvrdit aplikaci
                </Button>
              </div>
            </DialogContent>
          </Dialog>

        </>
      )}
    </div>
  );
}
