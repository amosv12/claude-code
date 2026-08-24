export interface PaperMetadata {
  title: string | null;
  authors: string | null;
  abstract: string | null;
}

export type ReferenceStyle = 'bracketed' | 'numbered' | 'author-year' | 'none';

export interface ReferencesResult {
  citations: string[];
  style: ReferenceStyle;
  /** Character length of the located references block; 0 when no section was found. */
  blockLength: number;
}

const EMAIL_RE = /[\w.\-+]+@[\w.\-]+\.\w+/;

/** Function words that leave a title line obviously unfinished. */
const DANGLING_CONNECTOR_RE =
  /\b(?:with|of|for|and|or|in|on|to|a|an|the|from|using|via|by|at|into|through|under|over|between|towards?)$/i;

const AFFILIATION_RE =
  /\b(universit|department|dept\.|institut|laborator|college|school of|academy|research cent|inc\.|corp\.|ltd\.|llc|gmbh|hospital|faculty|campus|foundation)\b/i;

/** Front-matter lines that precede the title on preprints and camera-ready copies. */
const NOISE_RES: RegExp[] = [
  /^arxiv:\s*\d{4}\.\d{4,5}/i,
  /^\d{1,4}$/,
  /^[ivxlcdm]{1,6}$/i,
  /^(preprint|submitted to|to appear in|accepted (at|to|for)|under review|draft|in press|technical report)\b/i,
  /^(doi\b|https?:\/\/|www\.)/i,
  /^(©|\(c\)\s*\d{4}|copyright\b)/i,
  /^(isbn|issn)\b/i,
  /^permission to make digital/i,
  /^(proceedings of|in proceedings|acm isbn|acm reference)/i,
  /^\d{4} ieee\b/i,
  /^(journal|transactions) of .{0,80}\(\d{4}\)/i,
  /^(vol\.|volume)\s*\d+/i,
  /^page \d+/i,
];

const ABSTRACT_MARKER_RE = /^abstract\b\s*[:.—–-]?\s*/i;

const ABSTRACT_STOP_RE =
  /^(keywords?|key words|index terms|general terms|categories and subject descriptors|ccs concepts|acm reference format|introduction)\b/i;

const NUMBERED_SECTION_RE = /^(?:\d+(?:\.\d+)*\.?|[IVX]+\.)\s+[A-Z]/;

