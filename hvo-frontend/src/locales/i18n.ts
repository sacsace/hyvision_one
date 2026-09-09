import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from './ko';

export type AppLanguage = 'ko' | 'en';

const loadedLanguages = new Set<string>(['ko']);

/** OS/브라우저(PC·모바일) 언어: 한국어면 ko, 그 외는 모두 en */
export function detectOsLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') return 'en';
  const candidates = [
    navigator.language,
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
  ]
    .filter(Boolean)
    .map((v) => String(v).toLowerCase());
  return candidates.some((l) => l.startsWith('ko')) ? 'ko' : 'en';
}

export function resolveAppLanguage(lng?: string | null): AppLanguage {
  const raw = String(lng || '').toLowerCase();
  if (raw.startsWith('ko')) return 'ko';
  if (raw.startsWith('en')) return 'en';
  return detectOsLanguage();
}

/** 비활성 언어 번역은 필요 시에만 동적 로드 */
export async function ensureI18nLanguage(lang: AppLanguage): Promise<void> {
  if (!loadedLanguages.has(lang)) {
    const mod = lang === 'en' ? await import('./en') : await import('./ko');
    i18n.addResourceBundle(lang, 'translation', mod.default.translation, true, true);
    loadedLanguages.add(lang);
  }
  await i18n.changeLanguage(lang);
}

const SEO_FALLBACK: Record<AppLanguage, { title: string; description: string }> = {
  ko: {
    title: 'Hyvision One - 하이비전 인도 통합 ERP',
    description: 'Hyvision One - Hyvision India를 위한 통합 ERP·시스템 인티그레이션 플랫폼',
  },
  en: {
    title: 'Hyvision One - Integrated ERP for Hyvision India',
    description:
      'Hyvision One - Integrated ERP and system integration platform optimized for Hyvision India',
  },
};

const setMetaByName = (name: string, content: string) => {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const setMetaByProperty = (property: string, content: string) => {
  let tag = document.querySelector(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('property', property);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

/** 활성 UI/기기 언어에 맞춰 SEO 메타(title/description/html lang/OG) 동기화 */
export const syncDocumentSeo = (lng?: string) => {
  if (typeof document === 'undefined') return;
  const lang = resolveAppLanguage(lng || i18n.language || detectOsLanguage());
  document.documentElement.lang = lang;

  const titleKey = i18n.t('seo.title', { lng: lang });
  const descKey = i18n.t('seo.description', { lng: lang });
  const title =
    titleKey && titleKey !== 'seo.title' ? titleKey : SEO_FALLBACK[lang].title;
  const description =
    descKey && descKey !== 'seo.description' ? descKey : SEO_FALLBACK[lang].description;

  document.title = title;
  setMetaByName('description', description);
  setMetaByName('application-name', 'Hyvision One');
  setMetaByName('apple-mobile-web-app-title', 'Hyvision One');
  setMetaByName('twitter:card', 'summary');
  setMetaByName('twitter:title', title);
  setMetaByName('twitter:description', description);
  setMetaByProperty('og:type', 'website');
  setMetaByProperty('og:site_name', 'Hyvision One');
  setMetaByProperty('og:title', title);
  setMetaByProperty('og:description', description);
  setMetaByProperty('og:locale', lang === 'ko' ? 'ko_KR' : 'en_IN');
  setMetaByProperty('og:locale:alternate', lang === 'ko' ? 'en_IN' : 'ko_KR');
};

const initialOsLang = detectOsLanguage();

// 언어는 OS 기본값 → 사용자 UI 설정(API / 메뉴 스토어)으로 동기화
i18n.use(initReactI18next).init({
  resources: {
    ko,
  },
  lng: initialOsLang,
  fallbackLng: initialOsLang === 'en' ? 'en' : 'ko',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

i18n.on('languageChanged', syncDocumentSeo);
// 영어 리소스 로드 전에도 타이틀/SEO가 영문으로 유지되도록 폴백 적용
syncDocumentSeo(initialOsLang);

/** React 렌더 전에 OS 언어(및 en 번들)를 준비 */
export async function bootstrapI18n(): Promise<AppLanguage> {
  const lang = detectOsLanguage();
  await ensureI18nLanguage(lang);
  syncDocumentSeo(lang);
  return lang;
}

export default i18n;
