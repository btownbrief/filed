#!/usr/bin/env node
// Btown Brief headline updater for FILED!
//
// Fetches the Btown Brief RSS feed (each RSS item is a full newsletter
// edition with inline HTML), extracts the story headlines from the newest
// edition's "Local News" section, and writes them to data/headlines.json
// for the game to load. Run manually with:  node scripts/update-headlines.mjs
//
// No dependencies — plain Node 18+.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FEED = 'https://rss.beehiiv.com/feeds/1BT4mvZXMo.xml';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'headlines.json');
const MAX_HEADLINES = 18;
const SHORT_LEN = 38;

const decode = (s) => s
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/\s+/g, ' ').trim();

function shorten(t) {
  if (t.length <= SHORT_LEN) return t;
  const cut = t.slice(0, SHORT_LEN);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), 20)).replace(/[,;:–—-]$/, '') + '…';
}

function looksLikeHeadline(t) {
  const words = t.split(' ');
  return (
    words.length >= 4 && words.length <= 14 &&
    /^[A-Z0-9$“"']/.test(t) &&
    !/instagram|facebook|subscribe|sign.?up|read more|click|sponsor|advertise|quiz|btown brief/i.test(t)
  );
}

const res = await fetch(FEED, { headers: { 'user-agent': 'filed-game-headline-updater' } });
if (!res.ok) {
  console.error(`Feed fetch failed: HTTP ${res.status}`);
  process.exit(1);
}
const xml = await res.text();

const items = xml.split('<item>').slice(1);
if (items.length === 0) {
  console.error('No <item> entries in feed');
  process.exit(1);
}
const newest = items[0];
const editionTitle = decode((newest.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1]);
const editionLink = decode((newest.match(/<link>([\s\S]*?)<\/link>/) || [, ''])[1]);
let body = (newest.match(/content:encoded>([\s\S]*?)<\/content:encoded>/) || [, ''])[1];
body = body.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');

// Primary source: <a> texts inside the "Local News" section.
const seen = new Set();
const headlines = [];
function collect(html) {
  for (const m of html.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/g)) {
    const t = decode(m[1]);
    const key = t.toLowerCase();
    if (t && looksLikeHeadline(t) && !seen.has(key)) {
      seen.add(key);
      headlines.push({ full: t, short: shorten(t) });
    }
    if (headlines.length >= MAX_HEADLINES) return;
  }
}

const localNews = body.match(/<h2[^>]*>[^<]*Local News[\s\S]*?<\/h2>([\s\S]*?)<h[12][^>]*>/i);
if (localNews) collect(localNews[1]);

// Fallbacks if the section heading changes: headline-shaped h2/h3s, then all links.
if (headlines.length < 5) {
  for (const m of body.matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g)) {
    const t = decode(m[1]);
    const key = t.toLowerCase();
    if (looksLikeHeadline(t) && !seen.has(key)) {
      seen.add(key);
      headlines.push({ full: t, short: shorten(t) });
    }
  }
}
if (headlines.length < 5) collect(body);

if (headlines.length < 3) {
  console.error(`Only ${headlines.length} usable headlines found — keeping previous data file.`);
  process.exit(1);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({
  updated: new Date().toISOString(),
  edition: editionTitle,
  link: editionLink,
  headlines: headlines.slice(0, MAX_HEADLINES),
}, null, 2) + '\n');
console.log(`Wrote ${Math.min(headlines.length, MAX_HEADLINES)} headlines from "${editionTitle}" to data/headlines.json`);
