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

import { getBrowserLanguage } from './displayLanguages';

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