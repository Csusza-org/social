import { ReactNode, useCallback, useMemo } from "react";
import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { AuthKitProvider, useAuth as useWorkOSAuth } from "@workos-inc/authkit-react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

/**
 * The redirect URI that WorkOS should send the user back to after OAuth.
 * Must match exactly what is configured in the WorkOS dashboard.
 */
const REDIRECT_URI =
  (import.meta.env.VITE_WORKOS_REDIRECT_URI as string) || window.location.origin;

/**
 * Custom hook that bridges WorkOS AuthKit state into the shape
 * ConvexProviderWithAuth expects. This must be a standalone hook
 * (not an inline closure) so that Convex's internal component
 * subscribes to WorkOS auth state changes directly.
 */
function useConvexAuthFromWorkOS() {
  const { isLoading, user, getAccessToken } = useWorkOSAuth();

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      try {
        const token = await getAccessToken();
        return token ?? null;
      } catch {
        // WorkOS throws LoginRequiredError when there's no session.
        // Return null so Convex transitions to Unauthenticated.
        return null;
      }
    },
    [getAccessToken]
  );

  return useMemo(() => ({
    isLoading,
    isAuthenticated: !!user,
    fetchAccessToken,
  }), [isLoading, user, fetchAccessToken]);
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <AuthKitProvider
      clientId={import.meta.env.VITE_WORKOS_CLIENT_ID as string}
      devMode={true}
      redirectUri={REDIRECT_URI}
    >
      <ConvexProviderWithAuth client={convex} useAuth={useConvexAuthFromWorkOS}>
        {children}
      </ConvexProviderWithAuth>
    </AuthKitProvider>
  );
}
