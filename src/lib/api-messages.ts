import en from '@/locales/en.json';
import zh from '@/locales/zh.json';

const apiErrorMessages = {
  en: en.apiErrors,
  zh: zh.apiErrors
} as const;

type ApiErrorKey = keyof typeof en.apiErrors;

export function getErrorMessage(key: ApiErrorKey, locale?: string): string {
  const loc = locale === 'zh' ? 'zh' : 'en';
  return apiErrorMessages[loc][key];
}
