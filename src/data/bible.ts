// The 66 books of the Bible with their chapter counts (KJV).
export const BOOKS: [string, number][] = [
  ['Genesis', 50], ['Exodus', 40], ['Leviticus', 27], ['Numbers', 36], ['Deuteronomy', 34], ['Joshua', 24], ['Judges', 21], ['Ruth', 4],
  ['1 Samuel', 31], ['2 Samuel', 24], ['1 Kings', 22], ['2 Kings', 25], ['1 Chronicles', 29], ['2 Chronicles', 36], ['Ezra', 10],
  ['Nehemiah', 13], ['Esther', 10], ['Job', 42], ['Psalms', 150], ['Proverbs', 31], ['Ecclesiastes', 12], ['Song of Solomon', 8],
  ['Isaiah', 66], ['Jeremiah', 52], ['Lamentations', 5], ['Ezekiel', 48], ['Daniel', 12], ['Hosea', 14], ['Joel', 3], ['Amos', 9],
  ['Obadiah', 1], ['Jonah', 4], ['Micah', 7], ['Nahum', 3], ['Habakkuk', 3], ['Zephaniah', 3], ['Haggai', 2], ['Zechariah', 14],
  ['Malachi', 4],
  ['Matthew', 28], ['Mark', 16], ['Luke', 24], ['John', 21], ['Acts', 28], ['Romans', 16], ['1 Corinthians', 16], ['2 Corinthians', 13],
  ['Galatians', 6], ['Ephesians', 6], ['Philippians', 4], ['Colossians', 4], ['1 Thessalonians', 5], ['2 Thessalonians', 3],
  ['1 Timothy', 6], ['2 Timothy', 4], ['Titus', 3], ['Philemon', 1], ['Hebrews', 13], ['James', 5], ['1 Peter', 5], ['2 Peter', 3],
  ['1 John', 5], ['2 John', 1], ['3 John', 1], ['Jude', 1], ['Revelation', 22],
];

export const OT_COUNT = 39;

const ALIASES: Record<string, string> = { psalm: 'Psalms', 'song of songs': 'Song of Solomon', songs: 'Song of Solomon' };

/** Parse "John 3", "Romans 12:1–2", "Psalm 23" → { book, chapter }. */
export function parseRef(ref: string): { book: string; chapter: number } | null {
  const m = ref.trim().match(/^(.+?)\s+(\d+)/);
  if (!m) return null;
  const name = m[1].toLowerCase();
  const book = ALIASES[name] ?? BOOKS.find(([b]) => b.toLowerCase() === name)?.[0];
  const max = BOOKS.find(([b]) => b === book)?.[1];
  const chapter = Number(m[2]);
  return book && max && chapter >= 1 && chapter <= max ? { book, chapter } : null;
}

export function neighbour(book: string, chapter: number, dir: 1 | -1): { book: string; chapter: number } | null {
  const i = BOOKS.findIndex(([b]) => b === book);
  if (i < 0) return null;
  const c = chapter + dir;
  if (c >= 1 && c <= BOOKS[i][1]) return { book, chapter: c };
  const j = i + dir;
  if (j < 0 || j >= BOOKS.length) return null;
  return { book: BOOKS[j][0], chapter: dir === 1 ? 1 : BOOKS[j][1] };
}
