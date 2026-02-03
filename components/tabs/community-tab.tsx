"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageCircle, Heart, TrendingUp } from "lucide-react";

interface CommunityTabProps {
  user: {
    _id: string;
    name?: string;
  };
}

export function CommunityTab({ user }: CommunityTabProps) {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Komunita</h1>
      
      <Card className="bg-card/50 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Připravujeme
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Komunitní funkce jsou ve vývoji. Brzy budete moci:
          </p>
          
          <div className="grid gap-3">
            <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
              <MessageCircle className="w-5 h-5 text-blue-400" />
              <div>
                <p className="font-medium">Sdílet zkušenosti</p>
                <p className="text-sm text-muted-foreground">Diskutujte s ostatními uživateli</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
              <Heart className="w-5 h-5 text-red-400" />
              <div>
                <p className="font-medium">Podporovat ostatní</p>
                <p className="text-sm text-muted-foreground">Motivace a podpora na cestě</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <div>
                <p className="font-medium">Sledovat pokroky</p>
                <p className="text-sm text-muted-foreground">Anonymní statistiky komunity</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
