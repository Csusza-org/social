import { useState } from "react";
import "./CreatePost.css";

interface CreatePostProps {
  onSubmit: (content: string) => Promise<void>;
  disabled?: boolean;
}

/**
 * Compose area for writing a new encrypted post.
 */
export function CreatePost({ onSubmit, disabled }: CreatePostProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || sending || disabled) return;
    setSending(true);
    try {
      await onSubmit(content.trim());
      setContent("");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="create-post glass-card">
      <textarea
        className="textarea create-post-input"
        placeholder="What's on your mind? Your message will be end-to-end encrypted."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || sending}
        rows={3}
        id="create-post-textarea"
      />
      <div className="create-post-footer">
        <span className="create-post-hint">
          <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to post
        </span>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSubmit}
          disabled={!content.trim() || sending || disabled}
          id="create-post-submit"
        >
          {sending ? (
            <>
              <span className="spinner" />
              Encrypting…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M14 2L7 9M14 2l-4.5 12L7 9M14 2L2 6.5 7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Post Encrypted
            </>
          )}
        </button>
      </div>
    </div>
  );
}
