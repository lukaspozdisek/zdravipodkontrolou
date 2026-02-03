// App Colors - matching Flutter AppColors
export const AppColors = {
  background: "#1C1C1E",
  card: "#2C2C2E",
  accent: "#00D4AA", // teal/cyan
  purple: "#AF52DE",
  gold: "#FFD700",
  orange: "#FF9500",
  red: "#FF3B30",
  green: "#34C759",
  blue: "#007AFF",
  gray: "#8E8E93",
} as const;

// Substance definitions
export interface Substance {
  id: string;
  name: string;
  usName: string;
  color: string;
  halfLifeHours: number;
  commonDoses: number[];
  typicalMaxDose: number;
  recommendedIntervalDays: number; // manufacturer recommended interval
}

export const substancesDB: Substance[] = [
  {
    id: "tirz",
    name: "Tirzepatide (Mounjaro)",
    usName: "Zepbound / Mounjaro",
    color: AppColors.purple,
    halfLifeHours: 120, // ~5 days
    commonDoses: [2.5, 5, 7.5, 10, 12.5, 15],
    typicalMaxDose: 15,
    recommendedIntervalDays: 7,
  },
  {
    id: "wegovy",
    name: "Wegovy",
    usName: "Wegovy",
    color: AppColors.blue,
    halfLifeHours: 168, // ~7 days
    commonDoses: [0.25, 0.5, 1, 1.7, 2.4],
    typicalMaxDose: 2.4,
    recommendedIntervalDays: 7,
  },
  {
    id: "ozempic",
    name: "Ozempic",
    usName: "Ozempic",
    color: "#C8102E", // Ozempic red
    halfLifeHours: 168, // ~7 days
    commonDoses: [0.25, 0.5, 1, 2],
    typicalMaxDose: 2,
    recommendedIntervalDays: 7,
  },
  {
    id: "saxenda",
    name: "Saxenda",
    usName: "Saxenda",
    color: AppColors.green,
    halfLifeHours: 13,
    commonDoses: [0.6, 1.2, 1.8, 2.4, 3.0],
    typicalMaxDose: 3.0,
    recommendedIntervalDays: 1, // daily
  },
  {
    id: "reta",
    name: "Retatrutide",
    usName: "Retatrutide",
    color: AppColors.orange,
    halfLifeHours: 144, // ~6 days
    commonDoses: [1, 2, 4, 8, 12],
    typicalMaxDose: 12,
    recommendedIntervalDays: 7,
  },
];

// Pen options
export interface PenOption {
  label: string;
  mg: number; // dose per injection (mg)
  totalMg: number; // total mg in the pen
  doses: number; // number of doses in the pen
  color: string;
}

export const penDatabase: Record<string, PenOption[]> = {
  tirz: [
    // Mounjaro official pen colors (Eli Lilly) - 4 doses per pen
    { label: "2.5 mg", mg: 2.5, totalMg: 10, doses: 4, color: "#6B7280" }, // Gray
    { label: "5 mg", mg: 5, totalMg: 20, doses: 4, color: "#14B8A6" },     // Teal/Cyan
    { label: "7.5 mg", mg: 7.5, totalMg: 30, doses: 4, color: "#22C55E" }, // Green
    { label: "10 mg", mg: 10, totalMg: 40, doses: 4, color: "#3B82F6" },   // Blue
    { label: "12.5 mg", mg: 12.5, totalMg: 50, doses: 4, color: "#8B5CF6" }, // Purple
    { label: "15 mg", mg: 15, totalMg: 60, doses: 4, color: "#7C3AED" },   // Dark Purple
  ],
  wegovy: [
    // Wegovy pens - 4 doses per pen (Novo Nordisk)
    { label: "0.25 mg", mg: 0.25, totalMg: 1, doses: 4, color: "#FFD100" },   // Yellow
    { label: "0.5 mg", mg: 0.5, totalMg: 2, doses: 4, color: "#C8102E" },     // Red
    { label: "1 mg", mg: 1, totalMg: 4, doses: 4, color: "#00A9E0" },         // Light Blue
    { label: "1.7 mg", mg: 1.7, totalMg: 6.8, doses: 4, color: "#003DA5" },   // Dark Blue
    { label: "2.4 mg", mg: 2.4, totalMg: 9.6, doses: 4, color: "#1D1160" },   // Navy/Purple
  ],
  ozempic: [
    // Ozempic official pen colors (Novo Nordisk) - 4 doses per pen
    { label: "0.25 mg", mg: 0.25, totalMg: 1, doses: 4, color: "#6B7280" },   // Gray
    { label: "0.5 mg", mg: 0.5, totalMg: 2, doses: 4, color: "#C8102E" },     // Red
    { label: "1 mg", mg: 1, totalMg: 4, doses: 4, color: "#22C55E" },         // Green
    { label: "2 mg", mg: 2, totalMg: 8, doses: 4, color: "#F97316" },         // Orange
  ],
  saxenda: [
    // Saxenda official color (Novo Nordisk) - variable doses based on 3ml pen
    { label: "6 mg/ml", mg: 3, totalMg: 18, doses: 6, color: "#00A651" }, // Green
  ],
  reta: [
    { label: "Generic Vial", mg: 10, totalMg: 10, doses: 1, color: AppColors.orange },
  ],
};

