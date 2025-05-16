import fg from 'fast-glob';
import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * Generates stub route files in the host Next.js app so that the real pages
 * that live inside feature packages are picked up by the Next App Router.
 *
 * Any package.json that contains an `exposeRoutes` field will be processed.
 *
 * The script looks for an optional `prefix` field inside that object; if it is
 * missing, the package name is used. The package must contain an `app/` folder.
 *
 * All recognised Next.js route files (page/layout/loading/error/head etc.) are
 * mirrored into:
 *   apps/web/app/(feature-routes)/<prefix>/<relativePath>
 * and simply re-export everything from the original source file.  Because they
 * live inside a route-group "(feature-routes)", they do not affect URL paths
 * (Next strips group names from the route).  Therefore `/docs/cats` becomes a
 * normal static route even though the implementation lives in
 * `features/docs/app/cats/page.tsx`.
 */

const repoRoot = path.resolve(__dirname, '..');
const HOST_APP_ROOT = path.join(repoRoot, 'apps/web/app');
const OUTPUT_GROUP = '(feature-routes)';
const GENERATED_ROOT = path.join(HOST_APP_ROOT, OUTPUT_GROUP);

// Utility: does path exist?
async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  // 1. Clean any previous output
  await fs.rm(GENERATED_ROOT, { recursive: true, force: true });

  // 2. Find every package.json except those in node_modules or the host app's generated folder
  const packageJsonPaths = await fg(['**/package.json', '!**/node_modules/**', '!apps/web/app/**'], {
    cwd: repoRoot,
    absolute: true,
  });

  // 3. For each package, check for exposeRoutes
  for (const pkgJsonPath of packageJsonPaths) {
    const pkgDir = path.dirname(pkgJsonPath);
    const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8')) as {
      name?: string;
      exposeRoutes?: { prefix?: string } | boolean;
    };

    if (!pkgJson.exposeRoutes) continue;

    const prefix = typeof pkgJson.exposeRoutes === 'object' && pkgJson.exposeRoutes.prefix
      ? (pkgJson.exposeRoutes as any).prefix
      : pkgJson.name;

    if (!prefix) continue;

    const appDir = path.join(pkgDir, 'app');
    if (!(await exists(appDir))) continue;

    // 4. Enumerate all recognised route files inside that app tree
    const routeFiles = await fg(
      '**/{page,layout,loading,error,head,not-found,template,route}.@(js|jsx|ts|tsx)',
      { cwd: appDir }
    );

    for (const rel of routeFiles) {
      const srcExt = path.extname(rel); // .tsx etc
      const destRel = path.join(prefix, rel).replace(/\\/g, '/'); // normalise
      const destPath = path.join(GENERATED_ROOT, destRel);
      await fs.mkdir(path.dirname(destPath), { recursive: true });

      // Build module specifier WITHOUT extension for cleaner imports.
      const importSpecifier = `${pkgJson.name}/app/${rel.replace(/\\/g, '/').replace(/\.[^.]+$/, '')}`;

      const stub = `export { default } from '${importSpecifier}';\nexport * from '${importSpecifier}';\n`;
      await fs.writeFile(destPath, stub, 'utf8');
    }
  }

  console.log('✅ Route stubs generated');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
