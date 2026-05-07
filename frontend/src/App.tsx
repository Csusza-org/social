import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useCrypto } from "./hooks/useCrypto";
import { Authenticated, Unauthenticated, AuthLoading, useUser } from "@clerk/clerk-react";
import * as cryptoUtils from "./lib/crypto";

function SocialApp() {
  const { user } = useUser();
  const { userKeys, setupUser, decryptCircleKey, encryptPost, decryptPost, setUserKeys } = useCrypto();
  
  const me = useQuery(api.users.getMe);
  const storeUser = useMutation(api.users.store);
  const createCircle = useMutation(api.circles.create);
  const myCircles = useQuery(api.circles.getMyCircles) || [];
  
  const [selectedCircleId, setSelectedCircleId] = useState<any>(null);
  const posts = useQuery(api.posts.listForCircle, selectedCircleId ? { circleId: selectedCircleId } : "skip");
  const createPostMutation = useMutation(api.posts.create);

  const [newPostContent, setNewPostContent] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);

  // Auto-initialize keys if not present
  useEffect(() => {
    if (me && !userKeys && !isInitializing) {
      // In a real app, we'd prompt for a password and decrypt me.encryptedPrivateKey
      // For this demo, if keys aren't in memory, we might need to "restore" them
      // but let's just allow manual setup for now.
    }
  }, [me, userKeys, isInitializing]);

  const handleRegister = async () => {
    setIsInitializing(true);
    try {
      const { publicKey, encryptedPrivateKey } = await setupUser();
      await storeUser({
        name: user?.fullName || "Anonymous",
        publicKey,
        encryptedPrivateKey,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsInitializing(false);
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
              <p>Keys not in memory. (Simulating login/key retrieval...)</p>
              <button onClick={async () => {
                const privKey = await cryptoUtils.importKey(me.encryptedPrivateKey, "private");
                const pubKey = await cryptoUtils.importKey(me.publicKey, "public");
                setUserKeys({ privateKey: privKey, publicKey: pubKey });
              }}>Restore Keys from DB</button>
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
                        circle={myCircles.find(c => c._id === selectedCircleId)}
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

function PostItem({ post, circle, decryptPost, decryptCircleKey }: any) {
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
  return (
    <main>
      <Authenticated>
        <SocialApp />
      </Authenticated>
      <Unauthenticated>
        <div style={{ padding: "50px", textAlign: "center" }}>
          <h1>Secure Social</h1>
          <p>Please sign in to continue</p>
          {/* Clerk's SignInButton would go here */}
        </div>
      </Unauthenticated>
      <AuthLoading>
        <p>Loading...</p>
      </AuthLoading>
    </main>
  );
}