/** Two-to-four capitalised components, allowing initials, hyphens and nobiliary particles. */
const NAME_RE =
  /^(?:(?:[A-Z][\p{L}'’\-]*\.?|(?:van|von|de|del|della|der|den|di|da|dos|du|la|le|el|bin|ibn|al))\s+){1,3}[A-Z][\p{L}'’\-]+\.?$/u;

function isNoise(line: string): boolean {
  // Copyright notices are often appended to a venue banner rather than starting it.
  if (line.includes('\u00a9')) return true;
  return NOISE_RES.some((re) => re.test(line));
}

/** Collapses soft hyphenation introduced by line wrapping ("proba- bilistic" -> "probabilistic"). */
function dehyphenate(text: string): string {
  return text.replace(/(\p{Ll})-\s+(\p{Ll})/gu, '$1$2');
}

/** Removes superscript affiliation markers ("Smith1,2" / "Doe*") without eating author separators. */
function stripAffiliationMarkers(line: string): string {
  return line
    .replace(/[†‡§¶*#]/g, ' ')
    .replace(/(\p{L})\d+(?:\s*,\s*\d+)*/gu, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normaliseLines(pageText: string): string[] {
  return pageText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);
}

function looksLikeAuthorLine(line: string): boolean {
  const tokens = splitAuthorTokens(stripAffiliationMarkers(line));
  if (tokens.length === 0) return false;
  const valid = tokens.filter((token) => NAME_RE.test(token));
  return valid.length > 0 && valid.length / tokens.length >= 0.6;
}

function splitAuthorTokens(line: string): string[] {
  return line
    .split(/,|;|\sand\s|\s&\s/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function extractTitle(lines: string[]): { title: string | null; endIndex: number } {
  let start = 0;
  while (start < lines.length && isNoise(lines[start])) start += 1;
  if (start >= lines.length) return { title: null, endIndex: 0 };

  let candidate = lines[start];
  let end = start + 1;

  // Titles frequently wrap across two or three lines; keep joining while the
  // next line reads as a continuation rather than the start of the byline.
  while (end < lines.length && end - start < 3) {
    const next = lines[end];
    // "Natural Image Denoising with" is plainly unfinished, so the next line
    // belongs to the title even though "Convolutional Networks" is shaped
    // exactly like a person's name.
    const dangling = DANGLING_CONNECTOR_RE.test(candidate);
    if (
      ABSTRACT_MARKER_RE.test(next) ||
      EMAIL_RE.test(next) ||
      AFFILIATION_RE.test(next) ||
      (!dangling && looksLikeAuthorLine(next))
    ) {
      break;
    }
    const continues = dangling || /[a-z,;:\-]$/.test(candidate) || /^[a-z]/.test(next);
    if (!continues) break;
    candidate = `${candidate} ${next}`;
    end += 1;
  }

  candidate = dehyphenate(candidate).replace(/\s{2,}/g, ' ').trim();
  const words = candidate.split(/\s+/);

  const confident =
    words.length >= 3 &&
    words.length <= 30 &&
    candidate.length >= 10 &&
    candidate.length <= 300 &&
    !EMAIL_RE.test(candidate) &&
    !/^(abstract|introduction|keywords)\b/i.test(candidate) &&
    candidate !== candidate.toLowerCase() &&
    !looksLikeAuthorLine(candidate);

  return { title: confident ? candidate : null, endIndex: end };
}

const NAME_PARTICLES = new Set([
  'van', 'von', 'de', 'del', 'della', 'der', 'den', 'di', 'da', 'dos', 'du', 'la', 'le', 'el',
  'bin', 'ibn', 'al',
]);

/**
 * Removes an address that shares a line with its author. Everything from the
 * address token onward goes, then trailing lowercase debris is dropped - an
 * email whose local part contains a space ("sahand n@example.edu") otherwise
 * leaves a stray fragment glued to the name.
 */
function stripInlineEmail(line: string): string {
  if (!EMAIL_RE.test(line)) return line;

  const tokens = line.split(/\s+/);
  const addressIndex = tokens.findIndex((token) => token.includes('@'));
  const kept = addressIndex === -1 ? tokens : tokens.slice(0, addressIndex);

  while (
    kept.length > 0 &&
    /^\p{Ll}/u.test(kept[kept.length - 1]) &&
    !NAME_PARTICLES.has(kept[kept.length - 1].toLowerCase())
  ) {
    kept.pop();
  }

  return kept.join(' ').trim();
}

function extractAuthors(lines: string[], startIndex: number): string | null {
  const names: string[] = [];

  for (let i = startIndex; i < Math.min(lines.length, startIndex + 8); i += 1) {
    const line = lines[i];
    if (ABSTRACT_MARKER_RE.test(line)) break;
    if (NUMBERED_SECTION_RE.test(line)) break;
    // Bylines commonly place the address beside the name; drop the address and
    // keep judging the name that remains.
    const withoutEmail = stripInlineEmail(line);
    if (withoutEmail.length === 0 || AFFILIATION_RE.test(withoutEmail)) continue;

    const tokens = splitAuthorTokens(stripAffiliationMarkers(withoutEmail));
    if (tokens.length === 0) continue;

    const valid = tokens.filter((token) => NAME_RE.test(token));
    // Mixed lines (a stray venue, a partial affiliation) are ambiguous - skip
    // rather than half-parse them.
    if (valid.length === 0 || valid.length / tokens.length < 0.6) continue;

    names.push(...valid);
  }

  if (names.length === 0) return null;
  return [...new Set(names)].join(', ');
}

function extractAbstract(lines: string[]): string | null {
  const markerIndex = lines.findIndex((line) => ABSTRACT_MARKER_RE.test(line));
  if (markerIndex === -1) return null;

  const parts: string[] = [];
  const firstLine = lines[markerIndex].replace(ABSTRACT_MARKER_RE, '').trim();
  if (firstLine.length > 0) parts.push(firstLine);

  for (let i = markerIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (ABSTRACT_STOP_RE.test(line) || NUMBERED_SECTION_RE.test(line)) break;
    parts.push(line);
    if (parts.join(' ').split(/\s+/).length > 400) break;
  }

  const abstract = dehyphenate(parts.join(' ')).replace(/\s{2,}/g, ' ').trim();
  return abstract.length >= 100 ? abstract : null;
}

export function extractMetadata(firstPageText: string): PaperMetadata {
  const lines = normaliseLines(firstPageText);
  if (lines.length === 0) return { title: null, authors: null, abstract: null };

  const { title, endIndex } = extractTitle(lines);
  return {
    title,
    authors: extractAuthors(lines, endIndex),
    abstract: extractAbstract(lines),
  };
}

const REF_HEADING_RE =
  /^[ \t]*(?:\d+\.?\s*)?(?:references?|bibliography|works cited|literature cited|references and notes)\s*:?[ \t]*$/gim;

const REF_END_RE =
  /^[ \t]*(?:\d+\.?\s*)?(?:appendix|appendices|acknowledge?ments?|acknowledgment|supplementary|supporting information|author contributions|about the authors?|biograph)/im;

/** Longest a lettered appendix heading is allowed to be before it reads as prose. */
const APPENDIX_HEADING_MAX_LENGTH = 40;

/**
 * Finds a lettered appendix heading such as "A Word Frequency", which names its
 * section instead of saying "Appendix". A wrapped citation line can look almost
 * identical ("A. Maximum entropy inverse reinforcement learn-"), so a heading is
 * only accepted when the preceding line closed a citation.
 */
function findLetteredAppendixIndex(block: string): number {
  const lines = block.split('\n');
  let offset = 0;
  let previous = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      const isHeading =
        trimmed.length <= APPENDIX_HEADING_MAX_LENGTH &&
        !trimmed.endsWith('-') &&
        /^[A-Z]\.?\s+[A-Z]/.test(trimmed) &&
        /[.)\]]$/.test(previous);
      if (isHeading) return offset;
      previous = trimmed;
    }
    offset += line.length + 1;
  }

  return -1;
}

/** Isolates the references block: the last plausible heading through to any trailing back matter. */
function locateReferencesBlock(fullText: string): string | null {
  REF_HEADING_RE.lastIndex = 0;
  const matches: Array<{ index: number; length: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = REF_HEADING_RE.exec(fullText)) !== null) {
    matches.push({ index: match.index, length: match[0].length });
  }
  if (matches.length === 0) return null;

  // Prefer a heading in the back half of the document: earlier hits are usually
  // table-of-contents entries or in-text mentions.
  const lateMatches = matches.filter((m) => m.index > fullText.length * 0.4);
  const chosen = (lateMatches.length > 0 ? lateMatches : matches)[
    (lateMatches.length > 0 ? lateMatches : matches).length - 1
  ];

  let block = fullText.slice(chosen.index + chosen.length);

  const endMatch = REF_END_RE.exec(block);
  if (endMatch && endMatch.index > 0) block = block.slice(0, endMatch.index);

  // Lettered appendix headings ("A Word Frequency") name the section rather than
  // saying "Appendix", so they need their own pass. Only honoured in the back half
  // of the block, where they cannot truncate the bibliography itself.
  const letteredIndex = findLetteredAppendixIndex(block);
  if (letteredIndex > block.length * 0.5) {
    block = block.slice(0, letteredIndex);
  }

  return block;
}

/** Drops page numbers and running headers/footers repeated throughout the block. */
function cleanReferenceLines(block: string): string[] {
  const lines = block
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
    .filter((line) => line.trim().length > 0);

  const counts = new Map<string, number>();
  for (const line of lines) {
    const key = line.trim();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return lines.filter((line) => {
    const key = line.trim();
    if (/^\d{1,4}$/.test(key)) return false;
    if (key.length < 3) return false;
    if ((counts.get(key) ?? 0) >= 3) return false;
    return true;
  });
}

function detectStyle(lines: string[]): ReferenceStyle {
  const bracketed = lines.filter((line) => /^\s*\[\d{1,3}\]/.test(line)).length;
  if (bracketed >= 3) return 'bracketed';

  const numberedStarts = lines
    .map((line) => /^\s*(\d{1,3})[.)]\s/.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => Number(m[1]));
  const ascending = numberedStarts.filter((n, i) => i === 0 || n > numberedStarts[i - 1]).length;
  if (numberedStarts.length >= 3 && ascending >= 3 && Math.min(...numberedStarts) <= 2) {
    return 'numbered';
  }

  return 'author-year';
}

function finaliseEntry(entry: string): string {
  return dehyphenate(entry.replace(/\s+/g, ' '))
    .replace(/^\s*\[\d{1,3}\]\s*/, '')
    .replace(/^\s*\d{1,3}[.)]\s*/, '')
    .trim();
}

function isPlausibleCitation(entry: string): boolean {
  return entry.length >= 20 && entry.length <= 1500 && /\p{L}/u.test(entry);
}

function splitBracketed(lines: string[]): string[] {
  const entries: string[] = [];
  for (const line of lines) {
    if (/^\s*\[\d{1,3}\]/.test(line) || entries.length === 0) entries.push(line);
    else entries[entries.length - 1] += ` ${line}`;
  }
  return entries;
}

/**
 * Splits "1. Author, ..." lists, starting a new entry only when the leading number
 * is the one expected next - so a year or page number opening a wrapped line does
 * not fabricate an entry.
 */
function splitNumbered(lines: string[]): string[] {
  const entries: string[] = [];
  let expected = 1;
  for (const line of lines) {
    const match = /^\s*(\d{1,3})[.)]\s/.exec(line);
    if (match && Number(match[1]) === expected) {
      entries.push(line);
      expected += 1;
    } else if (entries.length === 0) {
      entries.push(line);
    } else {
      entries[entries.length - 1] += ` ${line}`;
    }
  }
  return entries;
}

