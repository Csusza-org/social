import { Navigate } from "react-router";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useAuth } from "@workos-inc/authkit-react";

/**
 * Wraps a route so only authenticated users can access it.
 * Unauthenticated visitors are redirected to "/".
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isLoading: isAuthKitLoading } = useAuth();

  return (
    <>
      <Authenticated>{children}</Authenticated>
      <Unauthenticated>
        <Navigate to="/" replace />
      </Unauthenticated>
      <AuthLoading>
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-base)",
          }}
        >
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 32,
                height: 32,
                border: "3px solid var(--border)",
                borderTopColor: "var(--accent)",
                borderRadius: "50%",
                animation: "spinSlow 0.8s linear infinite",
              }}
            />
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
              {isAuthKitLoading ? "Loading authentication…" : "Connecting to backend…"}
            </p>
          </div>
        </div>
      </AuthLoading>
    </>
  );
}
