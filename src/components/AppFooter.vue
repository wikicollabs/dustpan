<!--
  SPDX-License-Identifier: GPL-2.0-or-later

  Dustpan
  A tool to uncover WikiProjects that can be improved on Wikidata
  @see https://github.com/wikicollabs/dustpan
-->


<template>
  <footer class="app-footer">
    <div class="footer-content">
      <div class="main-section">
        <div class="footer-branding">
          <dustpanIcon class="footer-logo" role="img" :aria-label="`Dustpan ${$i18n('logo-alt')}`" />
          <div class="footer-text">
            <h3 class="footer-title">Dustpan</h3>
            <p class="footer-caption">
              {{ $i18n('footer-by') }}
              <a
                href="https://meta.wikimedia.org/wiki/Wikicollabs"
                target="_blank"
                rel="noopener"
                class="wikicollabs-link"
                :aria-label="$i18n('footer-wikicollabs-aria', 'Wikicollabs')"
                >Wikicollabs</a
              >
            </p>
            <p class="footer-caption">{{ $i18n('footer-powered-by') }}</p>
          </div>
        </div>
      </div>
      <div class="links">
        <a
          href="https://www.wikidata.org/wiki/Wikidata:Dustpan"
          target="_blank"
          rel="noopener"
          class="external-link"
          :aria-label="$i18n('footer-about-aria')"
        >
          {{ $i18n('footer-about') }}
          <cdx-icon :icon="cdxIconLinkExternal" size="small" />
        </a>
        <span class="link-separator">·</span>
        <a
          href="https://www.wikidata.org/wiki/Wikidata:Dustpan/Privacy_policy"
          target="_blank"
          rel="noopener"
          class="external-link"
          :aria-label="$i18n('footer-privacy-policy-aria')"
        >
          {{ $i18n('footer-privacy') }}
          <cdx-icon :icon="cdxIconLinkExternal" size="small" />
        </a>
        <span class="link-separator">·</span>
        <a
          href="https://www.wikidata.org/wiki/Wikidata:Dustpan/License"
          target="_blank"
          rel="noopener"
          class="external-link"
          :aria-label="$i18n('footer-license-aria')"
        >
          {{ $i18n('footer-license') }}
          <cdx-icon :icon="cdxIconLinkExternal" size="small" />
        </a>
        <span class="link-separator">·</span>
        <a
          href="https://github.com/wikicollabs/dustpan"
          target="_blank"
          rel="noopener"
          class="external-link"
          :aria-label="$i18n('footer-source-code-aria')"
        >
          {{ $i18n('footer-source') }}
          <cdx-icon :icon="cdxIconLinkExternal" size="small" />
        </a>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { CdxIcon } from "@wikimedia/codex";
import { cdxIconLinkExternal } from "@wikimedia/codex-icons";
import dustpanIcon from "./icons/DustpanIcon.vue";
import { getCurrentInstance } from 'vue';

const instance = getCurrentInstance();
const $i18n = instance?.appContext.config.globalProperties.$i18n as (key: string, ...params: unknown[]) => string;
</script>

<style scoped>
.app-footer {
  background-color: var(--background-color-neutral);
  border-top: 0.0625rem solid var(--border-color-base);
  margin-top: auto;
}

.footer-content {
  padding: var(--spacing-100); /* 16px all around on mobile */
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-150);
  flex-direction: column;

}

.links {
  width: 100%;
  display: flex;
  gap: var(--spacing-25); /* changed from spacing-100 */
  flex-wrap: wrap;
  align-items: center; /* align with footer text */
}


/* TABLET PORTRAIT */
@media (min-width: 640px) and (max-width: 1023px) {
  
  .footer-content {
    padding: var(--spacing-150) var(--spacing-200); /* same as desktop */
    align-items: flex-end;
    flex-direction: row;
    justify-content: space-between;
    gap: var(--spacing-150);
  }

  .links {
    flex-wrap: wrap; /* allow wrapping on tablet */
    width: auto;
  }
}
/* DESKTOP */
@media (min-width: 1024px) {
  .footer-content {
    padding: var(--spacing-150) var(--spacing-200); /* 24px vertical, 32px horizontal */
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--spacing-150);
  }

    .links {
    width: auto;
  }

}

/* rest of footer styles stay the same */

.footer-branding {
  display: flex;
  align-items: center;
  gap: var(--spacing-100); /* changed from spacing-50 (MA) */
}

.footer-logo {
  width: 2rem;
  height: 2rem;
  color: #196551;
}

.footer-text {
  display: flex;
  flex-direction: column;
  gap: 0; /* remove spacing between lines */
}

.footer-title {
  margin: 0;
  font-size: var(--font-size-x-large);
  font-style: normal;
  font-weight: 700;
  line-height: var(--line-height-x-large);
  color: var(--color-base);
  font-family: var(--font-family-system-sans);
}

.footer-caption {
  margin: 0;
  font-size: var(--font-size-small);
  font-weight: 700;
  line-height: var(--line-height-small);
  letter-spacing: 0;
  color: var(--color-subtle);
  font-family: var(--font-family-system-sans);
}

.wikicollabs-link {
  color: var(--color-progressive);
  text-decoration: none;
  font-weight: 700; /* maintain bold weight */
}

.wikicollabs-link:hover {
  text-decoration: underline;
}

.link-separator {
  color: var(--color-subtle);
  font-size: var(--font-size-small);
  user-select: none;
}

.external-link {
  color: var(--color-progressive);
  text-decoration: none;
  font-size: var(--font-size-small);
  font-weight: 400; /* caption regular, not bold */
  line-height: var(--line-height-small);
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25);
}

.external-link:hover {
  text-decoration: underline;
}

/* make the icon blue too */
.external-link :deep(.cdx-icon) {
  color: var(--color-progressive);
}
</style>