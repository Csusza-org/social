import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const store = mutation({
  args: {
    name: v.string(),
    publicKey: v.string(),
    encryptedPrivateKey: v.string(),
    privateKeySalt: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (user !== null) {
      return user._id;
    }

    return await ctx.db.insert("users", {
      name: args.name,
      tokenIdentifier: identity.tokenIdentifier,
      publicKey: args.publicKey,
      encryptedPrivateKey: args.encryptedPrivateKey,
      privateKeySalt: args.privateKeySalt,
    });
  },
});

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
});

/**
 * Search users by name prefix. Returns only _id, name, and publicKey to
 * avoid leaking private key material. Requires authentication.
 *
 * NOTE: Using a full table scan with a JS filter here because Convex
 * doesn't have a native prefix/LIKE search on regular indexes. For
 * production at scale you'd use a search index, but for small user
 * counts this is fine.
 */
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const normalised = args.query.toLowerCase().trim();
    if (!normalised) return [];

    const all = await ctx.db.query("users").take(200);

    return all
      .filter((u) => u.name.toLowerCase().includes(normalised))
      .map((u) => ({
        _id: u._id,
        name: u.name,
        publicKey: u.publicKey,
      }));
  },
});
