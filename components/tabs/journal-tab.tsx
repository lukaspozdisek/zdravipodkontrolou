"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Plus, Star, Trash2, FileEdit } from "lucide-react";
import { calculateDrugLevel } from "@/lib/pharmacokinetics";
import { sideEffectCategories } from "@/lib/constants";

interface JournalTabProps {
  user: Doc<"users">;
}

export function JournalTab({ user }: JournalTabProps) {
  const moodRecords = useQuery(api.records.getMoodRecords) ?? [];
  const injectionRecords = useQuery(api.records.getInjectionRecords) ?? [];
  const addMood = useMutation(api.records.addMoodRecord);
  const deleteMood = useMutation(api.records.deleteMoodRecord);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [rating, setRating] = useState(3);
  const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
  const [note, setNote] = useState("");

  // Calculate current drug level for new entries
  const injectionData = injectionRecords.map(r => ({
    date: r.date,
    substanceId: r.substanceId,
    mg: r.mg
  }));
  const currentLevel = calculateDrugLevel(injectionData);

  const handleAddMood = async () => {
    await addMood({
      date: Date.now(),
      rating,
      sideEffects: selectedEffects,
      note: note || undefined,
      levelAtTime: currentLevel,
    });

    setRating(3);
    setSelectedEffects([]);
    setNote("");
    setDialogOpen(false);
  };

  const handleDelete = async (id: Id<"moodRecords">) => {
    if (confirm("Opravdu chcete smazat tento záznam?")) {
      await deleteMood({ id });
    }
  };

  const toggleEffect = (effect: string) => {
    setSelectedEffects(prev => 
      prev.includes(effect) 
        ? prev.filter(e => e !== effect)
        : [...prev, effect]
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* Add entry button */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button className="w-full bg-app-gold hover:bg-app-gold/90 text-black">
            <FileEdit className="w-4 h-4 mr-2" />
            PŘIDAT ZÁZNAM DO DENÍKU
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nový záznam</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Rating */}
            <div className="space-y-2">
              <Label>Jak se cítíte?</Label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star 
                      className={`w-8 h-8 ${
                        star <= rating 
                          ? "fill-app-gold text-app-gold" 
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Side effects by category */}
            <div className="space-y-4">
              <Label>Vedlejší účinky</Label>
              {sideEffectCategories.map((category) => (
                <div key={category.name} className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">{category.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {category.effects.map((effect) => {
                      const effectKey = `${effect.emoji} ${effect.label}`;
                      return (
                        <div 
                          key={effect.id}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                            selectedEffects.includes(effectKey)
                              ? "bg-app-red/20 border border-app-red/50"
                              : "bg-secondary hover:bg-secondary/80"
                          }`}
                          onClick={() => toggleEffect(effectKey)}
                        >
                          <Checkbox 
                            checked={selectedEffects.includes(effectKey)}
                            className="pointer-events-none"
                          />
                          <span className="text-sm">{effect.emoji} {effect.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label>Poznámka (volitelné)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Jak se cítíte? Co jste jedli? Jak jste spali?"
                rows={3}
              />
            </div>

            {/* Current level info */}
            <div className="p-3 bg-app-purple/10 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Aktuální hladina léku</p>
              <p className="text-lg font-bold text-app-purple">{currentLevel.toFixed(2)} mg</p>
            </div>

            <Button onClick={handleAddMood} className="w-full">
              Uložit záznam
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mood history */}
      {moodRecords.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileEdit className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Deník je prázdný</p>
          <p className="text-sm">Přidejte svůj první záznam</p>
        </div>
      ) : (
        <div className="space-y-3">
          {moodRecords.map((record) => (
            <Card key={record._id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(record.date), "d. MMMM HH:mm", { locale: cs })}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-app-purple/20 text-app-purple">
                      {record.levelAtTime.toFixed(2)} mg
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleDelete(record._id)}
                    >
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </div>
                </div>

                {/* Stars */}
                <div className="flex gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star}
                      className={`w-4 h-4 ${
                        star <= record.rating 
                          ? "fill-app-gold text-app-gold" 
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>

                {/* Side effects */}
                {record.sideEffects && record.sideEffects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {record.sideEffects.map((effect) => (
                      <span 
                        key={effect}
                        className="px-2.5 py-1 rounded-full text-xs bg-app-red/20 text-app-red border border-app-red/30"
                      >
                        {effect}
                      </span>
                    ))}
                  </div>
                )}

                {/* Note */}
                {record.note && (
                  <p className="text-sm text-muted-foreground italic">
                    {record.note}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
