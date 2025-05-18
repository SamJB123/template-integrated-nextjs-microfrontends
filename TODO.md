# Project To-Do (Route-Registry Refactor)

- [x] **Finish `generate-route-stubs.ts` refactor** - generator compiles & runs.
  - [x] Compile & lint with `pnpm tsx scripts/generate-route-stubs.ts --dry-run` (or `tsc --noEmit`).
  - [x] Resolve remaining TypeScript errors/warnings.
  - [x] Confirm new schema works for:
        - Provider w/ `defaultUrl`.
        - [x] Provider w/o `defaultUrl` (pure library).
        - Consumer `mountRoutes`.
  - [x] Remove legacy `exposeRoutes.{prefix|prefixes}` support.
  - [x] Unit-test by running the script and verifying stubs in `apps/web/app/(feature-routes)`.

- [ ] **Update documentation**
  - [ ] Revise `Next-React-Microfrontends.md` to explain new `exposeRoutes` & `mountRoutes` schemas with examples.
  - [ ] Document optional `ROUTE_REGISTRY_SNAPSHOT` environment variable.

- [ ] **Migrate existing packages to new schema**
  - [ ] Update `features/docs/package.json` (`exposeRoutes` array).
  - [ ] Create (or update) a `features/teams` example package with `mountRoutes` pointing to `docs`.

- [ ] **Dev-experience**
  - [ ] Update root `package.json` scripts (`dev`, `build`, etc.) to run the generator after schema change.

- [ ] **Testing & CI**
  - [ ] Add a simple Jest/Vitest test that runs the generator and asserts expected stub paths exist.
  - [ ] Ensure CI passes with new tests.

- [ ] **Clean-up**
  - [ ] Remove deprecated code paths and comments in generator after migration is complete.
  - [ ] Re-run Prettier/Lint.
