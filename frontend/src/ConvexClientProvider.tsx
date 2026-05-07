import { ReactNode, useCallback, useMemo } from "react";
import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { AuthKitProvider, useAuth as useWorkOSAuth } from "@workos-inc/authkit-react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function ConvexAuthAdapter({ children }: { children: ReactNode }) {
  const { isLoading, user, getAccessToken } = useWorkOSAuth();
  
  const fetchAccessToken = useCallback(async () => {
    return await getAccessToken();
  }, [getAccessToken]);

  const authState = useMemo(() => ({
    isLoading,
    isAuthenticated: !!user,
    fetchAccessToken
  }), [isLoading, user, fetchAccessToken]);

  return (
    <ConvexProviderWithAuth client={convex} useAuth={() => authState}>
      {children}
    </ConvexProviderWithAuth>
  );
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <AuthKitProvider clientId={import.meta.env.VITE_WORKOS_CLIENT_ID as string}>
      <ConvexAuthAdapter>
        {children}
      </ConvexAuthAdapter>
    </AuthKitProvider>
  );
}
