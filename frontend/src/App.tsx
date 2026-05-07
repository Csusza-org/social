import { useState, useEffect } from "react";
import { useQuery, useMutation, Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@convex/_generated/api";
import { useCrypto } from "./hooks/useCrypto";
import { useAuth } from "@workos-inc/authkit-react";
import * as cryptoUtils from "./lib/crypto";
import type { Id } from "@convex/_generated/dataModel";

type Circle = {
  _id: Id<"circles">;
  _creationTime: number;
  name: string;
  creatorId: Id<"users">;
  encryptedCircleKey: string;
};

type Post = {
  _id: Id<"posts">;
  _creationTime: number;
  authorId: Id<"users">;
  circleId: Id<"circles">;
  encryptedContent: string;
  encryptedPostKey: string;
  createdAt: number;
};

function SocialApp() {
  const { user } = useAuth();
  const { userKeys, setupUser, restoreUserKeys, decryptCircleKey, encryptPost, decryptPost, setUserKeys } = useCrypto();
  
  const me = useQuery(api.users.getMe);
  const storeUser = useMutation(api.users.store);
  const createCircle = useMutation(api.circles.create);
  const myCircles = (useQuery(api.circles.getMyCircles) as Circle[] | undefined) || [];
  
  const [selectedCircleId, setSelectedCircleId] = useState<Id<"circles"> | null>(null);
  const posts = useQuery(api.posts.listForCircle, selectedCircleId ? { circleId: selectedCircleId } : "skip") as Post[] | undefined;
  const createPostMutation = useMutation(api.posts.create);

  const [newPostContent, setNewPostContent] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);

  const handleRegister = async () => {
    const password = prompt("Create a master password for your keys (don't lose it!):");
    if (!password) return;

    setIsInitializing(true);
    try {
      const { publicKey, encryptedPrivateKey, privateKeySalt } = await setupUser(password);
      await storeUser({
        name: user?.firstName ? `${user.firstName} ${user.lastName}` : "Anonymous",
        publicKey,
        encryptedPrivateKey,
        privateKeySalt,
      });
    } catch (e) {
      console.error(e);
      alert("Registration failed");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleRestoreKeys = async () => {
    if (!me) return;
    const password = prompt("Enter your master password to unlock your keys:");
    if (!password) return;

    try {
      await restoreUserKeys(
        me.encryptedPrivateKey,
        me.privateKeySalt,
        me.publicKey,
        password
      );
    } catch (e) {
      console.error(e);
      alert("Failed to unlock keys. Incorrect password?");
    }
  };

  const handleCreateCircle = async () => {
    const name = prompt("Circle name:");
    if (!name || !userKeys) return;

    const circleKey = await cryptoUtils.generateSymmetricKey();
    const wrappedCircleKey = await cryptoUtils.wrapSymmetricKey(circleKey, userKeys.publicKey);

    await createCircle({
      name,
      encryptedCircleKey: wrappedCircleKey,
    });
  };

  const handleCreatePost = async () => {
    if (!selectedCircleId || !newPostContent || !userKeys) return;

    const circle = myCircles.find(c => c._id === selectedCircleId);
    if (!circle) return;

    const circleKey = await decryptCircleKey(circle.encryptedCircleKey);
    const { encryptedContent, encryptedPostKey } = await encryptPost(newPostContent, circleKey);

    await createPostMutation({
      circleId: selectedCircleId,
      encryptedContent,
      encryptedPostKey,
    });
    setNewPostContent("");
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Secure Social</h1>
      
      {!me ? (
        <button onClick={handleRegister} disabled={isInitializing}>
          {isInitializing ? "Initializing..." : "Register & Generate Keys"}
        </button>
      ) : (
        <div>
          <p>Welcome, {me.name}!</p>
          {!userKeys && (
            <div style={{ border: "1px solid red", padding: "10px", margin: "10px 0" }}>
              <p>Keys not in memory.</p>
              <button onClick={handleRestoreKeys}>Restore Keys from DB</button>
            </div>
          )}

          <div style={{ display: "flex", gap: "20px" }}>
            <div style={{ width: "200px" }}>
              <h3>Circles</h3>
              <button onClick={handleCreateCircle}>+ New Circle</button>
              <ul>
                {myCircles.map(c => (
                  <li key={c._id}>
                    <button onClick={() => setSelectedCircleId(c._id)}>
                      {c.name} {selectedCircleId === c._id && "✓"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ flex: 1 }}>
              {selectedCircleId ? (
                <div>
                  <h3>Feed</h3>
                  <div style={{ marginBottom: "20px" }}>
                    <textarea 
                      value={newPostContent} 
                      onChange={e => setNewPostContent(e.target.value)}
                      placeholder="What's on your mind?"
                      style={{ width: "100%", height: "60px" }}
                    />
                    <button onClick={handleCreatePost}>Post Encrypted</button>
                  </div>

                  <div>
                    {posts?.map(p => (
                      <PostItem 
                        key={p._id} 
                        post={p} 
                        circle={myCircles.find(c => c._id === selectedCircleId)!}
                        decryptPost={decryptPost}
                        decryptCircleKey={decryptCircleKey}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p>Select a circle to see posts</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PostItemProps {
  post: Post;
  circle: Circle;
  decryptPost: (encryptedContent: string, encryptedPostKey: string, circleKey: CryptoKey) => Promise<string>;
  decryptCircleKey: (wrappedCircleKey: string) => Promise<CryptoKey>;
}

function PostItem({ post, circle, decryptPost, decryptCircleKey }: PostItemProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function decrypt() {
      try {
        const circleKey = await decryptCircleKey(circle.encryptedCircleKey);
        const decrypted = await decryptPost(post.encryptedContent, post.encryptedPostKey, circleKey);
        setContent(decrypted);
      } catch (e) {
        setError("Failed to decrypt");
        console.error(e);
      }
    }
    decrypt();
  }, [post, circle, decryptPost, decryptCircleKey]);

  return (
    <div style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px", borderRadius: "8px" }}>
      <p style={{ fontSize: "0.8em", color: "#666" }}>Post ID: {post._id}</p>
      {content ? (
        <p>{content}</p>
      ) : error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <p>Decrypting...</p>
      )}
    </div>
  );
}

export default function App() {
  const { signIn, user, isLoading: isAuthLoading } = useAuth();
  
  return (
    <main>
      <Authenticated>
        <SocialApp />
      </Authenticated>
      <Unauthenticated>
        <div style={{ padding: "50px", textAlign: "center" }}>
          <h1>Secure Social</h1>
          {user ? (
            <div>
              <p>WorkOS Authenticated as {user.firstName}, waiting for Convex...</p>
              <AuthLoading>
                <p>Syncing with backend...</p>
              </AuthLoading>
            </div>
          ) : (
            <div>
              <p>Please sign in to continue</p>
              <button onClick={() => signIn()}>Sign In with WorkOS</button>
            </div>
          )}
        </div>
      </Unauthenticated>
      <AuthLoading>
        {isAuthLoading ? <p>Loading AuthKit...</p> : <p>Loading Convex...</p>}
      </AuthLoading>
    </main>
  );
}
