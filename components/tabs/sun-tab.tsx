"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

import {
  sideEffectCategories,
  findSubstance,
  type Gender,
  type WeightGoal,
  type WeightIntensity,
  type ActivityLevel,
} from "@/lib/constants";
import { calculateDrugLevel } from "@/lib/pharmacokinetics";
import { calculateNutrition } from "@/lib/nutrition";
import { ScrollArea } from "@/components/ui/scroll-area";

// Master food catalog with tabs
const MASTER_CATALOG = [
  // --- ZÁLOŽKA 1: BÍLKOVINY ---
  {
    id: 'tab_protein',
    label: '🥩 Bílkoviny',
    color: '#ff00cc',
    categories: [
      {
        name: "Maso a drůbež",
        items: [
          { id: "m1", name: "Kuřecí prsa", detail: "150g (běžný plátek)", protein: 46, carbs: 0, fiber: 0, kcal: 240, icon: "🍗" },
          { id: "m2", name: "Krůtí prsa", detail: "150g (běžný plátek)", protein: 43, carbs: 0, fiber: 0, kcal: 230, icon: "🦃" },
          { id: "m3", name: "Hovězí (libové)", detail: "150g (steak)", protein: 39, carbs: 0, fiber: 0, kcal: 270, icon: "🥩" },
          { id: "m4", name: "Vepřové (libové)", detail: "150g (plátek)", protein: 33, carbs: 0, fiber: 0, kcal: 270, icon: "🐖" },
          { id: "m5", name: "Telecí maso", detail: "150g (porce)", protein: 36, carbs: 0, fiber: 0, kcal: 250, icon: "🐄" },
          { id: "m6", name: "Jehněčí", detail: "150g (porce)", protein: 37, carbs: 0, fiber: 0, kcal: 290, icon: "🍖" }
        ]
      },
      {
        name: "Ryby a moře",
        items: [
          { id: "r1", name: "Losos", detail: "150g (filet)", protein: 30, carbs: 0, fiber: 0, kcal: 350, icon: "🍣" },
          { id: "r2", name: "Tuňák", detail: "130g (celá plechovka)", protein: 30, carbs: 0, fiber: 0, kcal: 140, icon: "🥫" },
          { id: "r3", name: "Treska", detail: "150g (filet)", protein: 27, carbs: 0, fiber: 0, kcal: 130, icon: "🐟" },
          { id: "r4", name: "Sardinky", detail: "90g (malá plechovka)", protein: 22, carbs: 0, fiber: 0, kcal: 160, icon: "🐟" },
          { id: "r5", name: "Krevety", detail: "100g (cca 8-10 ks)", protein: 24, carbs: 1, fiber: 0, kcal: 100, icon: "🦐" }
        ]
      },
      {
        name: "Vejce a Mléčné",
        items: [
          { id: "vm1", name: "Vejce (celé)", detail: "1 kus (vel. L)", protein: 7, carbs: 0, fiber: 0, kcal: 75, icon: "🥚" },
          { id: "vm2", name: "Vaječný bílek", detail: "ze 3 vajec", protein: 11, carbs: 1, fiber: 0, kcal: 50, icon: "🍳" },
          { id: "vm3", name: "Tvaroh", detail: "1/2 vaničky (125g)", protein: 15, carbs: 5, fiber: 0, kcal: 140, icon: "🥣" },
          { id: "vm4", name: "Jogurt řecký", detail: "1 kelímek (140g)", protein: 14, carbs: 5, fiber: 0, kcal: 120, icon: "🥛" },
          { id: "vm5", name: "Sýr Cottage", detail: "1 kelímek (150g)", protein: 17, carbs: 5, fiber: 0, kcal: 150, icon: "🍚" },
          { id: "vm6", name: "Eidam 30%", detail: "2 plátky (40g)", protein: 10, carbs: 0, fiber: 0, kcal: 110, icon: "🧀" },
          { id: "vm7", name: "Mléko", detail: "1 hrnek (250ml)", protein: 8, carbs: 12, fiber: 0, kcal: 120, icon: "🥛" }
        ]
      },
      {
        name: "Luštěniny (Rostlinné Bílkoviny)",
        items: [
          { id: "l1", name: "Čočka", detail: "1 miska vařená (200g)", protein: 18, carbs: 40, fiber: 16, kcal: 230, icon: "🥘" },
          { id: "l2", name: "Fazole", detail: "1/2 plechovky (120g)", protein: 10, carbs: 25, fiber: 8, kcal: 120, icon: "🌯" },
          { id: "l3", name: "Cizrna", detail: "1/2 plechovky (120g)", protein: 9, carbs: 22, fiber: 7, kcal: 150, icon: "🧆" },
          { id: "l4", name: "Hrách", detail: "1 miska vařený (200g)", protein: 16, carbs: 40, fiber: 16, kcal: 160, icon: "🥣" },
          { id: "l5", name: "Tofu", detail: "1/2 balení (100g)", protein: 12, carbs: 2, fiber: 1, kcal: 130, icon: "🧊" }
        ]
      },
      {
        name: "Ořechy & Doplňky",
        items: [
          { id: "o1", name: "Mandle/Ořechy", detail: "Hrst (30g)", protein: 6, carbs: 6, fiber: 4, kcal: 175, icon: "🌰" },
          { id: "s1", name: "Protein (Whey/Vegan)", detail: "1 odměrka", protein: 24, carbs: 2, fiber: 0, kcal: 120, icon: "🥤" },
          { id: "s4", name: "Proteinová tyčinka", detail: "1 kus", protein: 20, carbs: 20, fiber: 3, kcal: 200, icon: "🍫" }
        ]
      }
    ]
  },

  // --- ZÁLOŽKA 2: ENERGIE ---
  {
    id: 'tab_energy',
    label: '⚡ Energie',
    color: '#ffcc00',
    categories: [
      {
        name: 'Zdravé Přílohy & Pečivo',
        items: [
          { id: "e1", name: "Brambory vařené", detail: "200g (klasika)", protein: 4, carbs: 35, fiber: 4, kcal: 170, icon: "🥔" },
          { id: "e2", name: "Rýže", detail: "1 kopeček (150g)", protein: 4, carbs: 45, fiber: 1, kcal: 200, icon: "🍚" },
          { id: "e5", name: "Pohanka / Quinoa", detail: "1 miska (Superpotravina)", protein: 6, carbs: 30, fiber: 5, kcal: 175, icon: "🌾" },
          { id: "e3", name: "Kváskový/Žitný chléb", detail: "1 krajíc", protein: 3, carbs: 25, fiber: 4, kcal: 130, icon: "🍞" },
          { id: "e4", name: "Ovesné vločky", detail: "Miska kaše", protein: 5, carbs: 30, fiber: 4, kcal: 220, icon: "🥣" },
          { id: "e6", name: "Těstoviny", detail: "1 porce", protein: 5, carbs: 40, fiber: 2, kcal: 200, icon: "🍝" }
        ]
      },
      {
        name: 'Běžné ovoce',
        items: [
          { id: "f1", name: "Jablko", detail: "1 kus", protein: 0, carbs: 20, fiber: 4, kcal: 70, icon: "🍎" },
          { id: "f2", name: "Hruška", detail: "1 kus", protein: 0, carbs: 22, fiber: 5, kcal: 85, icon: "🍐" },
          { id: "f3", name: "Banán", detail: "1 kus", protein: 1, carbs: 27, fiber: 3, kcal: 105, icon: "🍌" },
          { id: "f4", name: "Mandarinka / Pomeranč", detail: "1-2 kusy", protein: 1, carbs: 15, fiber: 3, kcal: 60, icon: "🍊" },
          { id: "f5", name: "Hroznové víno", detail: "Miska / Hrst", protein: 1, carbs: 18, fiber: 1, kcal: 100, icon: "🍇" },
          { id: "f6", name: "Bobule / Jahody", detail: "Miska", protein: 1, carbs: 12, fiber: 3, kcal: 50, icon: "🍓" },
          { id: "f7", name: "Švestky", detail: "2-3 kusy", protein: 0, carbs: 18, fiber: 2, kcal: 45, icon: "🫐" }
        ]
      }
    ]
  },

  // --- ZÁLOŽKA 3: ZDRAVÍ ---
  {
    id: 'tab_fiber',
    label: '🥦 Zdraví',
    color: '#00ff99',
    categories: [
      {
        name: 'Běžná Zelenina',
        items: [
          { id: "v4", name: "Rajče", detail: "1 kus / Miska cherry", protein: 1, carbs: 4, fiber: 2, kcal: 20, icon: "🍅" },
          { id: "v5", name: "Okurka", detail: "1/3 hadovky", protein: 1, carbs: 2, fiber: 1, kcal: 15, icon: "🥒" },
          { id: "v6", name: "Paprika", detail: "1 kus", protein: 1, carbs: 6, fiber: 2, kcal: 35, icon: "🫑" },
          { id: "v10", name: "Salát / Špenát", detail: "Miska listů", protein: 1, carbs: 1, fiber: 2, kcal: 15, icon: "🥗" }
        ]
      },
      {
        name: 'Kořenová & Sezónní',
        items: [
          { id: "v7", name: "Mrkev", detail: "1 větší kus / Miska", protein: 1, carbs: 8, fiber: 3, kcal: 35, icon: "🥕" },
          { id: "v12", name: "Červená řepa", detail: "Pečená / Nakládaná", protein: 2, carbs: 10, fiber: 3, kcal: 65, icon: "🍠" },
          { id: "v13", name: "Celer / Petržel", detail: "Pečená / V polévce", protein: 2, carbs: 9, fiber: 4, kcal: 40, icon: "🥣" },
          { id: "v8", name: "Ředkvičky", detail: "Svazek / Hrst", protein: 0, carbs: 2, fiber: 2, kcal: 15, icon: "🔴" },
          { id: "v9", name: "Kedlubna", detail: "1 kus (na chroupání)", protein: 2, carbs: 6, fiber: 3, kcal: 35, icon: "🥬" }
        ]
      },
      {
        name: 'Super-Vláknina (Trávení)',
        items: [
          { id: "v11", name: "Kysané zelí", detail: "Miska (Probiotika!)", protein: 1, carbs: 4, fiber: 3, kcal: 30, icon: "🥬" },
          { id: "v1", name: "Avokádo", detail: "1/2 plodu", protein: 2, carbs: 6, fiber: 7, kcal: 160, icon: "🥑" },
          { id: "v2", name: "Chia / Semínka", detail: "1 lžíce", protein: 3, carbs: 1, fiber: 5, kcal: 70, icon: "🥄" },
          { id: "v3", name: "Brokolice / Květák", detail: "Vařená porce", protein: 4, carbs: 6, fiber: 5, kcal: 45, icon: "🥦" }
        ]
      }
    ]
  }
];

