import { useState, useEffect } from "react";
import "./PostCard.css";

interface PostCardProps {
  authorName: string;
  createdAt: number;
  encryptedContent: string;
  encryptedPostKey: string;
  encryptedCircleKey: string;
  decryptPost: (
    encryptedContent: string,
    encryptedPostKey: string,
    circleKey: CryptoKey
  ) => Promise<string>;
  decryptCircleKey: (wrappedCircleKey: string) => Promise<CryptoKey>;
}

/**
 * Renders a single post with lazy client-side decryption.
 */
export function PostCard({
  authorName,
  createdAt,
  encryptedContent,
  encryptedPostKey,
  encryptedCircleKey,
  decryptPost,
  decryptCircleKey,
}: PostCardProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function decrypt() {
      try {
        const circleKey = await decryptCircleKey(encryptedCircleKey);
        const decrypted = await decryptPost(
          encryptedContent,
          encryptedPostKey,
          circleKey
        );
        if (!cancelled) setContent(decrypted);
      } catch {
        if (!cancelled) setError("Failed to decrypt");
      }
    }

    decrypt();
    return () => {
      cancelled = true;
    };
  }, [encryptedContent, encryptedPostKey, encryptedCircleKey, decryptPost, decryptCircleKey]);

  return (
    <article className="post-card glass-card">
      <div className="post-card-header">
        <div className="post-card-avatar">{authorName[0]?.toUpperCase() ?? "?"}</div>
        <div className="post-card-meta">
          <span className="post-card-author">{authorName}</span>
          <time className="post-card-time" dateTime={new Date(createdAt).toISOString()}>
            {formatRelativeTime(createdAt)}
          </time>
        </div>
        <span className="badge badge-accent post-card-badge">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M12 7V5a4 4 0 0 0-8 0v2M4 7h8a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          E2E
        </span>
      </div>

      <div className="post-card-body">
        {content !== null ? (
          <p>{content}</p>
        ) : error ? (
          <p className="post-card-error">{error}</p>
        ) : (
          <div className="post-card-skeleton">
            <div className="skeleton" style={{ height: "14px", width: "85%" }} />
            <div className="skeleton" style={{ height: "14px", width: "60%" }} />
          </div>
        )}
      </div>
    </article>
  );
}

/* ---- helpers ---- */
function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
