"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Trash2, FlaskConical, Pen, Package, Plus, Lock, Crown } from "lucide-react";
import { substancesDB } from "@/lib/constants";

interface InventoryTabProps {
  user: Doc<"users">;
  onUseFromStock: (stockId: string) => void;
}

export function InventoryTab({ user, onUseFromStock }: InventoryTabProps) {
  const stockItems = useQuery(api.records.getStockItems) ?? [];
  const addStock = useMutation(api.records.addStockItem);
  const deleteStock = useMutation(api.records.deleteStockItem);

  // Premium check - vials require premium
  const hasPremium = user.isPremium || user.premiumPermanent || (user.premiumUntil && user.premiumUntil > Date.now());
  const canUseVials = user.showPeptides && hasPremium;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStock, setNewStock] = useState({
    name: "",
    substanceId: "tirz",
    isVial: canUseVials ? true : false,
    totalMg: 10,
  });

  const handleAddStock = async () => {
    await addStock({
      name: newStock.name || `${substancesDB.find(s => s.id === newStock.substanceId)?.name} ${newStock.totalMg}mg`,
      substanceId: newStock.substanceId,
      isVial: newStock.isVial,
      totalMg: newStock.totalMg,
      currentMg: newStock.totalMg,
    });
    setNewStock({ name: "", substanceId: "tirz", isVial: canUseVials ? true : false, totalMg: 10 });
    setDialogOpen(false);
  };

  const handleDelete = async (id: Id<"stockItems">) => {
    if (confirm("Opravdu chcete smazat tuto položku?")) {
      await deleteStock({ id });
    }
  };

  const getSubstance = (id: string) => substancesDB.find(s => s.id === id);

  return (
    <div className="p-4 space-y-4">
      {/* Add stock button */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                    variant={newStock.isVial && canUseVials ? "default" : "outline"}
                    className={`flex-1 ${!hasPremium ? "opacity-50" : ""}`}
                    onClick={() => {
                      if (hasPremium) {
                        setNewStock(prev => ({ ...prev, isVial: true }));
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
                    variant={!newStock.isVial ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setNewStock(prev => ({ ...prev, isVial: false }))}
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
                value={newStock.substanceId} 
                onValueChange={(v) => setNewStock(prev => ({ ...prev, substanceId: v }))}
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
                value={newStock.totalMg}
                onChange={(e) => setNewStock(prev => ({ ...prev, totalMg: Number(e.target.value) }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Název (volitelné)</Label>
              <Input
                value={newStock.name}
                onChange={(e) => setNewStock(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Např. Mounjaro 5mg pero"
              />
            </div>

            <Button onClick={handleAddStock} className="w-full">
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
                      onClick={() => handleDelete(item._id)}
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
                    onClick={() => hasPremium && onUseFromStock(item._id)}
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
    </div>
  );
}