interface SunTabProps {
  user: Doc<"users">;
}

const moodEmojis = [
  { value: 1, emoji: "😞", label: "Špatně", color: "from-red-500/20 to-red-600/30", border: "border-red-500/50", bg: "bg-red-500/10" },
  { value: 2, emoji: "😕", label: "Nic moc", color: "from-orange-500/20 to-orange-600/30", border: "border-orange-500/50", bg: "bg-orange-500/10" },
  { value: 3, emoji: "😐", label: "Normálně", color: "from-yellow-500/20 to-yellow-600/30", border: "border-yellow-500/50", bg: "bg-yellow-500/10" },
  { value: 4, emoji: "🙂", label: "Dobře", color: "from-lime-500/20 to-lime-600/30", border: "border-lime-500/50", bg: "bg-lime-500/10" },
  { value: 5, emoji: "😊", label: "Skvěle", color: "from-green-500/20 to-green-600/30", border: "border-green-500/50", bg: "bg-green-500/10" },
];

// ==============================================
// FREE VERZE (Šedý minimalistický widget)
// ==============================================
const SimpleStatsCircle = ({ 
  kcalCurrent, 
  daysUntilInjection, 
  onUpgrade 
}: { 
  kcalCurrent: number; 
  daysUntilInjection: number; 
  onUpgrade: () => void;
}) => {
  return (
    <div style={{
      width: 320, height: 320, borderRadius: '50%',
      border: '4px solid #333', 
      background: '#111',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
      boxShadow: '0 0 20px rgba(0,0,0,0.5)'
    }}>
      <h1 style={{fontSize: '56px', fontWeight: '300', margin: 0, color: '#ddd', fontFamily: 'sans-serif'}}>
        {kcalCurrent}<span style={{fontSize: 20, color: '#666'}}>kcal</span>
      </h1>
      <p style={{margin: '0 0 20px 0', color: '#666', fontSize: '14px', letterSpacing: '1px', fontFamily: 'sans-serif'}}>
        ENERGIE DNES
      </p>
      
      <div style={{width: '60%', height: 1, background: '#333', marginBottom: 20}}></div>
      
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'sans-serif'}}>
        <span style={{fontSize: '24px', fontWeight: 'bold', color: '#888'}}>{daysUntilInjection}</span>
        <span style={{fontSize: '12px', color: '#555', textTransform: 'uppercase'}}>Dní do injekce</span>
      </div>

      <button onClick={onUpgrade} style={{
        position: 'absolute', bottom: -50,
        background: 'linear-gradient(90deg, #d4a5a5, #a5a5d4)', 
        border: 'none', padding: '12px 24px', borderRadius: '30px',
        color: 'white', fontWeight: 'bold', cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(255,255,255,0.1)',
        fontSize: '14px', fontFamily: 'sans-serif'
      }}>
        ✨ Oživit aplikaci
      </button>
    </div>
  );
};

// ==============================================
// FREE INFO PANEL (Základní funkčnost)
// ==============================================
const SimpleInfoPanel = ({ 
  onUpgrade, 
  onAddWater,
  waterCount 
}: { 
  onUpgrade: () => void;
  onAddWater: () => void;
  waterCount: number;
}) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-[90%] max-w-[360px] mt-5 p-5 rounded-xl"
      style={{
        background: '#111',
        border: '1px solid #333',
      }}>
      {/* Zamčená sekce Insight */}
      <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: '1px solid #222' }}>
        <div>
          <h3 className="text-sm font-bold text-gray-500 m-0">DENNÍ ANALÝZA</h3>
          <p className="text-xs text-gray-600 mt-1 mb-0">Nedostupná ve Free verzi</p>
        </div>
        <div className="text-xl">🔒</div>
      </div>

      {/* Funkční tlačítka */}
      <div className="flex gap-3 mb-4">
        <button className="flex-1 py-3 px-4 rounded-md text-gray-300 font-bold cursor-pointer hover:bg-gray-700 active:scale-95 transition-all"
          style={{ background: '#333', border: '1px solid #555' }}
        >
          + Protein
        </button>
        <button 
          onClick={onAddWater}
          className="flex-1 py-3 px-4 rounded-md text-gray-300 font-bold cursor-pointer hover:bg-gray-700 active:scale-95 transition-all"
          style={{ background: '#333', border: '1px solid #555' }}
        >
          + Voda {waterCount > 0 && <span className="text-blue-400 ml-1">({waterCount})</span>}
        </button>
      </div>

      {/* Upsell text */}
      <div 
        onClick={onUpgrade} 
        className="text-center text-xs cursor-pointer underline hover:text-pink-300 transition-colors mt-3"
        style={{ color: '#d4a5a5' }}
      >
        Odemknout chytré tipy a analýzu →
      </div>
    </div>
  );
};

// ==============================================
// INFOTAINMENT KARTA PRO ŽENY - DailyInsightCard
// ==============================================
const InfotainmentStyles = () => (
  <style>{`
    @keyframes slideUpFade {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-up { animation: slideUpFade 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
    .glass-btn { transition: all 0.3s ease; }
    .glass-btn:hover { transform: translateY(-2px); filter: brightness(1.2); }
    .glass-btn:active { transform: scale(0.95); }
  `}</style>
);

