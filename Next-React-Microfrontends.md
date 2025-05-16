# Embedding a Stand‑Alone Next.js App‑Router Package Under a Catch‑All Route (Pattern A)

This recipe shows how to **mount a self‑contained App‑Router package (“Package A”) under a single optional catch‑all route of another Next.js application (“Main App”)** while preserving:

* **SSR / streaming HTML**  
* **Per‑page metadata, SSG / ISR, and SEO**  
* **Shared React context and providers**  
* **Isolated local‑dev for the package**

The helpers scale automatically: when the Package A team adds `src/app/foo/bar/page.tsx`, it is picked up at build‑time—no host changes required.

---

## 1  When Pattern A is the right tool

| Need \ Pattern                | **Pattern A – wrapper + catch‑all** | Pattern B – copy/symlink package_a/src/app |
| ----------------------------- | :---------------------------------- | :---------------------------------------- |
| Single mount‐point (`/package_a/**`) | ✅ easiest | ✅ |
| Package runs alone in dev     | ✅ | ✅ |
| Keep host glue minimal        | ✅ one folder | ❌ duplicates file tree |
| Inner `layout.tsx`, `loading.tsx` auto‑wired | 🔧 manual fwd | ✅ |
| Full file‑router behaviour    | 🔧 manual fwd | ✅ |

Choose Pattern A for design‑system bundles, micro‑front‑ends, or feature modules where a single URL subtree is fine.

---

## 2  Folder layout

```
monorepo/
├─ packages/
│   └─ package_a/
│       └─ src/
│           └─ app/
│               ├─ layout.tsx
│               ├─ page.tsx
│               └─ [...slug]/page.tsx
│           ├─ router.tsx        ← <PackageARouter/>
│           └─ ssr.ts            ← helpers (generateStaticParams / Metadata)
└─ mainapp/
    ├─ next.config.js
    └─ src/app/package_a/
        ├─ layout.tsx
        └─ [[...slug]]/
            ├─ page.tsx
            ├─ generateMetadata.ts
            └─ generateStaticParams.ts
```

---

## 3  Step‑by‑step

### 3.1  Transpile the workspace package

```js
// mainapp/next.config.js
module.exports = {
  experimental: { appDir: true },
  transpilePackages: ['package_a'],   // 👈 makes TS/ESM inside the package part of the build
};
```

### 3.2  Expose three things from Package A

* **`PackageARouter`** – runtime hand‑off  
* **`generateStaticParams`** – lists every page file found by a glob  
* **`generateMetadata`** – pulls each page’s own metadata export

```tsx
/* packages/package_a/src/router.tsx */
import CatchAll from './app/[...slug]/page';
export function PackageARouter({ slug }: { slug?: string[] }) {
  return <CatchAll params={{ slug }} />;
}
```

```ts
/* packages/package_a/src/ssr.ts */
import fg from 'fast-glob';
import path from 'node:path';
import type { Metadata } from 'next';

const ROOT = path.join(__dirname, 'src/app');
const PAGES = await fg('**/page.@(js|jsx|ts|tsx)', { cwd: ROOT, absolute: true });

const toSlug = (file: string) =>
  path.relative(ROOT, file)
       .replace(/\/page\.[^/]+$/, '')
       .split(path.sep)
       .filter(Boolean);

export async function generateStaticParams() {
  return PAGES.map((p) => ({ slug: toSlug(p) }));
}

export async function generateMetadata(
  { params }: { params: { slug?: string[] } }
): Promise<Metadata> {
  const slugArr = params.slug ?? [];
  const match = PAGES.find((p) =>
    JSON.stringify(toSlug(p)) === JSON.stringify(slugArr)
  );
  if (!match) return { title: 'Package A' };
  const mod = await import(match);
  if (mod.metadata) return mod.metadata as Metadata;
  if (typeof mod.generateMetadata === 'function')
    return mod.generateMetadata({ params });
  return { title: slugArr.length ? `Package A – ${slugArr.join(' / ')}` : 'Package A' };
}
```

```ts
/* packages/package_a/index.ts */
export * from './src/router';
export * from './src/ssr';
export { default as PackageALayout } from './src/app/layout';
```

### 3.3  Mount once in the host

```tsx
// mainapp/src/app/package_a/[[...slug]]/page.tsx
import { PackageARouter } from 'package_a';
export default function PackageAPage({ params }: { params: { slug?: string[] } }) {
  return <PackageARouter slug={params.slug} />;
}
```

```ts
// generateStaticParams.ts
export { generateStaticParams } from 'package_a';
// generateMetadata.ts
export { generateMetadata } from 'package_a';
```

```tsx
// mainapp/src/app/package_a/layout.tsx
import MainLayout from '../layout';
import { PackageALayout } from 'package_a';
export default function PackageAWrapper({ children }) {
  return (
    <MainLayout>
      <PackageALayout>{children}</PackageALayout>
    </MainLayout>
  );
}
```

---

## 4  Using `next/navigation` inside Package A

*In client components*:

```tsx
'use client';
import { useParams, useRouter } from 'next/navigation';

export function GoSettings() {
  const { slug = [] } = useParams<{ slug?: string[] }>();
  const router = useRouter();
  return (
    <button onClick={() => router.push('/package_a/' + [...slug,'settings'].join('/'))}>
      Settings
    </button>
  );
}
```

* `useParams()` returns `{ slug: ['foo','bar'] }` for `/package_a/foo/bar`.  
* First paint is still server‑rendered; client navigation is deferred until hydration.

---

## 5  What you get

| Capability | Status |
| ---------- | ------ |
| Server‑side HTML & streaming | ✅ |
| Static generation / ISR | ✅ via glob helper |
| Per‑page metadata, OG images | ✅ pulled automatically |
| Unlimited nested pages inside package | ✅ auto‑discovered |
| React context sharing | ✅ host layouts wrap package layouts |
| Dev workflow (`pnpm -F package_a dev`) | ✅ |

---

## 6  Troubleshooting

| Issue | Fix |
| ----- | --- |
| Duplicate‑React errors | Ensure workspace hoists a single `react` + `react-dom`. |
| Package CSS missing | Import in `PackageALayout` (`import './globals.css'`). |
| Need `loading.tsx` per folder | Switch to Pattern B (copy/symlink `app/`). |
| Env vars missing in prod | Mirror them in host deployment config. |

---

## 7  Migration path

*Stay in Pattern A* until you truly need folder‑level `loading.tsx`, parallel routes, or static file routes.  
Then **copy or symlink** `packages/package_a/src/app → mainapp/src/app/package_a` (Pattern B). HMR for symlinks was fixed in Next 14.

---

## 8  Quick commands

```bash
# Dev
pnpm --filter package_a dev   # isolated
pnpm --filter mainapp dev     # integrated view

# Build single artefact
pnpm --filter mainapp build
```

---

### Enjoy embedded packages with zero routing headaches!