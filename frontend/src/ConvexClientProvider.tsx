import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth } from "convex/react-auth";
import { AuthKitProvider, useAuth } from "@workos-inc/authkit-react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <AuthKitProvider clientId={import.meta.env.VITE_WORKOS_CLIENT_ID as string}>
      <ConvexProviderWithAuth client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithAuth>
    </AuthKitProvider>
  );
}
