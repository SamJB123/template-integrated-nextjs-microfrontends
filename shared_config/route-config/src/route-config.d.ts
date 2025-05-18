/**
 * ---------------------------------------------------------------------------
 * Route-config type definitions (pure TypeScript, no runtime lib required)
 * ---------------------------------------------------------------------------
 * These interfaces are consumed by every package’s `routes.config.ts` file
 * and by the generator during the build.
 *
 * A generated declaration file will later provide the `RegistryKey` union of
 * all valid provider keys. Until that is generated we fall back to `string`
 * so that type-checking still passes.
 * ---------------------------------------------------------------------------
 */

// Will be overridden by the generated registry.d.ts; default to string so the
// compiler has something to work with before generation occurs.
export type RegistryKey = string;

/** Mapping of provider registry keys to the slug under the group’s baseRoute */
export type FeatureMap = Record<RegistryKey, string>;

export interface ExposeRouteEntry {
  /** Unique registry key that consumers reference */
  name: RegistryKey;

  /** Short description of what the route renders */
  description: string;

  /**
   * Subfolder inside the package’s `app/` folder that contains the route files.
   * Omit or use `'.'` to reference the root of `app/`.
   */
  internalPath?: string;
}

export interface MountRoutesGroup {
  /** Human-friendly name for this logical group */
  name: string;

  /** Optional explanation for maintainers */
  description?: string;

  /**
   * URL prefix inside the host application. Omitting or using `'.'` mounts at
   * the host root.
   */
  baseRoute?: string;

  /** Mapping of provider registry key → slug (required, non-empty) */
  features: FeatureMap;
}

export interface RoutesConfig {
  /** Routes this package exposes to others */
  exposeRoutes?: ExposeRouteEntry[];

  /** Routes this package mounts from other providers */
  mountRoutes?: MountRoutesGroup[];
}
