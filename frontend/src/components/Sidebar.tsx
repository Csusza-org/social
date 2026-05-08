import { useAuth } from "@workos-inc/authkit-react";
import type { Id } from "@convex/_generated/dataModel";
import "./Sidebar.css";

type Circle = {
  _id: Id<"circles">;
  _creationTime: number;
  name: string;
  creatorId: Id<"users">;
  encryptedCircleKey: string;
};

interface SidebarProps {
  userName: string | null;
  userKeys: CryptoKeyPair | null;
  circles: Circle[];
  selectedCircleId: Id<"circles"> | null;
  onSelectCircle: (id: Id<"circles">) => void;
  onCreateCircle: () => void;
  onRestoreKeys: () => void;
  onAddMember: () => void;
  membersCount?: number;
}

/**
 * Sidebar with user profile summary, key status, circle list, and actions.
 */
export function Sidebar({
  userName,
  userKeys,
  circles,
  selectedCircleId,
  onSelectCircle,
  onCreateCircle,
  onRestoreKeys,
  onAddMember,
  membersCount,
}: SidebarProps) {
  const { signOut } = useAuth();

  return (
    <>
      {/* User profile header */}
      <div className="sidebar-profile">
        <div className="sidebar-avatar">{userName?.[0]?.toUpperCase() ?? "?"}</div>
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{userName ?? "User"}</span>
          {userKeys ? (
            <span className="badge badge-success">🔑 Keys loaded</span>
          ) : (
            <span className="badge badge-danger">🔒 Keys locked</span>
          )}
        </div>
      </div>

      {/* Key restoration banner */}
      {!userKeys && (
        <div className="sidebar-key-banner">
          <p>Your encryption keys are not in memory.</p>
          <button className="btn btn-sm" onClick={onRestoreKeys}>
            Unlock Keys
          </button>
        </div>
      )}

      {/* Circles list */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <h4>Circles</h4>
          <button className="btn btn-ghost btn-icon" onClick={onCreateCircle} title="New Circle" aria-label="Create new circle">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <nav className="sidebar-circle-list" aria-label="Circles">
          {circles.length === 0 && (
            <p className="sidebar-empty-text">No circles yet. Create one!</p>
          )}
          {circles.map((c) => (
            <button
              key={c._id}
              className={`sidebar-circle-item ${selectedCircleId === c._id ? "active" : ""}`}
              onClick={() => onSelectCircle(c._id)}
              aria-current={selectedCircleId === c._id ? "page" : undefined}
            >
              <span className="sidebar-circle-icon">◉</span>
              <span className="sidebar-circle-name">{c.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Selected circle actions */}
      {selectedCircleId && (
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <h4>Circle Settings</h4>
          </div>
          <div className="sidebar-circle-actions">
            <button className="btn btn-sm" onClick={onAddMember}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM2 14c0-3 2.5-5 6-5s6 2 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M13 3v4M11 5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Add Member
            </button>
            {membersCount !== undefined && (
              <span className="sidebar-meta">{membersCount} member{membersCount !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Sign out */}
      <div className="sidebar-footer">
        <button className="btn btn-ghost btn-sm sidebar-signout" onClick={() => signOut()}>
          Sign Out
        </button>
      </div>
    </>
  );
}
