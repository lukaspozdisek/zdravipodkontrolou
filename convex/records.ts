import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

// ============ WEIGHT RECORDS ============

export const getWeightRecords = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    
    return await ctx.db
      .query("weightRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const addWeightRecord = mutation({
  args: {
    date: v.number(),
    kg: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("weightRecords", {
      userId,
      date: args.date,
      kg: args.kg,
    });
  },
});

export const deleteWeightRecord = mutation({
  args: { id: v.id("weightRecords") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const record = await ctx.db.get(args.id);
    if (!record || record.userId !== userId) {
      throw new Error("Record not found");
    }

    await ctx.db.delete(args.id);
  },
});

export const updateWeightRecord = mutation({
  args: {
    id: v.id("weightRecords"),
    date: v.number(),
    kg: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const record = await ctx.db.get(args.id);
    if (!record || record.userId !== userId) {
      throw new Error("Record not found");
    }

    await ctx.db.patch(args.id, { date: args.date, kg: args.kg });
  },
});

// ============ INJECTION RECORDS ============

export const getInjectionRecords = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("injectionRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const addInjectionRecord = mutation({
  args: {
    date: v.number(),
    substanceId: v.string(),
    mg: v.number(),
    site: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("injectionRecords", {
      userId,
      date: args.date,
      substanceId: args.substanceId,
      mg: args.mg,
      site: args.site,
    });
  },
});

export const deleteInjectionRecord = mutation({
  args: { id: v.id("injectionRecords") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const record = await ctx.db.get(args.id);
    if (!record || record.userId !== userId) {
      throw new Error("Record not found");
    }

    await ctx.db.delete(args.id);
  },
});

export const updateInjectionRecord = mutation({
  args: {
    id: v.id("injectionRecords"),
    date: v.number(),
    substanceId: v.optional(v.string()),
    mg: v.optional(v.number()),
    site: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const record = await ctx.db.get(args.id);
    if (!record || record.userId !== userId) {
      throw new Error("Record not found");
    }

    const updates: { date: number; substanceId?: string; mg?: number; site?: string } = { date: args.date };
    if (args.substanceId !== undefined) updates.substanceId = args.substanceId;
    if (args.mg !== undefined) updates.mg = args.mg;
    if (args.site !== undefined) updates.site = args.site;

    await ctx.db.patch(args.id, updates);
  },
});

// ============ MEASURE RECORDS ============

export const getMeasureRecords = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("measureRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const addMeasureRecord = mutation({
  args: {
    date: v.number(),
    neck: v.optional(v.number()),
    chest: v.optional(v.number()),
    waist: v.optional(v.number()),
    hips: v.optional(v.number()),
    thigh: v.optional(v.number()),
    calf: v.optional(v.number()),
    arm: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("measureRecords", {
      userId,
      date: args.date,
      neck: args.neck,
      chest: args.chest,
      waist: args.waist,
      hips: args.hips,
      thigh: args.thigh,
      calf: args.calf,
      arm: args.arm,
    });
  },
});

export const deleteMeasureRecord = mutation({
  args: { id: v.id("measureRecords") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const record = await ctx.db.get(args.id);
    if (!record || record.userId !== userId) {
      throw new Error("Record not found");
    }

    await ctx.db.delete(args.id);
  },
});

// ============ MOOD RECORDS ============

export const getMoodRecords = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("moodRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getTodayMoodRecord = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get start of today
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const records = await ctx.db
      .query("moodRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Find today's record
    return records.find(r => r.date >= startOfDay) || null;
  },
});

export const addMoodRecord = mutation({
  args: {
    date: v.number(),
    rating: v.number(),
    sideEffects: v.array(v.string()),
    note: v.optional(v.string()),
    levelAtTime: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("moodRecords", {
      userId,
      date: args.date,
      rating: args.rating,
      sideEffects: args.sideEffects,
      note: args.note,
      levelAtTime: args.levelAtTime,
    });
  },
});

export const deleteMoodRecord = mutation({
  args: { id: v.id("moodRecords") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const record = await ctx.db.get(args.id);
    if (!record || record.userId !== userId) {
      throw new Error("Record not found");
    }

    await ctx.db.delete(args.id);
  },
});

// ============ WATER RECORDS ============

