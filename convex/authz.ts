import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Admin email - automatically has admin role
const ADMIN_EMAIL = "lukas.pozdisek@gmail.com";

export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    
    const user = await ctx.db.get(userId);
    if (!user) return false;
    
    // Check if user has admin role OR is the designated admin email
    return user.role === "admin" || user.email === ADMIN_EMAIL;
  },
});

export const getCurrentUserId = query({
  args: {},
  handler: async (ctx) => {
    return await getAuthUserId(ctx);
  },
});
