import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    circleId: v.id("circles"),
    encryptedContent: v.string(),
    encryptedPostKey: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user is in the circle
    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle", (q) => q.eq("circleId", args.circleId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .unique();

    if (!membership) {
      throw new Error("User is not a member of this circle");
    }

    return await ctx.db.insert("posts", {
      authorId: user._id,
      circleId: args.circleId,
      encryptedContent: args.encryptedContent,
      encryptedPostKey: args.encryptedPostKey,
      createdAt: Date.now(),
    });
  },
});

/**
 * Lists posts for a circle with the author's name joined in, avoiding
 * N+1 queries on the client.
 */
export const listForCircle = query({
  args: {
    circleId: v.id("circles"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify membership
    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle", (q) => q.eq("circleId", args.circleId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .unique();

    if (!membership) {
      throw new Error("User is not a member of this circle");
    }

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_circle", (q) => q.eq("circleId", args.circleId))
      .order("desc")
      .take(100);

    // Join author name server-side to avoid N+1 on the client
    const postsWithAuthor = [];
    for (const post of posts) {
      const author = await ctx.db.get(post.authorId);
      postsWithAuthor.push({
        ...post,
        authorName: author?.name ?? "Unknown",
      });
    }

    return postsWithAuthor;
  },
});
