import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
    publicKey: v.string(), // RSA Public Key (PEM or JWK string)
    encryptedPrivateKey: v.string(), // User's private key, encrypted with their password-derived key
    privateKeySalt: v.string(), // Salt used for PBKDF2
  }).index("by_token", ["tokenIdentifier"]),

  circles: defineTable({
    name: v.string(),
    creatorId: v.id("users"),
  }),

  circleMembers: defineTable({
    circleId: v.id("circles"),
    userId: v.id("users"),
    encryptedCircleKey: v.string(), // Circle's AES key, encrypted with User's Public Key
  }).index("by_circle", ["circleId"])
    .index("by_user", ["userId"]),

  posts: defineTable({
    authorId: v.id("users"),
    circleId: v.id("circles"),
    encryptedContent: v.string(), // Encrypted blob (Base64)
    encryptedPostKey: v.string(), // Post's AES key, encrypted with Circle Key
    createdAt: v.number(),
  }).index("by_circle", ["circleId"]),
});
