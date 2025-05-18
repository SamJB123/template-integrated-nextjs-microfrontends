import type { RoutesConfig } from '@repo/route-config';

const config: RoutesConfig = {
  exposeRoutes: [
    {
      name: 'docs-root',
      description: 'Docs landing & pages',
      internalPath: '.',
    },
  ]
};

export default config;
