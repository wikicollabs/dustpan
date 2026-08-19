/**
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * Dustpan
 * A tool to uncover WikiProjects that can be improved on Wikidata
 * @see https://github.com/wikicollabs/dustpan
 */

export interface DisplayLanguage {
  code: string;
  nativeName: string;
  rtl: boolean;
}

export const DISPLAY_LANGUAGES: DisplayLanguage[] = [
  { code: 'en', nativeName: 'English', rtl: false }
];

export const getBrowserLanguage = (): string => {
  // normalize browser language tag (e.g., 'zh-Hant', 'zh_Hant', 'en-US')
  const browserLang = window?.navigator?.language
    ?.toLowerCase()
    .replace('_', '-'); // normalize underscore to hyphen

  if (!browserLang) return 'en';

  const supportedCodes = DISPLAY_LANGUAGES.map((lang) => lang.code);

  // first try exact match (e.g., 'zh-hant')
  if (supportedCodes.includes(browserLang)) {
    return browserLang;
  }

  // then try base language code (e.g., 'zh' from 'zh-hant')
  const baseLang = browserLang.split('-')[0];
  if (supportedCodes.includes(baseLang)) {
    return baseLang;
  }

  // fallback to English
  return 'en';
};

// current display language: explicit user choice (localStorage) if set,
// otherwise best-guess from the browser. shared by anything that needs
// current locale as a plain string (SPARQL lang param, property label
// lookups, etc). if the stored choice no longer matches a supported
// language (e.g. it was removed from DISPLAY_LANGUAGES since the user
// last visited), the stale value is cleared and a fresh browser guess
// is used instead. NOTE: getBrowserLanguage() here and searchStore.ts's
// getAutoLanguage() are two different browser-language-guessing
// implementations (this one does exact+base match against
// DISPLAY_LANGUAGES with an 'en' fallback, that one just splits on '-').
// pre-existing divergence.
export const getDisplayLanguage = (): string => {
  const stored = localStorage.getItem('locale');
  const supportedCodes = DISPLAY_LANGUAGES.map((lang) => lang.code);

  if (stored && !supportedCodes.includes(stored)) {
    localStorage.removeItem('locale');
    return getBrowserLanguage();
  }

  return stored || getBrowserLanguage();
};