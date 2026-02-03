import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

// Subscription products
const SUBSCRIPTION_PRODUCTS = [
  {
    id: "monthly_sub",
    title: "Měsíční Start",
    durationMonths: 1,
  },
  {
    id: "quarterly_sub",
    title: "90denní Protokol",
    durationMonths: 3,
  },
  {
    id: "yearly_sub",
    title: "Roční Transformace",
    durationMonths: 12,
  },
];

// Type definitions
type UserWithStats = Doc<"users"> & {
  weightRecordsCount: number;
  injectionRecordsCount: number;
  lastActivity?: number;
};

type GetAllUsersResult =
  | { ok: true; users: UserWithStats[] }
  | { ok: false; code: "FORBIDDEN"; message: string };

type GetUserDataResult =
  | {
      ok: true;
      user: Doc<"users">;
      weightRecords: Doc<"weightRecords">[];
      injectionRecords: Doc<"injectionRecords">[];
      measureRecords: Doc<"measureRecords">[];
      moodRecords: Doc<"moodRecords">[];
      stockItems: Doc<"stockItems">[];
    }
  | { ok: false; code: "FORBIDDEN" | "NOT_FOUND"; message: string };

// Get all users with basic stats
export const getAllUsers = query({
  args: {},
  handler: async (ctx): Promise<GetAllUsersResult> => {
    const isUserAdmin: boolean = await ctx.runQuery(api.authz.isAdmin, {});

    if (!isUserAdmin) {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "Přístup odepřen. Musíte být administrátor.",
      };
    }

    const users = await ctx.db.query("users").collect();

    // Get counts for each user
    const usersWithStats: UserWithStats[] = await Promise.all(
      users.map(async (user) => {
        const weightRecords = await ctx.db
          .query("weightRecords")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        const injectionRecords = await ctx.db
          .query("injectionRecords")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();

        // Get last activity (most recent record date)
        const allDates = [
          ...weightRecords.map((r) => r.date),
          ...injectionRecords.map((r) => r.date),
        ];
        const lastActivity = allDates.length > 0 ? Math.max(...allDates) : undefined;

        return {
          ...user,
          weightRecordsCount: weightRecords.length,
          injectionRecordsCount: injectionRecords.length,
          lastActivity,
        };
      })
    );

    return { ok: true, users: usersWithStats };
  },
});

// Get detailed data for a specific user
export const getUserData = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<GetUserDataResult> => {
    const isUserAdmin: boolean = await ctx.runQuery(api.authz.isAdmin, {});

    if (!isUserAdmin) {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "Přístup odepřen. Musíte být administrátor.",
      };
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Uživatel nenalezen.",
      };
    }

    const weightRecords = await ctx.db
      .query("weightRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const injectionRecords = await ctx.db
      .query("injectionRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const measureRecords = await ctx.db
      .query("measureRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const moodRecords = await ctx.db
      .query("moodRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const stockItems = await ctx.db
      .query("stockItems")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return {
      ok: true,
      user,
      weightRecords,
      injectionRecords,
      measureRecords,
      moodRecords,
      stockItems,
    };
  },
});

// Generate random promo code string
function generateRandomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate promo code (admin only)
export const generatePromoCode = mutation({
  args: { 
    productId: v.string(), // "monthly_sub", "quarterly_sub", "yearly_sub"
  },
  handler: async (ctx, { productId }) => {
    const isUserAdmin: boolean = await ctx.runQuery(api.authz.isAdmin, {});
    if (!isUserAdmin) {
      return { ok: false, code: "FORBIDDEN", message: "Přístup odepřen" };
    }

    const product = SUBSCRIPTION_PRODUCTS.find(p => p.id === productId);
    if (!product) {
      return { ok: false, code: "INVALID_PRODUCT", message: "Neplatný produkt" };
    }

    // Get admin user ID
    const adminId = await ctx.runQuery(api.authz.getCurrentUserId, {});
    if (!adminId) {
      return { ok: false, code: "NOT_AUTHENTICATED", message: "Nepřihlášen" };
    }

    // Generate unique code
    let code = generateRandomCode();
    let existing = await ctx.db.query("promoCodes").withIndex("by_code", q => q.eq("code", code)).first();
    while (existing) {
      code = generateRandomCode();
      existing = await ctx.db.query("promoCodes").withIndex("by_code", q => q.eq("code", code)).first();
    }

    await ctx.db.insert("promoCodes", {
      code,
      durationMonths: product.durationMonths,
      productId: product.id,
      productTitle: product.title,
      createdBy: adminId,
      createdAt: Date.now(),
    });

    return { 
      ok: true, 
      code, 
      productTitle: product.title,
      durationMonths: product.durationMonths,
    };
  },
});

// Get all promo codes (admin only)
export const getPromoCodes = query({
  args: {},
  handler: async (ctx) => {
    const isUserAdmin: boolean = await ctx.runQuery(api.authz.isAdmin, {});
    if (!isUserAdmin) {
      return { ok: false, code: "FORBIDDEN", message: "Přístup odepřen" };
    }

    const codes = await ctx.db.query("promoCodes").order("desc").collect();
    return { ok: true, codes };
  },
});

// Set user premium permanently (admin only)
export const setUserPremiumPermanent = mutation({
  args: { 
    userId: v.id("users"),
    permanent: v.boolean(),
  },
  handler: async (ctx, { userId, permanent }) => {
    const isUserAdmin: boolean = await ctx.runQuery(api.authz.isAdmin, {});
    if (!isUserAdmin) {
      return { ok: false, code: "FORBIDDEN", message: "Přístup odepřen" };
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return { ok: false, code: "NOT_FOUND", message: "Uživatel nenalezen" };
    }

    await ctx.db.patch(userId, {
      premiumPermanent: permanent,
      isPremium: permanent,
    });

    return { ok: true, permanent };
  },
});

// Get subscription products (for UI)
export const getSubscriptionProducts = query({
  args: {},
  handler: async () => {
    return SUBSCRIPTION_PRODUCTS;
  },
});
