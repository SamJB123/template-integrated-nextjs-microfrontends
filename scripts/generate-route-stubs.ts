import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fg from 'fast-glob';
import fs from 'node:fs/promises';
import routeStubConfig from '../shared_config/route-config/route-stubs.config.js';
import { argv, env } from 'node:process';

// Node ESM equivalent of __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRootEnv = path.resolve(__dirname, '..');
dotenv.config(); // load .env
dotenv.config({ path: path.join(repoRootEnv, '.env.local'), override: true });

/**
 * Generates stub route files in the host Next.js app (or a specified target) so that the real pages
 * that live inside feature packages are picked up by the Next App Router.
 *
 * Usage:
 *   pnpm exec tsx scripts/generate-route-stubs.ts [--hostApp apps/web]
 *   HOST_APP=apps/web pnpm exec tsx scripts/generate-route-stubs.ts
 *
 * Priority: CLI --hostApp > env.HOST_APP > config file > default 'apps/web'
 *
 * All recognised Next.js route files (page/layout/loading/error/head etc.) are
 * mirrored into:
 *   <hostApp>/app/(feature-routes)/<prefix>/<relativePath>
 * and simply re-export everything from the original source file.  Because they
 * live inside a route-group "(feature-routes)", they do not affect URL paths
 * (Next strips group names from the route).
 */

const repoRoot = path.resolve(__dirname, '..');
function getHostAppRel(): string {
  // 1. CLI arg --hostApp
  const cliArg = argv.find((a) => a.startsWith('--hostApp'));
  if (cliArg) {
    const idx = argv.indexOf(cliArg);
    if (cliArg.includes('=')) return cliArg.split('=')[1]!;
    if (argv[idx + 1]) return argv[idx + 1]!;
  }
  // 2. Env var
  if (env.HOST_APP) return env.HOST_APP;
  // 3. Config file
  if ((routeStubConfig as any).hostApp) return (routeStubConfig as any).hostApp;
  // 4. Default
  return 'apps/web';
}
const HOST_APP_REL = String(getHostAppRel() ?? 'apps/web');
const HOST_APP_ROOT = path.join(repoRoot, HOST_APP_REL, 'app');
const OUTPUT_GROUP = '(feature-routes)';
const GENERATED_ROOT = path.join(repoRoot, HOST_APP_REL, 'app', OUTPUT_GROUP);
// Path to generated d.ts that makes stub re-exports type-safe for TS
const DECLARATION_PATH = path.join(repoRoot, HOST_APP_REL, 'types', 'generated-route-modules.d.ts');
// Optional debug snapshot of full registry
const SNAPSHOT_PATH = path.join(repoRoot, HOST_APP_REL, '.generated', 'route-registry.json');

// Utility: does path exist?
async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

import type { Options as FGOptions } from 'fast-glob';
import type { RoutesConfig } from '@shared/route-config';

interface ExposeEntry {
  name: string; // registry key
  description?: string; // human help text
  internalPath?: string; // relative folder within app/, defaults to '.'
}

interface MountEntry {
  route: string; // registry key of provider expose entry
  baseRoute: string; // URL segment(s) where the feature mounts inside the consumer
}

// Helper to import TS/JS config fresh each time (avoid Node import cache during repeated runs)
async function freshImport(filePath: string) {
  const url = new URL(pathToFileURL(filePath));
  url.search = `v=${Date.now()}`; // cache-bust per run
  return import(url.href);
}