const DailyInsightCard = ({ moodLevel, cyclePhaseLabel, onAddWater, waterCount, onAddProtein }: { moodLevel: number; cyclePhaseLabel: string; onAddWater: () => void; waterCount: number; onAddProtein: () => void }) => {
  // Dynamic insights based on mood and cycle phase
  const getInsights = () => {
    const insights: { emoji: string; text: string }[] = [];
    
    // Mood-based insights
    if (moodLevel >= 4) {
      insights.push({ emoji: "🌸", text: "Vzestup energie" });
    } else if (moodLevel <= 2) {
      insights.push({ emoji: "🌙", text: "Potřeba odpočinku" });
    } else {
      insights.push({ emoji: "⚖️", text: "Stabilní den" });
    }
    
    // Cycle phase insights
    const phase = cyclePhaseLabel.toLowerCase();
    if (phase.includes("ovulace")) {
      insights.push({ emoji: "✨", text: "Peak energie" });
    } else if (phase.includes("luteal") || phase.includes("luteální")) {
      insights.push({ emoji: "🍫", text: "Vyšší chuť" });
    } else if (phase.includes("menstru")) {
      insights.push({ emoji: "💆‍♀️", text: "Šetři se" });
    } else if (phase.includes("folikul")) {
      insights.push({ emoji: "🚀", text: "Rostoucí drive" });
    }
    
    insights.push({ emoji: "🥩", text: "Sleduj protein" });
    
    return insights.slice(0, 3);
  };

  const insights = getInsights();

  return (
    <>
      <InfotainmentStyles />
      <div className="animate-slide-up w-full max-w-[360px] mt-6 p-5 rounded-3xl"
        style={{
          backgroundColor: 'rgba(40, 20, 60, 0.7)',
          border: '1px solid rgba(255, 0, 255, 0.3)',
          boxShadow: '0 0 20px rgba(255, 0, 255, 0.15), inset 0 0 20px rgba(40, 10, 40, 0.5)',
          backdropFilter: 'blur(10px)',
        }}>
        <h3 className="text-white/90 text-lg font-normal mb-4">Dnes ses cítila:</h3>

        <div className="flex flex-wrap gap-x-6 gap-y-3 mb-5">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-center gap-2 text-white/80">
              <span>{insight.emoji}</span>
              <span className="text-sm">{insight.text}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-4">
          <button 
            onClick={onAddProtein}
            className="glass-btn flex-1 py-3 px-4 rounded-2xl text-white text-sm font-bold border-none cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #a020f0, #ff00ff)', boxShadow: '0 4px 15px rgba(255,0,255,0.4)' }}>
            + Jídlo
          </button>
          <button 
            onClick={onAddWater}
            className="glass-btn flex-1 py-3 px-4 rounded-2xl text-white text-sm font-bold border-none cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #0055ff, #00bbff)', boxShadow: '0 4px 15px rgba(0,150,255,0.4)' }}>
            + Voda
          </button>
        </div>

        <p className="text-xs text-center text-white/50">
          V téhle fázi je denní kolísání normální.
        </p>
      </div>
    </>
  );
};

// ==============================================
// INFOTAINMENT KARTA PRO MUŽE - MissionBriefCard
// ==============================================
const TechStyles = () => (
  <style>{`
    @keyframes techSlideUp {
      from { opacity: 0; transform: translateY(40px) scale(0.95); filter: blur(5px); }
      to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
    }
    .tech-enter { animation: techSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .tech-btn { transition: all 0.2s ease; clip-path: polygon(10% 0, 100% 0, 100% 90%, 90% 100%, 0 100%, 0 10%); }
    .tech-btn:hover { transform: translateY(-2px); filter: brightness(1.3); box-shadow: 0 0 15px rgba(0, 255, 255, 0.6); }
    .tech-btn:active { transform: scale(0.98); }
  `}</style>
);

const MissionBriefCard = ({ moodLevel, onAddWater, waterCount, onAddProtein }: { moodLevel: number; onAddWater: () => void; waterCount: number; onAddProtein: () => void }) => {
  // Dynamic status based on mood
  const getStatusInsights = () => {
    const insights: { emoji: string; label: string; value: string; color: string }[] = [];
    
    if (moodLevel >= 4) {
      insights.push({ emoji: "⚡", label: "Energie", value: "Vysoká", color: "#00ff00" });
    } else if (moodLevel <= 2) {
      insights.push({ emoji: "⚡", label: "Energie", value: "Nízká", color: "#ff5555" });
    } else {
      insights.push({ emoji: "⚡", label: "Energie", value: "Stabilní", color: "#00ffff" });
    }
    
    insights.push({ emoji: "📊", label: "Hladina", value: "V normě", color: "#ffaa00" });
    
    if (moodLevel >= 3) {
      insights.push({ emoji: "🏋️‍♂️", label: "Trénink", value: "Připraven", color: "#00ff00" });
    } else {
      insights.push({ emoji: "🏋️‍♂️", label: "Trénink", value: "Odpočinek", color: "#ffaa00" });
    }
    
    return insights;
  };

  const insights = getStatusInsights();

  return (
    <>
      <TechStyles />
      <div className="tech-enter w-full max-w-[360px] mt-6 p-6 relative"
        style={{
          backgroundColor: 'rgba(10, 20, 30, 0.8)',
          border: '2px solid rgba(0, 255, 255, 0.2)',
          boxShadow: '0 0 25px rgba(0, 255, 255, 0.1), inset 0 0 30px rgba(0, 10, 20, 0.8)',
          borderRadius: '4px',
          backdropFilter: 'blur(10px)',
        }}>
        {/* Tech corner decoration */}
        <div style={{position: 'absolute', top: -2, left: -2, width: 20, height: 20, borderTop: '2px solid #00ffff', borderLeft: '2px solid #00ffff'}} />

        <h3 className="mb-5 text-sm font-bold uppercase tracking-widest"
          style={{ color: '#00ffff' }}>
          <span className="mr-2">▌</span>Stav Systému
        </h3>

        <div className="flex flex-wrap gap-x-6 gap-y-3 mb-6">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-center gap-2 text-gray-300 text-sm">
              <span style={{ color: insight.color }}>{insight.emoji}</span>
              <span>{insight.label}:</span>
              <span style={{ color: insight.color }}>{insight.value}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-3">
          <button 
            onClick={onAddProtein}
            className="tech-btn flex-1 py-3 px-3 border-none text-sm font-bold cursor-pointer uppercase"
            style={{ background: 'linear-gradient(90deg, #00ffff, #0088ff)', color: '#0a0a12' }}>
            + Jídlo
          </button>
          <button 
            onClick={onAddWater}
            className="tech-btn flex-1 py-3 px-3 border-none text-sm font-bold cursor-pointer uppercase"
            style={{ background: 'linear-gradient(90deg, #0088ff, #0055ff)', color: '#0a0a12' }}>
            + Voda
          </button>
        </div>
        
        <p className="text-xs text-center text-white/50">
          V téhle fázi je denní kolísání normální.
        </p>
      </div>
    </>
  );
};

