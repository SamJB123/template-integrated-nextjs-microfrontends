import MainLayout from '../layout'; // Assuming this is the main app layout
import { DocsLayout } from 'docs'; // Corrected import path

export default function DocsPageLayout({ children }: { children: React.ReactNode }) { // Renamed from PackageAWrapper
  return (
    <MainLayout>
      <DocsLayout>{children}</DocsLayout>
    </MainLayout>
  );
} 