/**
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * Dustpan
 * A tool to uncover WikiProjects that can be improved on Wikidata
 * @see https://github.com/wikicollabs/dustpan
 */

import type { WikiProject } from '../types/types';
import paintings from './paintings.json';
import music from './music.json';
import podcasts from './podcasts.json';

export const WIKIPROJECTS: WikiProject[] = [
  paintings as WikiProject,
  music as WikiProject,
  podcasts as WikiProject,
];