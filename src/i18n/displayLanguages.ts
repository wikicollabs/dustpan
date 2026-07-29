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
}

export const DISPLAY_LANGUAGES: DisplayLanguage[] = [
  { code: 'id', nativeName: 'Bahasa Indonesia' },
  { code: 'en', nativeName: 'English' },
  { code: 'ar', nativeName: 'العربية' },
  { code: 'ko', nativeName: '한국어' },
];