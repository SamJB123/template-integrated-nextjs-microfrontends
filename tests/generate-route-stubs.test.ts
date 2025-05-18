import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { describe, it, beforeEach, expect } from 'vitest';
import os from 'os';
import stubCfg from '../shared_config/route-config/route-stubs.config.js';

const repoRoot = path.resolve(__dirname, '..');
const hostAppRel = (stubCfg as any).hostApp || 'apps/web';
const GENERATED_ROOT = path.join(repoRoot, hostAppRel, 'app', '(feature-routes)');

function runGenerator() {
  execSync('pnpm run generate-routes', { cwd: repoRoot, stdio: 'inherit' });
}

describe('route stub generation', () => {
  // fresh stubs for every individual test to avoid cross-test interference
  beforeEach(() => {
    runGenerator();
  });

  it('generates host stubs when a provider specifies a defaultUrl (provider self-mount)', async () => {
    const hostCfgPath = path.join(repoRoot, hostAppRel, 'routes.config.ts');
    const { default: hostCfg } = await import(hostCfgPath);

    const grp = hostCfg.mountRoutes.find((g: any) => g.features['docs-root']);
    const segs: string[] = [];
    if (grp.baseRoute && grp.baseRoute !== '.') segs.push(...grp.baseRoute.split('/'));
    segs.push(grp.features['docs-root']);

    const docsRoot = path.join(GENERATED_ROOT, ...segs, 'page.tsx');
    await expect(fs.access(docsRoot)).resolves.not.toThrow();
  });

  it('allows a consumer package to mount a provider’s routes at a custom path', async () => {
    const hostCfgPath = path.join(repoRoot, hostAppRel, 'routes.config.ts');
    const { default: hostCfg } = await import(hostCfgPath);
    const teamsCfgPath = path.join(repoRoot, 'features', 'teams', 'routes.config.ts');
    const { default: teamsCfg } = await import(teamsCfgPath);

    // host prefix for teams
    const hostGrp = hostCfg.mountRoutes.find((g: any) => g.features['teams-root']);
    const hostSegs: string[] = [];
    if (hostGrp.baseRoute && hostGrp.baseRoute !== '.') hostSegs.push(...hostGrp.baseRoute.split('/'));
    hostSegs.push(hostGrp.features['teams-root']);

    // teams mounts docs-root inside its own app
    const teamsGrp = teamsCfg.mountRoutes.find((g: any) => g.features['docs-root']);
    const teamSegs: string[] = [];
    if (teamsGrp.baseRoute && teamsGrp.baseRoute !== '.') teamSegs.push(...teamsGrp.baseRoute.split('/'));
    teamSegs.push(teamsGrp.features['docs-root']);

    const teamDocs = path.join(GENERATED_ROOT, ...hostSegs, ...teamSegs, 'page.tsx');
    await expect(fs.access(teamDocs)).resolves.not.toThrow();
  });

  it('supports providers that expose routes but do NOT define a defaultUrl (pure libraries)', async () => {
    // verify stub exists at consumer-defined internalPath
    const teamsCfgPath = path.join(repoRoot, 'features', 'teams', 'routes.config.ts');
    const { default: teamsCfg } = await import(teamsCfgPath);
    const hostCfgPath = path.join(repoRoot, hostAppRel, 'routes.config.ts');
    const { default: hostCfg } = await import(hostCfgPath);
    const hostGrp = hostCfg.mountRoutes.find((g: any) => g.features['teams-root']);
    const hostSegs: string[] = [];
    if (hostGrp.baseRoute && hostGrp.baseRoute !== '.') hostSegs.push(...hostGrp.baseRoute.split('/'));
    hostSegs.push(hostGrp.features['teams-root']);

    const mount = teamsCfg.mountRoutes.find((g: any) => g.features['metrics-root']);
    const segs: string[] = [];
    if (mount.baseRoute && mount.baseRoute !== '.') segs.push(...mount.baseRoute.split('/'));

    const dir = path.join(GENERATED_ROOT, ...hostSegs, ...segs);
    await expect(fs.access(dir)).resolves.not.toThrow();
  });

  it('deletes obsolete stub files on each run so removed routes do not linger', async () => {
    const staleDir = path.join(GENERATED_ROOT, 'obsolete');
    const staleFile = path.join(staleDir, 'page.tsx');
    await fs.mkdir(staleDir, { recursive: true });
    await fs.writeFile(staleFile, '// stale file', 'utf8');

    // Sanity check file exists
    await expect(fs.access(staleFile)).resolves.not.toThrow();

    // Run generator again – should wipe obsolete dir
    runGenerator();

    await expect(fs.access(staleFile)).rejects.toThrow();
  });

  it('updates stubs when a consumer changes where it mounts a provider’s routes', async () => {
    const tempConsumerDir = path.join(repoRoot, 'features', 'temp-consumer');
    const cfgPath = path.join(tempConsumerDir, 'routes.config.ts');
    const pkgJsonPath = path.join(tempConsumerDir, 'package.json');

    // Clean slate
    await fs.rm(tempConsumerDir, { recursive: true, force: true });
    await fs.mkdir(tempConsumerDir, { recursive: true });

    await fs.writeFile(
      pkgJsonPath,
      JSON.stringify({ name: 'temp-consumer', version: '1.0.0' }, null, 2) + os.EOL,
      'utf8',
    );

    const makeConfig = (base: string) => `import type { RoutesConfig } from '@repo/route-config';

const config: RoutesConfig = {
  mountRoutes: [
    {
      name: 'TempMount',
      baseRoute: '${base}',
      features: {
        'metrics-root': 'dashboard',
      },
    },
  ],
};

export default config;
`;

    // Initial config – metrics under /metrics
    await fs.writeFile(cfgPath, makeConfig('team-temp/[teamId]/metrics'), 'utf8');

    try {
      runGenerator();

      const oldStub = path.join(
        GENERATED_ROOT,
        ...'team-temp/[teamId]/metrics/dashboard/page.tsx'.split('/'),
      );
      await expect(fs.access(oldStub)).resolves.not.toThrow();

      // Update config – move to /stats
      await fs.writeFile(cfgPath, makeConfig('team-temp/[teamId]/stats'), 'utf8');

      runGenerator();

      const newStub = path.join(
        GENERATED_ROOT,
        ...'team-temp/[teamId]/stats/dashboard/page.tsx'.split('/'),
      );
      await expect(fs.access(oldStub)).rejects.toThrow();
      await expect(fs.access(newStub)).resolves.not.toThrow();
    } finally {
      // cleanup temp consumer and regenerate clean stubs
      await fs.rm(tempConsumerDir, { recursive: true, force: true });
      runGenerator();
    }
  });

  // Removed mutable tests that altered routes.config.ts; generator behaviour now only tested with static configs.
});
