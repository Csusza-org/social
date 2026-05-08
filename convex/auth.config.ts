/**
 * Convex Auth Configuration — validates JWTs issued by WorkOS AuthKit.
 *
 * The `domain` must be the OIDC issuer URL (used to fetch .well-known/openid-configuration).
 * The `applicationID` is checked against the JWT `aud` (audience) claim.
 *
 * Both values use the WorkOS Client ID, which is public (embedded in the SPA).
 */
const WORKOS_CLIENT_ID = process.env.VITE_WORKOS_CLIENT_ID!;

export default {
  providers: [
    {
      domain: `https://api.workos.com/user_management/${WORKOS_CLIENT_ID}`,
      applicationID: WORKOS_CLIENT_ID,
    },
  ],
};
