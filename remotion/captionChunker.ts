/**
 * captionChunker.ts — M6/G4: clause-boundary caption chunker.
 *
 * Rules: chunk on clause boundaries first (. , ; — ? ! :), then cap
 * 4-6 words; NEVER end a chunk on a stopword (a/the/and/of/to/that/is).
 * Words carry their timestamps; chunks inherit word timing for sync.
 */
export interface Word { text: string; start: number; end: number; }
export interface Chunk { words: Word[]; start: number; end: number; text: string; }

const STOP_END = new Set(['a','the','and','of','to','that','is','in','on','for','with','your','you','are','out']);
const MIN_WORDS = parseInt(process.env.CHUNK_MIN ?? '4', 10);
const MAX_WORDS = parseInt(process.env.CHUNK_MAX ?? '6', 10);
const CLAUSE_PUNCT = /[.,;—?!:]$/;

function isClauseEnd(w: Word): boolean { return CLAUSE_PUNCT.test(w.text); }

export function chunkCaptions(words: Word[]): Chunk[] {
  const chunks: Chunk[] = [];
  let cur: Word[] = [];
  const flush = () => {
    // never END a chunk on a stopword: pull the WHOLE stopword tail
    // (consecutive stopwords) into the next chunk
    let cut = cur.length;
    while (cut > 1 && STOP_END.has(cur[cut-1].text.toLowerCase().replace(/[^a-z']/g,''))) cut--;
    if (cut < cur.length) {
      chunks.push(mk(cur.slice(0, cut)));
      cur = cur.slice(cut);
      return;
    }
    chunks.push(mk(cur)); cur = [];
  };
  const mk = (ws: Word[]): Chunk => ({
    words: ws, start: ws[0].start, end: ws[ws.length-1].end,
    text: ws.map(w => w.text).join(' '),
  });

  for (const w of words) {
    cur.push(w);
    const hard = cur.length >= MAX_WORDS;
    const soft = isClauseEnd(w) && cur.length >= MIN_WORDS;
    if (soft || hard) flush();
  }
  if (cur.length) {
    while (cur.length > 1 && STOP_END.has(cur[cur.length-1].text.toLowerCase().replace(/[^a-z']/g,''))) {
      const last = chunks[chunks.length-1];
      chunks[chunks.length-1] = { ...last, words: [...last.words, cur[0]], end: cur[0].end, text: last.text + ' ' + cur[0].text };
      cur = cur.slice(1);
    }
    if (cur.length) chunks.push(mk(cur));
  }
  return chunks;
}
