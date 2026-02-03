import type { Gender, WeightGoal, WeightIntensity, ActivityLevel } from "./constants";

export interface UserNutritionProfile {
  gender: Gender;
  heightCm: number;
  currentWeightKg: number;
  age: number;
  goal: WeightGoal;
  intensity: WeightIntensity;
  activityLevel: ActivityLevel;
}

/**
 * Calculate BMR using Mifflin-St Jeor equation
 */
function calculateBMR(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number
): number {
  if (gender === "male") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }
}

/**
 * Get activity multiplier for TDEE calculation
 */
function getActivityMultiplier(level: ActivityLevel): number {
  switch (level) {
    case "none":
      return 1.2;
    case "light":
      return 1.375;
    case "medium":
      return 1.55;
    case "heavy":
      return 1.725;
    default:
      return 1.2;
  }
}

/**
 * Get calorie adjustment based on goal and intensity
 */
function getCalorieAdjustment(goal: WeightGoal, intensity: WeightIntensity): number {
  if (goal === "lose") {
    switch (intensity) {
      case "slow":
        return -0.15; // -15%
      case "normal":
        return -0.20; // -20%
      case "fast":
        return -0.25; // -25%
    }
  } else if (goal === "gain") {
    switch (intensity) {
      case "slow":
        return 0.05; // +5%
      case "normal":
        return 0.10; // +10%
      case "fast":
        return 0.15; // +15%
    }
  } else {
    // maintain
    switch (intensity) {
      case "slow":
        return -0.05; // slight deficit for recomp
      case "normal":
        return 0;
      case "fast":
        return 0.05; // slight surplus for recovery
    }
  }
  return 0;
}

/**
 * Calculate daily nutrition targets
 */
export function calculateNutrition(profile: UserNutritionProfile): {
  bmr: number;
  tdee: number;
  target: number;
  protein: number;
  carbs: number;
  fat: number;
} {
  const bmr = calculateBMR(
    profile.gender,
    profile.currentWeightKg,
    profile.heightCm,
    profile.age
  );

  const tdee = bmr * getActivityMultiplier(profile.activityLevel);
  const adjustment = getCalorieAdjustment(profile.goal, profile.intensity);
  const target = Math.round(tdee * (1 + adjustment));

  // Macro split based on goal
  let proteinRatio: number;
  let fatRatio: number;

  if (profile.goal === "lose") {
    proteinRatio = 0.35; // Higher protein for muscle preservation
    fatRatio = 0.25;
  } else if (profile.goal === "gain") {
    proteinRatio = 0.25;
    fatRatio = 0.25;
  } else {
    proteinRatio = 0.30;
    fatRatio = 0.25;
  }

  const carbRatio = 1 - proteinRatio - fatRatio;

  // Calculate grams (protein/carbs = 4 cal/g, fat = 9 cal/g)
  const protein = Math.round((target * proteinRatio) / 4);
  const carbs = Math.round((target * carbRatio) / 4);
  const fat = Math.round((target * fatRatio) / 9);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    target,
    protein,
    carbs,
    fat,
  };
}

/**
 * Calculate BMI
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/**
 * Get BMI category
 */
export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return "Podváha";
  if (bmi < 25) return "Normální";
  if (bmi < 30) return "Nadváha";
  if (bmi < 35) return "Obezita I";
  if (bmi < 40) return "Obezita II";
  return "Obezita III";
}

/**
 * Get intensity label based on goal
 */
export function getIntensityLabel(goal: WeightGoal, intensity: WeightIntensity): string {
  if (goal === "lose") {
    switch (intensity) {
      case "slow":
        return "Pomalu (-15%) Velmi udržitelné";
      case "normal":
        return "Standard (-20%) Zlatý střed";
      case "fast":
        return "Rychle (-25%) Agresivní hubnutí";
    }
  } else if (goal === "gain") {
    switch (intensity) {
      case "slow":
        return "Pomalu (+5%) Lean bulk";
      case "normal":
        return "Standard (+10%) Klasický objem";
      case "fast":
        return "Rychle (+15%) Rychlé nabírání";
    }
  } else {
    switch (intensity) {
      case "slow":
        return "Pomalu (-5%) Rekompozice";
      case "normal":
        return "Standard (0%) Údržba";
      case "fast":
        return "Rychle (+5%) Regenerace";
    }
  }
}
