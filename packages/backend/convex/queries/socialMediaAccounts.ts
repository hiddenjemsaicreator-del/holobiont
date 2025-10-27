import { query } from "../_generated/server";
import { v } from "convex/values";
import { getUserId } from "../schema";

// List all connected accounts for the current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const accounts = await ctx.db
      .query("socialMediaAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return accounts;
  },
});

// List only connected accounts
export const listConnected = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const accounts = await ctx.db
      .query("socialMediaAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isConnected"), true))
      .collect();

    return accounts;
  },
});

// Get account by ID
export const getById = query({
  args: {
    accountId: v.id("socialMediaAccounts"),
  },
  handler: async (ctx, { accountId }) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const account = await ctx.db.get(accountId);
    if (!account || account.userId !== userId) return null;

    return account;
  },
});

// Get account by platform
export const getByPlatform = query({
  args: {
    platform: v.union(
      v.literal("tiktok"),
      v.literal("instagram"),
      v.literal("youtube"),
      v.literal("x"),
      v.literal("facebook"),
      v.literal("threads"),
    ),
  },
  handler: async (ctx, { platform }) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const account = await ctx.db
      .query("socialMediaAccounts")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", userId).eq("platform", platform),
      )
      .first();

    return account;
  },
});

// Get account with latest stats
export const getByIdWithStats = query({
  args: {
    accountId: v.id("socialMediaAccounts"),
  },
  handler: async (ctx, { accountId }) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const account = await ctx.db.get(accountId);
    if (!account || account.userId !== userId) return null;

    // Get latest stats for this account
    const latestStats = await ctx.db
      .query("socialMediaStats")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .order("desc")
      .first();

    return {
      account,
      stats: latestStats,
    };
  },
});

// Get all accounts with their latest stats
export const listWithStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const accounts = await ctx.db
      .query("socialMediaAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Get latest stats for each account
    const accountsWithStats = await Promise.all(
      accounts.map(async (account) => {
        const latestStats = await ctx.db
          .query("socialMediaStats")
          .withIndex("by_account", (q) => q.eq("accountId", account._id))
          .order("desc")
          .first();

        return {
          account,
          stats: latestStats,
        };
      }),
    );

    return accountsWithStats;
  },
});

// Check if user has connected account for a platform
export const hasConnectedPlatform = query({
  args: {
    platform: v.union(
      v.literal("tiktok"),
      v.literal("instagram"),
      v.literal("youtube"),
      v.literal("x"),
      v.literal("facebook"),
      v.literal("threads"),
    ),
  },
  handler: async (ctx, { platform }) => {
    const userId = await getUserId(ctx);
    if (!userId) return false;

    const account = await ctx.db
      .query("socialMediaAccounts")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", userId).eq("platform", platform),
      )
      .filter((q) => q.eq(q.field("isConnected"), true))
      .first();

    return !!account;
  },
});

// Get connection summary
export const getConnectionSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const accounts = await ctx.db
      .query("socialMediaAccounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const summary = {
      total: accounts.length,
      connected: 0,
      disconnected: 0,
      byPlatform: {} as Record<
        string,
        { connected: boolean; accountId: string }
      >,
    };

    accounts.forEach((account) => {
      if (account.isConnected) {
        summary.connected++;
      } else {
        summary.disconnected++;
      }

      summary.byPlatform[account.platform] = {
        connected: account.isConnected,
        accountId: account._id,
      };
    });

    return summary;
  },
});
