import { query, mutation } from "./_generated/server";
import { Doc } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

// Get current logged in user
export const currentLoggedInUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    return user;
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    surname: v.optional(v.string()),
    heightCm: v.optional(v.number()),
    targetWeightKg: v.optional(v.number()),
    birthDate: v.optional(v.number()),
    gender: v.optional(v.string()),
    goal: v.optional(v.string()),
    intensity: v.optional(v.string()),
    activityLevel: v.optional(v.string()),
    isUSMode: v.optional(v.boolean()),
    showPeptides: v.optional(v.boolean()),
    defaultSubstanceId: v.optional(v.string()),
    enabledSubstances: v.optional(v.array(v.string())),
    customIntervalEnabled: v.optional(v.boolean()),
    customIntervalAccepted: v.optional(v.boolean()),
    injectionIntervalDays: v.optional(v.number()),
    halfDayDosing: v.optional(v.boolean()),
    halfDayDosingAccepted: v.optional(v.boolean()),
    menstrualCycleStartDate: v.optional(v.number()),
    menstrualCycleLength: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(userId, args);
    return { success: true };
  },
});

// Complete onboarding
export const completeOnboarding = mutation({
  args: {
    defaultSubstanceId: v.string(),
    name: v.optional(v.string()),
    heightCm: v.optional(v.number()),
    targetWeightKg: v.optional(v.number()),
    birthDate: v.optional(v.number()),
    gender: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(userId, {
      defaultSubstanceId: args.defaultSubstanceId,
      enabledSubstances: [args.defaultSubstanceId], // Enable the selected substance by default
      name: args.name,
      heightCm: args.heightCm,
      targetWeightKg: args.targetWeightKg,
      birthDate: args.birthDate,
      gender: args.gender,
      onboardingComplete: true,
    });
    return { success: true };
  },
});

// Check if user has active premium
export const checkPremiumStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { isPremium: false, reason: "not_authenticated" };
    
    const user = await ctx.db.get(userId);
    if (!user) return { isPremium: false, reason: "user_not_found" };
    
    // Permanent premium (set by admin)
    if (user.premiumPermanent) {
      return { isPremium: true, reason: "permanent", until: null };
    }
    
    // Time-limited premium (trial or promo code)
    if (user.premiumUntil) {
      const now = Date.now();
      if (user.premiumUntil > now) {
        return { isPremium: true, reason: "subscription", until: user.premiumUntil };
      }
    }
    
    // Legacy isPremium check (backward compatibility)
    if (user.isPremium) {
      return { isPremium: true, reason: "legacy", until: null };
    }
    
    return { 
      isPremium: false, 
      reason: "expired",
      trialActivated: user.trialActivated || false,
    };
  },
});

// Activate 60-day trial
export const activateTrial = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    
    // Check if trial was already used
    if (user.trialActivated) {
      return { success: false, error: "Trial již byl využit" };
    }
    
    // 60 days from now
    const premiumUntil = Date.now() + (60 * 24 * 60 * 60 * 1000);
    
    await ctx.db.patch(userId, {
      trialActivated: true,
      premiumUntil,
      isPremium: true,
    });
    
    return { success: true, premiumUntil };
  },
});

// Redeem promo code
export const redeemPromoCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    // Find the promo code
    const promoCode = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
      .first();
    
    if (!promoCode) {
      return { success: false, error: "Neplatný promo kód" };
    }
    
    if (promoCode.usedBy) {
      return { success: false, error: "Tento kód již byl použit" };
    }
    
    // Calculate new premium end date
    const now = Date.now();
    const user = await ctx.db.get(userId);
    const currentEnd = user?.premiumUntil && user.premiumUntil > now ? user.premiumUntil : now;
    const durationMs = promoCode.durationMonths * 30 * 24 * 60 * 60 * 1000;
    const premiumUntil = currentEnd + durationMs;
    
    // Mark code as used
    await ctx.db.patch(promoCode._id, {
      usedBy: userId,
      usedAt: now,
    });
    
    // Update user premium
    await ctx.db.patch(userId, {
      premiumUntil,
      isPremium: true,
    });
    
    return { 
      success: true, 
      premiumUntil,
      productTitle: promoCode.productTitle,
      durationMonths: promoCode.durationMonths,
    };
  },
});
