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

### Feature Packages & App-Router Integration

This repository implements a powerful system for composing Next.js applications from multiple feature packages, allowing each package to expose its own route tree while maintaining full App Router capabilities.

#### 1. Core Concepts

- **Feature Packages**: Self-contained modules that expose routes and components
- **Host Application**: The main Next.js app (`apps/web`) that composes features
- **Route Stubs**: Auto-generated files that connect the host app to feature routes

#### 2. Getting Started

##### 2.1 Create a New Feature Package

1. Create a new directory in `features/` (e.g., `features/blog`)
2. Add a standard Next.js `app/` directory with your routes
3. Create a `routes.config.ts` file:

```typescript
// features/blog/routes.config.ts
import type { RoutesConfig } from '@repo/route-config';

const config: RoutesConfig = {
  exposeRoutes: [
    {
      name: 'blog-root',
      description: 'Blog landing & articles',
      internalPath: '.',
    },
  ]
};

export default config;
```

##### 2.2 Mount Routes in the Host App

Update the host application's `routes.config.ts` to include your feature:

```typescript
// apps/web/routes.config.ts
import type { RoutesConfig } from '@repo/route-config';

const config: RoutesConfig = {
  mountRoutes: [
    {
      name: 'Blog',
      baseRoute: '.',
      features: {
        'blog-root': 'blog',  // Mounts at /blog
      },
    },
  ],
};

export default config;
```

##### 2.3 Run the Application

```bash
# Start the development server
pnpm dev

# Or build for production
pnpm build
```

#### 3. Advanced Usage

##### 3.1 Mounting Multiple Features

You can mount multiple features under different paths:

```typescript
// In routes.config.ts
mountRoutes: [
  {
    name: 'TeamSpace',
    baseRoute: 'team/[teamId]',
    features: {
      'docs-root': 'docs',        // Mounts at /team/[teamId]/docs
      'analytics-root': 'stats',  // Mounts at /team/[teamId]/stats
    },
  },
],
```

##### 3.2 Nested Mounting

Features can mount other features:

```typescript
// features/teams/routes.config.ts
const config: RoutesConfig = {
  exposeRoutes: [
    {
      name: 'teams-root',
      description: 'Teams dashboard',
      internalPath: '.',
    },
  ],
  mountRoutes: [
    {
      name: 'TeamDocs',
      baseRoute: 'team/[teamId]/',
      features: {
        'docs-root': 'docs',  // Mounts at /teams/team/[teamId]/docs
      },
    },
  ],
};
```

#### 4. How It Works

1. **Build-Time Generation**: The `generate-route-stubs` script runs during `dev`/`build`
2. **Route Discovery**: Scans all packages for `routes.config.ts` files
3. **Stub Generation**: Creates type-safe stubs in `apps/web/app/(feature-routes)`
4. **Route Composition**: Assembles the final route tree based on mount configurations

#### 5. Best Practices

- Keep feature packages focused and self-contained
- Use meaningful route names and descriptions
- Document your feature's public API in its README
- Test routes in isolation before mounting

For detailed documentation, see [Next-React-Microfrontends.md](./Next-React-Microfrontends.md)

### Architecture & Benefits

#### Why This Approach?

This system was designed to solve common challenges in large-scale Next.js applications:

- **Team Autonomy**: Multiple teams can work on independent features
- **Code Organization**: Clear boundaries between features
- **Performance**: Zero-runtime overhead for route composition
- **Developer Experience**: Type safety and hot module reloading

#### Comparison with Alternatives

| Pattern | Trade-offs | Our Solution |
|---------|------------|--------------|
| **Monolithic App** | Tight coupling, scaling challenges | ✅ Independent features with clear contracts |
| **Micro-frontends** | Duplicate bundles, hydration issues | ✅ Single bundle, shared dependencies |
| **Module Federation** | Complex setup, runtime overhead | ✅ Build-time composition, zero runtime cost |
| **Package-based** | Manual route management | ✅ Automatic route generation |

#### Key Features

- **Type-Safe Routing**: Full TypeScript support for all routes
- **Build-Time Composition**: No runtime overhead for route mounting
- **Progressive Enhancement**: Start small and add features as needed
- **Standard Next.js**: Uses built-in App Router features only
- **Cross-Platform**: Works on all operating systems and CI environments

For a detailed technical deep dive, see [Next-React-Microfrontends.md](./Next-React-Microfrontends.md)

### Utilities

This Turborepo has some additional tools already setup for you:

- [Tailwind CSS](https://tailwindcss.com/) for styles
- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting
