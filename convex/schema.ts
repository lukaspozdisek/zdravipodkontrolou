import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const schema = defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    surname: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Profile data
    heightCm: v.optional(v.number()),
    targetWeightKg: v.optional(v.number()),
    birthDate: v.optional(v.number()), // timestamp
    gender: v.optional(v.string()), // "male" | "female"
    goal: v.optional(v.string()), // "lose" | "maintain" | "gain"
    intensity: v.optional(v.string()), // "slow" | "normal" | "fast"
    activityLevel: v.optional(v.string()), // "none" | "light" | "medium" | "heavy"
    isUSMode: v.optional(v.boolean()),
    showPeptides: v.optional(v.boolean()),
    enabledSubstances: v.optional(v.array(v.string())), // ["tirz", "sema", "lira", "reta"]
    // Dosing schedule
    customIntervalEnabled: v.optional(v.boolean()), // user enabled custom interval (off-label)
    customIntervalAccepted: v.optional(v.boolean()), // user accepted off-label warning
    injectionIntervalDays: v.optional(v.number()), // 3-30 days between injections (only used if customIntervalEnabled)
    halfDayDosing: v.optional(v.boolean()), // half-day dosing mode
    halfDayDosingAccepted: v.optional(v.boolean()), // user accepted off-label warning
    // Onboarding
    defaultSubstanceId: v.optional(v.string()), // "tirz" | "sema" | "lira" | "reta"
    onboardingComplete: v.optional(v.boolean()),
    // Role
    role: v.optional(v.string()), // "admin" | undefined (regular user)
    // Premium
    isPremium: v.optional(v.boolean()),
    premiumUntil: v.optional(v.number()), // timestamp until premium is active
    trialActivated: v.optional(v.boolean()), // has used 60-day trial?
    premiumPermanent: v.optional(v.boolean()), // permanently activated by admin
    // Menstrual cycle (for women)
    menstrualCycleStartDate: v.optional(v.number()), // timestamp of last period start
    menstrualCycleLength: v.optional(v.number()), // cycle length in days (default 28)
  }).index("email", ["email"]),

  // Weight records
  weightRecords: defineTable({
    userId: v.id("users"),
    date: v.number(), // timestamp
    kg: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  // Injection records
  injectionRecords: defineTable({
    userId: v.id("users"),
    date: v.number(), // timestamp
    substanceId: v.string(), // "tirz" | "sema" | "lira" | "reta"
    mg: v.number(),
    site: v.optional(v.string()), // injection site
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  // Body measurement records
  measureRecords: defineTable({
    userId: v.id("users"),
    date: v.number(), // timestamp
    neck: v.optional(v.number()),
    chest: v.optional(v.number()),
    waist: v.optional(v.number()),
    hips: v.optional(v.number()),
    thigh: v.optional(v.number()),
    calf: v.optional(v.number()),
    arm: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  // Mood/journal records
  moodRecords: defineTable({
    userId: v.id("users"),
    date: v.number(), // timestamp
    rating: v.number(), // 1-5 stars
    sideEffects: v.array(v.string()),
    note: v.optional(v.string()),
    levelAtTime: v.number(), // drug level at time of entry
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  // Water intake records (daily)
  waterRecords: defineTable({
    userId: v.id("users"),
    date: v.number(), // timestamp (start of day)
    glasses: v.number(), // number of glasses/activations
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  // Protein intake records (daily)
  proteinRecords: defineTable({
    userId: v.id("users"),
    date: v.number(), // timestamp (start of day)
    totalGrams: v.number(), // total protein in grams for the day
    items: v.array(v.object({
      id: v.string(),
      name: v.string(),
      count: v.number(),
      proteinPerUnit: v.number(),
    })), // list of food items added
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  // Promo codes for premium activation
  promoCodes: defineTable({
    code: v.string(), // unique promo code
    durationMonths: v.number(), // 1, 3, or 12
    productId: v.string(), // "monthly_sub", "quarterly_sub", "yearly_sub"
    productTitle: v.string(), // human readable name
    createdBy: v.id("users"), // admin who created
    createdAt: v.number(), // timestamp
    usedBy: v.optional(v.id("users")), // user who redeemed
    usedAt: v.optional(v.number()), // when redeemed
  })
    .index("by_code", ["code"])
    .index("by_creator", ["createdBy"]),

  // Stock/inventory items
  stockItems: defineTable({
    userId: v.id("users"),
    name: v.string(),
    substanceId: v.string(),
    isVial: v.boolean(),
    totalMg: v.number(),
    currentMg: v.number(),
    // Vial config
    vialMg: v.optional(v.number()),
    vialMl: v.optional(v.number()),
    // Pen config
    penType: v.optional(v.string()),
    penColor: v.optional(v.string()),
  }).index("by_user", ["userId"]),
});

export default schema;
