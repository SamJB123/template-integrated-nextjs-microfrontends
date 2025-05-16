/* features/docs/ssr.ts */
import fg from 'fast-glob';
import path from 'node:path';
import type { Metadata } from 'next';

const ROOT = path.join(__dirname, 'app'); // Adjusted path from 'src/app' to 'app'
const PAGES = await fg('**/page.@(js|jsx|ts|tsx)', { cwd: ROOT, absolute: true });

const toSlug = (file: string) =>
  path.relative(ROOT, file)
       .replace(/\/page\.[^/]+$/, '') // Escaped forward slash for regex
       .split(path.sep)
       .filter(Boolean);

export async function generateStaticParams() {
  return PAGES.map((p) => ({ slug: toSlug(p) }));
}

export async function generateMetadata(
  { params }: { params: { slug?: string[] } }
): Promise<Metadata> {
  const slugArr = params.slug ?? [];
  const match = PAGES.find((p) =>
    JSON.stringify(toSlug(p)) === JSON.stringify(slugArr)
  );
  if (!match) return { title: 'Docs' }; // Changed 'Package A' to 'Docs'
  const mod = await import(match);
  if (mod.metadata) return mod.metadata as Metadata;
  if (typeof mod.generateMetadata === 'function')
    return mod.generateMetadata({ params });
  return { title: slugArr.length ? `Docs – ${slugArr.join(' / ')}` : 'Docs' }; // Changed 'Package A' to 'Docs'
} 