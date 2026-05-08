import type { Id } from "@convex/_generated/dataModel";
import { PostCard } from "./PostCard";
import { CreatePost } from "./CreatePost";
import "./Feed.css";

type Circle = {
  _id: Id<"circles">;
  _creationTime: number;
  name: string;
  creatorId: Id<"users">;
  encryptedCircleKey: string;
};

type PostWithAuthor = {
  _id: Id<"posts">;
  _creationTime: number;
  authorId: Id<"users">;
  authorName: string;
  circleId: Id<"circles">;
  encryptedContent: string;
  encryptedPostKey: string;
  createdAt: number;
};

interface FeedProps {
  circle: Circle;
  posts: PostWithAuthor[] | undefined;
  onCreatePost: (content: string) => Promise<void>;
  decryptPost: (
    encryptedContent: string,
    encryptedPostKey: string,
    circleKey: CryptoKey
  ) => Promise<string>;
  decryptCircleKey: (wrappedCircleKey: string) => Promise<CryptoKey>;
  keysLoaded: boolean;
}

/**
 * The main feed view: compose area + list of decrypted posts.
 */
export function Feed({
  circle,
  posts,
  onCreatePost,
  decryptPost,
  decryptCircleKey,
  keysLoaded,
}: FeedProps) {
  return (
    <div className="feed">
      <header className="feed-header">
        <h1 className="feed-title">{circle.name}</h1>
        <p className="feed-subtitle">End-to-end encrypted circle</p>
      </header>

      <div className="feed-content">
        <CreatePost onSubmit={onCreatePost} disabled={!keysLoaded} />

        <div className="feed-posts">
          {posts === undefined ? (
            /* Skeleton loader while Convex subscription loads */
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="post-card glass-card post-card-skeleton-wrapper">
                <div className="post-card-header">
                  <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "50%" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div className="skeleton" style={{ width: "40%", height: 12 }} />
                    <div className="skeleton" style={{ width: "25%", height: 10 }} />
                  </div>
                </div>
                <div className="post-card-skeleton" style={{ marginTop: 14 }}>
                  <div className="skeleton" style={{ height: 14, width: "90%" }} />
                  <div className="skeleton" style={{ height: 14, width: "65%" }} />
                </div>
              </div>
            ))
          ) : posts.length === 0 ? (
            <div className="feed-empty">
              <div className="feed-empty-icon">💬</div>
              <p>No posts yet. Be the first to share something!</p>
            </div>
          ) : (
            posts.map((post, index) => (
              <div key={post._id} style={{ animationDelay: `${index * 50}ms` }}>
                <PostCard
                  authorName={post.authorName}
                  createdAt={post.createdAt}
                  encryptedContent={post.encryptedContent}
                  encryptedPostKey={post.encryptedPostKey}
                  encryptedCircleKey={circle.encryptedCircleKey}
                  decryptPost={decryptPost}
                  decryptCircleKey={decryptCircleKey}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
