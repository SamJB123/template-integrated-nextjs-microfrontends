# Feature-Package Integration via Automatic Route-Stub Generation

This document describes how a Next.js feature package (e.g., a microfrontend or a feature module) can expose its own App Router routes to a host Next.js application (`apps/web` in this project) using an automatic route-stub generation system. This approach preserves:

*   **Full App Router Feature Set**: Static params, dynamic params, metadata, `revalidate`, loading/error boundaries, RSC, Server Actions.
*   **SSR / Streaming HTML**.
*   **Per-page metadata, SSG / ISR, and SEO** (handled by individual pages within the feature package).
*   **Shared React Context and Providers** (through standard Next.js layout nesting).
*   **Isolated Local Development** for the feature package.
*   **Type-Safe Monorepo DX**: Packages compile together, share TS types.
*   **Zero Runtime Penalty**: Stubs are build-time generated re-exports.

This system scans opted-in feature packages for Next.js route files (pages, layouts, route handlers) within their `app/` directory and generates corresponding "stub" files in the host application. These stubs simply re-export the original files, effectively making the feature package's routes part of the host application's route tree.

---

## 1  Key Benefits of the Route-Stub System

This route-stub generation approach offers several advantages over common Next.js microfrontend patterns:

| Benefit                               | Description                                                                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Full App-Router Feature Set**       | Static params, metadata, `revalidate`, loading/error boundaries, RSC, Server Actions all work as expected.                                |
| **Zero Runtime Penalty**              | Stubs are generated at build-time and are simple re-exports; no dynamic `import()` or federation chunk overhead at runtime.                 |
| **Type-Safe Monorepo DX**             | Feature packages and the host app can share TypeScript types. ESLint and TSX tooling correctly identify components and their sources.       |
| **Edge & Static Ready**               | Because pages become part of the host's file tree via stubs, they can be pre-rendered or deployed to Vercel's Edge like any other page.     |
| **Minimal Host Glue**                 | Once a package opts in, its routes are automatically available. No manual host-side changes are needed for new routes within the package. |
| **No Custom Router to Maintain**      | Eliminates the need for complex hand-off components or manual routing logic in the host for microfrontend integration.                    |
| **Cross-Platform Compatibility**      | Generates files instead of relying on symlinks, ensuring robust behavior on Windows, macOS, and CI environments.                          |
| **Incremental Adoption**              | Teams can add `"exposeRoutes": true` to their package.json when ready; existing apps and other integration methods continue to work.     |

This system aims to provide the maintainability of monorepo packages with the performance and SEO benefits of a single, cohesive Next.js site, without the complexities of module federation or reverse proxy setups.

---

## 2  Folder Layout

```
monorepo/
├─ features/
│   └─ docs/  (Example Feature Package, formerly "Package A")
│       ├─ package.json        ← Must contain "exposeRoutes" to opt-in
│       └─ app/                ← Standard Next.js App Router directory
│           ├─ layout.tsx
│           ├─ page.tsx
│           └─ [...slug]/
│               └─ page.tsx
│           (other routes, route.ts files, etc.)
│
├─ apps/
│   └─ web/  (Main Application / Host)
│       ├─ next.config.ts
│       └─ app/
│           └─ (feature-routes)/ ← Route group for generated stubs (doesn't affect URL)
│               └─ docs/         ← Corresponds to "prefix" in feature package's exposeRoutes
│                   ├─ layout.tsx              ┐
│                   ├─ page.tsx                ├─ Generated stubs re-exporting
│                   └─ [...slug]/              │  files from features/docs/app/...
│                       └─ page.tsx            ┘
│
└─ scripts/
    └─ generate-route-stubs.ts ← Script responsible for generating the stubs
```
*   The `(feature-routes)` directory in `apps/web/app/` is a Next.js Route Group, meaning it doesn't add a segment to the URL (e.g., `features/docs/app/page.tsx` becomes available at `/docs` in the host app, not `/feature-routes/docs`).
*   Stubs are git-ignored and regenerated as needed.

