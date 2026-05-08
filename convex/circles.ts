import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    encryptedCircleKey: v.string(), // The key for this circle, encrypted with creator's public key
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

    const circleId = await ctx.db.insert("circles", {
      name: args.name,
      creatorId: user._id,
    });

    await ctx.db.insert("circleMembers", {
      circleId,
      userId: user._id,
      encryptedCircleKey: args.encryptedCircleKey,
    });

    return circleId;
  },
});

export const addMember = mutation({
  args: {
    circleId: v.id("circles"),
    userId: v.id("users"),
    encryptedCircleKey: v.string(), // Circle key encrypted with new member's public key
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

    // Check if current user is the creator (basic access control for now)
    const circle = await ctx.db.get(args.circleId);
    if (!circle || circle.creatorId !== user._id) {
      throw new Error("Only the creator can add members");
    }

    // Prevent duplicate membership
    const existing = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle", (q) => q.eq("circleId", args.circleId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();

    if (existing) {
      throw new Error("User is already a member of this circle");
    }

    return await ctx.db.insert("circleMembers", {
      circleId: args.circleId,
      userId: args.userId,
      encryptedCircleKey: args.encryptedCircleKey,
    });
  },
});

export const getMyCircles = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return [];
    }

    const memberships = await ctx.db
      .query("circleMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const circles = [];
    for (const membership of memberships) {
      const circle = await ctx.db.get(membership.circleId);
      if (circle) {
        circles.push({
          ...circle,
          encryptedCircleKey: membership.encryptedCircleKey,
        });
      }
    }

    return circles;
  },
});

/**
 * Returns the list of members for a given circle (with their names).
 * Requires the requesting user to be a member of the circle.
 */
export const getMembers = query({
  args: { circleId: v.id("circles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) {
      return [];
    }

    // Verify caller is a member
    const callerMembership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle", (q) => q.eq("circleId", args.circleId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .unique();

    if (!callerMembership) {
      return [];
    }

    const memberships = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle", (q) => q.eq("circleId", args.circleId))
      .collect();

    const members = [];
    for (const m of memberships) {
      const memberUser = await ctx.db.get(m.userId);
      if (memberUser) {
        members.push({
          _id: memberUser._id,
          name: memberUser.name,
        });
      }
    }

    return members;
  },
});
