import { substancesDB, findSubstance, normalizeSubstanceId } from "./constants";

export interface InjectionData {
  date: number; // timestamp
  substanceId: string;
  mg: number;
}

/**
 * Calculate drug level at a specific time based on injection history
 * Uses exponential decay based on half-life
 */
export function calculateDrugLevel(
  injections: InjectionData[],
  atTime: number = Date.now(),
  includeFuture: boolean = false
): number {
  let totalLevel = 0;

  for (const injection of injections) {
    const substance = findSubstance(injection.substanceId);
    if (!substance) continue;

    // If user is not premium, ignore injections scheduled in the future (relative to "now")
    if (!includeFuture && injection.date > Date.now()) continue;

    const hoursSinceInjection = (atTime - injection.date) / (1000 * 60 * 60);

    // Injection hasn't happened yet at this time point
    if (hoursSinceInjection < 0) continue;

    // Exponential decay: level = dose * (0.5)^(t/halfLife)
    const decayFactor = Math.pow(0.5, hoursSinceInjection / substance.halfLifeHours);
    totalLevel += injection.mg * decayFactor;
  }

  return totalLevel;
}

/**
 * Generate pharmacokinetic curve data points for charting
 */
export function generatePKCurve(
  injections: InjectionData[],
  startTime: number,
  endTime: number,
  pointsCount: number = 100
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const step = (endTime - startTime) / pointsCount;

  for (let i = 0; i <= pointsCount; i++) {
    const time = startTime + i * step;
    const level = calculateDrugLevel(injections, time);
    points.push({ x: time, y: level });
  }

  return points;
}

/**
 * Calculate drug level for a specific substance at a given time
 */
export function calculateDrugLevelBySubstance(
  injections: InjectionData[],
  substanceId: string,
  atTime: number = Date.now(),
  includeFuture: boolean = false
): number {
  let totalLevel = 0;
  const substance = findSubstance(substanceId);
  if (!substance) return 0;

  const normalizedTargetId = normalizeSubstanceId(substanceId);
  
  for (const injection of injections) {
    // Normalize both IDs for comparison (handles old "sema" records)
    if (normalizeSubstanceId(injection.substanceId) !== normalizedTargetId) continue;

    // If user is not premium, ignore injections scheduled in the future (relative to "now")
    if (!includeFuture && injection.date > Date.now()) continue;

    const hoursSinceInjection = (atTime - injection.date) / (1000 * 60 * 60);

    // Injection hasn't happened yet at this time point
    if (hoursSinceInjection < 0) continue;

    const decayFactor = Math.pow(0.5, hoursSinceInjection / substance.halfLifeHours);
    totalLevel += injection.mg * decayFactor;
  }

  return totalLevel;
}

/**
 * Generate PK curves per substance for multi-line charting
 */
export function generatePKCurvesBySubstance(
  injections: InjectionData[],
  substanceIds: string[],
  startTime: number,
  endTime: number,
  pointsCount: number = 100,
  includeFuture: boolean = false
): { time: number; label: string; isFuture?: boolean; [substanceId: string]: number | string | boolean | undefined }[] {
  const points: { time: number; label: string; isFuture?: boolean; [substanceId: string]: number | string | boolean | undefined }[] = [];
  const step = (endTime - startTime) / pointsCount;
  const now = Date.now();

  for (let i = 0; i <= pointsCount; i++) {
    const time = startTime + i * step;
    const point: { time: number; label: string; isFuture?: boolean; [substanceId: string]: number | string | boolean | undefined } = {
      time,
      label: new Date(time).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" }),
      isFuture: time > now,
    };

    for (const substanceId of substanceIds) {
      point[substanceId] = calculateDrugLevelBySubstance(injections, substanceId, time, includeFuture);
    }

    points.push(point);
  }

  return points;
}

/**
 * Get time window dates based on range and offset
 */
export function getWindowDates(
  range: "week" | "month" | "threeMonths" | "sixMonths" | "all",
  offsetIndex: number = 0
): { start: Date; end: Date } {
  const now = new Date();
  let daysBack: number;

  switch (range) {
    case "week":
      daysBack = 7;
      break;
    case "month":
      daysBack = 30;
      break;
    case "threeMonths":
      daysBack = 90;
      break;
    case "sixMonths":
      daysBack = 180;
      break;
    case "all":
      daysBack = 365 * 2; // 2 years
      break;
  }

  const end = new Date(now.getTime() - offsetIndex * daysBack * 24 * 60 * 60 * 1000);
  const start = new Date(end.getTime() - daysBack * 24 * 60 * 60 * 1000);

  return { start, end };
}

/**
 * Calculate units (IU) from mg for vial injections
 */
export function calculateUnits(
  wantMg: number,
  vialMg: number,
  vialMl: number
): number {
  // concentration = mg/ml
  // units = (wantMg / concentration) * 100
  const concentration = vialMg / vialMl;
  return (wantMg / concentration) * 100;
}

/**
 * Calculate mg from units (IU) for vial injections
 */
export function calculateMgFromUnits(
  units: number,
  vialMg: number,
  vialMl: number
): number {
  const concentration = vialMg / vialMl;
  return (units / 100) * concentration;
}

/**
 * Calculate pen clicks from mg
 * Standard: 60 clicks = full pen dose
 */
export function calculatePenClicks(wantMg: number, penTotalMg: number): number {
  return Math.round((wantMg / penTotalMg) * 60);
}

/**
 * Calculate doses per vial and remnant
 */
export function calculateVialDoses(
  vialMg: number,
  doseWantMg: number
): { doses: number; remnant: number } {
  const doses = Math.floor(vialMg / doseWantMg);
  const remnant = vialMg - doses * doseWantMg;
  return { doses, remnant };
}
