// Detailed dependency reporting script.
// Generates per-package reports (dependency-report.json) and a root summary
// (dependency-report.root.json) with the structure requested by the project
// owner.  It never exits with a non-zero code; the goal is visibility, not CI
// failure.

import fs from 'fs/promises';
import path from 'path';
import fg from 'fast-glob';
import depcheck from 'depcheck';

/** Helpers */
const readJson = async (p: string) => JSON.parse(await fs.readFile(p, 'utf8'));
const exists = (p: string) => fs.access(p).then(() => true).catch(() => false);
const uniq = <T>(arr: T[]) => Array.from(new Set(arr));

/** Load root manifest */
const repoRoot = path.resolve('.');
const rootPkgPath = path.join(repoRoot, 'package.json');
const rootPkg = await readJson(rootPkgPath);
const rootDeps = new Set(Object.keys(rootPkg.dependencies || {}));
const rootDevDeps = new Set(Object.keys(rootPkg.devDependencies || {}));
const internalPkgs = [...rootDeps, ...rootDevDeps].filter((d) => d.startsWith('@repo/'));

// ---- Path-alias support ----------------------------------------------------
// Load alias prefixes from root tsconfig so that imports like `@shared/utils`
// are treated as internal (and therefore NOT flagged as missing deps).
const tsconfigPath = path.join(repoRoot, 'tsconfig.json');
let aliasPrefixes: string[] = [];
try {
  const tsconfig = await readJson(tsconfigPath);
  aliasPrefixes = Object.keys(tsconfig.compilerOptions?.paths || {}).map((k: string) =>
    k.replace(/\*.*$/, ''),
  );
} catch {
  // tsconfig may not exist or be malformed – ignore in that case.
}

const isPathAlias = (name: string) => aliasPrefixes.some((p) => name.startsWith(p));

/** Discover workspaces we care about */
const workspaceDirs = await fg(['apps/*', 'features/*'], { onlyDirectories: true, deep: 1 });

// Accumulators for root report
const aggregateUsedDeps: Record<string, Set<string>> = {};
const aggregateUsedDevDeps: Record<string, Set<string>> = {};
const aggregateMissing: Record<string, Set<string>> = {};
const declarationCollisions: Record<string, Set<string>> = {};

