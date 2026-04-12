'use client';

import { LanguageProvider, useLanguage } from '@/i18n/language-provider';
import { useDocumentMetadata } from '@/i18n/use-document-metadata';

function DocumentMetadataUpdater({ children }: { children: React.ReactNode }) {
  useDocumentMetadata();
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <DocumentMetadataUpdater>{children}</DocumentMetadataUpdater>
    </LanguageProvider>
  );
}
