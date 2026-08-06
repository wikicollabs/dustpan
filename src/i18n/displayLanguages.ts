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
  { code: 'id', nativeName: 'Bahasa Indonesia', rtl: false },
  { code: 'en', nativeName: 'English', rtl: false },
  { code: 'ar', nativeName: 'العربية', rtl: true },
  { code: 'ko', nativeName: '한국어', rtl: false }
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