for (const dir of workspaceDirs) {
  const pkgPath = path.join(dir, 'package.json');
  if (!(await exists(pkgPath))) continue;

  const pkg = await readJson(pkgPath);
  const subName: string = pkg.name || path.basename(dir);
  const declaredDeps = Object.keys(pkg.dependencies || {});
  const declaredDevDeps = Object.keys(pkg.devDependencies || {});

  // Track collisions – direct version spec (not workspace:*) duplicates
  const recordCollision = (dep: string) => {
    if (!declarationCollisions[dep]) declarationCollisions[dep] = new Set();
    declarationCollisions[dep].add(subName);
  };
  declaredDeps.forEach((d) => {
    if ((rootDeps.has(d) || rootDevDeps.has(d)) && pkg.dependencies[d] !== 'workspace:*') recordCollision(d);
  });
  declaredDevDeps.forEach((d) => {
    if ((rootDeps.has(d) || rootDevDeps.has(d)) && pkg.devDependencies[d] !== 'workspace:*') recordCollision(d);
  });

  // depcheck analysis
  const dcRes = await depcheck(path.resolve(dir), {
    ignoreBinPackage: false,
    skipMissing: false,
    ignorePatterns: ['dist', '.next', 'build', 'out', '.turbo', 'node_modules'],
  });

  const usedDeps = Object.keys(dcRes.using || {});
  const missingRaw = Object.keys(dcRes.missing || {});
  const unusedDepsArr = dcRes.dependencies || [];
  const unusedDevDepsArr = dcRes.devDependencies || [];

  // Classification for sub-report
  const rootDepsUsed = usedDeps.filter((d) => rootDeps.has(d));
  const rootDevDepsUsed = usedDeps.filter((d) => rootDevDeps.has(d));

  const subDepsUsed = usedDeps.filter((d) => declaredDeps.includes(d));
  const subDevDepsUsed = usedDeps.filter((d) => declaredDevDeps.includes(d));

  const subDepsNotUsed = declaredDeps.filter((d) => !subDepsUsed.includes(d));
  const subDevDepsNotUsed = declaredDevDeps.filter((d) => !subDevDepsUsed.includes(d));

  const collisionDeps = declaredDeps.filter((d) => rootDeps.has(d) && pkg.dependencies[d] !== 'workspace:*');
  const collisionDevDeps = declaredDevDeps.filter((d) => rootDevDeps.has(d) && pkg.devDependencies[d] !== 'workspace:*');

  const missingFiltered = missingRaw.filter(
    (d) =>
      !rootDeps.has(d) &&
      !rootDevDeps.has(d) &&
      !declaredDeps.includes(d) &&
      !declaredDevDeps.includes(d) &&
      !isPathAlias(d),
  );

  // additional heuristic: string search for internal packages that depcheck may miss (e.g. CSS imports)
  const codeFiles = await fg(['**/*.{ts,tsx,js,jsx,css,scss,sass,less}'], {
    cwd: dir,
    dot: false,
    ignore: ['node_modules', 'dist', '.next', 'build', 'out', '.turbo'],
  });
  const fileContentsCache: Record<string, string> = {};
  const markUsedInternal = (pkgName: string) => {
    // track root-level usage
    if (rootDeps.has(pkgName)) {
      if (!aggregateUsedDeps[pkgName]) aggregateUsedDeps[pkgName] = new Set();
      aggregateUsedDeps[pkgName].add(subName);
    } else if (rootDevDeps.has(pkgName)) {
      if (!aggregateUsedDevDeps[pkgName]) aggregateUsedDevDeps[pkgName] = new Set();
      aggregateUsedDevDeps[pkgName].add(subName);
    }
  };

  for (const rel of codeFiles) {
    const abs = path.join(dir, rel);
    let text = fileContentsCache[abs];
    if (!text) {
      try {
        text = await fs.readFile(abs, 'utf8');
        fileContentsCache[abs] = text;
      } catch {
        continue;
      }
    }
    for (const pkgName of internalPkgs) {
      if (text.includes(pkgName)) markUsedInternal(pkgName);
    }
  }

  const subReport = {
    generatedAt: new Date().toISOString(),
    rootLevel: {
      dependenciesUsed: rootDepsUsed.sort(),
      devDependenciesUsed: rootDevDepsUsed.sort(),
    },
    subAppLevel: {
      dependenciesUsed: subDepsUsed.sort(),
      devDependenciesUsed: subDevDepsUsed.sort(),
      dependenciesNotUsed: subDepsNotUsed.sort(),
      devDependenciesNotUsed: subDevDepsNotUsed.sort(),
    },
    collisions: {
      dependencies: collisionDeps.sort(),
      devDependencies: collisionDevDeps.sort(),
    },
    missing: {
      dependencies: missingFiltered.sort(),
    },
  };

  const outPath = path.join(dir, 'dependency-report.json');
  await fs.writeFile(outPath, JSON.stringify(subReport, null, 2));
  console.log(`report → ${outPath}`);

  // Aggregate for root summary
  const addToMap = (map: Record<string, Set<string>>, dep: string) => {
    if (!map[dep]) map[dep] = new Set();
    map[dep].add(subName);
  };
  rootDepsUsed.forEach((d) => addToMap(aggregateUsedDeps, d));
  rootDevDepsUsed.forEach((d) => addToMap(aggregateUsedDevDeps, d));
  missingFiltered.forEach((d) => addToMap(aggregateMissing, d));

  // Merge collisions
  [...collisionDeps, ...collisionDevDeps].forEach((d) => recordCollision(d));
}

/** Build root report */
const usedDepsList = Object.entries(aggregateUsedDeps).map(([dep, apps]) => ({ dep, apps: Array.from(apps).sort() }));
const usedDevDepsList = Object.entries(aggregateUsedDevDeps).map(([dep, apps]) => ({ dep, apps: Array.from(apps).sort() }));

const unusedRootDeps = [...rootDeps].filter((d) => !aggregateUsedDeps[d]);
const unusedRootDevDeps = [...rootDevDeps].filter((d) => !aggregateUsedDevDeps[d]);

const collisionsList = Object.entries(declarationCollisions)
  .filter(([, pkgs]) => pkgs.size > 1)
  .map(([dep, pkgs]) => ({ dep, manifests: Array.from(pkgs).sort() }));

const missingList = Object.entries(aggregateMissing).map(([dep, apps]) => ({ dep, apps: Array.from(apps).sort() }));

const rootReport = {
  generatedAt: new Date().toISOString(),
  used: {
    dependencies: usedDepsList.sort((a, b) => a.dep.localeCompare(b.dep)),
    devDependencies: usedDevDepsList.sort((a, b) => a.dep.localeCompare(b.dep)),
  },
  unused: {
    dependencies: unusedRootDeps.sort(),
    devDependencies: unusedRootDevDeps.sort(),
  },
  collisions: collisionsList.sort((a, b) => a.dep.localeCompare(b.dep)),
  missing: missingList.sort((a, b) => a.dep.localeCompare(b.dep)),
};

await fs.writeFile(path.join(repoRoot, 'dependency-report.root.json'), JSON.stringify(rootReport, null, 2));
console.log('Root dependency-report.root.json generated');
