import { Geist } from "next/font/google";

const geist = Geist({ subsets: ["latin"] });

type RootLayoutProps = {
  children: React.ReactNode;
  /**
   * If a ReactNode, it will be rendered above the children (header-style).
   * If a function, it should return a ReactNode that wraps the children, e.g.
   *   banner={(content) => <DashboardShell>{content}</DashboardShell>}
   */
  banner?: React.ReactNode | ((content: React.ReactNode) => React.ReactNode);
};

/**
 * Shared outer‐shell layout that provides a consistent `<html>` / `<body>` wrapper,
 * global font, and flex column.  Pass either:
 *
 * 1. `banner` as a **ReactNode** (header/navbar) – it will be rendered above the page:
 *   ```tsx
 *   import { RootLayout } from '@repo/rootlayout-config';
 *   import { Navbar } from './components/Navbar';
 *
 *   export default function AppLayout({ children }: { children: React.ReactNode }) {
 *     return (
 *       <RootLayout banner={<Navbar />}>
 *         {children}
 *       </RootLayout>
 *     );
 *   }
 *   ```
 *
 * 2. `banner` as a **wrapper function** – it receives the rendered `children` and
 *   should return a ReactNode that embeds them (e.g. dashboard shell):
 *   ```tsx
 *   const DashboardShell = ({ children }: { children: React.ReactNode }) => (
 *     <div className="flex h-full">
 *       <Sidebar />
 *       <main className="flex-1 overflow-auto">{children}</main>
 *     </div>
 *   );
 *
 *   export default function AdminLayout({ children }: { children: React.ReactNode }) {
 *     return (
 *       <RootLayout banner={(content) => <DashboardShell>{content}</DashboardShell>}>
 *         {children}
 *       </RootLayout>
 *     );
 *   }
 *   ```
 *
 * Why is this important?
 * Using a **single, identical** `RootLayout` in every host and feature app
 * allows Next.js to safely _deduplicate_ the automatically generated
 * `<html>` and `<body>` elements during runtime. This avoids hydration
 * warnings and ensures that micro-frontend feature apps integrate
 * seamlessly into their host without duplicate tags or conflicting
 * attributes.
 *
 * Props:
 * - `children` – the route tree being rendered.
 * - `banner`   – `ReactNode` **or** `(content) => ReactNode` wrapper.
 */
export default function RootLayout({ children, banner }: RootLayoutProps) {
  return (
    <html lang="en">
      <body
        className={geist.className}
        style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
      >
        {typeof banner === "function" ? (
          banner(children)
        ) : (
          <>
            {banner && (
              <div
                style={{
                  backgroundColor: "rgba(0,0,0,0.7)",
                  color: "white",
                  padding: "4px",
                  textAlign: "center",
                }}
              >
                {banner}
              </div>
            )}
            <div style={{ flex: 1 }}>{children}</div>
          </>
        )}
      </body>
    </html>
  );
}
