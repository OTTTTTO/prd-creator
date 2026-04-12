'use client';

import { Button } from '@/components/button';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/language-provider';

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const handleOnline = () => {
      window.location.reload();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      // Try to fetch a simple endpoint to check connectivity
      const response = await fetch('/');
      if (response.ok) {
        window.location.reload();
      }
    } catch {
      setIsRetrying(false);
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <svg
            className="h-8 w-8 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <h1 className="mb-4 text-2xl font-bold text-slate-900">
          {t('offline.title')}
        </h1>

        <p className="mb-8 text-slate-600">
          {t('offline.description')}
        </p>

        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h2 className="mb-2 font-semibold text-blue-900">
              {t('offline.availableOffline')}
            </h2>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>&bull; {t('offline.viewPrds')}</li>
              <li>&bull; {t('offline.accessDrafts')}</li>
              <li>&bull; {t('offline.editFields')}</li>
            </ul>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h2 className="mb-2 font-semibold text-amber-900">
              {t('offline.requiresInternet')}
            </h2>
            <ul className="space-y-1 text-sm text-amber-700">
              <li>&bull; {t('offline.generatePrds')}</li>
              <li>&bull; {t('offline.refineDocs')}</li>
              <li>&bull; {t('offline.syncCloud')}</li>
            </ul>
          </div>
        </div>

        <Button
          onClick={handleRetry}
          disabled={isRetrying}
          className="mt-8 w-full"
        >
          {isRetrying ? t('offline.checking') : t('offline.tryAgain')}
        </Button>

        <p className="mt-4 text-xs text-slate-500">
          {t('offline.autoRefresh')}
        </p>
      </div>
    </div>
  );
}
