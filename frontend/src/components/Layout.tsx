import { type ReactNode } from "react";
import "./Layout.css";

interface LayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
}

/**
 * Main application layout with a fixed sidebar and scrollable content area.
 */
export function Layout({ sidebar, children }: LayoutProps) {
  return (
    <div className="layout">
      <aside className="layout-sidebar">{sidebar}</aside>
      <main className="layout-main">{children}</main>
    </div>
  );
}
