import { promises as fs, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import os from 'os';
import { randomUUID } from 'crypto';
import stubCfg from '../shared_config/route-config/route-stubs.config.js';
import type { RoutesConfig } from '@repo/route-config';

const repoRoot = path.resolve(__dirname, '..');
const hostAppRel = (stubCfg as any).hostApp || 'apps/web';
const GENERATED_ROOT = path.join(repoRoot, hostAppRel, 'app', '(feature-routes)');
const hostCfgPath = path.join(repoRoot, hostAppRel, 'routes.config.ts');
let origHostCfg: string;

function runGenerator() {
  execSync('pnpm run generate-routes', { cwd: repoRoot, stdio: 'ignore' });
}

function createFeature(slug: string) {
  execSync(`pnpm exec tsx scripts/new-feature.ts ${slug}`, { cwd: repoRoot });
}

function writeHostConfig(config: RoutesConfig) {
  const content = `import type { RoutesConfig } from '@repo/route-config';
const config: RoutesConfig = ${JSON.stringify(config, null, 2)};
export default config;
`;
  writeFileSync(hostCfgPath, content, 'utf8');
}

describe('route stub generation (dynamic)', () => {
  beforeEach(async () => {
    origHostCfg = readFileSync(hostCfgPath, 'utf8');
    await fs.rm(GENERATED_ROOT, { recursive: true, force: true });
    const featDir = path.join(repoRoot, 'features');
    for (const name of await fs.readdir(featDir)) {
      if (name.startsWith('tmp-')) {
        await fs.rm(path.join(featDir, name), { recursive: true, force: true });
      }
    }
  });

  afterEach(async () => {
    writeFileSync(hostCfgPath, origHostCfg, 'utf8');
    const featDir = path.join(repoRoot, 'features');
    for (const name of await fs.readdir(featDir)) {
      if (name.startsWith('tmp-')) {
        await fs.rm(path.join(featDir, name), { recursive: true, force: true });
      }
    }
    runGenerator();
  });

  it('generates stub for a self-exposing provider', async () => {
    const slug = 'tmp-' + randomUUID();
    createFeature(slug);
    writeHostConfig({
      mountRoutes: [
        {
          name: 'SelfMount',
          baseRoute: '.',
          features: { [`${slug}-root`]: slug },
        },
      ],
    });
    runGenerator();
    const stub = path.join(GENERATED_ROOT, slug, 'page.tsx');
    await expect(fs.access(stub)).resolves.not.toThrow();
  });

  it('deletes obsolete stub files', async () => {
    const slug = 'tmp-' + randomUUID();
    createFeature(slug);
    writeHostConfig({
      mountRoutes: [
        {
          name: 'StaleMount',
          baseRoute: '.',
          features: { [`${slug}-root`]: slug },
        },
      ],
    });
    runGenerator();
    const staleDir = path.join(GENERATED_ROOT, slug, 'stale');
    const staleFile = path.join(staleDir, 'page.tsx');
    await fs.mkdir(staleDir, { recursive: true });
    await fs.writeFile(staleFile, '// stale', 'utf8');
    await expect(fs.access(staleFile)).resolves.not.toThrow();
    runGenerator();
    await expect(fs.access(staleFile)).rejects.toThrow();
  });

  it('updates stubs when mount path changes', async () => {
    const slug = 'tmp-' + randomUUID();
    createFeature(slug);
    const featureKey = `${slug}-root`;
    writeHostConfig({
      mountRoutes: [
        {
          name: 'Mount1',
          baseRoute: 'base1',
          features: { [featureKey]: slug },
        },
      ],
    });
    runGenerator();
    const oldStub = path.join(GENERATED_ROOT, 'base1', slug, 'page.tsx');
    await expect(fs.access(oldStub)).resolves.not.toThrow();
    writeHostConfig({
      mountRoutes: [
        {
          name: 'Mount2',
          baseRoute: 'base2',
          features: { [featureKey]: slug },
        },
      ],
    });
    runGenerator();
    const newStub = path.join(GENERATED_ROOT, 'base2', slug, 'page.tsx');
    await expect(fs.access(oldStub)).rejects.toThrow();
    await expect(fs.access(newStub)).resolves.not.toThrow();
  });

  it('allows a consumer feature to mount a provider’s routes at a custom path', async () => {
    const slugProv = 'tmp-' + randomUUID();
    const slugCons = 'tmp-' + randomUUID();
    createFeature(slugProv);
    createFeature(slugCons);
    // Configure consumer to mount provider
    const consCfgPath = path.join(repoRoot, 'features', slugCons, 'routes.config.ts');
    const consConfig: RoutesConfig = {
      exposeRoutes: [{ name: `${slugCons}-root`, internalPath: '.', description: '' }],
      mountRoutes: [
        { name: 'CustomMount', baseRoute: 'custom', features: { [`${slugProv}-root`]: slugProv } },
      ],
    };
    writeFileSync(consCfgPath, `import type { RoutesConfig } from '@repo/route-config';
const config: RoutesConfig = ${JSON.stringify(consConfig, null, 2)};
export default config;
`);
    // Mount consumer in host app
    writeHostConfig({
      mountRoutes: [{ name: 'HostMount', baseRoute: '.', features: { [`${slugCons}-root`]: slugCons } }],
    });
    runGenerator();
    const nestedStub = path.join(GENERATED_ROOT, slugCons, 'custom', slugProv, 'page.tsx');
    await expect(fs.access(nestedStub)).resolves.not.toThrow();
  });

  it('supports providers that expose routes but do NOT self-mount (pure libraries)', async () => {
    const slug = 'tmp-' + randomUUID();
    createFeature(slug);
    writeHostConfig({
      mountRoutes: [{ name: 'PureLib', baseRoute: 'lib', features: { [`${slug}-root`]: slug } }],
    });
    runGenerator();
    const dir = path.join(GENERATED_ROOT, 'lib', slug);
    await expect(fs.access(dir)).resolves.not.toThrow();
  });

  it('generates stubs in a temporary host via --hostApp flag', async () => {
    const slug = 'tmp-' + randomUUID();
    createFeature(slug);
    // create a temp host folder inside the repo for isolation
    const tmpHostRel = 'tmp-host-' + randomUUID();
    const tmpHost = path.join(repoRoot, tmpHostRel);
    // host structure
    await fs.mkdir(path.join(tmpHost, 'app'), { recursive: true });
    // minimal package.json so the generator picks it up if needed
    writeFileSync(path.join(tmpHost, 'package.json'), JSON.stringify({ name: tmpHostRel }, null, 2), 'utf8');
    // host config
    const tmpHostCfg = path.join(tmpHost, 'routes.config.ts');
    const hostCfg: RoutesConfig = {
      mountRoutes: [{ name: 'TempMount', baseRoute: '.', features: { [`${slug}-root`]: slug } }],
    };
    writeFileSync(
      tmpHostCfg,
      `import type { RoutesConfig } from '@repo/route-config';
const config: RoutesConfig = ${JSON.stringify(hostCfg, null, 2)};
export default config;
`,
      'utf8',
    );
    // run generator against the temp host
    execSync(`pnpm exec tsx scripts/generate-route-stubs.ts --hostApp ${tmpHostRel}`, {
      cwd: repoRoot,
      stdio: 'ignore',
    });
    const stub = path.join(tmpHost, 'app', '(feature-routes)', slug, 'page.tsx');
    await expect(fs.access(stub)).resolves.not.toThrow();
    // cleanup
    await fs.rm(tmpHost, { recursive: true, force: true });
  });
});