// ==========================================
// WIDGET PRO ŽENY (GLP1BloomWidget) - S MENSTRUAČNÍM CYKLEM A AKČNÍM REŽIMEM
// ==========================================
const GLP1BloomWidget = ({
  kcalCurrent = 0,
  kcalGoal = 1500,
  waterCurrent = 0,
  waterGoal = 8,
  daysUntilInjection = 7,
  menstrualDay = 0,
  cycleLength = 28,
  moodLevel = 4,
  showActionMode = false,
  onConfirmInjection,
}: {
  kcalCurrent?: number;
  kcalGoal?: number;
  waterCurrent?: number;
  waterGoal?: number;
  daysUntilInjection?: number;
  menstrualDay?: number;
  cycleLength?: number;
  moodLevel?: number;
  showActionMode?: boolean;
  onConfirmInjection?: () => void;
}) => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [flash, setFlash] = useState(false);

  const handleConfirm = () => {
    setFlash(true);
    setIsConfirmed(true);
    setTimeout(() => setFlash(false), 800);
    onConfirmInjection?.();
  };

  // --- LOGIKA MENSTRUAČNÍHO CYKLU ---
  // Phases are relative to cycle length: menstruation (days 1-5), follicular (6 to ovulation-1), ovulation (around day 14 for 28-day cycle), luteal (rest)
  const ovulationDay = Math.round(cycleLength / 2); // Ovulation roughly at mid-cycle
  
  const getCyclePhase = (day: number) => {
    if (day <= 0) return { color: "#666", glow: "0 0 5px #666", label: "NENASTAVENO" };
    if (day <= 5) return { color: "#ff0055", glow: "0 0 10px #ff0055", label: "MENSTRUACE" };
    if (day < ovulationDay) return { color: "#ff99cc", glow: "0 0 5px #ff99cc", label: "FOLIKULÁRNÍ" };
    if (day === ovulationDay) return { color: "#ffffff", glow: "0 0 15px #ffffff", label: "OVULACE" };
    return { color: "#a3a3ff", glow: "0 0 5px #a3a3ff", label: "LUTEÁLNÍ" };
  };

  const cyclePhase = getCyclePhase(menstrualDay);

  // --- LOGIKA INJEKCE ---
  let activeStroke = "url(#goldOrbitGradient)";
  let activeFilter = "drop-shadow(0 0 8px #FFD700) drop-shadow(0 0 15px #FFFF00)";
  let activeAnimation = "none";

  if (isConfirmed) {
    activeStroke = "#00ffaa";
    activeFilter = "drop-shadow(0 0 10px #00ffaa) drop-shadow(0 0 20px #00ffaa)";
  } else if (daysUntilInjection === 0) {
    // Červená záře celý den D
    activeStroke = "#ff0055";
    activeFilter = "drop-shadow(0 0 15px #ff0055) drop-shadow(0 0 30px #ff0000)";
    // Shake animace pouze 2h před aplikací
    activeAnimation = showActionMode ? "shake 0.5s infinite" : "none";
  } else if (daysUntilInjection === 1) {
    activeStroke = "#ffcc00";
    activeFilter = "drop-shadow(0 0 10px #ffcc00)";
    activeAnimation = "pulse-slow 2s infinite";
  }

  const getMoodTheme = (level: number) => {
    switch (level) {
      case 1: return { core: "#a3a3ff", glow: "rgba(120, 120, 255, 0.6)", label: "ODPOČÍVEJ", bg: "rgba(40, 30, 60, 1)" };
      case 2: return { core: "#4da6ff", glow: "rgba(0, 150, 255, 0.6)", label: "KLIDNĚJI", bg: "rgba(10, 40, 80, 1)" };
      case 3: return { core: "#ffffff", glow: "rgba(255, 255, 255, 0.7)", label: "ROVNOVÁHA", bg: "rgba(50, 40, 60, 1)" };
      case 4: return { core: "#ff00dd", glow: "rgba(255, 0, 220, 0.7)", label: "ROZKVÉTÁŠ", bg: "rgba(60, 0, 40, 1)" };
      case 5: return { core: "#00ffe0", glow: "rgba(0, 255, 220, 0.8)", label: "ZÁŘÍŠ", bg: "rgba(0, 50, 50, 1)" };
      default: return { core: "#ff00dd", glow: "rgba(255, 0, 220, 0.6)", label: "STATUS", bg: "#000" };
    }
  };

  const theme = getMoodTheme(moodLevel);
  const size = 320;
  const center = size / 2;

  // GEOMETRIE
  const radiusProtein = 65;
  const circProtein = 2 * Math.PI * radiusProtein;
  const kcalPct = Math.min(100, Math.max(0, (kcalCurrent / kcalGoal) * 100));

  // 1. Injekční Orbita
  const radiusOrbit = 135;
  const orbitAngle = ((7 - daysUntilInjection) / 7) * 360 - 90;
  const syringeX = center + radiusOrbit * Math.cos((orbitAngle * Math.PI) / 180);
  const syringeY = center + radiusOrbit * Math.sin((orbitAngle * Math.PI) / 180);

  // 2. Menstruační Prstenec
  const radiusCycle = 110;
  const cycleAngle = (menstrualDay / cycleLength) * 360 - 90;
  const moonX = center + radiusCycle * Math.cos((cycleAngle * Math.PI) / 180);
  const moonY = center + radiusCycle * Math.sin((cycleAngle * Math.PI) / 180);

  const renderPetals = () => {
    const petals: React.ReactNode[] = [];
    const count = waterGoal;
    const step = 360 / count;
    const activePetals = Math.floor((waterCurrent / waterGoal) * count);

    for (let i = 0; i < count; i++) {
      const active = i < activePetals;
      const rotation = i * step;
      const fill = active ? "url(#bloomWaterGradient)" : "rgba(0,0,0,0.2)";
      const stroke = active ? "#FFFFFF" : "rgba(255,255,255,0.1)";
      const filter = active ? "drop-shadow(0 0 5px #00ffff) drop-shadow(0 0 15px #00ffff)" : "none";

      petals.push(
        <g key={i} transform={`rotate(${rotation} ${center} ${center})`}>
          <path d={`M${center},${center - 75} Q${center + 15},${center - 100} ${center},${center - 120} Q${center - 15},${center - 100} ${center},${center - 75}`}
            fill={fill} stroke={stroke} strokeWidth={active ? 2 : 0.5} style={{ transition: "all 0.3s ease", filter: filter }} />
          <circle cx={center} cy={center - 105} r={active ? 2 : 1} fill="white" filter="blur(1px)" opacity={active ? 1.0 : 0.3} />
        </g>
      );
    }
    return petals;
  };

  return (
    <div style={{
      width: size, height: size, position: "relative",
      display: "flex", justifyContent: "center", alignItems: "center",
      background: `radial-gradient(circle, ${theme.bg} 0%, #000000 80%)`,
      borderRadius: "50%",
      boxShadow: daysUntilInjection === 0 && !isConfirmed ? "0 0 60px rgba(255,0,80,0.6)" : `0 0 80px ${theme.glow}`,
      transition: "all 1s ease",
      animation: activeAnimation,
    }}>
      <style>{`
        @keyframes pulse-slow { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
        @keyframes shake { 0% { transform: translate(1px, 1px) rotate(0deg); } 10% { transform: translate(-1px, -2px) rotate(-1deg); } 20% { transform: translate(-3px, 0px) rotate(1deg); } 30% { transform: translate(3px, 2px) rotate(0deg); } 40% { transform: translate(1px, -1px) rotate(1deg); } 50% { transform: translate(-1px, 2px) rotate(-1deg); } 60% { transform: translate(-3px, 1px) rotate(0deg); } 70% { transform: translate(3px, 1px) rotate(-1deg); } 80% { transform: translate(-1px, -1px) rotate(1deg); } 90% { transform: translate(1px, 2px) rotate(0deg); } 100% { transform: translate(1px, -2px) rotate(-1deg); } }
        @keyframes fade-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes pulse-fast { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
      `}</style>

      {flash && (
        <div style={{
          position: "absolute", width: "100%", height: "100%", borderRadius: "50%",
          background: "white", zIndex: 100, animation: "fade-out 0.8s forwards", pointerEvents: "none",
        }} />
      )}

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="bloomCoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.core} /><stop offset="100%" stopColor="#ffffff" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="bloomWaterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" /><stop offset="40%" stopColor="#ccffff" /><stop offset="100%" stopColor="#00ffff" />
          </linearGradient>
          <linearGradient id="goldOrbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" /><stop offset="50%" stopColor="#FFF700" /><stop offset="100%" stopColor="#FFD700" />
          </linearGradient>
          <filter id="moodBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="20" result="coloredBlur"/></filter>
          <filter id="bloomGlow"><feGaussianBlur stdDeviation="4" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>

        {[...Array(15)].map((_, i) => (
          <circle key={i} cx={Math.random() * size} cy={Math.random() * size} r={Math.random() * 1.8} fill="white" opacity={0.7}>
            <animate attributeName="opacity" values="0.3;1;0.3" dur={`${2 + i}s`} repeatCount="indefinite" />
          </circle>
        ))}

        {/* --- 1. INJEKČNÍ ORBITA (Vnější) --- */}
        <circle cx={center} cy={center} r={radiusOrbit} fill="none" stroke="#FFD700" strokeWidth="1" opacity={0.15} />

        <path
          d={isConfirmed
            ? `M${center},${center - radiusOrbit} A${radiusOrbit},${radiusOrbit} 0 1,1 ${center - 0.1},${center - radiusOrbit}`
            : `M${center},${center - radiusOrbit} A${radiusOrbit},${radiusOrbit} 0 ${daysUntilInjection < 3.5 ? 1 : 0},1 ${syringeX},${syringeY}`
          }
          fill="none"
          stroke={activeStroke}
          strokeWidth="4"
          strokeLinecap="round"
          style={{ filter: activeFilter, transition: "all 0.5s ease" }}
        />

        {!isConfirmed && (
          <g transform={`translate(${syringeX}, ${syringeY}) rotate(${orbitAngle + 90})`}>
            <path d="M-3,-6 L3,-6 L3,6 L-3,6 Z M0,6 L0,10 M-5,-2 L5,-2" stroke="#FFF700" strokeWidth="2" fill="none" filter="drop-shadow(0 0 2px black)" />
            <text y="-8" x="0" textAnchor="middle" fill="#FFF700" fontSize="18" fontWeight="bold" fontFamily="sans-serif"
              style={{textShadow: "0 0 10px #FFD700, 0 0 20px #FFFF00"}}>
              {daysUntilInjection}
            </text>
          </g>
        )}

        {/* --- 2. MENSTRUAČNÍ PRSTENEC (DRÁHA) --- */}
        {menstrualDay > 0 && (
          <circle cx={center} cy={center} r={radiusCycle} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="2,4" />
        )}

        {/* --- 3. VODA A PROTEIN (Vnitřní vrstvy) --- */}
        <circle cx={center} cy={center} r={95} fill="none" stroke={theme.core} strokeWidth="30" opacity={0.4} filter="url(#moodBlur)" style={{ transition: "stroke 1s ease" }} />

        {renderPetals()}

        <circle cx={center} cy={center} r={radiusProtein} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
        <circle cx={center} cy={center} r={radiusProtein} fill="url(#bloomCoreGradient)" opacity={kcalCurrent > 0 ? 0.3 : 0.15}>
          {kcalCurrent === 0 && <animate attributeName="opacity" values="0.1;0.3;0.1" dur="3s" repeatCount="indefinite" />}
        </circle>

        {kcalCurrent > 0 && (
          <circle cx={center} cy={center} r={radiusProtein} fill="none" stroke="url(#bloomCoreGradient)" strokeWidth="6"
            strokeDasharray={circProtein} strokeDashoffset={circProtein - (kcalPct / 100) * circProtein} strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            style={{ filter: "url(#bloomGlow)", transition: "stroke 1s ease, stroke-dashoffset 1s ease" }} />
        )}

        {/* --- 4. INDIKÁTOR MENSTRUAČNÍHO CYKLU (NEJVYŠŠÍ VRSTVA) --- */}
        {menstrualDay > 0 && (
          <g transform={`translate(${moonX}, ${moonY})`}>
            <circle cx="0" cy="0" r="14" fill={cyclePhase.color} opacity={0.4} style={{ filter: "blur(5px)", transition: "fill 1s ease" }} />
            <circle cx="0" cy="0" r="7" fill={cyclePhase.color} stroke="white" strokeWidth="1.5"
              style={{ filter: `drop-shadow(0 0 5px ${cyclePhase.color})`, transition: "all 1s ease" }} />
            <circle cx="0" cy="0" r="3" fill="white" />
          </g>
        )}
      </svg>

      <div style={{ position: "absolute", textAlign: "center", color: "white", fontFamily: "sans-serif", zIndex: 10 }}>
        {daysUntilInjection > 0 || isConfirmed || !showActionMode ? (
          <>
            <div style={{ fontSize: "42px", fontWeight: "300", textShadow: `0 0 10px ${theme.core}50` }}>
              {kcalCurrent}<span style={{ fontSize: "16px", opacity: 0.7, marginLeft: "2px" }}>kcal</span>
            </div>
            <div style={{ height: "1px", width: "40px", opacity: 0.3, margin: "2px auto 6px auto", background: "rgba(255,255,255,0.3)" }}></div>

            <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
              <div style={{
                fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase",
                color: isConfirmed ? "#00ffaa" : daysUntilInjection === 0 ? "#ff0055" : daysUntilInjection === 1 ? "#ffcc00" : "#fff",
                textShadow: isConfirmed ? "0 0 5px #00ffaa" : daysUntilInjection === 0 ? "0 0 5px #ff0055" : "none",
              }}>
                {isConfirmed ? "POTVRZENO" : daysUntilInjection === 0 ? "DEN APLIKACE" : daysUntilInjection === 1 ? "ZÍTRA" : theme.label}
              </div>
              {menstrualDay > 0 && (
                <div style={{ fontSize: "9px", color: cyclePhase.color, opacity: 0.8, marginTop: "2px" }}>
                  {menstrualDay}. DEN ({cyclePhase.label})
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ animation: "pulse-fast 2s infinite" }}>
            <div style={{
              fontSize: "14px", color: "#ff0055", fontWeight: "bold",
              textShadow: "0 0 10px #ff0055", marginBottom: "8px", letterSpacing: "1px",
            }}>
              APLIKOVAT
            </div>
            <button
              onClick={handleConfirm}
              style={{
                background: "linear-gradient(45deg, #ff0055, #ff5500)",
                border: "2px solid white", borderRadius: "30px",
                padding: "12px 24px", color: "white", fontWeight: "bold", fontSize: "14px",
                boxShadow: "0 0 20px rgba(255,0,85,0.8)", cursor: "pointer", textTransform: "uppercase",
              }}
            >
              Potvrdit
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// WIDGET PRO MUŽE (GLP1CoreWidget) - TITANIUM ACTION MODE
// ==========================================
const GLP1CoreWidget = ({
  kcalCurrent = 0,
  kcalGoal = 1500,
  waterCurrent = 0,
  waterGoal = 8,
  daysUntilInjection = 7, 
  moodLevel = 5,
  showActionMode = false,
  onConfirmInjection,
}: {
  kcalCurrent?: number;
  kcalGoal?: number;
  waterCurrent?: number;
  waterGoal?: number;
  daysUntilInjection?: number;
  moodLevel?: number;
  showActionMode?: boolean;
  onConfirmInjection?: () => void;
}) => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [flash, setFlash] = useState(false);

  const handleConfirm = () => {
    setFlash(true);
    setIsConfirmed(true);
    setTimeout(() => setFlash(false), 600);
    onConfirmInjection?.();
  };

  // --- LOGIKA "DEFCON" STAVŮ ---
  let orbitColor = "#00bfff"; // Default Blue (Nominal)
  let orbitGlow = "drop-shadow(0 0 5px #00bfff) drop-shadow(0 0 10px #00bfff)";
  let activeAnimation = "none";
  let statusLabel = `INJ: T-${daysUntilInjection}D`;

  // 1. STAV: UZAMČENO (System Secured)
  if (isConfirmed) {
    orbitColor = "#00ff00"; // Neon Green
    orbitGlow = "drop-shadow(0 0 8px #00ff00) drop-shadow(0 0 20px #00ff00)";
    statusLabel = "DOSE CONFIRMED";
  }
  // 2. STAV: DEN D (Critical / Deploy)
  else if (daysUntilInjection === 0) {
    orbitColor = "#ff0000"; // Red Alert
    orbitGlow = "drop-shadow(0 0 10px #ff0000) drop-shadow(0 0 30px #ff0000)";
    // Pulse animace pouze 2h před aplikací
    activeAnimation = showActionMode ? "pulse-fast 1s infinite" : "none";
    statusLabel = showActionMode ? "DEPLOY REQUIRED" : "INJECTION DAY";
  }
  // 3. STAV: 24H PŘED (Alert)
  else if (daysUntilInjection === 1) {
    orbitColor = "#ff4500"; // Orange
    orbitGlow = "drop-shadow(0 0 8px #ff4500)";
    activeAnimation = "pulse-slow 3s infinite";
    statusLabel = "T-MINUS 24H";
  }
  // 4. STAV: 48H PŘED (Warning)
  else if (daysUntilInjection === 2) {
    orbitColor = "#ffcc00"; // Amber
    orbitGlow = "drop-shadow(0 0 5px #ffcc00)";
    statusLabel = "T-MINUS 48H";
  }
  
  const getStatusTheme = (level: number) => {
    switch (level) {
      case 1: return { color: "#ff0000", glow: "rgba(255, 0, 0, 0.6)", label: "CRITICAL" };
      case 2: return { color: "#ff4500", glow: "rgba(255, 69, 0, 0.5)", label: "WARNING" };
      case 3: return { color: "#ffcc00", glow: "rgba(255, 204, 0, 0.4)", label: "STANDBY" };
      case 4: return { color: "#00bfff", glow: "rgba(0, 191, 255, 0.4)", label: "NOMINAL" };
      case 5: return { color: "#00ff00", glow: "rgba(0, 255, 0, 0.5)", label: "OPTIMAL" };
      default: return { color: "#00bfff", glow: "rgba(0, 191, 255, 0.4)", label: "SYSTEM" };
    }
  };

  const theme = getStatusTheme(moodLevel);
  const displayColor = isConfirmed ? "#00ff00" : theme.color; 

  const size = 320;
  const center = size / 2;
  const radiusProteinOuter = 80;
  const radiusProteinInner = 65;
  const circProteinInner = 2 * Math.PI * radiusProteinInner;
  const kcalPct = Math.min(100, Math.max(0, (kcalCurrent / kcalGoal) * 100));
  const dashProtein = circProteinInner - (kcalPct / 100) * circProteinInner;

  const radiusOrbit = 140;
  const orbitAngle = ((7 - daysUntilInjection) / 7) * 360 - 90;
  const syringeX = center + radiusOrbit * Math.cos((orbitAngle * Math.PI) / 180);
  const syringeY = center + radiusOrbit * Math.sin((orbitAngle * Math.PI) / 180);

  const renderCells = () => {
    const cells: React.ReactNode[] = [];
    const count = waterGoal;
    const step = 360 / count;
    const activeCells = Math.floor((waterCurrent / waterGoal) * count);

    for (let i = 0; i < count; i++) {
      const active = i < activeCells;
      const rotation = i * step;
      cells.push(
        <g key={i} transform={`rotate(${rotation} ${center} ${center})`}>
          <rect x={center - 6} y={center - 115} width="12" height="20" rx="2"
            fill={active ? "url(#coreWaterGradient)" : "#1a1a2e"} 
            stroke={active ? "#fff" : "#333"} strokeWidth={active ? 1 : 0.5}
            style={{ transition: "all 0.3s ease", filter: active ? "drop-shadow(0 0 5px #00BFFF)" : "none" }} />
        </g>
      );
    }
    return cells;
  };

  return (
    <div style={{
      width: size, height: size, position: "relative",
      display: "flex", justifyContent: "center", alignItems: "center",
      background: `radial-gradient(circle, ${theme.glow} 0%, rgba(10,10,15,1) 70%)`,
      borderRadius: "50%",
      boxShadow: daysUntilInjection === 0 && !isConfirmed
        ? `0 0 50px rgba(255,0,0,0.5), inset 0 0 30px rgba(255,0,0,0.3)`
        : `0 0 50px ${theme.glow}, inset 0 0 20px rgba(0,0,0,0.9)`,
      border: "2px solid #333",
      transition: "all 0.5s ease",
    }}>
      <style>{`
        @keyframes pulse-slow { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        @keyframes pulse-fast { 0% { opacity: 0.8; } 50% { opacity: 1; } 100% { opacity: 0.8; } }
        @keyframes tech-flash { 0% { background: white; opacity: 1; } 100% { background: transparent; opacity: 0; } }
      `}</style>

      {flash && (
        <div style={{
          position: "absolute", width: "100%", height: "100%", borderRadius: "50%",
          background: "white", zIndex: 100, animation: "tech-flash 0.6s forwards", pointerEvents: "none",
        }} />
      )}

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="coreStatusGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={displayColor} /><stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
          <linearGradient id="coreWaterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#87CEFA" /><stop offset="100%" stopColor="#00BFFF" />
          </linearGradient>
          <pattern id="coreGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(100,100,100,0.1)" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width={size} height={size} fill="url(#coreGrid)" opacity={0.3} />

        {/* --- ORBITA (Inteligentní) --- */}
        <circle cx={center} cy={center} r={radiusOrbit} fill="none" stroke={orbitColor} strokeWidth="1" opacity={0.2} strokeDasharray="5,5" />
        
        <path
          d={isConfirmed
            ? `M${center},${center - radiusOrbit} A${radiusOrbit},${radiusOrbit} 0 1,1 ${center - 0.1},${center - radiusOrbit}`
            : `M${center},${center - radiusOrbit} A${radiusOrbit},${radiusOrbit} 0 ${daysUntilInjection < 3.5 ? 1 : 0},1 ${syringeX},${syringeY}`
          }
          fill="none"
          stroke={orbitColor}
          strokeWidth={isConfirmed ? 4 : 5}
          style={{ filter: orbitGlow, transition: "all 0.5s ease", animation: activeAnimation }}
        />
        
        {!isConfirmed && (
          <g transform={`translate(${syringeX}, ${syringeY}) rotate(${orbitAngle + 90})`}>
            <path d="M-4,-8 L4,-8 L4,8 L-4,8 Z M0,8 L0,12 M-6,-4 L6,-4" stroke={orbitColor} strokeWidth="2" fill="none" />
            <text y="-8" x="0" textAnchor="middle" fill={orbitColor} fontSize="20" fontFamily="monospace" fontWeight="bold" 
              style={{textShadow: `0 0 10px ${orbitColor}`}}>
              {daysUntilInjection}
            </text>
          </g>
        )}

        {renderCells()}

        <circle cx={center} cy={center} r={radiusProteinOuter} fill="none" stroke="#333" strokeWidth="4" strokeDasharray="10, 5" opacity={0.8} />
        <circle cx={center} cy={center} r={radiusProteinOuter} fill="none" stroke={displayColor} strokeWidth="1" strokeDasharray="10, 30" opacity={0.6} transform={`rotate(-90 ${center} ${center})`}>
             <animateTransform attributeName="transform" type="rotate" from={`0 ${center} ${center}`} to={`360 ${center} ${center}`} dur="10s" repeatCount="indefinite"/>
        </circle>

        <circle cx={center} cy={center} r={radiusProteinInner} fill="none" stroke="#111" strokeWidth="10" />
        {kcalCurrent > 0 && (
          <circle cx={center} cy={center} r={radiusProteinInner} fill="none" stroke="url(#coreStatusGradient)" strokeWidth="10"
            strokeDasharray={circProteinInner} strokeDashoffset={dashProtein} transform={`rotate(-90 ${center} ${center})`}
            style={{ filter: `drop-shadow(0 0 5px ${displayColor})`, transition: "stroke-dashoffset 1s ease" }} />
        )}
        <circle cx={center} cy={center} r={radiusProteinInner - 10} fill="rgba(0,0,0,0.8)" stroke="#333" strokeWidth="1" />
      </svg>

      <div style={{ position: "absolute", textAlign: "center", color: "white", fontFamily: "'Courier New', monospace", textShadow: `0 0 10px ${displayColor}`, zIndex: 10 }}>
        {(daysUntilInjection > 0 || isConfirmed || !showActionMode) ? (
          <>
            <div style={{ fontSize: "36px", fontWeight: "bold", letterSpacing: "-2px", color: kcalCurrent===0 ? "#aaa" : "white" }}>
              {kcalCurrent}<span style={{fontSize: "16px", color: "#aaa"}}>kcal</span>
            </div>
            <div style={{ fontSize: "14px", color: displayColor, fontWeight: "bold", marginTop: "4px" }}>
              {Math.round(kcalPct)}%
            </div>
            <div style={{ 
              fontSize: "10px", letterSpacing: "2px", color: isConfirmed ? "#00ff00" : displayColor, 
              marginTop: "5px", border: `1px solid ${isConfirmed ? "#00ff00" : displayColor}`, 
              padding: "2px 6px", background: "rgba(0,0,0,0.6)" 
            }}>
              {statusLabel}
            </div>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ 
              fontSize: "12px", color: "#ff0000", fontWeight: "bold", letterSpacing: "2px", marginBottom: "8px",
              animation: "pulse-fast 0.5s infinite"
            }}>
              AWAITING INPUT
            </div>
            
            <button 
              onClick={handleConfirm}
              style={{
                background: "rgba(0,0,0,0.8)",
                border: "2px solid #ff0000",
                color: "#ff0000",
                fontFamily: "'Courier New', monospace",
                fontSize: "16px",
                fontWeight: "bold",
                padding: "10px 20px",
                letterSpacing: "1px",
                cursor: "pointer",
                boxShadow: "0 0 15px rgba(255,0,0,0.6), inset 0 0 10px rgba(255,0,0,0.3)",
                textTransform: "uppercase",
                clipPath: "polygon(10% 0, 100% 0, 100% 90%, 90% 100%, 0 100%, 0 10%)",
              }}
              onMouseOver={(e) => { 
                (e.target as HTMLButtonElement).style.background = "#ff0000"; 
                (e.target as HTMLButtonElement).style.color = "black"; 
              }}
              onMouseOut={(e) => { 
                (e.target as HTMLButtonElement).style.background = "rgba(0,0,0,0.8)"; 
                (e.target as HTMLButtonElement).style.color = "#ff0000"; 
              }}
            >
              INITIALIZE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export function SunTab({ user }: SunTabProps) {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [notificationDismissed, setNotificationDismissed] = useState(false);
  const [proteinDialogOpen, setProteinDialogOpen] = useState(false);
  const [proteinSelections, setProteinSelections] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState(MASTER_CATALOG[0].id);
  const [activeCategory, setActiveCategory] = useState(MASTER_CATALOG[0].categories[0].name);
  
  const addMood = useMutation(api.records.addMoodRecord);
  const addWaterGlass = useMutation(api.records.addWaterGlass);
  const addProtein = useMutation(api.records.addProtein);
  const todayProtein = useQuery(api.records.getTodayProteinRecord);
  
  const isPremium = user.isPremium ?? false;
  const injectionRecords = useQuery(api.records.getInjectionRecords) ?? [];
  const weightRecords = useQuery(api.records.getWeightRecords) ?? [];
  const todayMood = useQuery(api.records.getTodayMoodRecord);
  const todayWater = useQuery(api.records.getTodayWaterRecord);
  
  // Calculate water goal based on weight: 35ml per kg, rounded to 250ml glasses
  const latestWeight = weightRecords[0]?.kg ?? 70; // default 70kg if no weight recorded
  const waterGoal = Math.round((latestWeight * 35) / 250);
  
  // Calculate nutrition targets from user profile
  const gender: Gender = user.gender === "female" ? "female" : "male";
  const goal: WeightGoal = user.goal === "gain" ? "gain" : user.goal === "maintain" ? "maintain" : "lose";
  const intensity: WeightIntensity = user.intensity === "slow" ? "slow" : user.intensity === "fast" ? "fast" : "normal";
  const activityLevel: ActivityLevel =
    user.activityLevel === "none"
      ? "none"
      : user.activityLevel === "light"
        ? "light"
        : user.activityLevel === "heavy"
          ? "heavy"
          : "medium";

  const age = user.birthDate
    ? Math.max(0, Math.floor((Date.now() - user.birthDate) / (1000 * 60 * 60 * 24 * 365.25)))
    : 30;

  const nutrition = calculateNutrition({
    gender,
    heightCm: user.heightCm ?? 170,
    currentWeightKg: latestWeight,
    age,
    goal,
    intensity,
    activityLevel,
  });
  const proteinGoal = nutrition.protein;
  const kcalGoal = nutrition.target;
  
  // Calculate current drug level
  const injectionData = injectionRecords.map(r => ({
    date: r.date,
    substanceId: r.substanceId,
    mg: r.mg
  }));
  const currentLevel = calculateDrugLevel(injectionData);

  // Calculate time until next injection
  const now = Date.now();
  const lastInjection = injectionRecords[0];
  const lastSubstance = lastInjection ? findSubstance(lastInjection.substanceId) : null;
  
  const getInjectionIntervalDays = (substanceId: string): number => {
    if (user.customIntervalEnabled && user.injectionIntervalDays) {
      return user.injectionIntervalDays;
    }
    const substance = findSubstance(substanceId);
    return substance?.recommendedIntervalDays ?? 7;
  };

  const intervalDays = lastSubstance ? getInjectionIntervalDays(lastInjection.substanceId) : 7;
  const nextInjectionDate = lastInjection ? new Date(lastInjection.date + intervalDays * 24 * 60 * 60 * 1000) : null;
  const msUntilNextInjection = nextInjectionDate ? nextInjectionDate.getTime() - now : 7 * 24 * 60 * 60 * 1000;
  const minutesUntilNextInjection = Math.max(0, Math.floor(msUntilNextInjection / (1000 * 60)));
  const daysUntilNextInjection = nextInjectionDate 
    ? Math.max(0, Math.round((nextInjectionDate.getTime() - now) / (1000 * 60 * 60 * 24)))
    : 7;
  
  // Show urgent notification when within 1 hour (unless dismissed)
  const showUrgentNotification = minutesUntilNextInjection <= 60 && minutesUntilNextInjection > 0 && !notificationDismissed;
  
  // Show action mode (button + animation) when within 2 hours of injection time
  const showActionMode = minutesUntilNextInjection <= 120 && daysUntilNextInjection === 0;

  // Calculate menstrual cycle day (for women)
  const cycleLength = user.menstrualCycleLength ?? 28;
  const menstrualDay = user.menstrualCycleStartDate 
    ? Math.floor((now - user.menstrualCycleStartDate) / (1000 * 60 * 60 * 24)) % cycleLength + 1
    : 0;

  // Get mood level (today's mood or default)
  const currentMoodValue = todayMood?.rating || selectedMood || 4;

  // Determine which widget to show based on gender
  const isFemale = user.gender === "female";

  const handleConfirmInjection = () => {
    // This will be handled by the widget's internal state
    // In a real app, you might want to add a new injection record here
    console.log("Injection confirmed from widget");
  };

  const handleAddWater = async () => {
    try {
      const newCount = await addWaterGlass({});
      console.log("Water added, new count:", newCount);
    } catch (error) {
      console.error("Error adding water:", error);
    }
  };

  const waterCount = todayWater?.glasses ?? 0;
  const proteinCurrent = todayProtein?.totalGrams ?? 0;
  
  // Calculate kcal from stored items
  const kcalCurrent = todayProtein?.items?.reduce((total, item) => {
    const catalogItem = (() => {
      for (const tab of MASTER_CATALOG) {
        for (const cat of tab.categories) {
          const found = cat.items.find(i => i.id === item.id);
          if (found) return found;
        }
      }
      return null;
    })();
    return total + (catalogItem?.kcal ?? 0) * item.count;
  }, 0) ?? 0;

  // Protein dialog handlers
  const handleProteinTap = (itemId: string, increment: number = 1) => {
    setProteinSelections(prev => {
      const currentCount = prev[itemId] || 0;
      const newCount = Math.max(0, currentCount + increment);
      
      const newSelections = { ...prev, [itemId]: newCount };
      if (newCount === 0) delete newSelections[itemId];
      return newSelections;
    });
  };

  const findItemInCatalog = (itemId: string) => {
    for (const tab of MASTER_CATALOG) {
      for (const cat of tab.categories) {
        const found = cat.items.find(i => i.id === itemId);
        if (found) return found;
      }
    }
    return null;
  };

  const getTotalSelectedNutrition = () => {
    return Object.entries(proteinSelections).reduce(
      (totals, [id, count]) => {
        const item = findItemInCatalog(id);
        if (item) {
          totals.protein += (item.protein ?? 0) * count;
          totals.carbs += (item.carbs ?? 0) * count;
          totals.fiber += (item.fiber ?? 0) * count;
          totals.kcal += (item.kcal ?? 0) * count;
        }
        return totals;
      },
      { protein: 0, carbs: 0, fiber: 0, kcal: 0 }
    );
  };

  const getTotalSelectedProtein = () => getTotalSelectedNutrition().protein;

  const handleAddProteinConfirm = async () => {
    const totalGrams = getTotalSelectedProtein();
    if (totalGrams === 0) return;

    const items = Object.entries(proteinSelections).map(([id, count]) => {
      const item = findItemInCatalog(id);
      return {
        id,
        name: item?.name ?? "",
        count,
        proteinPerUnit: item?.protein ?? 0,
      };
    }).filter(i => i.count > 0);

    try {
      await addProtein({ items, totalGrams });
      toast.success(`+${totalGrams}g proteinu přidáno!`);
      setProteinSelections({});
      setProteinDialogOpen(false);
    } catch (error) {
      console.error("Error adding protein:", error);
      toast.error("Chyba při ukládání proteinu");
    }
  };

  const handleMoodSelect = async (value: number) => {
    setSelectedMood(value);
    
    // Good moods (3, 4, 5) - save immediately
    if (value >= 3) {
      await addMood({
        date: Date.now(),
        rating: value,
        sideEffects: [],
        levelAtTime: currentLevel,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      // Bad moods (1, 2) - show culprit selector
      setDialogOpen(true);
    }
  };

  const toggleEffect = (effect: string) => {
    setSelectedEffects(prev => 
      prev.includes(effect) 
        ? prev.filter(e => e !== effect)
        : [...prev, effect]
    );
  };

  const handleSave = async () => {
    if (!selectedMood) return;
    
    await addMood({
      date: Date.now(),
      rating: selectedMood,
      sideEffects: selectedEffects,
      levelAtTime: currentLevel,
    });
    
    setDialogOpen(false);
    setSelectedEffects([]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleQuickSave = async () => {
    if (!selectedMood) return;
    
    await addMood({
      date: Date.now(),
      rating: selectedMood,
      sideEffects: [],
      levelAtTime: currentLevel,
    });
    
    setDialogOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const greeting = getGreeting();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 relative">
      {/* Urgent Notification - 1 hour before injection */}
      {showUrgentNotification && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-gradient-to-br from-red-950/90 to-black border-2 border-red-500/50 shadow-2xl shadow-red-500/30 relative">
            <div className="text-6xl animate-bounce">💉</div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-400 mb-2">
                ČAS APLIKACE!
              </h2>
              <p className="text-white text-lg font-mono">
                {minutesUntilNextInjection < 1 
                  ? "TEĎ!" 
                  : `za ${minutesUntilNextInjection} min`}
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i} 
                  className="w-3 h-3 rounded-full bg-red-500 animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <button
              onClick={() => setNotificationDismissed(true)}
              className="mt-4 px-6 py-2 text-sm text-white/70 hover:text-white border border-white/20 hover:border-white/40 rounded-full transition-all"
            >
              Zrušit upozornění
            </button>
          </div>
        </div>
      )}

      {/* Greeting */}
      <h1 className="text-2xl font-bold text-center mb-2">
        {greeting}, {user.name?.split(" ")[0] || "člověče"}!
      </h1>
      
      <p className="text-muted-foreground text-center mb-6">
        Jak se dnes cítíš?
      </p>

      {/* GLP-1 Widget based on premium status and gender */}
      <div className="mb-6">
        {!isPremium ? (
          <SimpleStatsCircle
            kcalCurrent={0}
            daysUntilInjection={daysUntilNextInjection}
            onUpgrade={() => {
              toast.info("Pro aktivaci premium použijte promo kód v nastavení");
            }}
          />
        ) : isFemale ? (
          <GLP1BloomWidget
            kcalCurrent={kcalCurrent}
            kcalGoal={kcalGoal}
            waterCurrent={waterCount}
            waterGoal={waterGoal}
            daysUntilInjection={daysUntilNextInjection}
            menstrualDay={menstrualDay}
            cycleLength={cycleLength}
            moodLevel={currentMoodValue}
            showActionMode={showActionMode}
            onConfirmInjection={handleConfirmInjection}
          />
        ) : (
          <GLP1CoreWidget
            kcalCurrent={kcalCurrent}
            kcalGoal={kcalGoal}
            waterCurrent={waterCount}
            waterGoal={waterGoal}
            daysUntilInjection={daysUntilNextInjection}
            moodLevel={currentMoodValue}
            showActionMode={showActionMode}
            onConfirmInjection={handleConfirmInjection}
          />
        )}
      </div>

      {/* Mood selector - only for premium */}
      {isPremium && (
        <div className="flex gap-3 mb-6">
          {moodEmojis.map((mood) => (
            <button
              key={mood.value}
              onClick={() => handleMoodSelect(mood.value)}
              className={`
                relative w-14 h-14 rounded-2xl flex items-center justify-center text-3xl
                transition-all duration-300 transform
                bg-gradient-to-br ${mood.color}
                border-2 ${currentMoodValue === mood.value ? mood.border : "border-transparent"}
                ${currentMoodValue === mood.value ? "scale-125 shadow-lg" : "hover:scale-110"}
              `}
            >
              {mood.emoji}
              {currentMoodValue === mood.value && (
                <div className="absolute -bottom-6 text-xs font-medium text-muted-foreground">
                  {mood.label}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Infotainment Card - FREE: SimpleInfoPanel, Premium: DailyInsight/MissionBrief */}
      {!isPremium ? (
        <SimpleInfoPanel 
          onUpgrade={() => toast.info("Pro aktivaci premium použijte promo kód v nastavení")} 
          onAddWater={handleAddWater}
          waterCount={waterCount}
        />
      ) : isFemale ? (
        <DailyInsightCard 
          moodLevel={currentMoodValue} 
          cyclePhaseLabel={getCyclePhaseLabel(menstrualDay, cycleLength)} 
          onAddWater={handleAddWater}
          waterCount={waterCount}
          onAddProtein={() => setProteinDialogOpen(true)}
        />
      ) : (
        <MissionBriefCard 
          moodLevel={currentMoodValue} 
          onAddWater={handleAddWater}
          waterCount={waterCount}
          onAddProtein={() => setProteinDialogOpen(true)}
        />
      )}

      {/* Feedback */}
      <div className="h-8 mt-4">
        {saved && (
          <p className="text-app-green text-sm animate-in fade-in slide-in-from-bottom-2">
            ✓ Uloženo
          </p>
        )}
      </div>

      {/* Dialog for food selection */}
      <Dialog open={proteinDialogOpen} onOpenChange={setProteinDialogOpen}>
        <DialogContent className="bg-card border-border max-w-md max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Přidat jídlo</span>
              <span className="text-sm font-normal text-muted-foreground">
                Dnes: {proteinCurrent}g bílkovin
              </span>
            </DialogTitle>
          </DialogHeader>
          
          {/* Main tabs */}
          <div className="grid grid-cols-3 gap-2 pb-2">
            {MASTER_CATALOG.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setActiveCategory(tab.categories[0].name);
                }}
                className={`px-2 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "text-black"
                    : "text-muted-foreground bg-secondary hover:bg-secondary/80"
                }`}
                style={{
                  backgroundColor: activeTab === tab.id ? tab.color : undefined,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Category selector within tab */}
          {(() => {
            const currentTab = MASTER_CATALOG.find(t => t.id === activeTab);
            if (!currentTab) return null;
            return (
              <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
                {currentTab.categories.map(cat => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    className={`px-3 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${
                      activeCategory === cat.name
                        ? "bg-white/20 text-white"
                        : "text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            );
          })()}

          {/* Items grid */}
          <ScrollArea className="flex-1 -mx-4 px-4">
            <div className="grid grid-cols-2 gap-2 py-2">
              {(() => {
                const currentTab = MASTER_CATALOG.find(t => t.id === activeTab);
                const currentCategory = currentTab?.categories.find(c => c.name === activeCategory);
                const tabColor = currentTab?.color ?? "#888";
                
                return currentCategory?.items.map(item => {
                  const count = proteinSelections[item.id] || 0;
                  const isSelected = count > 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleProteinTap(item.id, 1)}
                      className={`relative p-3 rounded-xl cursor-pointer transition-all ${
                        isSelected 
                          ? "bg-white/10" 
                          : "bg-secondary hover:bg-secondary/80"
                      }`}
                      style={{
                        border: isSelected ? `2px solid ${tabColor}` : "2px solid transparent",
                      }}
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <p className="font-bold text-sm mt-1">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                      <div className="flex gap-2 mt-1 text-xs">
                        <span style={{ color: tabColor }}>
                          {item.protein}g <span className="text-muted-foreground">B</span>
                        </span>
                        {item.carbs > 0 && (
                          <span className="text-yellow-400">
                            {item.carbs}g <span className="text-muted-foreground">S</span>
                          </span>
                        )}
                        <span className="text-muted-foreground ml-auto">{item.kcal} kcal</span>
                      </div>

                      {/* Counter overlay */}
                      {isSelected && (
                        <div 
                          className="absolute right-1 top-1 bottom-1 w-10 rounded-lg flex flex-col items-center justify-between py-1"
                          style={{ backgroundColor: "rgba(0,0,0,0.8)" }}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); handleProteinTap(item.id, 1); }}
                            className="text-green-500 text-lg font-bold hover:scale-110 transition-transform"
                          >
                            +
                          </button>
                          <span className="text-white font-bold">{count}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleProteinTap(item.id, -1); }}
                            className="text-red-500 text-lg font-bold hover:scale-110 transition-transform"
                          >
                            −
                          </button>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </ScrollArea>

          {/* Footer with totals and confirm button */}
          <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
            <div>
              <p className="text-xs text-muted-foreground">CELKEM VYBRÁNO</p>
              <div className="flex gap-3 items-baseline">
                <span className="text-xl font-bold">{getTotalSelectedNutrition().protein}<span className="text-xs text-muted-foreground ml-0.5">g B</span></span>
                <span className="text-sm text-yellow-400">{getTotalSelectedNutrition().carbs}<span className="text-xs text-muted-foreground ml-0.5">g S</span></span>
                <span className="text-sm text-muted-foreground">{getTotalSelectedNutrition().kcal} kcal</span>
              </div>
            </div>
            <Button
              onClick={handleAddProteinConfirm}
              disabled={getTotalSelectedProtein() === 0}
              className="px-6"
            >
              PŘIDAT
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for quick culprit selection (bad moods only) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedMood && (
                <>
                  <span className="text-3xl">{moodEmojis.find(m => m.value === selectedMood)?.emoji}</span>
                  <span>Co za to může?</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Quick culprit selection - flat list */}
            <div className="grid grid-cols-2 gap-2">
              {sideEffectCategories.flatMap(cat => cat.effects).map((effect) => {
                const effectKey = `${effect.emoji} ${effect.label}`;
                return (
                  <button 
                    key={effect.id}
                    className={`flex items-center gap-2 p-3 rounded-xl text-left transition-all ${
                      selectedEffects.includes(effectKey)
                        ? "bg-app-red/20 border-2 border-app-red/50 scale-[1.02]"
                        : "bg-secondary hover:bg-secondary/80 border-2 border-transparent"
                    }`}
                    onClick={() => toggleEffect(effectKey)}
                  >
                    <span className="text-xl">{effect.emoji}</span>
                    <span className="text-sm">{effect.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleQuickSave} 
                variant="outline" 
                className="flex-1"
              >
                Přeskočit
              </Button>
              <Button onClick={handleSave} className="flex-1">
                Uložit {selectedEffects.length > 0 && `(${selectedEffects.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Dobré ráno";
  if (hour < 18) return "Dobré odpoledne";
  return "Dobrý večer";
}

function getCyclePhaseLabel(day: number, cycleLength: number): string {
  if (day <= 0) return "nenastaveno";
  const ovulationDay = Math.round(cycleLength / 2);
  if (day <= 5) return "menstruace";
  if (day < ovulationDay) return "folikulární";
  if (day === ovulationDay) return "ovulace";
  return "luteální";
}
