#!/usr/bin/env node
/**
 * i18n Coverage Check
 *
 * Verifies that every locale translation file in `messages/` has exactly the
 * same set of leaf keys as the reference locale (`en.json`). Leaf keys are
 * collected in dot-notation (e.g. "nav.api", "hero.title1", "pricing.free.features").
 *
 * A "leaf" is any value that is NOT a plain object. Strings, numbers, booleans,
 * arrays and null are all treated as leaves. Only plain objects are traversed
 * recursively, which mirrors how next-intl consumes nested message objects.
 *
 * Exit codes:
 *   0 - every locale matches the reference key set
 *   1 - one or more locales have missing/extra keys, or a file could not be read
 *
 * Usage:
 *   node scripts/check-i18n.mjs
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const messagesDir = join(__dirname, '..', 'messages');
const REFERENCE_LOCALE = 'en';

// Locales that are expected to exist. A missing entry here is reported as an
// error rather than silently skipped. Any additional `*.json` file discovered
// in the messages directory is also checked, so newly added locales are picked
// up automatically without editing this list.
const EXPECTED_LOCALES = ['de', 'es', 'fr', 'ja', 'ko', 'zh'];

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

/**
 * Recursively collects leaf keys from a nested object using dot-notation.
 *
 * @param {Record<string, unknown>} obj - the parsed JSON object
 * @param {string} [prefix] - accumulated key prefix (used during recursion)
 * @param {string[]} [keys] - accumulator array (used during recursion)
 * @returns {string[]} the list of dot-notation leaf keys
 */
function collectLeafKeys(obj, prefix = '', keys = []) {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    // Only recurse into plain objects. Arrays, strings, numbers, booleans and
    // null are all treated as leaves so their key path is recorded as-is.
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      collectLeafKeys(value, path, keys);
    } else {
      keys.push(path);
    }
  }
  return keys;
}

/**
 * Reads and parses a locale JSON file, throwing a descriptive error on failure.
 *
 * @param {string} locale - the locale code (e.g. "en", "de")
 * @returns {{ data: Record<string, unknown>, filePath: string }}
 */
