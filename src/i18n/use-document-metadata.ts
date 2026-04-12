'use client';

import { useEffect } from 'react';
import { useLanguage } from './language-provider';

export function useDocumentMetadata() {
  const { locale, t } = useLanguage();

  useEffect(() => {
    document.title = t('seo.title');
    document.documentElement.lang = locale;

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement | null;
      }
      if (el) {
        el.setAttribute('content', content);
      }
    };

    setMeta('description', t('seo.description'));
    setMeta('og:title', t('seo.ogTitle'));
    setMeta('og:description', t('seo.ogDescription'));
    setMeta('twitter:title', t('seo.ogTitle'));
    setMeta('twitter:description', t('seo.ogDescription'));
  }, [locale, t]);
}