// Time ranges for graphs
export type TimeRange = "week" | "month" | "threeMonths" | "sixMonths" | "all";

export const timeRangeLabels: Record<TimeRange, string> = {
  week: "1T",
  month: "1M",
  threeMonths: "3M",
  sixMonths: "6M",
  all: "Vše",
};

// Enums
export type Gender = "male" | "female";
export type WeightGoal = "lose" | "maintain" | "gain";
export type WeightIntensity = "slow" | "normal" | "fast";
export type ActivityLevel = "none" | "light" | "medium" | "heavy";

// Side effects options with categories
export interface SideEffectOption {
  id: string;
  label: string;
  emoji: string;
}

export interface SideEffectCategory {
  name: string;
  effects: SideEffectOption[];
}

export const sideEffectCategories: SideEffectCategory[] = [
  {
    name: "Žaludek (Gastro)",
    effects: [
      { id: "nausea", label: "Nevolno", emoji: "🤢" },
      { id: "vomiting", label: "Zvracení", emoji: "🤮" },
      { id: "heartburn", label: "Pálení žáhy", emoji: "🔥" },
      { id: "constipation", label: "Zácpa", emoji: "💩" },
      { id: "diarrhea", label: "Průjem", emoji: "💨" },
      { id: "belching", label: "Říhání", emoji: "😤" },
      { id: "flatulence", label: "Plynatost", emoji: "💨" },
      { id: "bloating", label: "Nadýmání", emoji: "🎈" },
    ],
  },
  {
    name: "Hlava/Tělo",
    effects: [
      { id: "fatigue", label: "Únava", emoji: "⚡" },
      { id: "headache", label: "Bolest hlavy", emoji: "🤕" },
      { id: "dizziness", label: "Závrať", emoji: "😵" },
    ],
  },
  {
    name: "Místo vpichu",
    effects: [
      { id: "redness", label: "Zarudnutí", emoji: "🔴" },
      { id: "itching", label: "Svědění", emoji: "🐜" },
    ],
  },
  {
    name: "Psychika",
    effects: [
      { id: "food-noise", label: "Food Noise", emoji: "🍔" },
      { id: "appetite-loss", label: "Nechuť k jídlu", emoji: "🚫" },
    ],
  },
];

// Flat list for backwards compatibility
export const sideEffectOptions = sideEffectCategories.flatMap(cat => 
  cat.effects.map(e => `${e.emoji} ${e.label}`)
);

// Injection sites
export const injectionSites = [
  { id: "belly-left", name: "Břicho - vlevo", icon: "🤲" },
  { id: "belly-right", name: "Břicho - vpravo", icon: "🤲" },
  { id: "thigh-left", name: "Stehno - levé", icon: "🦵" },
  { id: "thigh-right", name: "Stehno - pravé", icon: "🦵" },
  { id: "arm-left", name: "Paže - levá", icon: "💪" },
  { id: "arm-right", name: "Paže - pravá", icon: "💪" },
];

// Syringe sizes
export const syringeSizes = [
  { value: 1.0, label: "1 ml (100 IU)" },
  { value: 0.5, label: "0.5 ml (50 IU)" },
  { value: 0.3, label: "0.3 ml (30 IU)" },
];

// Vial configurations
export const vialMgOptions = [2, 5, 10, 15, 20, 30];
export const vialMlOptions = [1, 2, 3, 5];

// Generic vial doses
export const genericVialDoses = [0.25, 0.5, 1.0, 1.7, 2.4, 2.5, 5.0, 7.5, 10.0, 12.5, 15.0];

// Zepbound vial doses (US)
export const zepboundDoses = [2.5, 5.0, 7.5, 10.0, 12.5, 15.0];

// Backward compatibility: map old substance IDs to new ones
// Old "sema" records are treated as "wegovy", old "lira" as "saxenda"
export function normalizeSubstanceId(id: string): string {
  if (id === "sema") return "wegovy";
  if (id === "lira") return "saxenda";
  return id;
}

// Find substance by ID with backward compatibility
export function findSubstance(id: string): Substance | undefined {
  const normalizedId = normalizeSubstanceId(id);
  return substancesDB.find(s => s.id === normalizedId);
}

// Find pens by substance ID with backward compatibility
export function findPens(id: string): PenOption[] {
  const normalizedId = normalizeSubstanceId(id);
  return penDatabase[normalizedId] ?? [];
}
