import path from 'node:path';

/**
 * Configuration for scripts/generate-route-stubs.ts
 *
 * hostApp – workspace-relative path to the Next.js application that will act as the
 *            single build target (i.e. where stub files are physically generated).
 *            Default is 'apps/web'.  Override to point to any other app if you
 *            want that one to be the central host.
 */
export default {
  hostApp: 'apps/web',
} as const;
