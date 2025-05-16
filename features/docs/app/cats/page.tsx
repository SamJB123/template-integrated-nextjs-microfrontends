export default async function Page({ params }: { params: { slug: string[] } }) {
  await Promise.resolve();
  return (
    <div>
      <h1>Docs Page</h1>
      <p>Path: SPECIAL CATS PAGE!</p>
    </div>
  );
} 