import type { RoutesConfig } from '@repo/route-config';

const config: RoutesConfig = {
  exposeRoutes: [
    {
      name: 'metrics-root',
      description: 'Main metrics dashboard',
      internalPath: '.',
    },
  ],
  mountRoutes: [],
};

export default config;