---

## 3  Step‑by‑step

### 3.1  Transpile the Feature Package

The host application needs to be configured to transpile the feature package.

```ts
// apps/web/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ... other configurations
  transpilePackages: ['docs'], // 👈 'docs' is the name of the feature package
};

export default nextConfig;
```

### 3.2  Define Routes in the Feature Package and Opt-In

1.  **Create standard App Router routes:**
    Inside your feature package (e.g., `features/docs`), structure your routes within the `app/` directory as you would in a standalone Next.js application. This includes `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `template.tsx`, and `route.ts` files.

    ```tsx
    // features/docs/app/layout.tsx
    export default function DocsLayout({ children }: { children: React.ReactNode }) {
      return (
        <section>
          <h2>Docs Section Layout</h2>
          {children}
        </section>
      );
    }
    ```

    ```tsx
    // features/docs/app/page.tsx
    export default function DocsRootPage() {
      return <h1>Welcome to Docs</h1>;
    }
    ```

    ```tsx
    // features/docs/app/settings/page.tsx
    import type { Metadata } from 'next';

    export const metadata: Metadata = {
      title: 'Docs Settings',
    };

    export default function SettingsPage() {
      return <p>Docs Settings Page</p>;
    }
    ```
    For pages requiring static generation (`generateStaticParams`) or dynamic metadata (`generateMetadata`), these functions should be exported from the respective `page.tsx` or `layout.tsx` files within the feature package.

2.  **Opt-in via `package.json`:**
    Add an `exposeRoutes` field to the feature package's `package.json`.

    ```jsonc
    // features/docs/package.json
    {
      "name": "docs", // This is used if prefix is omitted
      "version": "1.0.0",
      // ... other fields
      "exposeRoutes": {
        "prefix": "docs" // URL mount point (e.g., /docs). Defaults to package name if omitted.
      }
    }
    ```

### 3.3  Automatic Route-Stub Generation

A script (e.g., `scripts/generate-route-stubs.ts`) handles the creation of stub files in the host application.

*   **Execution**: This script typically runs automatically at the start of `pnpm dev` or `pnpm build` (configured in the root `package.json`'s scripts). It can also be run manually (e.g., `pnpm run generate-routes`).
*   **Functionality**:
    *   Scans all workspace packages for the `exposeRoutes` key in their `package.json`.
    *   For each opted-in package, it finds every Next.js route file (e.g. `page.tsx`, `layout.tsx`, `route.ts`) inside its `app/` directory.
    *   Generates a corresponding "stub" file in the host application under `apps/web/app/(feature-routes)/<prefix>/<sameRelativePath>`.
*   **Stub File Example**:
    If `features/docs/app/team/[id]/page.tsx` exists, a stub will be generated at `apps/web/app/(feature-routes)/docs/team/[id]/page.tsx` with content similar to:

    ```ts
    // apps/web/app/(feature-routes)/docs/team/[id]/page.tsx (Auto-generated stub)
    export * from 'docs/app/team/[id]/page'; // Re-exports named exports (e.g., generateMetadata, generateStaticParams, Server Actions)
    export { default } from 'docs/app/team/[id]/page'; // Re-exports the default export (the page component)
    ```
    Similarly, `features/docs/app/layout.tsx` would have a corresponding stub at `apps/web/app/(feature-routes)/docs/layout.tsx` re-exporting it.

This ensures that all exports from the original feature package's route files, including page components, layouts, metadata, static generation functions, and server actions, are correctly exposed to the host Next.js application.

---

## 4  Using `next/navigation` inside the Feature Package

Navigation hooks like `useRouter` and `useParams` from `next/navigation` work as expected within client components in the feature package.

*In client components (`'use client';`):*

```tsx
// Example: features/docs/app/some/component.tsx
'use client';
import { useParams, useRouter, usePathname } from 'next/navigation';

