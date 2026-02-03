"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Plus, Ruler, Trash2, Scale, ChevronLeft, ChevronRight, Pencil, Target, TrendingDown, Activity } from "lucide-react";
import { calculateBMI, getBMICategory } from "@/lib/nutrition";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type TimeRange, timeRangeLabels } from "@/lib/constants";
import { toast } from "sonner";

interface BodyTabProps {
  user: Doc<"users">;
}

type MeasureRecord = Doc<"measureRecords">;

// Measurement labels in Czech
const measureLabels: Record<string, string> = {
  neck: "Krk",
  chest: "Hrudník",
  waist: "Pas",
  hips: "Boky",
  thigh: "Stehno",
  calf: "Lýtko",
  arm: "Paže",
};

// Colors for each measurement
const measureColors: Record<string, string> = {
  neck: "hsl(var(--app-purple))",
  chest: "hsl(var(--app-blue))",
  waist: "hsl(var(--app-red))",
  hips: "hsl(var(--app-orange))",
  thigh: "hsl(var(--app-green))",
  calf: "hsl(var(--primary))",
  arm: "hsl(var(--app-gold))",
};

type ViewMode = "weight" | "measures";

export function BodyTab({ user }: BodyTabProps) {
  const weightRecords = useQuery(api.records.getWeightRecords) ?? [];
  const measureRecords = useQuery(api.records.getMeasureRecords) ?? [];
  
  const addWeight = useMutation(api.records.addWeightRecord);
  const deleteWeight = useMutation(api.records.deleteWeightRecord);
  const updateWeight = useMutation(api.records.updateWeightRecord);
  const addMeasure = useMutation(api.records.addMeasureRecord);
  const deleteMeasure = useMutation(api.records.deleteMeasureRecord);

  const [viewMode, setViewMode] = useState<ViewMode>("weight");
  const [selectedRange, setSelectedRange] = useState<TimeRange>("month");
  const [offsetIndex, setOffsetIndex] = useState(0);
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [measureDialogOpen, setMeasureDialogOpen] = useState(false);
  const [editWeightDialogOpen, setEditWeightDialogOpen] = useState(false);
  const [editingWeight, setEditingWeight] = useState<{ id: Id<"weightRecords">; kg: string; date: Date } | null>(null);
  const [selectedMeasure, setSelectedMeasure] = useState<string>("waist");
  const [newWeight, setNewWeight] = useState("");
  const [newWeightDate, setNewWeightDate] = useState<Date>(new Date());
  const [newMeasures, setNewMeasures] = useState({
    neck: "", chest: "", waist: "", hips: "", thigh: "", calf: "", arm: ""
  });

  // Get latest and previous measurements for comparison
  const latestMeasure = measureRecords[0];
  const previousMeasure = measureRecords[1];

  // Get latest weight data
  const latestWeight = weightRecords[0]?.kg ?? 0;
  
  // Total weight change (from first record)
  const firstWeight = weightRecords.length > 0 ? weightRecords[weightRecords.length - 1]?.kg : latestWeight;
  const totalChange = latestWeight - firstWeight;
  const totalChangePercent = firstWeight > 0 ? ((totalChange / firstWeight) * 100) : 0;
  
  // Calculate average change per week/month
  const firstRecordDate = weightRecords.length > 0 ? weightRecords[weightRecords.length - 1]?.date : Date.now();
  const totalDays = (Date.now() - firstRecordDate) / (24 * 60 * 60 * 1000);
  const avgPerWeek = totalDays >= 7 ? (totalChange / totalDays) * 7 : totalChange;
  const avgPerMonth = totalDays >= 30 ? (totalChange / totalDays) * 30 : totalChange;
  
  // BMI calculation
  const heightCm = user.heightCm ?? 170;
  const bmi = latestWeight > 0 ? calculateBMI(latestWeight, heightCm) : 0;
  const bmiCategory = getBMICategory(bmi);
  
  // Distance to goal
  const targetWeight = user.targetWeightKg ?? latestWeight;
  const toGoal = latestWeight - targetWeight;

  // Calculate changes
  const getChange = (key: string): number | null => {
    if (!latestMeasure || !previousMeasure) return null;
    const latest = latestMeasure[key as keyof MeasureRecord] as number | undefined;
    const previous = previousMeasure[key as keyof MeasureRecord] as number | undefined;
    if (latest === undefined || previous === undefined) return null;
    return latest - previous;
  };

  // Filter data by time range
  const now = Date.now();
  const rangeMs = {
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    threeMonths: 90 * 24 * 60 * 60 * 1000,
    sixMonths: 180 * 24 * 60 * 60 * 1000,
    all: 365 * 2 * 24 * 60 * 60 * 1000,
  }[selectedRange];

  const endTime = now - offsetIndex * rangeMs;
  const startTime = endTime - rangeMs;

  const filteredMeasureRecords = measureRecords.filter(r => r.date > startTime && r.date <= endTime);
  const filteredWeightRecords = weightRecords.filter(r => r.date > startTime && r.date <= endTime);

  // Prepare weight chart data
  const weightChartData = filteredWeightRecords
    .map(r => ({
      date: r.date,
      kg: r.kg,
      label: format(new Date(r.date), "d.M.", { locale: cs })
    }))
    .reverse();
  
  // Change for selected period
  const periodFirstWeight = weightChartData[0]?.kg ?? latestWeight;
  const periodLastWeight = weightChartData[weightChartData.length - 1]?.kg ?? latestWeight;
  const periodChange = periodLastWeight - periodFirstWeight;

  // Prepare measure chart data for selected measurement
  const measureChartData = filteredMeasureRecords
    .filter(r => r[selectedMeasure as keyof MeasureRecord] !== undefined)
    .map(r => ({
      date: r.date,
      value: r[selectedMeasure as keyof MeasureRecord] as number,
      label: format(new Date(r.date), "d.M.", { locale: cs })
    }))
    .reverse();

  // Calculate total change for selected measurement
  const firstValue = measureChartData[0]?.value;
  const lastValue = measureChartData[measureChartData.length - 1]?.value;
  const totalMeasureChange = firstValue && lastValue ? lastValue - firstValue : null;

  const handleAddWeight = async () => {
    const kg = parseFloat(newWeight);
    if (isNaN(kg) || kg <= 0) return;
    
    await addWeight({ date: newWeightDate.getTime(), kg });
    setNewWeight("");
    setNewWeightDate(new Date());
    setWeightDialogOpen(false);
    toast.success("Váha zapsána");
  };

  const handleDeleteWeight = async (id: Id<"weightRecords">) => {
    await deleteWeight({ id });
    toast.success("Záznam smazán");
  };

  const handleEditWeight = (record: Doc<"weightRecords">) => {
    setEditingWeight({
      id: record._id,
      kg: record.kg.toString(),
      date: new Date(record.date)
    });
    setEditWeightDialogOpen(true);
  };

  const handleUpdateWeight = async () => {
    if (!editingWeight) return;
    const kg = parseFloat(editingWeight.kg);
    if (isNaN(kg) || kg <= 0) return;
    
    await updateWeight({ 
      id: editingWeight.id, 
      date: editingWeight.date.getTime(), 
      kg 
    });
    setEditWeightDialogOpen(false);
    setEditingWeight(null);
    toast.success("Záznam upraven");
  };

  const handleAddMeasure = async () => {
    const measures: Record<string, number | undefined> = {};
    Object.entries(newMeasures).forEach(([key, value]) => {
      const num = parseFloat(value);
      if (!isNaN(num) && num > 0) {
        measures[key] = num;
      }
    });

    if (Object.keys(measures).length === 0) return;

    await addMeasure({ date: Date.now(), ...measures });
    setNewMeasures({ neck: "", chest: "", waist: "", hips: "", thigh: "", calf: "", arm: "" });
    setMeasureDialogOpen(false);
    toast.success("Měření zapsáno");
  };

  const handleDeleteMeasure = async (id: Id<"measureRecords">) => {
    await deleteMeasure({ id });
    toast.success("Záznam smazán");
  };

  return (
    <div className="p-4 space-y-4">
      {/* View Mode Toggle */}
      <div className="flex rounded-lg bg-secondary p-1">
        <button
          onClick={() => setViewMode("weight")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            viewMode === "weight"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Scale className="w-4 h-4" />
          Váha
        </button>
        <button
          onClick={() => setViewMode("measures")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            viewMode === "measures"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Ruler className="w-4 h-4" />
          Měření těla
        </button>
      </div>

      {viewMode === "weight" ? (
        <>
          {/* Weight Stats - Row 1 */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-card border-border">
              <CardContent className="p-3 text-center">
                <Scale className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Aktuální</p>
                <p className="text-lg font-bold">{latestWeight.toFixed(1)} kg</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-3 text-center">
                <Activity className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">BMI</p>
                <p className="text-lg font-bold">{bmi.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">{bmiCategory}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-3 text-center">
                <Target className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">K cíli</p>
                <p className={`text-lg font-bold ${toGoal <= 0 ? "text-app-green" : ""}`}>
                  {toGoal > 0 ? `-${toGoal.toFixed(1)}` : toGoal === 0 ? "✓" : `+${Math.abs(toGoal).toFixed(1)}`} kg
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Weight Stats - Row 2 */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-card border-border">
              <CardContent className="p-3 text-center">
                <TrendingDown className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Celkem</p>
                <p className={`text-lg font-bold ${totalChange < 0 ? "text-app-green" : totalChange > 0 ? "text-app-red" : ""}`}>
                  {totalChange > 0 ? "+" : ""}{totalChange.toFixed(1)} kg
                </p>
                <p className={`text-[10px] ${totalChangePercent < 0 ? "text-app-green" : totalChangePercent > 0 ? "text-app-red" : "text-muted-foreground"}`}>
                  ({totalChangePercent > 0 ? "+" : ""}{totalChangePercent.toFixed(1)}%)
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Ø týden / měsíc</p>
                <p className={`text-lg font-bold ${avgPerWeek < 0 ? "text-app-green" : avgPerWeek > 0 ? "text-app-red" : ""}`}>
                  {avgPerWeek > 0 ? "+" : ""}{avgPerWeek.toFixed(1)} / {avgPerMonth > 0 ? "+" : ""}{avgPerMonth.toFixed(1)}
                </p>
                <p className="text-[10px] text-muted-foreground">kg</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Období</p>
                <p className={`text-lg font-bold ${periodChange < 0 ? "text-app-green" : periodChange > 0 ? "text-app-red" : ""}`}>
                  {periodChange > 0 ? "+" : ""}{periodChange.toFixed(1)} kg
                </p>
                <p className="text-[10px] text-muted-foreground">{timeRangeLabels[selectedRange]}</p>
              </CardContent>
            </Card>
          </div>

          {/* Weight Chart */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Scale className="w-4 h-4" />
                Váha
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Time range selector */}
              <div className="flex gap-1 overflow-x-auto pb-2 mb-2">
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

              {/* Navigation */}
              <div className="flex items-center justify-between mb-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setOffsetIndex(prev => prev + 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-medium text-muted-foreground">
                  {format(new Date(startTime), "d.M.", { locale: cs })} - {format(new Date(endTime), "d.M.", { locale: cs })}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setOffsetIndex(prev => Math.max(0, prev - 1))}
                  disabled={offsetIndex === 0}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="h-48">
                {weightChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        domain={['dataMin - 1', 'dataMax + 1']}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        width={35}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)} kg`, "Váha"]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="kg" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Zatím žádná data
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Add Weight Button */}
          <Dialog open={weightDialogOpen} onOpenChange={setWeightDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-app-gold hover:bg-app-gold/90 text-black">
                <Plus className="w-4 h-4 mr-2" />
                Přidat váhu
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Přidat váhu</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {format(newWeightDate, "d. MMMM yyyy", { locale: cs })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newWeightDate}
                        onSelect={(date) => date && setNewWeightDate(date)}
                        initialFocus
                        locale={cs}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Váha (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    placeholder="75.5"
                  />
                </div>
                <Button onClick={handleAddWeight} className="w-full">
                  Uložit
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Weight Dialog */}
          <Dialog open={editWeightDialogOpen} onOpenChange={setEditWeightDialogOpen}>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Upravit váhu</DialogTitle>
              </DialogHeader>
              {editingWeight && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Datum</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          {format(editingWeight.date, "d. MMMM yyyy", { locale: cs })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={editingWeight.date}
                          onSelect={(date) => date && setEditingWeight({ ...editingWeight, date })}
                          initialFocus
                          locale={cs}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Váha (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingWeight.kg}
                      onChange={(e) => setEditingWeight({ ...editingWeight, kg: e.target.value })}
                      placeholder="75.5"
                    />
                  </div>
                  <Button onClick={handleUpdateWeight} className="w-full">
                    Uložit změny
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Weight History */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Historie váhy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {weightRecords.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  Zatím žádné záznamy
                </p>
              ) : (
                weightRecords.slice(0, 10).map((record) => (
                  <div 
                    key={record._id} 
                    className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                  >
                    <div>
                      <p className="font-bold">{record.kg.toFixed(1)} kg</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(record.date), "d. MMMM yyyy, HH:mm", { locale: cs })}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditWeight(record)}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteWeight(record._id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Body Visualization */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Ruler className="w-4 h-4 text-primary" />
                Vizualizace těla
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <BodySilhouette 
                  current={latestMeasure} 
                  previous={previousMeasure} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Current Measurements Grid */}
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(measureLabels).map(([key, label]) => {
              const value = latestMeasure?.[key as keyof MeasureRecord] as number | undefined;
              const change = getChange(key);
              const isSelected = selectedMeasure === key;
              
              return (
                <button
                  key={key}
                  onClick={() => setSelectedMeasure(key)}
                  className={`p-2 rounded-lg border transition-all ${
                    isSelected 
                      ? "bg-primary/20 border-primary" 
                      : "bg-card border-border hover:border-primary/50"
                  }`}
                >
                  <p className="text-[10px] text-muted-foreground truncate">{label}</p>
                  <p className="text-sm font-bold">{value?.toFixed(1) ?? "-"}</p>
                  {change !== null && (
                    <p className={`text-[10px] ${change < 0 ? "text-app-green" : change > 0 ? "text-app-red" : "text-muted-foreground"}`}>
                      {change > 0 ? "+" : ""}{change.toFixed(1)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Measurement Chart */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: measureColors[selectedMeasure] }}
                />
                {measureLabels[selectedMeasure]}
                {totalMeasureChange !== null && (
                  <span className={`text-xs ${totalMeasureChange < 0 ? "text-app-green" : totalMeasureChange > 0 ? "text-app-red" : ""}`}>
                    ({totalMeasureChange > 0 ? "+" : ""}{totalMeasureChange.toFixed(1)} cm)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Time range selector */}
              <div className="flex gap-1 overflow-x-auto pb-2 mb-2">
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

              {/* Navigation */}
              <div className="flex items-center justify-between mb-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setOffsetIndex(prev => prev + 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-medium text-muted-foreground">
                  {format(new Date(startTime), "d.M.", { locale: cs })} - {format(new Date(endTime), "d.M.", { locale: cs })}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setOffsetIndex(prev => Math.max(0, prev - 1))}
                  disabled={offsetIndex === 0}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="h-48">
                {measureChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={measureChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        domain={['dataMin - 2', 'dataMax + 2']}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        width={35}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)} cm`, measureLabels[selectedMeasure]]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={measureColors[selectedMeasure]} 
                        strokeWidth={2}
                        dot={{ fill: measureColors[selectedMeasure], strokeWidth: 0, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    Zatím žádná data pro {measureLabels[selectedMeasure].toLowerCase()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Add Measurement Button */}
          <Dialog open={measureDialogOpen} onOpenChange={setMeasureDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Přidat měření
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nové měření těla (cm)</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {Object.entries(measureLabels).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newMeasures[key as keyof typeof newMeasures]}
                      onChange={(e) => setNewMeasures(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={latestMeasure?.[key as keyof MeasureRecord]?.toString() ?? "0"}
                    />
                  </div>
                ))}
                <Button onClick={handleAddMeasure} className="w-full mt-4">
                  Uložit měření
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Measurement History */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Historie měření</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {measureRecords.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-4">
                  Zatím žádná měření
                </p>
              ) : (
                measureRecords.slice(0, 10).map((record) => (
                  <div 
                    key={record._id} 
                    className="flex items-center justify-between p-3 bg-background rounded-lg border border-border"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(record.date), "d. MMMM yyyy, HH:mm", { locale: cs })}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {Object.entries(measureLabels).map(([key, label]) => {
                          const value = record[key as keyof MeasureRecord] as number | undefined;
                          if (value === undefined) return null;
                          return (
                            <span 
                              key={key} 
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ 
                                backgroundColor: `${measureColors[key]}20`,
                                color: measureColors[key]
                              }}
                            >
                              {label}: {value.toFixed(1)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteMeasure(record._id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// Body Silhouette SVG Component
interface BodySilhouetteProps {
  current?: MeasureRecord;
  previous?: MeasureRecord;
}

function BodySilhouette({ current, previous }: BodySilhouetteProps) {
  // Scale factor for visualization
  const scale = 1.5;
  
  // Default measurements if none provided
  const defaultMeasures = {
    neck: 35,
    chest: 90,
    waist: 75,
    hips: 95,
    thigh: 55,
    calf: 35,
    arm: 30,
  };

  const getMeasure = (record: MeasureRecord | undefined, key: string): number => {
    if (!record) return defaultMeasures[key as keyof typeof defaultMeasures];
    const value = record[key as keyof MeasureRecord] as number | undefined;
    return value ?? defaultMeasures[key as keyof typeof defaultMeasures];
  };

  const getChange = (key: string): { value: number; color: string } | null => {
    if (!current || !previous) return null;
    const curr = getMeasure(current, key);
    const prev = getMeasure(previous, key);
    const diff = curr - prev;
    if (Math.abs(diff) < 0.1) return null;
    return {
      value: diff,
      color: diff < 0 ? "hsl(var(--app-green))" : "hsl(var(--app-red))"
    };
  };

  // Current measurements
  const neck = getMeasure(current, "neck") * scale / 3;
  const chest = getMeasure(current, "chest") * scale / 3;
  const waist = getMeasure(current, "waist") * scale / 3;
  const hips = getMeasure(current, "hips") * scale / 3;
  const thigh = getMeasure(current, "thigh") * scale / 3;
  const calf = getMeasure(current, "calf") * scale / 3;

  // Previous measurements (ghost)
  const prevNeck = getMeasure(previous, "neck") * scale / 3;
  const prevChest = getMeasure(previous, "chest") * scale / 3;
  const prevWaist = getMeasure(previous, "waist") * scale / 3;
  const prevHips = getMeasure(previous, "hips") * scale / 3;
  const prevThigh = getMeasure(previous, "thigh") * scale / 3;
  const prevCalf = getMeasure(previous, "calf") * scale / 3;

  // Y positions
  const headY = 30;
  const neckY = 55;
  const shoulderY = 70;
  const chestY = 100;
  const waistY = 140;
  const hipY = 175;
  const thighY = 230;
  const calfY = 320;
  const ankleY = 360;

  const centerX = 150;

  return (
    <svg width="300" height="400" viewBox="0 0 300 400">
      {/* Ghost body (previous measurements) */}
      {previous && (
        <g opacity="0.3">
          {/* Ghost outline */}
          <path
            d={`
              M ${centerX} ${headY}
              Q ${centerX - 20} ${headY} ${centerX - 20} ${headY + 15}
              Q ${centerX - 20} ${headY + 30} ${centerX} ${headY + 30}
              Q ${centerX + 20} ${headY + 30} ${centerX + 20} ${headY + 15}
              Q ${centerX + 20} ${headY} ${centerX} ${headY}
              
              M ${centerX - prevNeck} ${neckY}
              L ${centerX - prevNeck} ${shoulderY - 5}
              L ${centerX - prevChest - 15} ${shoulderY}
              L ${centerX - prevChest - 25} ${chestY + 20}
              M ${centerX - prevChest - 15} ${shoulderY}
              Q ${centerX - prevChest} ${chestY} ${centerX - prevChest} ${chestY}
              Q ${centerX - prevWaist} ${waistY - 20} ${centerX - prevWaist} ${waistY}
              Q ${centerX - prevHips} ${hipY - 20} ${centerX - prevHips} ${hipY}
              L ${centerX - prevThigh - 5} ${thighY}
              L ${centerX - prevCalf - 5} ${calfY}
              L ${centerX - 10} ${ankleY}
              L ${centerX - prevCalf - 5} ${calfY}
              L ${centerX - prevThigh - 5} ${thighY}
              L ${centerX - 5} ${hipY + 10}
              L ${centerX + prevThigh + 5} ${thighY}
              L ${centerX + prevCalf + 5} ${calfY}
              L ${centerX + 10} ${ankleY}
              L ${centerX + prevCalf + 5} ${calfY}
              L ${centerX + prevThigh + 5} ${thighY}
              L ${centerX + prevHips} ${hipY}
              Q ${centerX + prevWaist} ${waistY - 20} ${centerX + prevWaist} ${waistY}
              Q ${centerX + prevChest} ${chestY} ${centerX + prevChest} ${chestY}
              L ${centerX + prevChest + 15} ${shoulderY}
              L ${centerX + prevChest + 25} ${chestY + 20}
              M ${centerX + prevChest + 15} ${shoulderY}
              L ${centerX + prevNeck} ${shoulderY - 5}
              L ${centerX + prevNeck} ${neckY}
            `}
            fill="none"
            stroke="hsl(var(--app-blue))"
            strokeWidth="2"
          />
        </g>
      )}

      {/* Current body */}
      <g>
        {/* Head */}
        <ellipse 
          cx={centerX} 
          cy={headY + 15} 
          rx="20" 
          ry="18" 
          fill="none" 
          stroke="hsl(var(--foreground))" 
          strokeWidth="2"
        />

        {/* Body outline */}
        <path
          d={`
            M ${centerX - neck} ${neckY}
            L ${centerX - neck} ${shoulderY - 5}
            L ${centerX - chest - 15} ${shoulderY}
            L ${centerX - chest - 25} ${chestY + 20}
            M ${centerX - chest - 15} ${shoulderY}
            Q ${centerX - chest} ${chestY} ${centerX - chest} ${chestY}
            Q ${centerX - waist} ${waistY - 20} ${centerX - waist} ${waistY}
            Q ${centerX - hips} ${hipY - 20} ${centerX - hips} ${hipY}
            L ${centerX - thigh - 5} ${thighY}
            L ${centerX - calf - 5} ${calfY}
            L ${centerX - 10} ${ankleY}
            L ${centerX - calf - 5} ${calfY}
            L ${centerX - thigh - 5} ${thighY}
            L ${centerX - 5} ${hipY + 10}
            L ${centerX + thigh + 5} ${thighY}
            L ${centerX + calf + 5} ${calfY}
            L ${centerX + 10} ${ankleY}
            L ${centerX + calf + 5} ${calfY}
            L ${centerX + thigh + 5} ${thighY}
            L ${centerX + hips} ${hipY}
            Q ${centerX + waist} ${waistY - 20} ${centerX + waist} ${waistY}
            Q ${centerX + chest} ${chestY} ${centerX + chest} ${chestY}
            L ${centerX + chest + 15} ${shoulderY}
            L ${centerX + chest + 25} ${chestY + 20}
            M ${centerX + chest + 15} ${shoulderY}
            L ${centerX + neck} ${shoulderY - 5}
            L ${centerX + neck} ${neckY}
          `}
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth="2.5"
        />
      </g>

      {/* Measurement indicators with change values */}
      {/* Neck */}
      <g>
        <line 
          x1={centerX - neck} y1={neckY + 5} 
          x2={centerX + neck} y2={neckY + 5} 
          stroke={getChange("neck")?.color ?? "hsl(var(--app-purple))"} 
          strokeWidth="3"
          strokeLinecap="round"
        />
        {getChange("neck") && (
          <text 
            x={centerX + neck + 8} 
            y={neckY + 8} 
            fill={getChange("neck")!.color} 
            fontSize="10" 
            fontWeight="bold"
          >
            {getChange("neck")!.value > 0 ? "+" : ""}{getChange("neck")!.value.toFixed(1)}
          </text>
        )}
      </g>

      {/* Chest */}
      <g>
        <line 
          x1={centerX - chest} y1={chestY} 
          x2={centerX + chest} y2={chestY} 
          stroke={getChange("chest")?.color ?? "hsl(var(--app-blue))"} 
          strokeWidth="3"
          strokeLinecap="round"
        />
        {getChange("chest") && (
          <text 
            x={centerX + chest + 8} 
            y={chestY + 4} 
            fill={getChange("chest")!.color} 
            fontSize="10" 
            fontWeight="bold"
          >
            {getChange("chest")!.value > 0 ? "+" : ""}{getChange("chest")!.value.toFixed(1)}
          </text>
        )}
      </g>

      {/* Waist */}
      <g>
        <line 
          x1={centerX - waist} y1={waistY} 
          x2={centerX + waist} y2={waistY} 
          stroke={getChange("waist")?.color ?? "hsl(var(--app-red))"} 
          strokeWidth="3"
          strokeLinecap="round"
        />
        {getChange("waist") && (
          <text 
            x={centerX + waist + 8} 
            y={waistY + 4} 
            fill={getChange("waist")!.color} 
            fontSize="10" 
            fontWeight="bold"
          >
            {getChange("waist")!.value > 0 ? "+" : ""}{getChange("waist")!.value.toFixed(1)}
          </text>
        )}
      </g>

      {/* Hips */}
      <g>
        <line 
          x1={centerX - hips} y1={hipY} 
          x2={centerX + hips} y2={hipY} 
          stroke={getChange("hips")?.color ?? "hsl(var(--app-orange))"} 
          strokeWidth="3"
          strokeLinecap="round"
        />
        {getChange("hips") && (
          <text 
            x={centerX + hips + 8} 
            y={hipY + 4} 
            fill={getChange("hips")!.color} 
            fontSize="10" 
            fontWeight="bold"
          >
            {getChange("hips")!.value > 0 ? "+" : ""}{getChange("hips")!.value.toFixed(1)}
          </text>
        )}
      </g>

      {/* Thigh */}
      <g>
        <line 
          x1={centerX - thigh - 5} y1={thighY + 20} 
          x2={centerX - 5} y2={thighY + 20} 
          stroke={getChange("thigh")?.color ?? "hsl(var(--app-green))"} 
          strokeWidth="3"
          strokeLinecap="round"
        />
        {getChange("thigh") && (
          <text 
            x={centerX - thigh - 30} 
            y={thighY + 24} 
            fill={getChange("thigh")!.color} 
            fontSize="10" 
            fontWeight="bold"
          >
            {getChange("thigh")!.value > 0 ? "+" : ""}{getChange("thigh")!.value.toFixed(1)}
          </text>
        )}
      </g>

      {/* Calf */}
      <g>
        <line 
          x1={centerX + 5} y1={calfY + 15} 
          x2={centerX + calf + 5} y2={calfY + 15} 
          stroke={getChange("calf")?.color ?? "hsl(var(--primary))"} 
          strokeWidth="3"
          strokeLinecap="round"
        />
        {getChange("calf") && (
          <text 
            x={centerX + calf + 12} 
            y={calfY + 19} 
            fill={getChange("calf")!.color} 
            fontSize="10" 
            fontWeight="bold"
          >
            {getChange("calf")!.value > 0 ? "+" : ""}{getChange("calf")!.value.toFixed(1)}
          </text>
        )}
      </g>

      {/* Legend */}
      {previous && (
        <g>
          <rect x="10" y="375" width="12" height="3" fill="hsl(var(--app-blue))" opacity="0.3" />
          <text x="26" y="380" fill="hsl(var(--muted-foreground))" fontSize="9">Předchozí</text>
          <rect x="85" y="375" width="12" height="3" fill="hsl(var(--foreground))" />
          <text x="101" y="380" fill="hsl(var(--muted-foreground))" fontSize="9">Aktuální</text>
        </g>
      )}
    </svg>
  );
}
