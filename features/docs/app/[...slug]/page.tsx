export default async function Page({ params }: { params: { slug: string[] } }) {
  // Placeholder await – replace with real data fetching when needed
  await Promise.resolve();
  return (
    <div>
      <h1>Docs Page</h1>
      <p>Path: /docs/{params.slug.join('/')}</p>
    </div>
  );
}