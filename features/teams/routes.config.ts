import type { RoutesConfig } from '@repo/route-config';

const config: RoutesConfig = {
  exposeRoutes: [
    {
      name: 'teams-root',
      description: 'Teams landing & pages',
      internalPath: '.',
    },
  ],
  mountRoutes: [
    {
      name: 'Docs',
      baseRoute: 'team/[teamId]/',
      features: {
        'docs-root': 'docs',
      },
    },
    {
      name: 'Metrics',
      baseRoute: 'team/[teamId]/',
      features: {
        'metrics-root': 'dashboard',
      },
    },
  ],
};

export default config;
