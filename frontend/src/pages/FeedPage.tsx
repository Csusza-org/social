import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useCrypto } from "../hooks/useCrypto";
import { useAuth } from "@workos-inc/authkit-react";
import * as cryptoUtils from "../lib/crypto";
import type { Id } from "@convex/_generated/dataModel";

import { Layout } from "../components/Layout";
import { Sidebar } from "../components/Sidebar";
import { Feed } from "../components/Feed";
import { Modal } from "../components/Modal";

import "../components/Feed.css";

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

type SearchedUser = {
  _id: Id<"users">;
  name: string;
  publicKey: string;
};

export default function FeedPage() {
  const { user } = useAuth();
  const { userKeys, setupUser, restoreUserKeys, decryptCircleKey, encryptPost, decryptPost } =
    useCrypto();

  const me = useQuery(api.users.getMe);
  const storeUser = useMutation(api.users.store);
  const createCircle = useMutation(api.circles.create);
  const myCircles = (useQuery(api.circles.getMyCircles) as Circle[] | undefined) || [];
  const addMemberMutation = useMutation(api.circles.addMember);

  const [selectedCircleId, setSelectedCircleId] = useState<Id<"circles"> | null>(null);
  const posts = useQuery(
    api.posts.listForCircle,
    selectedCircleId ? { circleId: selectedCircleId } : "skip"
  ) as PostWithAuthor[] | undefined;
  const createPostMutation = useMutation(api.posts.create);

  // Members for the selected circle
  const members = useQuery(
    api.circles.getMembers,
    selectedCircleId ? { circleId: selectedCircleId } : "skip"
  );

  // ---- Modal State ----
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showCreateCircleModal, setShowCreateCircleModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  const [modalPassword, setModalPassword] = useState("");
  const [modalCircleName, setModalCircleName] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  // ---- Add Member Search State ----
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const searchResults = useQuery(
    api.users.search,
    memberSearchQuery.trim().length >= 2 ? { query: memberSearchQuery.trim() } : "skip"
  ) as SearchedUser[] | undefined;

  // ---- Auto-trigger registration if no user record exists ----
  const needsRegistration = me === null && !showRegisterModal;

  // ---- Handlers ----
  const handleRegister = async () => {
    if (!modalPassword) return;
    setModalLoading(true);
    setModalError("");
    try {
      const { publicKey, encryptedPrivateKey, privateKeySalt } = await setupUser(modalPassword);
      await storeUser({
        name: user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "Anonymous",
        publicKey,
        encryptedPrivateKey,
        privateKeySalt,
      });
      setShowRegisterModal(false);
      setModalPassword("");
    } catch {
      setModalError("Registration failed. Please try again.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleRestoreKeys = async () => {
    if (!me || !modalPassword) return;
    setModalLoading(true);
    setModalError("");
    try {
      await restoreUserKeys(me.encryptedPrivateKey, me.privateKeySalt, me.publicKey, modalPassword);
      setShowRestoreModal(false);
      setModalPassword("");
    } catch {
      setModalError("Incorrect password or corrupted key data.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreateCircle = async () => {
    if (!modalCircleName.trim() || !userKeys) return;
    setModalLoading(true);
    setModalError("");
    try {
      const circleKey = await cryptoUtils.generateSymmetricKey();
      const wrappedCircleKey = await cryptoUtils.wrapSymmetricKey(circleKey, userKeys.publicKey);
      await createCircle({ name: modalCircleName.trim(), encryptedCircleKey: wrappedCircleKey });
      setShowCreateCircleModal(false);
      setModalCircleName("");
    } catch {
      setModalError("Failed to create circle.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleCreatePost = async (content: string) => {
    if (!selectedCircleId || !userKeys) return;
    const circle = myCircles.find((c) => c._id === selectedCircleId);
    if (!circle) return;

    const circleKey = await decryptCircleKey(circle.encryptedCircleKey);
    const { encryptedContent, encryptedPostKey } = await encryptPost(content, circleKey);
    await createPostMutation({
      circleId: selectedCircleId,
      encryptedContent,
      encryptedPostKey,
    });
  };

  const handleAddMember = async (targetUser: SearchedUser) => {
    if (!selectedCircleId || !userKeys) return;
    const circle = myCircles.find((c) => c._id === selectedCircleId);
    if (!circle) return;

    setModalLoading(true);
    setModalError("");
    try {
      // 1. Decrypt the circle key with our private key
      const circleKey = await decryptCircleKey(circle.encryptedCircleKey);
      // 2. Import the target user's public key
      const targetPublicKey = await cryptoUtils.importKey(targetUser.publicKey, "public");
      // 3. Re-wrap the circle key with the target user's public key
      const wrappedForTarget = await cryptoUtils.wrapSymmetricKey(circleKey, targetPublicKey);
      // 4. Store the wrapped key on the backend
      await addMemberMutation({
        circleId: selectedCircleId,
        userId: targetUser._id,
        encryptedCircleKey: wrappedForTarget,
      });
      setShowAddMemberModal(false);
      setMemberSearchQuery("");
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Failed to add member.");
    } finally {
      setModalLoading(false);
    }
  };

  // ---- Render ----
  const selectedCircle = myCircles.find((c) => c._id === selectedCircleId);

  return (
    <>
      <Layout
        sidebar={
          <Sidebar
            userName={me?.name ?? null}
            userKeys={userKeys}
            circles={myCircles}
            selectedCircleId={selectedCircleId}
            onSelectCircle={setSelectedCircleId}
            onCreateCircle={() => {
              setModalError("");
              setModalCircleName("");
              setShowCreateCircleModal(true);
            }}
            onRestoreKeys={() => {
              setModalError("");
              setModalPassword("");
              setShowRestoreModal(true);
            }}
            onAddMember={() => {
              setModalError("");
              setMemberSearchQuery("");
              setShowAddMemberModal(true);
            }}
            membersCount={members?.length}
          />
        }
      >
        {selectedCircle ? (
          <Feed
            circle={selectedCircle}
            posts={posts}
            onCreatePost={handleCreatePost}
            decryptPost={decryptPost}
            decryptCircleKey={decryptCircleKey}
            keysLoaded={!!userKeys}
          />
        ) : (
          <div className="feed-placeholder">
            <div className="feed-placeholder-icon">🔐</div>
            <h2>Select a Circle</h2>
            <p>Choose a circle from the sidebar to view and post encrypted messages.</p>
          </div>
        )}
      </Layout>

      {/* ---- Register Modal (first-time user) ---- */}
      {needsRegistration && !showRegisterModal && (
        /* auto-open on next render */
        <>{setTimeout(() => setShowRegisterModal(true), 0) && null}</>
      )}
      <Modal
        open={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        title="Create Your Encryption Keys"
        footer={
          <button
            className="btn btn-primary"
            onClick={handleRegister}
            disabled={!modalPassword || modalLoading}
            id="register-submit"
          >
            {modalLoading ? "Generating…" : "Generate Keys"}
          </button>
        }
      >
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Create a master password to protect your encryption keys. This password never leaves your
          browser. <strong>Do not lose it</strong> — there is no recovery.
        </p>
        <div className="form-group">
          <label className="form-label" htmlFor="register-password">
            Master Password
          </label>
          <input
            id="register-password"
            type="password"
            className="input"
            placeholder="Choose a strong password…"
            value={modalPassword}
            onChange={(e) => setModalPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            autoFocus
          />
        </div>
        {modalError && <p style={{ color: "var(--danger)", fontSize: "0.8125rem" }}>{modalError}</p>}
      </Modal>

      {/* ---- Restore Keys Modal ---- */}
      <Modal
        open={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        title="Unlock Your Keys"
        footer={
          <button
            className="btn btn-primary"
            onClick={handleRestoreKeys}
            disabled={!modalPassword || modalLoading}
            id="restore-submit"
          >
            {modalLoading ? "Decrypting…" : "Unlock"}
          </button>
        }
      >
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Enter your master password to decrypt your private key and restore access to your circles.
        </p>
        <div className="form-group">
          <label className="form-label" htmlFor="restore-password">
            Master Password
          </label>
          <input
            id="restore-password"
            type="password"
            className="input"
            placeholder="Enter your master password…"
            value={modalPassword}
            onChange={(e) => setModalPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRestoreKeys()}
            autoFocus
          />
        </div>
        {modalError && <p style={{ color: "var(--danger)", fontSize: "0.8125rem" }}>{modalError}</p>}
      </Modal>

      {/* ---- Create Circle Modal ---- */}
      <Modal
        open={showCreateCircleModal}
        onClose={() => setShowCreateCircleModal(false)}
        title="Create a New Circle"
        footer={
          <button
            className="btn btn-primary"
            onClick={handleCreateCircle}
            disabled={!modalCircleName.trim() || !userKeys || modalLoading}
            id="create-circle-submit"
          >
            {modalLoading ? "Creating…" : "Create Circle"}
          </button>
        }
      >
        <div className="form-group">
          <label className="form-label" htmlFor="circle-name">
            Circle Name
          </label>
          <input
            id="circle-name"
            type="text"
            className="input"
            placeholder="e.g. Close Friends, Study Group…"
            value={modalCircleName}
            onChange={(e) => setModalCircleName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateCircle()}
            autoFocus
          />
        </div>
        {!userKeys && (
          <p style={{ color: "var(--warning)", fontSize: "0.8125rem" }}>
            ⚠ Your keys are locked. Unlock them first to create a circle.
          </p>
        )}
        {modalError && <p style={{ color: "var(--danger)", fontSize: "0.8125rem" }}>{modalError}</p>}
      </Modal>

      {/* ---- Add Member Modal ---- */}
      <Modal
        open={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        title="Add a Member"
      >
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Search for a user to add to this circle. Their public key will be used to securely share
          the circle's encryption key.
        </p>
        <div className="form-group">
          <label className="form-label" htmlFor="member-search">
            Search by name
          </label>
          <input
            id="member-search"
            type="text"
            className="input"
            placeholder="Type a name…"
            value={memberSearchQuery}
            onChange={(e) => setMemberSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {searchResults && searchResults.length > 0 && (
          <div className="search-results">
            {searchResults
              .filter((u) => u._id !== me?._id)
              .map((u) => (
                <div key={u._id} className="search-result-item">
                  <div className="search-result-avatar">{u.name[0]?.toUpperCase() ?? "?"}</div>
                  <span className="search-result-name">{u.name}</span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAddMember(u)}
                    disabled={modalLoading}
                  >
                    {modalLoading ? "…" : "Add"}
                  </button>
                </div>
              ))}
          </div>
        )}

        {searchResults && searchResults.filter((u) => u._id !== me?._id).length === 0 && memberSearchQuery.trim().length >= 2 && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", textAlign: "center" }}>
            No users found.
          </p>
        )}

        {/* Current members list */}
        {members && members.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <p className="form-label">Current members</p>
            <div className="search-results">
              {members.map((m) => (
                <div key={m._id} className="search-result-item">
                  <div className="search-result-avatar">{m.name[0]?.toUpperCase() ?? "?"}</div>
                  <span className="search-result-name">{m.name}</span>
                  <span className="badge badge-accent" style={{ marginLeft: "auto" }}>
                    Member
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {modalError && (
          <p style={{ color: "var(--danger)", fontSize: "0.8125rem" }}>{modalError}</p>
        )}
      </Modal>

      <style>{`
        .search-results {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 200px;
          overflow-y: auto;
        }
        .search-result-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          transition: background var(--duration-fast) var(--ease-out);
        }
        .search-result-item:hover {
          background: var(--bg-elevated);
        }
        .search-result-avatar {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          background: linear-gradient(135deg, #818cf8, var(--accent));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-inverse);
          flex-shrink: 0;
        }
        .search-result-name {
          font-size: 0.875rem;
          color: var(--text-primary);
          flex: 1;
        }
      `}</style>
    </>
  );
}
