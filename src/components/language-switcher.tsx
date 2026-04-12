'use client';

import { useLanguage } from '@/i18n/language-provider';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="flex items-center rounded-none border-[2px] border-black bg-white shadow-[2px_2px_0px_#000]">
      <button
        onClick={() => setLocale('zh')}
        className={`px-2 py-1 text-sm font-bold tracking-wide transition-colors ${
          locale === 'zh'
            ? 'bg-[#FFEB3B] text-black'
            : 'bg-white text-gray-600 hover:bg-gray-100'
        }`}
        aria-label="切换到中文"
      >
        中
      </button>
      <button
        onClick={() => setLocale('en')}
        className={`border-l-[2px] border-black px-2 py-1 text-sm font-bold tracking-wide transition-colors ${
          locale === 'en'
            ? 'bg-[#FFEB3B] text-black'
            : 'bg-white text-gray-600 hover:bg-gray-100'
        }`}
        aria-label="Switch to English"
      >
        EN
      </button>
    </div>
  );
}