/** Surname-first, as in APA/Chicago: "Andoni, A." or "Andoni, Alexandr". */
const SURNAME_FIRST_OPENER_RE =
  /^[A-Z][\p{L}'’\-]+,\s+(?:(?:[A-Z]\.\s*){1,3}|[A-Z][\p{L}]+)/u;

/** Forename-first, as in ACL/LNCS: "Alexandr Andoni and Piotr Indyk." */
const FORENAME_FIRST_OPENER_RE =
  /^(?:(?:[A-Z][\p{L}'’\-]+\.?|and|&)\s+){1,8}[A-Z][\p{L}'’\-]+[,.]/u;

const YEAR_RE = /(?:19|20)\d{2}/;

function splitAuthorYear(block: string, lines: string[]): string[] {
  // Blank-line separation is only trustworthy when the resulting chunks actually
  // look like citations. In many PDFs the blank lines are page breaks, which
  // would otherwise yield a couple of enormous chunks and a stray page number.
  const paragraphs = block
    .split(/\r?\n\s*\r?\n/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter((part) => part.length > 0);
  const plausibleParagraphs = paragraphs.filter(isPlausibleCitation);
  if (
    plausibleParagraphs.length >= 3 &&
    plausibleParagraphs.length / paragraphs.length >= 0.6
  ) {
    return paragraphs;
  }

  const entries: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const previous = entries[entries.length - 1];
    // A new entry needs a name-shaped opener AND a previous entry that already
    // looks complete (terminal punctuation plus a year). Without that guard,
    // capitalised continuation lines such as "Proceedings of EMNLP..." would
    // each start a spurious entry.
    const previousLooksComplete =
      previous !== undefined && /[.)\]]\s*$/.test(previous) && YEAR_RE.test(previous);
    const startsEntry =
      previousLooksComplete &&
      (SURNAME_FIRST_OPENER_RE.test(line) || FORENAME_FIRST_OPENER_RE.test(line));

    if (startsEntry || entries.length === 0) entries.push(line);
    else entries[entries.length - 1] += ` ${line}`;
  }
  return entries;
}

export function extractReferences(fullText: string): ReferencesResult {
  const block = locateReferencesBlock(fullText);
  if (block === null) return { citations: [], style: 'none', blockLength: 0 };

  const lines = cleanReferenceLines(block);
  if (lines.length === 0) return { citations: [], style: 'none', blockLength: block.length };

  const style = detectStyle(lines);
  let raw: string[];
  if (style === 'bracketed') raw = splitBracketed(lines);
  else if (style === 'numbered') raw = splitNumbered(lines);
  else raw = splitAuthorYear(block, lines);

  // A numbered scheme that collapses into almost nothing was a misread; the
  // block is far more likely to be an author-year list.
  if (style !== 'author-year' && raw.length < 3 && block.length > 2000) {
    raw = splitAuthorYear(block, lines);
  }

  const citations = raw.map(finaliseEntry).filter(isPlausibleCitation);
  return { citations: [...new Set(citations)], style, blockLength: block.length };
}
