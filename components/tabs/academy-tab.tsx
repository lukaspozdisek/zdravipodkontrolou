"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, 
  BookOpen, 
  AlertCircle, 
  Heart, 
  ArrowLeft,
  ChevronRight 
} from "lucide-react";

interface AcademyTabProps {
  user: {
    name?: string;
    isUSMode?: boolean;
  };
}

export function AcademyTab({ user }: AcademyTabProps) {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  return (
    <div className="p-4 space-y-4">
      {selectedModule === null ? (
        // Module selection
        <div className="space-y-4">
          <div className="text-center mb-6">
            <GraduationCap className="w-12 h-12 mx-auto mb-2 text-blue-500" />
            <h2 className="text-lg font-semibold">GLP-1 Akademie</h2>
            <p className="text-sm text-muted-foreground">Vyberte vzdělávací modul</p>
          </div>

          {/* Module: Injekční Průvodce */}
          <Card 
            className="bg-card border-2 border-app-purple/30 cursor-pointer hover:border-app-purple/60 transition-all"
            onClick={() => setSelectedModule("injection-guide")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-app-purple/20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-app-purple" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-app-purple">Injekční Průvodce</h3>
                  <p className="text-sm text-muted-foreground">Kompletní návod na správnou aplikaci</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Module: SOS První Pomoc */}
          <Card 
            className="bg-card border-2 border-red-500/30 cursor-pointer hover:border-red-500/60 transition-all"
            onClick={() => setSelectedModule("sos-help")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-500">SOS: První Pomoc</h3>
                  <p className="text-sm text-muted-foreground">Co dělat při vedlejších účincích</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Module: GLP-1 Životní Styl */}
          <Card 
            className="bg-card border-2 border-emerald-500/30 cursor-pointer hover:border-emerald-500/60 transition-all"
            onClick={() => setSelectedModule("lifestyle")}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-emerald-500">GLP-1 Životní Styl</h3>
                  <p className="text-sm text-muted-foreground">Strava, cvičení a zdravé návyky</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Module content
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedModule(null)}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zpět na moduly
          </Button>

          {selectedModule === "injection-guide" && (
            <Card className="bg-card border-app-purple/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen className="w-6 h-6 text-app-purple" />
                  <h2 className="text-lg font-semibold text-app-purple">Injekční Průvodce</h2>
                </div>
                <div className="text-center py-8 text-muted-foreground">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Obsah bude brzy k dispozici</p>
                  <p className="text-sm mt-1">Pracujeme na kompletním průvodci</p>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedModule === "sos-help" && (
            <Card className="bg-card border-red-500/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  <h2 className="text-lg font-semibold text-red-500">SOS: První Pomoc</h2>
                </div>
                <div className="text-center py-8 text-muted-foreground">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Obsah bude brzy k dispozici</p>
                  <p className="text-sm mt-1">Pracujeme na průvodci první pomocí</p>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedModule === "lifestyle" && (
            <Card className="bg-card border-emerald-500/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Heart className="w-6 h-6 text-emerald-500" />
                  <h2 className="text-lg font-semibold text-emerald-500">GLP-1 Životní Styl</h2>
                </div>
                <div className="text-center py-8 text-muted-foreground">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Obsah bude brzy k dispozici</p>
                  <p className="text-sm mt-1">Pracujeme na průvodci životním stylem</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
