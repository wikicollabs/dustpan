/**
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * Dustpan
 * A tool to uncover WikiProjects that can be improved on Wikidata
 * @see https://github.com/wikicollabs/dustpan
 */

import { createI18n } from 'vue-banana-i18n';
import enMessages from './en.json';
import idMessages from './id.json';
import arMessages from './ar.json';
import koMessages from './ko.json';

import { DISPLAY_LANGUAGES } from './displayLanguages';

const getBrowserLanguage = (): string => {
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

const messages = {
  en: enMessages,
  id: idMessages,
  ar: arMessages,
  ko: koMessages,
};

export default createI18n({
  locale: localStorage?.getItem('locale') || getBrowserLanguage(),
  messages: messages,
});