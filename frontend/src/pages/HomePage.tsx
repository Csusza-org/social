import { useNavigate } from "react-router";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useAuth } from "@workos-inc/authkit-react";
import { useEffect } from "react";
import "./HomePage.css";

/**
 * Landing / sign-in page.
 * If the user is already authenticated, redirect straight to /feed.
 */
export default function HomePage() {
  const { signIn, user, isLoading: isAuthLoading } = useAuth();

  return (
    <>
      {/* Already authenticated → go to feed */}
      <Authenticated>
        <RedirectToFeed />
      </Authenticated>

      {/* WorkOS authenticated but Convex rejected the token → show sign-in */}
      <Unauthenticated>
        {!isAuthLoading && (
          <div className="home">
            <div className="home-glow" aria-hidden="true" />
            <div className="home-content">
              <div className="home-badge">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M12 7V5a4 4 0 0 0-8 0v2M4 7h8a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                End-to-End Encrypted
              </div>
              <h1 className="home-title">
                Secure<br />Social
              </h1>
              <p className="home-subtitle">
                A privacy-first social platform where your data stays yours.
                Every message, every post — encrypted before it leaves your browser.
              </p>
              <button className="btn btn-primary btn-lg" onClick={() => signIn()} id="home-sign-in">
                Get Started
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="home-features">
                <div className="home-feature">
                  <span className="home-feature-icon">🔐</span>
                  <span>Zero-knowledge backend</span>
                </div>
                <div className="home-feature">
                  <span className="home-feature-icon">🛡</span>
                  <span>AES-256 &amp; RSA-OAEP</span>
                </div>
                <div className="home-feature">
                  <span className="home-feature-icon">👥</span>
                  <span>Encrypted circles</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Unauthenticated>

      {/* Convex still loading (syncing auth state) */}
      <AuthLoading>
        <div className="home">
          <div className="home-content">
            <div className="home-loader">
              <div className="home-loader-spinner" />
              <p>{isAuthLoading ? "Loading…" : "Syncing with backend…"}</p>
            </div>
          </div>
        </div>
      </AuthLoading>
    </>
  );
}

/** Tiny helper that navigates to /feed once Convex confirms auth. */
function RedirectToFeed() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/feed", { replace: true });
  }, [navigate]);
  return null;
}
