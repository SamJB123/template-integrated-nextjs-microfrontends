import type { RoutesConfig } from "@shared/route-config/route-config";

const config: RoutesConfig = {
  exposeRoutes: [
    {
      name: "__feature_slug__-root",
      internalPath: ".",
      description: "The full __feature_slug__ directory",
    },
  ],
};

export default config;