export const getTodayWaterRecord = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get start of today (UTC normalized)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return await ctx.db
      .query("waterRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", startOfDay))
      .first();
  },
});

export const addWaterGlass = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get start of today
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Check if record exists for today
    const existing = await ctx.db
      .query("waterRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", startOfDay))
      .first();

    if (existing) {
      // Increment glasses count
      await ctx.db.patch(existing._id, { glasses: existing.glasses + 1 });
      return existing.glasses + 1;
    } else {
      // Create new record with 1 glass
      await ctx.db.insert("waterRecords", {
        userId,
        date: startOfDay,
        glasses: 1,
      });
      return 1;
    }
  },
});

export const getWaterRecords = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("waterRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// ============ PROTEIN RECORDS ============

export const getTodayProteinRecord = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get start of today
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return await ctx.db
      .query("proteinRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", startOfDay))
      .first();
  },
});

export const addProtein = mutation({
  args: {
    items: v.array(v.object({
      id: v.string(),
      name: v.string(),
      count: v.number(),
      proteinPerUnit: v.number(),
    })),
    totalGrams: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get start of today
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Check if record exists for today
    const existing = await ctx.db
      .query("proteinRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", startOfDay))
      .first();

    if (existing) {
      // Merge items and add to total
      const mergedItems = [...existing.items];
      for (const newItem of args.items) {
        const existingItem = mergedItems.find(i => i.id === newItem.id);
        if (existingItem) {
          existingItem.count += newItem.count;
        } else {
          mergedItems.push(newItem);
        }
      }
      
      await ctx.db.patch(existing._id, { 
        totalGrams: existing.totalGrams + args.totalGrams,
        items: mergedItems,
      });
      return existing.totalGrams + args.totalGrams;
    } else {
      // Create new record
      await ctx.db.insert("proteinRecords", {
        userId,
        date: startOfDay,
        totalGrams: args.totalGrams,
        items: args.items,
      });
      return args.totalGrams;
    }
  },
});

export const getProteinRecords = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("proteinRecords")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// ============ STOCK ITEMS ============

export const getStockItems = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("stockItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const addStockItem = mutation({
  args: {
    name: v.string(),
    substanceId: v.string(),
    isVial: v.boolean(),
    totalMg: v.number(),
    currentMg: v.number(),
    vialMg: v.optional(v.number()),
    vialMl: v.optional(v.number()),
    penType: v.optional(v.string()),
    penColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("stockItems", {
      userId,
      ...args,
    });
  },
});

export const updateStockItem = mutation({
  args: {
    id: v.id("stockItems"),
    currentMg: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.id);
    if (!item || item.userId !== userId) {
      throw new Error("Item not found");
    }

    await ctx.db.patch(args.id, { currentMg: args.currentMg });
  },
});

export const deleteStockItem = mutation({
  args: { id: v.id("stockItems") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const item = await ctx.db.get(args.id);
    if (!item || item.userId !== userId) {
      throw new Error("Item not found");
    }

    await ctx.db.delete(args.id);
  },
});

// ============ IMPORT FROM SHOTSY ============

export const importFromShotsy = mutation({
  args: {
    weightRecords: v.array(v.object({
      date: v.number(),
      kg: v.number(),
    })),
    injectionRecords: v.array(v.object({
      date: v.number(),
      substanceId: v.string(),
      mg: v.number(),
      site: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let weightCount = 0;
    let injectionCount = 0;

    // Import weight records
    for (const record of args.weightRecords) {
      // Check if record already exists for this date
      const existing = await ctx.db
        .query("weightRecords")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", record.date))
        .first();

      if (!existing) {
        await ctx.db.insert("weightRecords", {
          userId,
          date: record.date,
          kg: record.kg,
        });
        weightCount++;
      }
    }

    // Import injection records
    for (const record of args.injectionRecords) {
      // Check if record already exists for this date and substance
      const existing = await ctx.db
        .query("injectionRecords")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", record.date))
        .first();

      if (!existing) {
        await ctx.db.insert("injectionRecords", {
          userId,
          date: record.date,
          substanceId: record.substanceId,
          mg: record.mg,
          site: record.site,
        });
        injectionCount++;
      }
    }

    return { weightCount, injectionCount };
  },
});