export function MyClientComponent() {
  const router = useRouter();
  const params = useParams(); // e.g., { slug: ['foo','bar'] } if path is /docs/foo/bar and route file is [...slug]/page.tsx
  const pathname = usePathname(); // e.g., /docs/foo/bar

  function goToSettings() {
    // router.push constructs paths relative to the host app's root.
    // If the feature 'docs' is mounted at /docs, and current page is /docs/foo
    // and you want to go to /docs/settings:
    router.push('/docs/settings');
  }

  return (
    <div>
      <p>Current Path (within host): {pathname}</p>
      <p>Params: {JSON.stringify(params)}</p>
      <button onClick={goToSettings}>Go to Docs Settings</button>
    </div>
  );
}
```
*   `useParams()` will return parameters based on the dynamic segments defined in the feature package's route file names (e.g., `[slug]`, `[...ids]`).
*   `useRouter().push()` paths should be absolute from the host application's root (e.g., `/docs/another-page`).
*   First paint is server-rendered by the host; client navigation is deferred until hydration.

---

## 5  What you get

| Capability                      | Status | Notes                                                                                                |
| ------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| Server‑side HTML & streaming    | ✅     | Standard Next.js behavior.                                                                           |
| Static Generation / ISR         | ✅     | Export `generateStaticParams` from page/layout files in the feature package.                         |
| Per‑page metadata, OG images    | ✅     | Export `metadata` or `generateMetadata` from page/layout files in the feature package.                 |
| Unlimited nested pages in package| ✅     | Auto‑discovered by the `generate-route-stubs.ts` script.                                           |
| React context sharing           | ✅     | Standard Next.js layout nesting ensures host layouts can wrap feature package content.               |
| Isolated dev for feature package| ✅     | E.g., `pnpm --filter docs dev`.                                                                        |
| Loading & Error UI              | ✅     | Define `loading.tsx`, `error.tsx` in the feature package's `app` dir.                                |
| Route Handlers (API routes)     | ✅     | Define `route.ts` files in the feature package's `app` dir.                                          |
| Server Actions                  | ✅     | Define and export Server Actions from components/pages in the feature package.                       |
| Minimal host app changes        | ✅     | Stubs are auto-generated; no manual wiring per route in the host.                                    |

---

## 6  Troubleshooting & Key Considerations

| Issue / Consideration                   | Fix / Explanation                                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Duplicate‑React errors                  | Ensure your monorepo setup hoists a single version of `react` and `react-dom`.                                                             |
| Feature Package CSS missing             | Ensure CSS is imported correctly within the feature package's components or layout (e.g., `import './globals.css'` in `features/docs/app/layout.tsx`). |
| Routes not appearing / 404s             | 1. Check `exposeRoutes` in `package.json`. 2. Ensure `prefix` is correct. 3. Manually run `pnpm run generate-routes` and check `apps/web/app/(feature-routes)/` for stubs. 4. Check for build errors from the script. |
| Build-time route collision              | If two packages pick the same `prefix` for `exposeRoutes`, Next.js will error. Ensure prefixes are unique.                                   |
| Env vars missing in prod for package    | Environment variables needed by the feature package must be available in the host application's deployment environment.                    |
| Gitignore for generated stubs           | The directory for generated stubs (e.g., `apps/web/app/(feature-routes)/`) should be in `.gitignore`.                                       |
| Understanding path resolution         | Imports within the feature package (e.g., `import '@/components/...'`) use the feature package's path aliases. Stubs re-export, so this works. |
| Legacy catch-all routes                 | Avoid pre-existing catch-all routes (e.g. `[[...slug]]`) in the host app at the same level as a generated prefix, as they might conflict. |

---

## 7  Quick commands (Example with 'docs' feature package)

```bash
# Isolated development for the 'docs' feature package
pnpm --filter docs dev

# Integrated view: run the main web app (which includes 'docs' via stubs)
pnpm --filter web dev

# Manually regenerate route stubs (if needed)
pnpm run generate-routes

# Build the main web app (single artefact including all features)
pnpm --filter web build
```

---

### Enjoy seamless feature integration with full App Router power!