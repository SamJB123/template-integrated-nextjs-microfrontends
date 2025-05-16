/* features/docs/router.tsx */
import CatchAll from './app/[...slug]/page';
import DocsRootPage from './app/page'; // Import the root page of the docs package

export function DocsRouter({ slug }: { slug?: string[] }) {
  const effectiveSlug = slug ?? [];
  if (effectiveSlug.length === 0) {
    return <DocsRootPage />;
  }
  return <CatchAll params={{ slug: effectiveSlug }} />;
}