function loadLocale(locale) {
  const filePath = join(messagesDir, `${locale}.json`);

  if (!existsSync(filePath)) {
    throw new Error(`Locale file not found: ${filePath}`);
  }

  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Could not read locale file "${filePath}": ${err.message}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in locale file "${filePath}": ${err.message}`);
  }

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(
      `Locale file "${filePath}" must contain a JSON object at the top level.`
    );
  }

  return { data, filePath };
}

/**
 * Builds the list of locale codes to check by merging the explicitly expected
 * locales with any `*.json` files discovered in the messages directory. This
 * ensures a deleted required locale is reported (it stays in the list and
 * `loadLocale` raises a clear "file not found" error) while newly added
 * locales are picked up automatically.
 *
 * @returns {string[]} sorted, de-duplicated list of locale codes
 */
function discoverLocales() {
  if (!existsSync(messagesDir) || !statSync(messagesDir).isDirectory()) {
    throw new Error(`Messages directory not found: ${messagesDir}`);
  }

  const discovered = readdirSync(messagesDir)
    .filter((file) => extname(file) === '.json')
    .map((file) => basename(file, '.json'));

  const merged = [...new Set([...EXPECTED_LOCALES, ...discovered])];
  merged.sort();
  return merged;
}

/**
 * Returns the set difference (elements in `a` that are not in `b`), preserving
 * the order of `a`.
 *
 * @param {string[]} a
 * @param {Set<string>} b
 * @returns {string[]}
 */
function difference(a, b) {
  return a.filter((k) => !b.has(k));
}

function plural(count, singular, pluralForm = singular + 's') {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function main() {
  console.log(`${BOLD}${CYAN}i18n Coverage Check${RESET}\n`);

  let locales;
  try {
    locales = discoverLocales();
  } catch (err) {
    console.error(`${RED}ERROR: ${err.message}${RESET}`);
    process.exit(1);
  }

  if (!locales.includes(REFERENCE_LOCALE)) {
    console.error(
      `${RED}ERROR: Reference locale "${REFERENCE_LOCALE}" was not found in ${messagesDir}${RESET}`
    );
    process.exit(1);
  }

  // Load the reference locale and collect its leaf keys.
  let reference;
  try {
    reference = loadLocale(REFERENCE_LOCALE);
  } catch (err) {
    console.error(`${RED}ERROR: ${err.message}${RESET}`);
    process.exit(1);
  }

  const referenceKeys = collectLeafKeys(reference.data);
  const referenceKeySet = new Set(referenceKeys);

  console.log(
    `${DIM}Reference: ${reference.filePath}${RESET}\n` +
      `${DIM}Leaf keys:  ${referenceKeys.length}${RESET}\n`
  );

  const otherLocales = locales.filter((l) => l !== REFERENCE_LOCALE);

  if (otherLocales.length === 0) {
    console.log(`${YELLOW}No other locales found to compare.${RESET}`);
    process.exit(0);
  }

  let hasFailures = false;
  const summary = [];

  for (const locale of otherLocales) {
    const label = `${BOLD}${locale}${RESET}`;

    let result;
    try {
      result = loadLocale(locale);
    } catch (err) {
      console.error(`${RED}ERROR: ${err.message}${RESET}\n`);
      hasFailures = true;
      summary.push({ locale, status: 'error', error: err.message });
      continue;
    }

    const localeKeys = collectLeafKeys(result.data);
    const localeKeySet = new Set(localeKeys);

    const missing = difference(referenceKeys, localeKeySet);
    const extra = difference(localeKeys, referenceKeySet);

    if (missing.length === 0 && extra.length === 0) {
      console.log(
        `${GREEN}\u2713${RESET} ${label} ${DIM}(${localeKeys.length}/${
          referenceKeys.length
        } keys) - OK${RESET}`
      );
      summary.push({ locale, status: 'ok', count: localeKeys.length });
    } else {
      hasFailures = true;
      const parts = [];
      if (missing.length > 0) parts.push(plural(missing.length, 'missing key'));
      if (extra.length > 0) parts.push(plural(extra.length, 'extra key'));
      console.log(
        `${RED}\u2717${RESET} ${label} ${DIM}(${localeKeys.length}/${
          referenceKeys.length
        } keys) - ${parts.join(', ')}${RESET}`
      );

      if (missing.length > 0) {
        console.log(`  ${RED}Missing keys (${missing.length}):${RESET}`);
        for (const key of missing) {
          console.log(`    ${RED}-${key}${RESET}`);
        }
      }

      if (extra.length > 0) {
        console.log(`  ${YELLOW}Extra keys (${extra.length}):${RESET}`);
        for (const key of extra) {
          console.log(`    ${YELLOW}+${key}${RESET}`);
        }
      }

      console.log('');
      summary.push({
        locale,
        status: 'fail',
        missing: missing.length,
        extra: extra.length,
      });
    }
  }

  // Final summary table.
  console.log(`\n${BOLD}Summary${RESET}`);
  console.log(`${DIM}${'-'.repeat(48)}${RESET}`);
  console.log(
    `${REFERENCE_LOCALE.padEnd(8)} ${DIM}reference${RESET}  ${referenceKeys.length} keys`
  );

  let failedCount = 0;
  for (const entry of summary) {
    if (entry.status === 'ok') {
      console.log(
        `${entry.locale.padEnd(8)} ${GREEN}OK${RESET}       ${entry.count} keys`
      );
    } else if (entry.status === 'fail') {
      failedCount++;
      const parts = [];
      if (entry.missing > 0) parts.push(`${entry.missing} missing`);
      if (entry.extra > 0) parts.push(`${entry.extra} extra`);
      console.log(
        `${entry.locale.padEnd(8)} ${RED}FAIL${RESET}      ${parts.join(', ')}`
      );
    } else {
      failedCount++;
      console.log(`${entry.locale.padEnd(8)} ${RED}ERROR${RESET}     ${entry.error}`);
    }
  }

  console.log(`${DIM}${'-'.repeat(48)}${RESET}`);

  if (hasFailures) {
    console.log(
      `\n${RED}${BOLD}FAIL${RESET} ${plural(
        failedCount,
        'locale has',
        'locales have'
      )} key mismatches. Update the translation files so they match "${REFERENCE_LOCALE}".\n`
    );
    process.exit(1);
  } else {
    console.log(
      `\n${GREEN}${BOLD}PASS${RESET} All ${otherLocales.length} ${
        otherLocales.length === 1 ? 'locale matches' : 'locales match'
      } the reference ("${REFERENCE_LOCALE}").\n`
    );
    process.exit(0);
  }
}

main();
