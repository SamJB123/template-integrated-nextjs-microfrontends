import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Given a workspace-relative path (e.g. 'apps/web'), returns the package name from its package.json
 */
export async function getPackageNameFromPath(pkgPath: string): Promise<string | undefined> {
  const pkgJsonPath = path.resolve(pkgPath, 'package.json');
  try {
    const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
    return pkgJson.name;
  } catch (err) {
    return undefined;
  }
}

