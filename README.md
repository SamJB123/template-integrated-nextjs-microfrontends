# Turborepo Tailwind CSS starter

This Turborepo starter is maintained by the Turborepo core team.

## Using this example

Run the following command:

```sh
npx create-turbo@latest -e with-tailwind
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app with [Tailwind CSS](https://tailwindcss.com/)
- `web`: another [Next.js](https://nextjs.org/) app with [Tailwind CSS](https://tailwindcss.com/)
- `ui`: a stub React component library with [Tailwind CSS](https://tailwindcss.com/) shared by both `web` and `docs` applications
- `@repo/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Building packages/ui

This example is set up to produce compiled styles for `ui` components into the `dist` directory. The component `.tsx` files are consumed by the Next.js apps directly using `transpilePackages` in `next.config.ts`. This was chosen for several reasons:

- Make sharing one `tailwind.config.ts` to apps and packages as easy as possible.
- Make package compilation simple by only depending on the Next.js Compiler and `tailwindcss`.
- Ensure Tailwind classes do not overwrite each other. The `ui` package uses a `ui-` prefix for it's classes.
- Maintain clear package export boundaries.

Another option is to consume `packages/ui` directly from source without building. If using this option, you will need to update the `tailwind.config.ts` in your apps to be aware of your package locations, so it can find all usages of the `tailwindcss` class names for CSS compilation.

For example, in [tailwind.config.ts](packages/tailwind-config/tailwind.config.ts):

```js
  content: [
    // app content
    `src/**/*.{js,ts,jsx,tsx}`,
    // include packages if not transpiling
    "../../packages/ui/*.{js,ts,jsx,tsx}",
  ],
```

If you choose this strategy, you can remove the `tailwindcss` and `autoprefixer` dependencies from the `ui` package.

### Feature packages & App-Router integration

This repo lets **any feature package expose its own `app/` route tree** to the host app (`apps/web`) while still benefiting from the real Next.js App-Router (static params, metadata, RSC, etc.).

1. **Opt-in inside the package**
   
   Add an `exposeRoutes` field to the package’s `package.json`:
   
   ```jsonc
   // features/blog/package.json
   {
     "name": "blog",
     "exposeRoutes": { "prefix": "blog" }
   }
   ```
   • `prefix` is the URL mount-point (`/blog`).  If you omit it we default to the package name.

2. **How it works under the hood**
   
   • At the start of **`pnpm dev`** or **`pnpm build`** the script `scripts/generate-route-stubs.ts` runs automatically (see root `package.json` scripts).  
   • It scans every workspace package for `exposeRoutes`, finds every Next.js route file inside `<pkg>/app/**`, and writes a **stub** that re-exports the real file into
     
     ```
     apps/web/app/(feature-routes)/<prefix>/<sameRelativePath>
     ```
   • `(feature-routes)` is a **route-group** so it does not affect the public URL.
   • The stubs are regenerated each time and live only in `apps/web/app/(feature-routes)` (ignored by Git).

3. **Adding a new feature package**

   1. Create your package with a normal `app/` folder.
   2. Add the `exposeRoutes` key shown above.
   3. Run `pnpm dev` – that’s it.  Visit `/blog/…` (or whatever prefix you chose) in the web app.

4. **Things to keep in mind**

   • Don’t leave legacy catch-all hand-off routes (e.g. `[[...slug]]`) at the same level – they will conflict with the generated stubs.  
   • If two packages pick the same `prefix`, you’ll get a build-time route collision.  Choose unique prefixes.

5. **Manual regeneration**

   You can run the script directly if needed:

   ```bash
   pnpm run generate-routes
   ```

Enjoy a zero-symlink, cross-platform way to share pages between packages!

### Why this approach vs. common Next.js micro-frontend patterns?

There are several popular ways to compose multiple teams’ Next.js codebases into one product.  Below is how this repo’s **route-stub system** compares.

| Pattern | Pros | Cons | How our system improves |
|---------|------|------|--------------------------|
| **Standalone apps behind a reverse-proxy** | Truly independent deploys | No shared navigation, hydration boundary at every page, SEO duplication | We keep a *single* Next.js app so navigation is seamless and edge/static optimisation is global. |
| **Module Federation (`@module-federation/nextjs-mf`)** | Runtime-lazy loading of remote pages | Extra bundle size, complicated webpack/RSC edge-cases, remote outages break the shell | Stubs are compiled at build-time, zero runtime indirection, works with any RSC version. |
| **NPM packages with custom router hand-off** | Simple publish/consume | Loses static generation & metadata, type safety, route precedence | Our generator re-injects the real files so App Router regains *all* its features. |
| **Filesystem symlinks** | Mirrors the real files | Windows/CI friction, brittle in monorepos | We generate files instead—cross-platform, rebuilds automatically. |

**Key benefits delivered by this repo’s approach**

* **Full App-Router feature set** – static params, metadata, `revalidate`, loading/error boundaries all just work.
* **Zero runtime penalty** – only a one-time build-time copy; no dynamic `import()` or federation chunk at runtime.
* **Type-safe monorepo DX** – packages compile together, share TS types, ESLint/TSX know the exact component.
* **Edge & static ready** – because pages are real files in the host tree, they can be pre-rendered or deployed to Vercel’s Edge just like any other page.
* **Incremental adoption** – teams can add `"exposeRoutes": true` when ready; existing apps keep working.
* **No custom router to maintain** – delete your hand-off components once stubs are generated.

> In short, you get the maintainability of monorepo packages **and** the performance & SEO of a single cohesive Next.js site, without the complexity of federation or proxy setups.

### Utilities

This Turborepo has some additional tools already setup for you:

- [Tailwind CSS](https://tailwindcss.com/) for styles
- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting
