import type { RoutesConfig } from '@repo/route-config';

const config: RoutesConfig = {
  mountRoutes: [
    {
      name: 'Docs',
      baseRoute: '.',
      features: {
        'docs-root': 'docs',
      },
    },
    {
      name: 'Teams',
      baseRoute: '.',
      features: {
        'teams-root': 'teams',
      },
    },
  ],
};

export default config;
