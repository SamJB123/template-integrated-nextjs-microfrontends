import { spawn } from 'node:child_process';
import path from 'node:path';
import routeStubConfig from '../shared_config/route-config/route-stubs.config';
import { getPackageNameFromPath } from './get-package-name-from-path';

async function main() {
  const hostAppPath = routeStubConfig.hostApp;
  if (!hostAppPath) {
    console.error('hostApp is not defined in route-stubs.config');
    process.exit(1);
  }
  const absHostAppPath = path.resolve(hostAppPath);
  const pkgName = await getPackageNameFromPath(absHostAppPath);
  if (!pkgName) {
    console.error(`Could not find package name for hostApp at path: ${hostAppPath}`);
    process.exit(1);
  }
  const turbo = spawn(
    'pnpm',
    ['turbo', 'run', 'dev', '--filter', pkgName],
    { stdio: 'inherit', shell: true }
  );
  turbo.on('exit', code => process.exit(code ?? 0));
}

main();