async function main() {
  // 1. Clean any previous output
  await fs.rm(GENERATED_ROOT, { recursive: true, force: true });

  // 2. Find every package.json except those in node_modules or the host app's generated folder
  const packageJsonPaths = await fg(['**/package.json', '!**/node_modules/**', '!apps/web/app/**'], {
    cwd: repoRoot,
    absolute: true,
  });

  // Build registry of exposed route groups
  interface RegistryItem {
    srcPkg: string;
    internalPath: string; // relative folder within provider app/
    routeFiles: string[]; // relative to internalPath root
    description?: string;
  }
  const registry = new Map<string, RegistryItem>();
  const consumerMounts: Array<{ srcPkg: string; routeFiles: string[]; mountPrefix: string }> = [];
  // Track where each package itself is mounted in the host (may be multiple locations)
  const pkgMountPrefixes = new Map<string, Set<string>>(); // pkgName -> set of prefixes

  for (const pkgJsonPath of packageJsonPaths) {
    const pkgDir = path.dirname(pkgJsonPath);

    // 2A. Load optional routes.config.ts/ .js
    let routesConfig: RoutesConfig | undefined;
    const cfgTs = path.join(pkgDir, 'routes.config.ts');
    const cfgJs = path.join(pkgDir, 'routes.config.js');
    if (await exists(cfgTs)) {
      routesConfig = (await freshImport(cfgTs)).default as RoutesConfig;
    } else if (await exists(cfgJs)) {
      routesConfig = (await freshImport(cfgJs)).default as RoutesConfig;
    }

    const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8')) as { name?: string };

    const appDir = path.join(pkgDir, 'app');
    const hasApp = await exists(appDir);

    // ------------------ Handle exposeRoutes ------------------
    const expose = routesConfig?.exposeRoutes;
    if (expose && hasApp) {
      let exposeEntries: ExposeEntry[] = [];

      if (Array.isArray(expose)) {
        exposeEntries = expose;
      } else if (expose) {
        console.warn(
          `⚠️  exposeRoutes in ${pkgJson.name ?? path.basename(pkgDir)} must be an array; legacy object syntax is no longer supported.`,
        );
      }

      for (const entry of exposeEntries) {
        const internalPath = entry.internalPath ?? '.';
        const internalAbs = path.join(appDir, internalPath);
        if (!(await exists(internalAbs))) continue;

        const globPattern = '**/{page,layout,loading,error,head,not-found,template,route}.@(js|jsx|ts|tsx)';
        const routeFiles = await fg(globPattern, { cwd: internalAbs } as FGOptions);

        registry.set(entry.name, {
          srcPkg: pkgJson.name!,
          internalPath,
          routeFiles,
          description: entry.description,
        });
      }
    }
  }

  // ------------------ Gather consumer mounts ------------------
  // Ensure host app (apps/web) is processed first so its mounts establish prefixes before others
  const sortedPkgJsonPaths = [...packageJsonPaths].sort((a, b) => {
    const aHost = a.includes(path.join('apps', 'web'));
    const bHost = b.includes(path.join('apps', 'web'));
    if (aHost && !bHost) return -1;
    if (!aHost && bHost) return 1;
    return a.localeCompare(b);
  });

  for (const pkgJsonPath of sortedPkgJsonPaths) {
    const pkgDir = path.dirname(pkgJsonPath);

    // Load same routes config if present
    let routesConfig: RoutesConfig | undefined;
    const cfgTs = path.join(pkgDir, 'routes.config.ts');
    const cfgJs = path.join(pkgDir, 'routes.config.js');
    if (await exists(cfgTs)) {
      routesConfig = (await freshImport(cfgTs)).default as RoutesConfig;
    } else if (await exists(cfgJs)) {
      routesConfig = (await freshImport(cfgJs)).default as RoutesConfig;
    }

    const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8')) as { name?: string };

    const mountGroups = (routesConfig?.mountRoutes ?? []) as any[];

    if (!mountGroups || mountGroups.length === 0) continue;

    const consumerPrefixes = pkgMountPrefixes.get(pkgJson.name ?? '') ?? new Set(['']);

    for (const grp of mountGroups) {
      const baseSeg = grp.baseRoute && grp.baseRoute !== '.' ? grp.baseRoute : '';
      for (const [key, slug] of Object.entries(grp.features)) {
        const regItem = registry.get(key);
        if (!regItem) {
          console.warn(`⚠️  mountRoutes: route key '${key}' not found (package ${pkgJson.name})`);
          continue;
        }
        const slugStr = String(slug);
        for (const consumerPrefix of consumerPrefixes) {
          const mountPrefix = consumerPrefix
            ? path.posix.join(consumerPrefix, baseSeg ? path.posix.join(baseSeg, slugStr) : slugStr)
            : baseSeg
            ? path.posix.join(baseSeg, slugStr)
            : slugStr;

          consumerMounts.push({
            srcPkg: regItem.srcPkg,
            routeFiles: regItem.routeFiles.map((r) =>
              path.posix.join(regItem.internalPath === '.' ? '' : regItem.internalPath, r),
            ),
            mountPrefix,
          });

          // record provider mounting position for nested consumers
          if (!pkgMountPrefixes.has(regItem.srcPkg)) pkgMountPrefixes.set(regItem.srcPkg, new Set());
          pkgMountPrefixes.get(regItem.srcPkg)!.add(mountPrefix);
        }
      }
    }
  }

  // Helper to write stub for a single route file
  async function writeStub(srcPkg: string, routeRel: string, destPrefix: string) {
    const importSpecifier = `${srcPkg}/app/${routeRel.replace(/\\/g, '/').replace(/\.[^.]+$/, '')}`;
    const destRel = path.join(destPrefix, routeRel).replace(/\\/g, '/');
    const destPath = path.join(GENERATED_ROOT, destRel);
    await fs.mkdir(path.dirname(destPath), { recursive: true });
    const stub = `export { default } from '${importSpecifier}';\nexport * from '${importSpecifier}';\n`;
    await fs.writeFile(destPath, stub, 'utf8');
  }

  // Emit stubs for all mounts (including self-mounts) derived from mountRoutes
  for (const cm of consumerMounts) {
    for (const routeRel of cm.routeFiles) {
      await writeStub(cm.srcPkg, routeRel, cm.mountPrefix);
    }
  }

  // ------------------ Write TS declaration file ------------------
  const providerPkgs = new Set<string>();
  registry.forEach((v) => providerPkgs.add(v.srcPkg));

  let dts = '// AUTO-GENERATED by scripts/generate-route-stubs.ts — DO NOT EDIT\n\n';
  dts += 'export interface RegistryEntry { srcPkg: string; description?: string }\n';
  dts += 'export interface Registry {\n';
  registry.forEach((v, k) => {
    dts += `  '${k}': RegistryEntry;\n`;
  });
  dts += '}\n\nexport type RegistryKey = keyof Registry;\n\n';
  for (const pkg of providerPkgs) {
    dts += `declare module '${pkg}/app/*';\n`;
  }

  await fs.mkdir(path.dirname(DECLARATION_PATH), { recursive: true });
  await fs.writeFile(DECLARATION_PATH, dts, 'utf8');

  // ------------------ Optional registry snapshot ------------------
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  if (process.env.ROUTE_REGISTRY_SNAPSHOT?.toLowerCase() === 'true') {
    const registryObj: Record<string, any> = {};
    registry.forEach((v, k) => {
      registryObj[k] = v;
    });
    await fs.mkdir(path.dirname(SNAPSHOT_PATH), { recursive: true });
    await fs.writeFile(SNAPSHOT_PATH, JSON.stringify(registryObj, null, 2), 'utf8');
    console.log('📝 Route registry snapshot written to ' + path.relative(repoRoot, SNAPSHOT_PATH));
  }

  console.log('✅ Route stubs & type declarations generated');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
