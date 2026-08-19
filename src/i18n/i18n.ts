/**
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * Dustpan
 * A tool to uncover WikiProjects that can be improved on Wikidata
 * @see https://github.com/wikicollabs/dustpan
 */

import { createI18n } from 'vue-banana-i18n';
import { getDisplayLanguage } from './displayLanguages';

// Auto-loads locale JSON files in this folder, matched by filename shape.
// Non-locale files such as qqq.json are filtered out below.
// Adding a new language means dropping in a new file, no import or registration needed.
const LOCALE_FILENAME = /^\.\/([a-z]{2,3}(?:-[a-zA-Z0-9]{1,8})*)\.json$/;

const localeModules = import.meta.glob('./*.json', { eager: true }) as Record<
  string,
  { default: Record<string, string> }
>;

const messages: Record<string, Record<string, string>> = {};
for (const path in localeModules) {
  const code = path.match(LOCALE_FILENAME)?.[1]?.toLowerCase();
  if (code && code !== 'qqq') {
    messages[code] = localeModules[path].default;
  }
}

export default createI18n({
  locale: getDisplayLanguage().toLowerCase(),
  messages: messages,
});